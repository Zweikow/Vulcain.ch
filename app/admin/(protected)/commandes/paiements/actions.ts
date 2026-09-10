'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { recordAudit } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { sendPaymentReminderNotification } from '@/lib/notifications'

function revalidateOrder(orderId: string) {
  revalidatePath(`/admin/commandes/${orderId}`)
  revalidatePath(`/admin/commandes/${orderId}/facture`)
  revalidatePath('/admin/commandes')
  revalidatePath('/admin/clients')
  revalidatePath('/admin')
}

/** Enregistrer l'encaissement d'une facture. */
export async function markOrderAsPaidAction(
  orderId: string,
  paymentMethod: string,
  paidAtDate?: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageInvoices)
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    const paidAt = paidAtDate ? new Date(paidAtDate) : new Date()
    const method = paymentMethod?.trim() || 'Virement bancaire'

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paidAt,
        paymentMethod: method,
      },
      select: {
        id: true,
        numero: true,
        invoiceNumber: true,
      },
    })

    await recordAudit(
      AuditAction.STATUT_MODIFIE,
      {
        type: 'COMMANDE',
        id: order.id,
        label: order.invoiceNumber ? `Facture ${order.invoiceNumber}` : order.numero,
      },
      `Facture marquée payée le ${paidAt.toLocaleDateString('fr-CH')} via ${method}`
    )

    revalidateOrder(orderId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de l'enregistrement du paiement" }
  }
}

/** Annuler l'encaissement (remettre la facture en attente de paiement). */
export async function markOrderAsUnpaidAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageInvoices)
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paidAt: null,
        paymentMethod: null,
      },
      select: {
        id: true,
        numero: true,
        invoiceNumber: true,
      },
    })

    await recordAudit(
      AuditAction.STATUT_MODIFIE,
      {
        type: 'COMMANDE',
        id: order.id,
        label: order.invoiceNumber ? `Facture ${order.invoiceNumber}` : order.numero,
      },
      'Encaissement annulé — facture remise en attente de paiement'
    )

    revalidateOrder(orderId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de l'annulation du paiement" }
  }
}

/** Envoyer un rappel de paiement courtois au client. */
export async function sendPaymentReminderAction(
  orderId: string,
  customNote?: string
): Promise<{ success: boolean; reminderCount?: number; error?: string }> {
  const guard = await assertCapability(can.manageInvoices)
  if (!guard.ok) return { success: false, error: guard.error }

  const result = await sendPaymentReminderNotification(orderId, customNote)

  if (result.success) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { numero: true, invoiceNumber: true },
    })
    if (order) {
      await recordAudit(
        AuditAction.STATUT_MODIFIE,
        {
          type: 'COMMANDE',
          id: orderId,
          label: order.invoiceNumber ? `Facture ${order.invoiceNumber}` : order.numero,
        },
        `Rappel de paiement n°${result.reminderCount || 1} envoyé au client${
          customNote ? ` (avec note personnalisée)` : ''
        }`
      )
    }
    revalidateOrder(orderId)
  }

  return result
}
