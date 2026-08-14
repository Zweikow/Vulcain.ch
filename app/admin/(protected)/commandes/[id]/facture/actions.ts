'use server'

import { revalidatePath } from 'next/cache'
import { AuditAction, ClientType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { issueInvoice } from '@/lib/invoices'
import { recordAudit } from '@/lib/audit'
import { proUnitPriceCents, shippingCentsFor, orderVatCents } from '@/lib/money'

/**
 * Émet la facture : lui attribue son numéro de série FAC. Geste volontaire —
 * une fois émise, la facture est un document comptable dont le numéro est figé.
 */
export async function issueInvoiceForOrder(orderId: string) {
  const session = await auth()
  if (!session) return

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { numero: true, invoiceNumber: true },
  })
  const invoiceNumber = await issueInvoice(orderId)
  if (order && invoiceNumber && !order.invoiceNumber) {
    await recordAudit(AuditAction.FACTURE_EMISE, { id: orderId, ...order }, invoiceNumber)
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
  const session = await auth()
  if (!session) return

  const settings = await getSettings()

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) return

    const isPro = order.clientType !== ClientType.PRO

    let subtotalCents = 0
    let discountCents = 0
    for (const item of order.items) {
      const unitPriceCents = isPro
        ? proUnitPriceCents(item.listPriceCents, settings.proRatePercent)
        : item.listPriceCents
      subtotalCents += unitPriceCents * item.quantity
      discountCents += (item.listPriceCents - unitPriceCents) * item.quantity
      await tx.orderItem.update({ where: { id: item.id }, data: { unitPriceCents } })
    }

    const shippingCents = shippingCentsFor(subtotalCents, isPro, settings)
    const totalCents = subtotalCents + shippingCents

    await tx.order.update({
      where: { id: orderId },
      data: {
        clientType: isPro ? ClientType.PRO : ClientType.PRIVE,
        subtotalCents,
        discountCents,
        shippingCents,
        totalCents,
        vatCents: orderVatCents(totalCents, settings),
      },
    })

    if (order.customerId) {
      await tx.customer.update({ where: { id: order.customerId }, data: { isPro } })
    }
  })

  const after = await prisma.order.findUnique({
    where: { id: orderId },
    select: { numero: true, clientType: true },
  })
  if (after) {
    await recordAudit(
      AuditAction.TARIF_BASCULE,
      { id: orderId, numero: after.numero },
      after.clientType === ClientType.PRO
        ? 'Particulier → Professionnel'
        : 'Professionnel → Particulier'
    )
  }

  revalidatePath(`/admin/commandes/${orderId}/facture`)
  revalidatePath(`/admin/commandes/${orderId}`)
  revalidatePath('/admin/preparation')
  revalidatePath('/admin')
}
