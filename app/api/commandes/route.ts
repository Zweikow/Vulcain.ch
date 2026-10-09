import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { AuditAction, ClientType, StockMovementReason } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { nextNumber, SERIES } from '@/lib/numbering'
import { notifyOrderPlaced } from '@/lib/notifications'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { getOrderRatelimit } from '@/lib/ratelimit'
import { orderSchema } from '@/lib/validations'
import { getSettings, isMaintenanceMode } from '@/lib/settings'
import { proUnitPriceCents, shippingCentsFor, orderVatCents, formatCHF } from '@/lib/money'
import { recordCustomerAudit } from '@/lib/audit'

class OrderConflictError extends Error {}

export async function POST(request: NextRequest) {
  // 0. Boutique en maintenance : aucune commande n'est acceptée
  if (await isMaintenanceMode()) {
    return NextResponse.json(
      {
        error:
          'La boutique est en maintenance : les commandes sont suspendues. Merci de réessayer un peu plus tard.',
      },
      { status: 503 }
    )
  }

  // 1. Rate limiting by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
  const { success: withinLimit } = await getOrderRatelimit().limit(ip)
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 10 minutes.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  // 2. Honeypot — silent rejection
  if (
    typeof body === 'object' &&
    body !== null &&
    'website' in body &&
    (body as Record<string, unknown>).website
  ) {
    return NextResponse.json({ orderId: 'bot-rejected' }, { status: 201 })
  }

  // 3. Zod validation
  const result = orderSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: result.error.flatten() },
      { status: 422 }
    )
  }

  // 4. Turnstile verification
  const tokenValid = await verifyTurnstileToken(result.data.turnstileToken)
  if (!tokenValid) {
    return NextResponse.json({ error: 'Vérification de sécurité échouée' }, { status: 403 })
  }

  // 5. Création en transaction : recalcul intégral côté serveur (prix depuis la
  // base, tarif pro depuis la fiche client, port depuis Setting), décrément de
  // stock conditionnel, numérotation atomique par année.
  const data = result.data
  const settings = await getSettings()

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Le tarif pro appartient au client : lu en base, jamais dans la requête.
      const customer = await tx.customer.upsert({
        where: { email: data.email },
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone ?? null,
          address: data.address,
          npa: data.npa,
          city: data.city,
          ...(data.acceptsMarketing ? { acceptsMarketing: true } : {}),
        },
        create: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone ?? null,
          address: data.address,
          npa: data.npa,
          city: data.city,
          acceptsMarketing: data.acceptsMarketing,
        },
      })
      const isPro = customer.isPro
      const effectiveProRate = isPro ? (customer.proRatePercent ?? settings.proRatePercent) : null

      const products = await tx.product.findMany({
        where: {
          id: { in: data.items.map((i) => i.productId) },
          active: true,
          archived: false,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          priceCents: true,
          purchasePriceCents: true,
          stock: true,
          bottleSize: true,
          bottlesPerUnit: true,
          category: { select: { name: true } },
          promotions: {
            where: { active: true },
          },
        },
      })
      const byId = new Map(products.map((p) => [p.id, p]))

      let subtotalCents = 0
      let discountCents = 0
      const orderItemsToCreate: {
        productId: string
        productName: string
        listPriceCents: number
        purchasePriceCents: number
        unitPriceCents: number
        quantity: number
        bottlesPerUnit: number
      }[] = []

      for (const item of data.items) {
        const product = byId.get(item.productId)
        if (!product) throw new OrderConflictError('Un ou plusieurs produits sont indisponibles')
        if (product.stock < item.quantity)
          throw new OrderConflictError(`Stock insuffisant pour ${product.name}`)

        const unitPriceCents =
          isPro && effectiveProRate !== null
            ? proUnitPriceCents(product.priceCents, effectiveProRate)
            : product.priceCents

        const promo = product.promotions?.[0]
        const bottlesPerUnit = product.bottlesPerUnit || 1

        if (
          promo &&
          promo.type === 'BUY_X_GET_Y_FREE' &&
          promo.buyQuantity &&
          promo.getFreeQuantity
        ) {
          const sets = Math.floor(item.quantity / promo.buyQuantity)
          const freeUnits = sets * promo.getFreeQuantity
          const paidUnits = item.quantity - freeUnits

          if (paidUnits > 0) {
            orderItemsToCreate.push({
              productId: product.id,
              productName: product.name,
              listPriceCents: product.priceCents,
              purchasePriceCents: product.purchasePriceCents,
              unitPriceCents,
              quantity: paidUnits,
              bottlesPerUnit,
            })
            subtotalCents += unitPriceCents * paidUnits
            discountCents += (product.priceCents - unitPriceCents) * paidUnits
          }

          if (freeUnits > 0) {
            orderItemsToCreate.push({
              productId: product.id,
              productName: `${product.name} — ${promo.name} (${freeUnits} offert${freeUnits > 1 ? 's' : ''})`,
              listPriceCents: product.priceCents,
              purchasePriceCents: product.purchasePriceCents,
              unitPriceCents: 0,
              quantity: freeUnits,
              bottlesPerUnit,
            })
            discountCents += product.priceCents * freeUnits
          }
        } else if (promo && promo.type === 'PERCENTAGE' && promo.discountPercent) {
          const discountPerUnit = Math.round(unitPriceCents * (promo.discountPercent / 100))
          const effectivePrice = unitPriceCents - discountPerUnit
          orderItemsToCreate.push({
            productId: product.id,
            productName: `${product.name} (${promo.name} -${promo.discountPercent}%)`,
            listPriceCents: product.priceCents,
            purchasePriceCents: product.purchasePriceCents,
            unitPriceCents: effectivePrice,
            quantity: item.quantity,
            bottlesPerUnit,
          })
          subtotalCents += effectivePrice * item.quantity
          discountCents += (product.priceCents - effectivePrice) * item.quantity
        } else if (promo && promo.type === 'FIXED_DISCOUNT' && promo.discountCents) {
          const effectivePrice = Math.max(0, unitPriceCents - promo.discountCents)
          orderItemsToCreate.push({
            productId: product.id,
            productName: `${product.name} (${promo.name})`,
            listPriceCents: product.priceCents,
            purchasePriceCents: product.purchasePriceCents,
            unitPriceCents: effectivePrice,
            quantity: item.quantity,
            bottlesPerUnit,
          })
          subtotalCents += effectivePrice * item.quantity
          discountCents += (product.priceCents - effectivePrice) * item.quantity
        } else {
          orderItemsToCreate.push({
            productId: product.id,
            productName: product.name,
            listPriceCents: product.priceCents,
            purchasePriceCents: product.purchasePriceCents,
            unitPriceCents,
            quantity: item.quantity,
            bottlesPerUnit,
          })
          subtotalCents += unitPriceCents * item.quantity
          discountCents += (product.priceCents - unitPriceCents) * item.quantity
        }
      }

      const shippingCents = shippingCentsFor(subtotalCents, isPro, settings)
      const totalCents = subtotalCents + shippingCents
      const vatCents = orderVatCents(totalCents, settings)

      // Décrément conditionnel : échoue si une commande concurrente a vidé le stock.
      for (const item of data.items) {
        const product = byId.get(item.productId)!
        const updated = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (updated.count === 0)
          throw new OrderConflictError(`Stock insuffisant pour ${product.name}`)
      }

      // Numérotation CMD-AAAA-NNNN — atomique, remplace order.count().
      // La facture recevra son propre numéro (série FAC) à son émission.
      const numero = await nextNumber(tx, SERIES.COMMANDE)

      const created = await tx.order.create({
        data: {
          numero,
          customerId: customer.id,
          clientType: isPro ? ClientType.PRO : ClientType.PRIVE,
          proRatePercent: effectiveProRate,
          clientName: `${data.firstName} ${data.lastName}`,
          clientEmail: data.email,
          clientPhone: data.phone ?? null,
          address: data.address,
          npa: data.npa,
          city: data.city,
          subtotalCents,
          discountCents,
          shippingCents,
          totalCents,
          vatCents,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          message: data.message || null,
          items: {
            create: orderItemsToCreate,
          },
        },
        select: { id: true, numero: true, totalCents: true },
      })

      await tx.stockMovement.createMany({
        data: data.items.map((item) => ({
          productId: item.productId,
          orderId: created.id,
          delta: -item.quantity,
          reason: StockMovementReason.COMMANDE,
        })),
      })

      return created
    })

    await recordCustomerAudit(
      AuditAction.COMMANDE_CREEE,
      { type: 'COMMANDE', id: order.id, label: order.numero },
      formatCHF(order.totalCents)
    )

    // Confirmation au client et notification à la cidrerie. N'échoue jamais :
    // la commande est déjà enregistrée, elle ne doit pas être perdue si SES
    // est indisponible.
    await notifyOrderPlaced(order.id)

    // Revalidation des fiches produits commandees et de la boutique
    try {
      revalidatePath('/')
      const orderedProducts = await prisma.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) } },
        select: { slug: true },
      })
      for (const p of orderedProducts) {
        if (p.slug) {
          revalidatePath(`/produits/${p.slug}`)
        }
      }
    } catch (err) {
      console.error('Revalidation error:', err)
    }

    return NextResponse.json(
      { orderId: order.numero, totalCents: order.totalCents },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof OrderConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 })
    }
    console.error('POST /api/commandes', e)
    return NextResponse.json(
      { error: "La commande n'a pas pu être enregistrée. Réessayez." },
      { status: 500 }
    )
  }
}
