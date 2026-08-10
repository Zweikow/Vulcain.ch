'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { cancelOrder, deleteOrder } from '@/lib/cancellation'
import { notifyOrderCancelled } from '@/lib/notifications'

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
  const session = await auth()
  if (!session) return { error: 'Non autorisé' }

  const result = await cancelOrder(orderId, reason)
  if (!result.ok) return { error: result.error }

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
  const session = await auth()
  if (!session) return { error: 'Non autorisé' }

  const result = await deleteOrder(orderId)
  if (!result.ok) return { error: result.error }

  revalidate()
  redirect('/admin/commandes')
}
