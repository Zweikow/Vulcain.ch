import 'server-only'
import { randomBytes } from 'node:crypto'
import { AuditAction, AuditTargetType, OrderStatus, PaymentMode } from '@prisma/client'
import type { TransactionCreate } from 'postfinancecheckout'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { getSettings } from '@/lib/settings'
import { formatCHF, orderTotalsFor } from '@/lib/money'
import { recordCustomerAudit } from '@/lib/audit'
import { isOnlinePaymentEnabled } from '@/lib/payments/config'
import { PAYMENT_CHOICE_LABELS, type PaymentChoiceValue } from '@/lib/payments/choices'
import {
  checkPaymentChoice,
  configurationIdsFor,
  configurationIdsWithoutInvoice,
} from '@/lib/payments/modes'
import { buildPaymentLines, invoiceFeeLine, toSdkLineItems } from '@/lib/payments/line-items'
import {
  createTransaction,
  describePostFinanceError,
  getPaymentPageUrl,
  postFinanceSpaceId,
  readTransaction,
} from '@/lib/payments/postfinance'
import {
  isFinalTransactionState,
  isReusableTransactionState,
  isSettlingTransactionState,
} from '@/lib/payments/states'

/** Jeton des pages publiques /paiement/<jeton> : 32 caractères aléatoires. */
export function newPaymentToken(): string {
  return randomBytes(24).toString('base64url')
}

export function paymentPagePath(token: string): string {
  return `/paiement/${token}`
}

export type StartPaymentResult =
  | { ok: true; paymentPageUrl: string }
  | {
      ok: false
      reason:
        | 'introuvable'
        | 'non_payable'
        | 'deja_payee'
        | 'en_cours'
        | 'refusee'
        | 'indisponible'
        | 'mode_indisponible'
        | 'erreur'
    }

/**
 * Ouvre (ou rouvre) le paiement en ligne d'une commande en attente et renvoie
 * l'adresse de la Payment Page PostFinance. Sert à la première redirection
 * après la commande comme aux nouvelles tentatives après un refus ou un
 * abandon : la commande n'est jamais recréée.
 *
 * Verrou du mode : la transaction est limitée aux configurations du mode
 * choisi (PFC_PAYMENT_MODES), et une seule transaction est active par
 * commande. Une transaction d'un autre mode est remplacée, jamais réutilisée.
 *
 * Ne marque jamais une commande payée : seul le webhook signé le fait. L'état
 * de la transaction active est relu chez PostFinance uniquement pour décider
 * s'il faut la rouvrir, attendre, ou en créer une nouvelle.
 */
export async function startOnlinePayment(orderId: string): Promise<StartPaymentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { articleNumber: true } } } },
      customer: { select: { firstName: true, lastName: true } },
      // Transaction active : la plus récente qui n'a pas été remplacée
      paymentTransactions: {
        where: { supersededAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!order) return { ok: false, reason: 'introuvable' }
  if (order.paidAt || order.invoiceAcceptedAt) return { ok: false, reason: 'deja_payee' }
  if (
    order.paymentMode !== PaymentMode.EN_LIGNE ||
    order.status !== OrderStatus.EN_ATTENTE_PAIEMENT ||
    !order.paymentToken
  ) {
    return { ok: false, reason: 'non_payable' }
  }
  if (!isOnlinePaymentEnabled()) return { ok: false, reason: 'indisponible' }

  // Mode choisi encore proposé ? (facture coupée, ou déjà échouée pour la commande)
  const choice = order.paymentChoice
  let allowedConfigurations: number[]
  if (choice) {
    if (!checkPaymentChoice(choice, { invoiceUnavailable: order.invoiceUnavailable }).ok) {
      return { ok: false, reason: 'mode_indisponible' }
    }
    allowedConfigurations = configurationIdsFor(choice)
  } else {
    allowedConfigurations = configurationIdsWithoutInvoice()
  }

  try {
    const active = order.paymentTransactions[0]
    const sameChoice = (active?.paymentChoice ?? null) === (choice ?? null)
    if (active && !isFinalTransactionState(active.state)) {
      const remote = await readTransaction(Number(active.transactionId))
      if (isSettlingTransactionState(remote.state)) return { ok: false, reason: 'en_cours' }
      if (remote.state === 'DECLINE') return { ok: false, reason: 'refusee' }
      if (
        sameChoice &&
        isReusableTransactionState(remote.state) &&
        active.amountCents === order.totalCents
      ) {
        try {
          return { ok: true, paymentPageUrl: await getPaymentPageUrl(remote.id) }
        } catch (error) {
          // Page expirée ou transaction plus utilisable : on en crée une nouvelle
          console.warn('PostFinance : page de paiement non réutilisable', {
            commande: order.numero,
            erreur: await describePostFinanceError(error),
          })
        }
      }
    } else if (active && isSettlingTransactionState(active.state)) {
      return { ok: false, reason: 'en_cours' }
    } else if (active?.state === 'DECLINE') {
      return { ok: false, reason: 'refusee' }
    }

    const lines = buildPaymentLines(
      {
        totalCents: order.totalCents,
        shippingCents: order.shippingCents,
        promoCode: order.promoCode,
        promoDiscountCents: order.promoDiscountCents,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          articleNumber: item.product?.articleNumber ?? null,
        })),
      },
      order.invoiceFeeCents > 0 ? [invoiceFeeLine(order.invoiceFeeCents)] : []
    )

    const [givenName, ...rest] = order.clientName.trim().split(/\s+/)
    // Particuliers uniquement : aucun nom d'entreprise, PowerPay traite alors
    // la facture comme B2C.
    const address = {
      givenName: order.customer?.firstName ?? givenName,
      familyName: order.customer?.lastName ?? (rest.join(' ') || givenName),
      street: order.address,
      postcode: order.npa,
      city: order.city,
      country: 'CH',
      emailAddress: order.clientEmail,
    }

    const pageUrl = `${getSiteUrl()}${paymentPagePath(order.paymentToken)}`
    const transactionCreate: TransactionCreate = {
      lineItems: toSdkLineItems(lines),
      currency: 'CHF',
      language: 'fr-CH',
      merchantReference: order.numero,
      customerEmailAddress: order.clientEmail,
      billingAddress: address,
      shippingAddress: address,
      successUrl: `${pageUrl}?retour=succes`,
      failedUrl: `${pageUrl}?retour=echec`,
      ...(allowedConfigurations.length > 0
        ? { allowedPaymentMethodConfigurations: allowedConfigurations }
        : {}),
      // Facture PowerPay : encaissement à l'expédition, depuis l'admin. Autres
      // modes : encaissement immédiat, les corrections passent par un
      // remboursement (recommandation PostFinance).
      completionBehavior: choice === 'FACTURE' ? 'COMPLETE_DEFERRED' : 'COMPLETE_IMMEDIATELY',
      // La boutique envoie ses propres emails de confirmation
      emailsDisabled: true,
      metaData: {
        commande: order.numero,
        environnement: process.env.NEXT_PUBLIC_STAGE || 'local',
      },
    }

    const created = await createTransaction(transactionCreate)
    // Une seule transaction active par commande : la nouvelle remplace les autres
    await prisma.$transaction([
      prisma.paymentTransaction.updateMany({
        where: { orderId: order.id, supersededAt: null },
        data: { supersededAt: new Date() },
      }),
      prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          transactionId: BigInt(created.id),
          spaceId: BigInt(postFinanceSpaceId()),
          state: created.state,
          amountCents: order.totalCents,
          paymentChoice: choice,
        },
      }),
    ])
    return { ok: true, paymentPageUrl: await getPaymentPageUrl(created.id) }
  } catch (error) {
    console.error('PostFinance : ouverture du paiement impossible', {
      commande: order.numero,
      erreur: await describePostFinanceError(error),
    })
    return { ok: false, reason: 'erreur' }
  }
}

