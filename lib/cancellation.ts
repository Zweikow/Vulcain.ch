import { OrderStatus, StockMovementReason } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type CancelResult =
  { ok: true; stockRestored: boolean; creditNoteNeeded: boolean } | { ok: false; error: string }

/**
 * Annule une commande. Une commande n'est jamais supprimée par cette voie : son
 * numéro a déjà été communiqué au client par email, et une facture émise ne peut
 * pas disparaître d'une comptabilité. Elle change simplement d'état et sort des
 * écrans de travail et des statistiques.
 *
 * Le stock n'est rendu que si la commande n'est pas partie : sur une commande
 * expédiée, les bouteilles sont physiquement chez le client, et le stock ne
 * remontera qu'au retour effectif de la marchandise — à saisir à la main.
 */
export async function cancelOrder(orderId: string, reason: string): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) return { ok: false as const, error: 'Commande introuvable' }
    if (order.status === OrderStatus.ANNULEE) {
      return { ok: false as const, error: 'Cette commande est déjà annulée' }
    }

    const stockRestored = order.status !== OrderStatus.EXPEDIEE

    if (stockRestored) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
      await tx.stockMovement.createMany({
        data: order.items.map((item) => ({
          productId: item.productId,
          orderId: order.id,
          delta: item.quantity,
          reason: StockMovementReason.ANNULATION,
        })),
      })
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.ANNULEE,
        cancelledAt: new Date(),
        cancelReason: reason.trim() || null,
      },
    })

    return {
      ok: true as const,
      stockRestored,
      // Une facture émise reste due tant qu'un avoir ne l'annule pas.
      creditNoteNeeded: order.invoiceNumber !== null,
    }
  })
}

/**
 * Suppression définitive — réservée aux commandes annulées qui n'ont jamais été
 * facturées, typiquement les essais. Une facture émise interdit la suppression :
 * elle laisserait un trou dans la série comptable.
 */
export async function deleteOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, invoiceNumber: true },
  })
  if (!order) return { ok: false, error: 'Commande introuvable' }
  if (order.invoiceNumber) {
    return {
      ok: false,
      error: 'Une commande facturée ne peut pas être supprimée, seulement annulée',
    }
  }
  if (order.status !== OrderStatus.ANNULEE) {
    return { ok: false, error: 'Annulez la commande avant de la supprimer' }
  }

  await prisma.$transaction(async (tx) => {
    // Les mouvements de stock perdent leur commande de rattachement mais restent
    // dans l'historique : le stock a réellement bougé, la trace doit subsister.
    await tx.stockMovement.updateMany({ where: { orderId }, data: { orderId: null } })
    await tx.order.delete({ where: { id: orderId } })
  })
  return { ok: true }
}
