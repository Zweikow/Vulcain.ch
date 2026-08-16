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

function revalidate(orderId?: string) {
  if (orderId) revalidatePath(`/admin/commandes/${orderId}`)
  revalidatePath('/admin/commandes')
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