export type ChangeChoiceResult =
  | { ok: true }
  | { ok: false; reason: 'introuvable' | 'non_payable' | 'mode_indisponible' | 'en_cours' }

/**
 * Le client change de mode avant d'avoir payé : le total est recalculé
 * (supplément facture ajouté ou retiré), puis le paiement est rouvert sur une
 * nouvelle transaction limitée au nouveau mode. L'ancienne est remplacée : si
 * elle est quand même payée, le webhook met la commande « à vérifier ».
 */
export async function changePaymentChoice(
  orderId: string,
  choice: unknown
): Promise<ChangeChoiceResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      paymentTransactions: {
        where: { supersededAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!order) return { ok: false, reason: 'introuvable' }
  if (
    order.paymentMode !== PaymentMode.EN_LIGNE ||
    order.status !== OrderStatus.EN_ATTENTE_PAIEMENT ||
    order.paidAt ||
    order.invoiceAcceptedAt
  ) {
    return { ok: false, reason: 'non_payable' }
  }
  const check = checkPaymentChoice(choice, { invoiceUnavailable: order.invoiceUnavailable })
  if (!check.ok) return { ok: false, reason: 'mode_indisponible' }
  const newChoice = choice as PaymentChoiceValue

  // Paiement en cours d'encaissement sur la transaction active : on attend
  const active = order.paymentTransactions[0]
  if (active && !isFinalTransactionState(active.state)) {
    const remote = await readTransaction(Number(active.transactionId))
    if (isSettlingTransactionState(remote.state)) return { ok: false, reason: 'en_cours' }
  }

  const settings = await getSettings()
  const totals = orderTotalsFor(order, newChoice, settings)
  const { count } = await prisma.order.updateMany({
    where: {
      id: order.id,
      status: OrderStatus.EN_ATTENTE_PAIEMENT,
      paidAt: null,
      invoiceAcceptedAt: null,
    },
    data: { paymentChoice: newChoice, ...totals },
  })
  if (count === 0) return { ok: false, reason: 'non_payable' }

  if (newChoice !== order.paymentChoice) {
    await recordCustomerAudit(
      AuditAction.MODE_PAIEMENT_CHANGE,
      { type: AuditTargetType.COMMANDE, id: order.id, label: order.numero },
      `${order.paymentChoice ? PAYMENT_CHOICE_LABELS[order.paymentChoice] : 'Sans mode'} → ${PAYMENT_CHOICE_LABELS[newChoice]}, total ${formatCHF(totals.totalCents)}`
    )
  }
  return { ok: true }
}

/**
 * Retour du client sur l'adresse d'échec après une tentative par facture :
 * refus de solvabilité ou abandon, PostFinance ne permet pas de les
 * distinguer. La facture est retirée pour cette commande ; le webhook d'échec
 * fait de même quand il arrive. Ne fait que retirer une option, jamais payer.
 */
export async function markInvoiceUnavailableAfterReturn(orderId: string): Promise<boolean> {
  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId,
      paymentChoice: 'FACTURE',
      status: OrderStatus.EN_ATTENTE_PAIEMENT,
      invoiceAcceptedAt: null,
      invoiceUnavailable: false,
    },
    data: { invoiceUnavailable: true },
  })
  return count === 1
}
