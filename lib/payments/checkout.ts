import 'server-only'
import { randomBytes } from 'node:crypto'
import { OrderStatus, PaymentMode } from '@prisma/client'
import type { TransactionCreate } from 'postfinancecheckout'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { isOnlinePaymentEnabled } from '@/lib/payments/config'
import { buildPaymentLines, toSdkLineItems } from '@/lib/payments/line-items'
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
        | 'erreur'
    }

/**
 * Ouvre (ou rouvre) le paiement en ligne d'une commande en attente et renvoie
 * l'adresse de la Payment Page PostFinance. Sert à la première redirection
 * après la commande comme aux nouvelles tentatives après un refus ou un
 * abandon : la commande n'est jamais recréée.
 *
 * Ne marque jamais une commande payée : seul le webhook signé le fait. L'état
 * de la dernière tentative est relu chez PostFinance uniquement pour décider
 * s'il faut la rouvrir, attendre, ou en créer une nouvelle.
 */
export async function startOnlinePayment(orderId: string): Promise<StartPaymentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { articleNumber: true } } } },
      customer: { select: { firstName: true, lastName: true } },
      paymentTransactions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  if (!order) return { ok: false, reason: 'introuvable' }
  if (order.paidAt) return { ok: false, reason: 'deja_payee' }
  if (
    order.paymentMode !== PaymentMode.EN_LIGNE ||
    order.status !== OrderStatus.EN_ATTENTE_PAIEMENT ||
    !order.paymentToken
  ) {
    return { ok: false, reason: 'non_payable' }
  }
  if (!isOnlinePaymentEnabled()) return { ok: false, reason: 'indisponible' }

  try {
    const latest = order.paymentTransactions[0]
    if (latest && !isFinalTransactionState(latest.state)) {
      const remote = await readTransaction(Number(latest.transactionId))
      if (isSettlingTransactionState(remote.state)) return { ok: false, reason: 'en_cours' }
      if (remote.state === 'DECLINE') return { ok: false, reason: 'refusee' }
      if (isReusableTransactionState(remote.state) && latest.amountCents === order.totalCents) {
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
    } else if (latest && isSettlingTransactionState(latest.state)) {
      return { ok: false, reason: 'en_cours' }
    } else if (latest?.state === 'DECLINE') {
      return { ok: false, reason: 'refusee' }
    }

    const lines = buildPaymentLines({
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
    })

    const [givenName, ...rest] = order.clientName.trim().split(/\s+/)
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
      // Encaissement immédiat pour tous les moyens : pas de capture à coder,
      // les corrections passent par un remboursement (recommandation PostFinance).
      completionBehavior: 'COMPLETE_IMMEDIATELY',
      // La boutique envoie ses propres emails de confirmation
      emailsDisabled: true,
      metaData: {
        commande: order.numero,
        environnement: process.env.NEXT_PUBLIC_STAGE || 'local',
      },
    }

    const created = await createTransaction(transactionCreate)
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        transactionId: BigInt(created.id),
        spaceId: BigInt(postFinanceSpaceId()),
        state: created.state,
        amountCents: order.totalCents,
      },
    })
    return { ok: true, paymentPageUrl: await getPaymentPageUrl(created.id) }
  } catch (error) {
    console.error('PostFinance : ouverture du paiement impossible', {
      commande: order.numero,
      erreur: await describePostFinanceError(error),
    })
    return { ok: false, reason: 'erreur' }
  }
}
