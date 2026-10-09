'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { nextNumber, SERIES } from '@/lib/numbering'
import { getSettings } from '@/lib/settings'
import { shippingCentsFor, orderVatCents, formatCHF } from '@/lib/money'
import { recordAudit } from '@/lib/audit'
import { notifyOrderPlaced } from '@/lib/notifications'
import { AuditAction, ClientType, OrderStatus, StockMovementReason } from '@prisma/client'

export interface CreateManualOrderInput {
  customer: {
    id?: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    address: string
    npa: string
    city: string
    isPro: boolean
  }
  items: Array<{
    productId: string
    productName?: string
    quantity: number
    unitPriceCents: number
  }>
  shippingOption: 'STANDARD' | 'RETRAIT' | 'CUSTOM'
  customShippingCents?: number
  status: OrderStatus
  deliveryDate?: string
  message?: string
  notifyCustomer: boolean
  allowNegativeStock: boolean
}

export async function createManualOrder(input: CreateManualOrderInput) {
  const user = await requireCapability(can.manageOrders)
  const settings = await getSettings()

  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'Veuillez ajouter au moins un produit.' }
  }

  if (!input.customer.firstName || !input.customer.lastName || !input.customer.email) {
    return { success: false, error: 'Les coordonnées du client sont incomplètes.' }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. Client : création ou mise à jour de la fiche
      const isPro = input.customer.isPro
      const customer = await tx.customer.upsert({
        where: { email: input.customer.email },
        update: {
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          phone: input.customer.phone || null,
          address: input.customer.address,
          npa: input.customer.npa,
          city: input.customer.city,
          isPro,
        },
        create: {
          email: input.customer.email,
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          phone: input.customer.phone || null,
          address: input.customer.address,
          npa: input.customer.npa,
          city: input.customer.city,
          isPro,
        },
      })

      // 2. Produits et calculs
      const productIds = input.items.map((i) => i.productId)
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          priceCents: true,
          purchasePriceCents: true,
          stock: true,
          bottlesPerUnit: true,
        },
      })
      const productMap = new Map(dbProducts.map((p) => [p.id, p]))

      let subtotalCents = 0
      let discountCents = 0

      const orderLines = input.items.map((item) => {
        const prod = productMap.get(item.productId)
        if (!prod) throw new Error(`Produit introuvable (ID: ${item.productId})`)

        const listPrice = prod.priceCents
        const appliedPrice = item.unitPriceCents ?? listPrice
        const lineTotal = appliedPrice * item.quantity

        subtotalCents += lineTotal
        if (listPrice > appliedPrice) {
          discountCents += (listPrice - appliedPrice) * item.quantity
        }

        return {
          productId: prod.id,
          productName: item.productName || prod.name,
          listPriceCents: listPrice,
          purchasePriceCents: prod.purchasePriceCents,
          unitPriceCents: appliedPrice,
          quantity: item.quantity,
          bottlesPerUnit: prod.bottlesPerUnit || 1,
          currentStock: prod.stock,
        }
      })

      // 3. Frais de port
      let shippingCents = 0
      if (input.shippingOption === 'STANDARD') {
        shippingCents = shippingCentsFor(subtotalCents, isPro, settings)
      } else if (input.shippingOption === 'CUSTOM') {
        shippingCents = Math.max(0, input.customShippingCents ?? 0)
      } else {
        // RETRAIT
        shippingCents = 0
      }

      const totalCents = subtotalCents + shippingCents
      const vatCents = orderVatCents(totalCents, settings)

      // 4. Décrémentation des stocks (avec gestion stock négatif si autorisé)
      const requestedByProduct = new Map<string, number>()
      for (const line of orderLines) {
        requestedByProduct.set(
          line.productId,
          (requestedByProduct.get(line.productId) || 0) + line.quantity
        )
      }

      for (const [pId, totalQty] of requestedByProduct.entries()) {
        const prod = productMap.get(pId)
        if (!prod) continue
        if (!input.allowNegativeStock && prod.stock < totalQty) {
          throw new Error(
            `Stock insuffisant pour ${prod.name} (disponible : ${prod.stock}, demandé : ${totalQty})`
          )
        }

        await tx.product.update({
          where: { id: pId },
          data: { stock: { decrement: totalQty } },
        })
      }

      // 5. Numérotation atomique
      const numero = await nextNumber(tx, SERIES.COMMANDE)

      // 6. Création de la commande
      const created = await tx.order.create({
        data: {
          numero,
          customerId: customer.id,
          clientType: isPro ? ClientType.PRO : ClientType.PRIVE,
          proRatePercent: isPro ? (customer.proRatePercent ?? settings.proRatePercent) : null,
          clientName: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
          clientEmail: input.customer.email,
          clientPhone: input.customer.phone || null,
          address: input.customer.address,
          npa: input.customer.npa,
          city: input.customer.city,
          subtotalCents,
          discountCents,
          shippingCents,
          totalCents,
          vatCents,
          status: input.status,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
          message: input.message || null,
          assignedToId: user.id,
          items: {
            create: orderLines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              listPriceCents: l.listPriceCents,
              purchasePriceCents: l.purchasePriceCents,
              unitPriceCents: l.unitPriceCents,
              quantity: l.quantity,
              bottlesPerUnit: l.bottlesPerUnit || 1,
            })),
          },
        },
        select: { id: true, numero: true, totalCents: true },
      })

      // 7. Mouvements de stock
      await tx.stockMovement.createMany({
        data: orderLines.map((l) => ({
          productId: l.productId,
          orderId: created.id,
          delta: -l.quantity,
          reason: StockMovementReason.COMMANDE,
        })),
      })

      return created
    })

    // Audit log
    await recordAudit(
      AuditAction.COMMANDE_CREEE,
      { type: 'COMMANDE', id: order.id, label: order.numero },
      `Saisie manuelle : ${formatCHF(order.totalCents)} (${input.customer.firstName} ${input.customer.lastName})`
    )

    // Notification email optionnelle
    if (input.notifyCustomer) {
      await notifyOrderPlaced(order.id)
    }

    revalidatePath('/admin/commandes')
    revalidatePath('/admin')
    revalidatePath('/admin/produits')
    revalidatePath('/')
    const orderedProducts = await prisma.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) } },
      select: { slug: true },
    })
    for (const prod of orderedProducts) {
      if (prod.slug) {
        revalidatePath(`/produits/${prod.slug}`)
      }
    }

    return { success: true, orderId: order.id }
  } catch (err: unknown) {
    console.error('Erreur création commande manuelle :', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Une erreur inattendue est survenue.',
    }
  }
}
