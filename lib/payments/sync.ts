import 'server-only'
import { AuditAction, AuditTargetType, OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { recordAudit, recordSystemAudit } from '@/lib/audit'
import { notifyOrderPlaced } from '@/lib/notifications'
import { readTransaction, type TransactionSnapshot } from '@/lib/payments/postfinance'
import { choiceOfConfiguration } from '@/lib/payments/modes'
import { PAYMENT_CHOICE_LABELS, type PaymentChoiceValue } from '@/lib/payments/choices'
import {
  FINAL_TRANSACTION_STATES,
  paymentStatusOf,
  transactionStateLabel,
} from '@/lib/payments/states'

/**
 * Aligne une tentative de paiement sur l'état réel de la transaction chez
 * PostFinance, relu par l'API : la charge d'un webhook n'est jamais crue sur
 * parole. Appelée par le webhook signé et, en secours, par le bouton
 * « Vérifier auprès de PostFinance » du back-office.
 *
 * Idempotente : rejouer la même notification ne change rien. La commande ne
 * passe « payée » (ou « acceptée sur facture ») qu'une fois, par une mise à
 * jour conditionnelle, et les emails ne partent qu'à ce moment-là.
 *
 * Double vérification avant toute confirmation : la transaction doit être la
 * transaction active de la commande, payée dans le mode choisi, pour le bon
 * montant. Au moindre écart, une commande en attente passe « à vérifier » :
 * jamais confirmée en silence.
 */

export type SyncOrigin = 'webhook' | 'admin'

export type SyncResult =
  | { outcome: 'ignoree'; detail: string }
  | { outcome: 'payee'; orderId: string; numero: string; newlyPaid: boolean }
  | { outcome: 'acceptee'; orderId: string; numero: string; newlyAccepted: boolean }
  | { outcome: 'en_cours' | 'echouee'; orderId: string; numero: string; state: string }
  | { outcome: 'anomalie' | 'a_verifier'; orderId: string; numero: string; detail: string }

// Facture PowerPay : la solvabilité acceptée (AUTHORIZED) suffit à lancer la
// commande ; l'encaissement, puis FULFILL, viennent à l'expédition.
const INVOICE_ACCEPTED_STATES = ['AUTHORIZED', 'COMPLETED', 'FULFILL']

const choiceLabel = (choice: PaymentChoiceValue | null | undefined) =>
  choice ? PAYMENT_CHOICE_LABELS[choice] : 'inconnu'

type AttemptToCheck = {
  amountCents: number
  paymentChoice: PaymentChoiceValue | null
  supersededAt: Date | null
}

/** Écart qui interdit de confirmer la commande, ou null si tout concorde. */
export function paymentInconsistency(
  transactionId: bigint,
  attempt: AttemptToCheck,
  order: { totalCents: number; paymentChoice: PaymentChoiceValue | null },
  remote: Pick<TransactionSnapshot, 'currency' | 'authorizationAmountCents'>,
  usedChoice: PaymentChoiceValue | null
): string | null {
  if (attempt.supersededAt) {
    return `Transaction ${transactionId} remplacée par une plus récente, mais payée : rembourser depuis le back-office PostFinance`
  }
  if (attempt.paymentChoice) {
    if (usedChoice !== attempt.paymentChoice) {
      return `Mode utilisé (${choiceLabel(usedChoice)}) différent du mode choisi (${choiceLabel(attempt.paymentChoice)}) pour la transaction ${transactionId}`
    }
    if (order.paymentChoice !== attempt.paymentChoice) {
      return `Mode de la transaction ${transactionId} (${choiceLabel(attempt.paymentChoice)}) différent du mode de la commande (${choiceLabel(order.paymentChoice)})`
    }
  } else if (usedChoice === 'FACTURE') {
    return `Facture PowerPay utilisée sans avoir été choisie, donc sans supplément (transaction ${transactionId})`
  }
  if (
    remote.currency !== 'CHF' ||
    remote.authorizationAmountCents !== attempt.amountCents ||
    attempt.amountCents !== order.totalCents
  ) {
    return `Montant payé (${remote.authorizationAmountCents === null ? 'inconnu' : formatCHF(remote.authorizationAmountCents)} ${remote.currency ?? ''}) différent de la commande (${formatCHF(order.totalCents)}) pour la transaction ${transactionId}`
  }
  return null
}

export async function syncPaymentTransaction(
  transactionId: bigint | number,
  origin: SyncOrigin
): Promise<SyncResult> {
  const id = BigInt(transactionId)
  const attempt = await prisma.paymentTransaction.findUnique({
    where: { transactionId: id },
    select: {
      id: true,
      state: true,
      amountCents: true,
      paymentChoice: true,
      supersededAt: true,
      order: {
        select: {
          id: true,
          numero: true,
          status: true,
          totalCents: true,
          paymentChoice: true,
        },
      },
    },
  })
  // Transaction d'un autre environnement partageant le même space (ou d'une
  // base locale) : rien à faire ici, et surtout pas une erreur qui ferait
  // désactiver l'écouteur par PostFinance.
  if (!attempt) return { outcome: 'ignoree', detail: 'Transaction inconnue de cette base' }

  const remote = await readTransaction(Number(id))
  const { order } = attempt
  const status = paymentStatusOf(remote.state)
  const usedChoice = choiceOfConfiguration(remote.paymentMethodConfigurationId)
  const invoice = attempt.paymentChoice === 'FACTURE' || usedChoice === 'FACTURE'
  const settled = invoice ? INVOICE_ACCEPTED_STATES.includes(remote.state) : status === 'PAYE'

  const target = { type: AuditTargetType.COMMANDE, id: order.id, label: order.numero }
  const audit = (action: AuditAction, detail: string) =>
    origin === 'admin'
      ? recordAudit(action, target, detail)
      : recordSystemAudit(action, target, detail, 'PostFinance (webhook)')

  // 1. La tentative suit PostFinance, sans jamais revenir sur un état final
  // déjà enregistré (deux notifications peuvent se croiser).
  const updated = await prisma.paymentTransaction.updateMany({
    where: { id: attempt.id, state: { notIn: [...FINAL_TRANSACTION_STATES] } },
    data: {
      state: remote.state,
      ...(remote.paymentMethod ? { paymentMethod: remote.paymentMethod.slice(0, 100) } : {}),
      ...(remote.paymentMethodConfigurationId
        ? { paymentMethodConfigurationId: BigInt(remote.paymentMethodConfigurationId) }
        : {}),
      ...(remote.failureMessage ? { failureReason: remote.failureMessage.slice(0, 300) } : {}),
      ...(remote.authorizedOn ? { authorizedAt: remote.authorizedOn } : {}),
      ...(remote.completedOn ? { completedAt: remote.completedOn } : {}),
      ...(remote.state === 'FULFILL' ? { fulfilledAt: remote.decisionOn ?? new Date() } : {}),
      ...(status === 'ECHOUE' ? { failedAt: remote.failedOn ?? new Date() } : {}),
    },
  })
  // Les traces du journal ne s'écrivent qu'au premier passage dans un état
  const stateChanged = updated.count === 1 && attempt.state !== remote.state
  const ref = { orderId: order.id, numero: order.numero }

  if (settled) {
    if (order.status === OrderStatus.ANNULEE) {
      const detail = `Paiement reçu sur une commande annulée : rembourser le client depuis le back-office PostFinance (transaction ${id})`
      if (stateChanged) await audit(AuditAction.PAIEMENT_ANOMALIE, detail)
      return { outcome: 'anomalie', ...ref, detail }
    }

    // 2. Double vérification : transaction active, mode choisi, montant exact
    const problem = paymentInconsistency(id, attempt, order, remote, usedChoice)
    if (problem) {
      const flagged = await prisma.order.updateMany({
        where: { id: order.id, status: OrderStatus.EN_ATTENTE_PAIEMENT },
        data: { status: OrderStatus.A_VERIFIER },
      })
      if (flagged.count === 1) {
        await audit(AuditAction.PAIEMENT_A_VERIFIER, problem)
        return { outcome: 'a_verifier', ...ref, detail: problem }
      }
      // Commande déjà confirmée par sa transaction active : second paiement à rembourser
      if (stateChanged) await audit(AuditAction.PAIEMENT_ANOMALIE, problem)
      return { outcome: 'anomalie', ...ref, detail: problem }
    }

    if (invoice) return confirmInvoice()
    return confirmPayment()
  }

  if (status === 'ECHOUE') {
    if (invoice) {
      // Refus de solvabilité ou abandon : indiscernables chez PostFinance. La
      // facture est retirée pour cette commande, les autres modes restent.
      await prisma.order.updateMany({
        where: {
          id: order.id,
          status: OrderStatus.EN_ATTENTE_PAIEMENT,
          invoiceAcceptedAt: null,
          invoiceUnavailable: false,
        },
        data: { invoiceUnavailable: true },
      })
    }
    if (stateChanged) {
      await audit(
        AuditAction.PAIEMENT_ECHOUE,
        invoice
          ? `Transaction ${id} : facture PowerPay non aboutie (refus ou abandon), facture retirée pour la commande`
          : `Transaction ${id} : ${remote.failureMessage ?? transactionStateLabel(remote.state)}`
      )
    }
    return { outcome: 'echouee', ...ref, state: remote.state }
  }

  if (status === 'REFUSE') {
    const detail = `PostFinance déconseille la livraison (DECLINE) pour la transaction ${id} : ne pas expédier, vérifier le remboursement dans le back-office PostFinance`
    if (stateChanged) await audit(AuditAction.PAIEMENT_ANOMALIE, detail)
    return { outcome: 'anomalie', ...ref, detail }
  }

  return { outcome: 'en_cours', ...ref, state: remote.state }

  async function confirmInvoice(): Promise<SyncResult> {
    const { count } = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.EN_ATTENTE_PAIEMENT,
        invoiceAcceptedAt: null,
        paidAt: null,
      },
      data: {
        status: OrderStatus.A_TRAITER,
        invoiceAcceptedAt: remote.authorizedOn ?? new Date(),
        paymentMethod: 'Facture (PowerPay)',
      },
    })
    if (count === 1) {
      await audit(
        AuditAction.FACTURE_ACCEPTEE,
        `${formatCHF(order.totalCents)} - solvabilité acceptée par PowerPay - transaction ${id}`
      )
      // Confirmation au client et notification à la cidrerie : seulement maintenant
      await notifyOrderPlaced(order.id)
    }
    // Encaissée à l'expédition : la facture est réglée par MF Group
    if (remote.state === 'FULFILL') {
      await prisma.order.updateMany({
        where: { id: order.id, paidAt: null, invoiceAcceptedAt: { not: null } },
        data: { paidAt: remote.completedOn ?? remote.decisionOn ?? new Date() },
      })
    }
    return { outcome: 'acceptee', ...ref, newlyAccepted: count === 1 }
  }

  async function confirmPayment(): Promise<SyncResult> {
    const paymentMethod = remote.paymentMethod
      ? `Paiement en ligne (${remote.paymentMethod.slice(0, 60)})`
      : 'Paiement en ligne'
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: OrderStatus.EN_ATTENTE_PAIEMENT, paidAt: null },
      data: {
        status: OrderStatus.A_TRAITER,
        paidAt: remote.completedOn ?? remote.decisionOn ?? new Date(),
        paymentMethod,
      },
    })

    if (count === 1) {
      await audit(
        AuditAction.PAIEMENT_CONFIRME,
        `${formatCHF(order.totalCents)} - ${paymentMethod} - transaction ${id}`
      )
      // Confirmation au client et notification à la cidrerie : seulement maintenant
      await notifyOrderPlaced(order.id)
      return { outcome: 'payee', ...ref, newlyPaid: true }
    }

    // Déjà payée : rejeu de la même notification, ou second paiement réussi
    // pour la même commande (deux onglets ouverts, par exemple).
    const otherPaid = await prisma.paymentTransaction.count({
      where: { orderId: order.id, id: { not: attempt!.id }, state: 'FULFILL' },
    })
    if (otherPaid > 0) {
      const detail = `Second paiement reçu pour une commande déjà payée : rembourser la transaction ${id} depuis le back-office PostFinance`
      if (stateChanged) await audit(AuditAction.PAIEMENT_ANOMALIE, detail)
      return { outcome: 'anomalie', ...ref, detail }
    }
    return { outcome: 'payee', ...ref, newlyPaid: false }
  }
}

