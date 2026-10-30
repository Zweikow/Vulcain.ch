'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AuditAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { cancelOrder, deleteOrder } from '@/lib/cancellation'
import { notifyOrderCancelled } from '@/lib/notifications'
import { recordAudit } from '@/lib/audit'
import { acceptPaymentToVerify, syncPaymentTransaction, type SyncResult } from '@/lib/payments/sync'
import { describePostFinanceError } from '@/lib/payments/postfinance'
import { isFinalTransactionState, transactionStateLabel } from '@/lib/payments/states'

function revalidate(orderId?: string) {
  if (orderId) revalidatePath(`/admin/commandes/${orderId}`)
  revalidatePath('/admin/commandes')
  revalidatePath('/admin/factures')
  revalidatePath('/admin/preparation')
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function cancelOrderAction(
  orderId: string,
  reason: string,
  notifyCustomer: boolean
): Promise<{ error?: string; message?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { error: guard.error }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { numero: true },
  })

  const result = await cancelOrder(orderId, reason)
  if (!result.ok) return { error: result.error }

  if (order) {
    await recordAudit(
      AuditAction.COMMANDE_ANNULEE,
      { type: 'COMMANDE', id: orderId, label: order.numero },
      reason.trim() || undefined
    )
  }

  if (notifyCustomer) await notifyOrderCancelled(orderId)

  revalidate(orderId)

  const notes = [
    result.stockRestored ? 'stock rendu' : 'stock non rendu (commande déjà expédiée)',
    result.creditNoteNeeded ? 'un avoir reste à établir' : null,
    result.refundNeeded ? 'remboursement à faire dans le back-office PostFinance' : null,
    result.voidNeeded ? 'autorisation PowerPay à annuler dans le back-office PostFinance' : null,
    notifyCustomer ? 'client prévenu par email' : null,
  ].filter(Boolean)

  return { message: `Commande annulée — ${notes.join(', ')}.` }
}

export async function deleteOrderAction(orderId: string): Promise<{ error?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { error: guard.error }

  // Le numéro est lu avant la suppression : c'est tout ce qui restera au journal.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { numero: true },
  })

  const result = await deleteOrder(orderId)
  if (!result.ok) return { error: result.error }

  if (order) {
    await recordAudit(AuditAction.COMMANDE_SUPPRIMEE, {
      type: 'COMMANDE',
      id: null,
      label: order.numero,
    })
  }

  revalidate()
  redirect('/admin/commandes')
}

export async function sendInvoiceEmailAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { success: false, error: guard.error }

  const result = await (await import('@/lib/notifications')).sendInvoiceEmail(orderId)
  if (result.success) revalidate(orderId)
  return result
}

export async function resendConfirmationAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { success: false, error: guard.error }

  const result = await (await import('@/lib/notifications')).resendOrderConfirmation(orderId)
  if (result.success) revalidate(orderId)
  return result
}

export async function resendShippingNoticeAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { success: false, error: guard.error }

  const result = await (await import('@/lib/notifications')).resendShippingNotice(orderId)
  if (result.success) revalidate(orderId)
  return result
}

export async function updateTrackingAction(
  orderId: string,
  trackingNumber: string,
  carrier: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: trackingNumber.trim() || null,
        carrier: carrier.trim() || 'DPD',
      },
    })
    revalidate(orderId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la mise à jour' }
  }
}

export async function updatePickupAction(
  orderId: string,
  isPickup: boolean
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { isPickup },
    })
    revalidate(orderId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la mise à jour' }
  }
}

export async function updateDeliveryDateAction(
  orderId: string,
  deliveryDate: string | null
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    const parsedDate = deliveryDate ? new Date(deliveryDate) : null
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryDate: parsedDate },
    })
    revalidate(orderId)
    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erreur lors de la mise à jour de la date de livraison',
    }
  }
}

export async function toggleOrderProAction(
  orderId: string
): Promise<{ success: boolean; error?: string; isPro?: boolean }> {
  const guard = await assertCapability((role) => can.manageOrders(role) || can.seeFinancials(role))
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    const { recalculateOrderPricing } = await import('@/lib/order-pricing')
    const { ClientType } = await import('@prisma/client')

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { clientType: true },
    })
    if (!order) return { success: false, error: 'Commande introuvable' }

    const targetType = order.clientType === ClientType.PRO ? ClientType.PRIVE : ClientType.PRO
    await recalculateOrderPricing(orderId, { targetType, updateCustomer: true })

    revalidate(orderId)
    revalidatePath(`/admin/commandes/${orderId}/facture`)

    return { success: true, isPro: targetType === ClientType.PRO }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors du recalcul' }
  }
}

function syncMessage(result: SyncResult): string {
  switch (result.outcome) {
    case 'payee':
      return result.newlyPaid
        ? 'Paiement confirmé par PostFinance : commande passée « À traiter », emails envoyés.'
        : 'Paiement déjà enregistré.'
    case 'acceptee':
      return result.newlyAccepted
        ? 'Facture PowerPay acceptée : commande passée « À traiter », emails envoyés.'
        : 'Acceptation sur facture déjà enregistrée.'
    case 'anomalie':
      return `À vérifier : ${result.detail}`
    case 'a_verifier':
      return `Commande passée « À vérifier » : ${result.detail}`
    case 'echouee':
      return `Dernière tentative ${transactionStateLabel(result.state).toLowerCase()} : le client peut réessayer depuis son lien de paiement.`
    case 'en_cours':
      return `Paiement encore en cours chez PostFinance (${transactionStateLabel(result.state).toLowerCase()}).`
    default:
      return result.detail
  }
}

/** Décision sur une commande « à vérifier » : accepter le paiement reçu. */
export async function acceptPaymentToVerifyAction(
  orderId: string
): Promise<{ error?: string; message?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { error: guard.error }
  try {
    const result = await acceptPaymentToVerify(orderId)
    if (!result.ok) return { error: result.error }
    revalidate(orderId)
    return { message: result.message }
  } catch (error) {
    return { error: `PostFinance injoignable : ${await describePostFinanceError(error)}` }
  }
}

/**
 * Secours si un webhook manque (écouteur désactivé, panne) : relit chez
 * PostFinance les tentatives non terminées de la commande, par le même chemin
 * de code que le webhook. Chaque passage est tracé au journal à votre nom.
 */
export async function verifyOnlinePaymentAction(
  orderId: string
): Promise<{ error?: string; message?: string }> {
  const guard = await assertCapability(can.manageOrders)
  if (!guard.ok) return { error: guard.error }

  const attempts = await prisma.paymentTransaction.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { transactionId: true, state: true },
  })
  if (attempts.length === 0) {
    return { error: 'Aucune transaction PostFinance pour cette commande.' }
  }
  const open = attempts.filter((a) => !isFinalTransactionState(a.state))
  const targets = open.length > 0 ? open : [attempts[0]]

  try {
    const results: SyncResult[] = []
    for (const attempt of targets) {
      results.push(await syncPaymentTransaction(attempt.transactionId, 'admin'))
    }
    revalidate(orderId)
    const decisive =
      results.find((r) => r.outcome === 'payee' && r.newlyPaid) ??
      results.find((r) => r.outcome === 'acceptee' && r.newlyAccepted) ??
      results.find((r) => r.outcome === 'a_verifier') ??
      results.find((r) => r.outcome === 'anomalie') ??
      results[0]
    return { message: syncMessage(decisive) }
  } catch (error) {
    return { error: `PostFinance injoignable : ${await describePostFinanceError(error)}` }
  }
}
