'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { recordAudit } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { sendPaymentReminderNotification } from '@/lib/notifications'
import { parseCamtXml, analyzeCamtTransactions, CamtAnalysisResult } from '@/lib/camt'

function revalidateOrder(orderId: string) {
  revalidatePath(`/admin/commandes/${orderId}`)
  revalidatePath(`/admin/commandes/${orderId}/facture`)
  revalidatePath('/admin/commandes')
  revalidatePath('/admin/factures')
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

/**
 * Analyse un fichier bancaire CAMT.054 ou CAMT.053 et propose le rapprochement
 * avec les commandes existantes dans la base.
 */
export async function analyzeCamtFileAction(
  xmlContent: string,
  fileName?: string
): Promise<{ success: boolean; data?: CamtAnalysisResult; error?: string }> {
  const guard = await assertCapability(can.manageInvoices)
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    if (!xmlContent || !xmlContent.trim()) {
      return { success: false, error: 'Le fichier XML fourni est vide.' }
    }

    const transactions = parseCamtXml(xmlContent)
    if (transactions.length === 0) {
      return {
        success: false,
        error: "Aucune transaction n'a été trouvée dans le fichier CAMT fourni.",
      }
    }

    const analysis = await analyzeCamtTransactions(transactions, fileName)
    return { success: true, data: analysis }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erreur lors de l'analyse du fichier CAMT.",
    }
  }
}

/**
 * Applique le rapprochement bancaire automatique pour un ensemble de commandes validées.
 */
export async function applyCamtReconciliationAction(
  itemsToReconcile: {
    orderId: string
    paidAtDate: string
    paymentMethod?: string
    transactionRef?: string
  }[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  const guard = await assertCapability(can.manageInvoices)
  if (!guard.ok) return { success: false, error: guard.error }

  if (!itemsToReconcile || itemsToReconcile.length === 0) {
    return { success: false, error: 'Aucune commande sélectionnée pour le rapprochement.' }
  }

  try {
    let reconciledCount = 0

    for (const item of itemsToReconcile) {
      const paidAt = item.paidAtDate ? new Date(item.paidAtDate) : new Date()
      const method = item.paymentMethod || 'Virement bancaire (CAMT.054)'

      const order = await prisma.order.update({
        where: { id: item.orderId },
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

      const refNote = item.transactionRef ? ` (Réf: ${item.transactionRef})` : ''
      await recordAudit(
        AuditAction.STATUT_MODIFIE,
        {
          type: 'COMMANDE',
          id: order.id,
          label: order.invoiceNumber ? `Facture ${order.invoiceNumber}` : order.numero,
        },
        `Rapprochement bancaire automatique CAMT : facture marquée payée le ${paidAt.toLocaleDateString(
          'fr-CH'
        )} via ${method}${refNote}`
      )

      revalidateOrder(item.orderId)
      reconciledCount++
    }

    return { success: true, count: reconciledCount }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erreur lors de la validation du rapprochement.',
    }
  }
}
