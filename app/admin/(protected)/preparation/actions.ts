'use server'

import { revalidatePath } from 'next/cache'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { issueInvoice } from '@/lib/invoices'
import { notifyOrderShipped } from '@/lib/notifications'
import { recordAudit } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

// Flux à trois statuts : À traiter → En préparation → Expédiée (DESIGN.md §3).
export async function advanceStatus(orderId: string) {
  const session = await auth()
  if (!session) return

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.status === OrderStatus.EXPEDIEE) return

  const shipping = order.status === OrderStatus.EN_PREPARATION

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
    order,
    shipping ? 'En préparation → Expédiée' : 'À traiter → En préparation'
  )

  if (shipping) {
    const invoiceNumber = await issueInvoice(orderId)
    if (invoiceNumber && !order.invoiceNumber) {
      await recordAudit(AuditAction.FACTURE_EMISE, order, invoiceNumber)
    }
    await notifyOrderShipped(orderId)
  }
  revalidatePath('/admin/preparation')
  revalidatePath('/admin')
}
