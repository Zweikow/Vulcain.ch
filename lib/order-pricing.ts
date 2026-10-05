import { ClientType, AuditAction, AuditTargetType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { proUnitPriceCents, shippingCentsFor, orderVatCents } from '@/lib/money'
import { recordAudit } from '@/lib/audit'

export interface RecalculateOrderPricingOptions {
  targetType: ClientType
  proRatePercent?: number | null // Si précisé, prévaut sur le taux client/global
  updateCustomer?: boolean // Met à jour customer.isPro (défaut: true)
  tx?: Prisma.TransactionClient
}

/**
 * Recalcule intégralement les prix d'une commande :
 * - Prix unitaire de chaque ligne depuis son listPriceCents figé à la commande
 * - Remise professionnelle (si PRO)
 * - Frais de port (offerts aux PROs, calculés selon franco si PRIVE)
 * - Sous-total, total TTC et TVA
 * - Synchronisation éventuelle de la fiche client
 * - Enregistrement de l'audit TARIF_BASCULE
 */
export async function recalculateOrderPricing(
  orderId: string,
  options: RecalculateOrderPricingOptions
) {
  const execute = async (db: Prisma.TransactionClient) => {
    const settings = await getSettings()

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            isPro: true,
            proRatePercent: true,
            customerNumber: true,
          },
        },
      },
    })

    if (!order) {
      throw new Error(`Commande introuvable : ${orderId}`)
    }

    const isPro = options.targetType === ClientType.PRO
    const effectiveProRate = isPro
      ? options.proRatePercent !== undefined && options.proRatePercent !== null
        ? options.proRatePercent
        : (order.customer?.proRatePercent ?? settings.proRatePercent)
      : null

    let subtotalCents = 0
    let discountCents = 0

    for (const item of order.items) {
      let unitPriceCents: number

      // Si l'article était un cadeau promotionnel gratuit, on conserve son prix nul
      if (item.unitPriceCents === 0 && item.productName.toLowerCase().includes('offert')) {
        unitPriceCents = 0
      } else if (isPro && effectiveProRate !== null) {
        unitPriceCents = proUnitPriceCents(item.listPriceCents, effectiveProRate)
      } else {
        unitPriceCents = item.listPriceCents
      }

      subtotalCents += unitPriceCents * item.quantity
      discountCents += (item.listPriceCents - unitPriceCents) * item.quantity

      await db.orderItem.update({
        where: { id: item.id },
        data: { unitPriceCents },
      })
    }

    const shippingCents = shippingCentsFor(subtotalCents, isPro, settings)
    const totalCents = subtotalCents + shippingCents
    const vatCents = orderVatCents(totalCents, settings)

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        clientType: isPro ? ClientType.PRO : ClientType.PRIVE,
        proRatePercent: effectiveProRate,
        subtotalCents,
        discountCents,
        shippingCents,
        totalCents,
        vatCents,
      },
      include: { items: true },
    })

    if (options.updateCustomer !== false && order.customerId) {
      await db.customer.update({
        where: { id: order.customerId },
        data: {
          isPro,
          ...(isPro && options.proRatePercent !== undefined
            ? { proRatePercent: options.proRatePercent }
            : {}),
        },
      })
    }

    await recordAudit(
      AuditAction.TARIF_BASCULE,
      {
        type: AuditTargetType.COMMANDE,
        id: orderId,
        label: order.numero,
      },
      isPro
        ? `Particulier → Professionnel (-${effectiveProRate}%, port offert)`
        : `Professionnel → Particulier (prix catalogue)`,
      db
    )

    return updatedOrder
  }

  if (options.tx) {
    return execute(options.tx)
  }

  return prisma.$transaction(async (tx) => {
    return execute(tx)
  })
}
