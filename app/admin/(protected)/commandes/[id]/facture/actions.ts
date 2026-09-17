'use server'

import { revalidatePath } from 'next/cache'
import { AuditAction, ClientType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { issueInvoice } from '@/lib/invoices'
import { recordAudit } from '@/lib/audit'
import { recalculateOrderPricing } from '@/lib/order-pricing'

/**
 * Émet la facture : lui attribue son numéro de série FAC. Geste volontaire —
 * une fois émise, la facture est un document comptable dont le numéro est figé.
 */
export async function issueInvoiceForOrder(orderId: string) {
  const guard = await assertCapability(can.manageInvoices)
  if (!guard.ok) return

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { numero: true, invoiceNumber: true },
  })
  const invoiceNumber = await issueInvoice(orderId)
  if (order && invoiceNumber && !order.invoiceNumber) {
    await recordAudit(
      AuditAction.FACTURE_EMISE,
      { type: 'COMMANDE', id: orderId, label: order.numero },
      invoiceNumber
    )
  }

  revalidatePath(`/admin/commandes/${orderId}/facture`)
  revalidatePath(`/admin/commandes/${orderId}`)
  revalidatePath('/admin/commandes')
}

/**
 * Bascule privé / professionnel depuis la facture — un rattrapage, pas le mode
 * nominal (DESIGN.md §2). Les lignes sont recalculées depuis le prix public figé
 * à la commande, jamais depuis le prix appliqué : rebasculer deux fois retombe
 * exactement sur les montants d'origine.
 *
 * Le statut est aussi porté sur la fiche client, puisque le tarif pro lui
 * appartient et doit se réappliquer aux commandes suivantes.
 */
export async function toggleClientType(orderId: string) {
  const guard = await assertCapability(can.seeFinancials)
  if (!guard.ok) return

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { clientType: true },
  })
  if (!order) return

  const targetType = order.clientType === ClientType.PRO ? ClientType.PRIVE : ClientType.PRO
  await recalculateOrderPricing(orderId, { targetType, updateCustomer: true })

  revalidatePath(`/admin/commandes/${orderId}/facture`)
  revalidatePath(`/admin/commandes/${orderId}`)
  revalidatePath('/admin/commandes')
  revalidatePath('/admin/factures')
  revalidatePath('/admin/preparation')
  revalidatePath('/admin')
}
