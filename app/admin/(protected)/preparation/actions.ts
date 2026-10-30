'use server'

import { revalidatePath } from 'next/cache'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { issueInvoice } from '@/lib/invoices'
import { notifyOrderShipped, sendInvoiceEmail } from '@/lib/notifications'
import { recordAudit } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { completeInvoiceBeforeShipping } from '@/lib/payments/completion'

// Flux à trois statuts : À traiter → En préparation → Expédiée (DESIGN.md §3).
export async function advanceStatus(orderId: string): Promise<{ error?: string } | void> {
  const session = await auth()
  if (!session) return

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  // En attente de paiement en ligne : seul le webhook PostFinance la fait avancer.
  // À vérifier : l'exploitant tranche depuis la fiche commande, jamais en un clic ici.
  if (
    !order ||
    order.status === OrderStatus.EXPEDIEE ||
    order.status === OrderStatus.EN_ATTENTE_PAIEMENT ||
    order.status === OrderStatus.A_VERIFIER
  )
    return

  const shipping = order.status === OrderStatus.EN_PREPARATION

  // Facture PowerPay : l'encaissement précède l'expédition, et peut la bloquer
  if (shipping) {
    const completion = await completeInvoiceBeforeShipping(orderId)
    if (!completion.ok) return { error: completion.error }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: shipping
      ? { status: OrderStatus.EXPEDIEE, shippedAt: new Date() }
      : { status: OrderStatus.EN_PREPARATION },
  })

  // Aucune commande ne part sans facture : émission automatique si l'exploitant
  // ne l'a pas déclenchée depuis l'écran facture (idempotent). L'avis part
  // ensuite, pour qu'il porte le numéro de facture et sa référence de paiement.
  await recordAudit(
    AuditAction.STATUT_MODIFIE,
    { type: 'COMMANDE', id: order.id, label: order.numero },
    shipping ? 'En préparation → Expédiée' : 'À traiter → En préparation'
  )

  if (shipping) {
    const invoiceNumber = await issueInvoice(orderId)
    if (invoiceNumber && !order.invoiceNumber) {
      await recordAudit(
        AuditAction.FACTURE_EMISE,
        { type: 'COMMANDE', id: order.id, label: order.numero },
        invoiceNumber
      )
    }
    await notifyOrderShipped(orderId)
    await sendInvoiceEmail(orderId)
  }
  revalidatePath('/admin/preparation')
  revalidatePath('/admin/factures')
  revalidatePath('/admin')
}
