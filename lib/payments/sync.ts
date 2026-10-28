import 'server-only'
import { AuditAction, AuditTargetType, OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { recordAudit, recordSystemAudit } from '@/lib/audit'
import { notifyOrderPlaced } from '@/lib/notifications'
import { readTransaction } from '@/lib/payments/postfinance'
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
 * passe « payée » qu'une fois (mise à jour conditionnelle sur paidAt nul), et
 * les emails de confirmation ne partent qu'à ce moment-là.
 */

export type SyncOrigin = 'webhook' | 'admin'

export type SyncResult =
  | { outcome: 'ignoree'; detail: string }
  | { outcome: 'payee'; orderId: string; numero: string; newlyPaid: boolean }
  | { outcome: 'en_cours' | 'echouee'; orderId: string; numero: string; state: string }
  | { outcome: 'anomalie'; orderId: string; numero: string; detail: string }

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
      order: { select: { id: true, numero: true, status: true, totalCents: true } },
    },
  })
  // Transaction d'un autre environnement partageant le même space (ou d'une
  // base locale) : rien à faire ici, et surtout pas une erreur qui ferait
  // désactiver l'écouteur par PostFinance.
  if (!attempt) return { outcome: 'ignoree', detail: 'Transaction inconnue de cette base' }

  const remote = await readTransaction(Number(id))
  const { order } = attempt
  const status = paymentStatusOf(remote.state)

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

  if (status === 'PAYE') {
    if (
      remote.currency !== 'CHF' ||
      remote.authorizationAmountCents !== attempt.amountCents ||
      attempt.amountCents !== order.totalCents
    ) {
      const detail = `Montant payé (${remote.authorizationAmountCents === null ? 'inconnu' : formatCHF(remote.authorizationAmountCents)} ${remote.currency ?? ''}) différent de la commande (${formatCHF(order.totalCents)}) : commande non validée, à vérifier dans PostFinance (transaction ${id})`
      if (stateChanged) await audit(AuditAction.PAIEMENT_ANOMALIE, detail)
      return { outcome: 'anomalie', ...ref, detail }
    }

    if (order.status === OrderStatus.ANNULEE) {
      const detail = `Paiement reçu sur une commande annulée : rembourser le client depuis le back-office PostFinance (transaction ${id})`
      if (stateChanged) await audit(AuditAction.PAIEMENT_ANOMALIE, detail)
      return { outcome: 'anomalie', ...ref, detail }
    }

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
      where: { orderId: order.id, id: { not: attempt.id }, state: 'FULFILL' },
    })
    if (otherPaid > 0) {
      const detail = `Second paiement reçu pour une commande déjà payée : rembourser la transaction ${id} depuis le back-office PostFinance`
      if (stateChanged) await audit(AuditAction.PAIEMENT_ANOMALIE, detail)
      return { outcome: 'anomalie', ...ref, detail }
    }
    return { outcome: 'payee', ...ref, newlyPaid: false }
  }

  if (status === 'ECHOUE') {
    if (stateChanged) {
      await audit(
        AuditAction.PAIEMENT_ECHOUE,
        `Transaction ${id} : ${remote.failureMessage ?? transactionStateLabel(remote.state)}`
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
}