export type AcceptPaymentResult = { ok: true; message: string } | { ok: false; error: string }

/**
 * Décision de l'exploitant sur une commande « à vérifier » : il accepte le
 * paiement reçu, après contrôle dans PostFinance. Le paiement doit exister et
 * porter sur le montant exact de la commande. Sinon, la seule issue est
 * d'annuler la commande et de rembourser le client.
 */
export async function acceptPaymentToVerify(orderId: string): Promise<AcceptPaymentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      numero: true,
      status: true,
      totalCents: true,
      paymentChoice: true,
      paymentTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, transactionId: true, state: true, paymentChoice: true },
      },
    },
  })
  if (!order) return { ok: false, error: 'Commande introuvable' }
  if (order.status !== OrderStatus.A_VERIFIER) {
    return { ok: false, error: "Cette commande n'est pas à vérifier." }
  }

  for (const attempt of order.paymentTransactions) {
    const remote = await readTransaction(Number(attempt.transactionId))
    const usedChoice = choiceOfConfiguration(remote.paymentMethodConfigurationId)
    const invoice = attempt.paymentChoice === 'FACTURE' || usedChoice === 'FACTURE'
    const settled = invoice
      ? INVOICE_ACCEPTED_STATES.includes(remote.state)
      : remote.state === 'FULFILL'
    if (
      !settled ||
      remote.currency !== 'CHF' ||
      remote.authorizationAmountCents !== order.totalCents
    ) {
      continue
    }

    const paymentMethod = invoice
      ? 'Facture (PowerPay)'
      : remote.paymentMethod
        ? `Paiement en ligne (${remote.paymentMethod.slice(0, 60)})`
        : 'Paiement en ligne'
    const accepted = await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.A_VERIFIER },
        data: {
          status: OrderStatus.A_TRAITER,
          paymentMethod,
          paymentChoice: usedChoice ?? attempt.paymentChoice ?? order.paymentChoice,
          ...(invoice
            ? {
                invoiceAcceptedAt: remote.authorizedOn ?? new Date(),
                ...(remote.state === 'FULFILL'
                  ? { paidAt: remote.completedOn ?? remote.decisionOn ?? new Date() }
                  : {}),
              }
            : { paidAt: remote.completedOn ?? remote.decisionOn ?? new Date() }),
        },
      })
      if (count === 0) return false
      // Le paiement accepté devient la transaction active de la commande
      await tx.paymentTransaction.updateMany({
        where: { orderId: order.id, id: { not: attempt.id }, supersededAt: null },
        data: { supersededAt: new Date() },
      })
      await tx.paymentTransaction.update({
        where: { id: attempt.id },
        data: { supersededAt: null, state: remote.state },
      })
      return true
    })
    if (!accepted) return { ok: false, error: 'Cette commande a déjà été traitée.' }

    await recordAudit(
      invoice ? AuditAction.FACTURE_ACCEPTEE : AuditAction.PAIEMENT_CONFIRME,
      { type: AuditTargetType.COMMANDE, id: order.id, label: order.numero },
      `Accepté après vérification - ${formatCHF(order.totalCents)} - ${paymentMethod} - transaction ${attempt.transactionId}`
    )
    await notifyOrderPlaced(order.id)
    return {
      ok: true,
      message: 'Paiement accepté : commande passée « À traiter », emails envoyés.',
    }
  }

  return {
    ok: false,
    error:
      'Aucun paiement au montant exact de la commande chez PostFinance : annulez la commande et remboursez le client depuis le back-office PostFinance.',
  }
}
