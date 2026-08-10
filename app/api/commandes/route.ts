import { NextRequest, NextResponse } from 'next/server'
import { ClientType, StockMovementReason } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { nextNumber, SERIES } from '@/lib/numbering'
import { notifyOrderPlaced } from '@/lib/notifications'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { getOrderRatelimit } from '@/lib/ratelimit'
import { orderSchema } from '@/lib/validations'
import { getSettings } from '@/lib/settings'
import { proUnitPriceCents, shippingCentsFor, vatIncludedCents } from '@/lib/money'

class OrderConflictError extends Error {}

export async function POST(request: NextRequest) {
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

      const products = await tx.product.findMany({
        where: {
          id: { in: data.items.map((i) => i.productId) },
          active: true,
          archived: false,
        },
        select: { id: true, name: true, priceCents: true, stock: true },
      })
      const byId = new Map(products.map((p) => [p.id, p]))

      let subtotalCents = 0
      let discountCents = 0
      const lines = data.items.map((item) => {
        const product = byId.get(item.productId)
        if (!product) throw new OrderConflictError('Un ou plusieurs produits sont indisponibles')
        if (product.stock < item.quantity)
          throw new OrderConflictError(`Stock insuffisant pour ${product.name}`)
        const unitPriceCents = isPro
          ? proUnitPriceCents(product.priceCents, settings.proRatePercent)
          : product.priceCents
        subtotalCents += unitPriceCents * item.quantity
        discountCents += (product.priceCents - unitPriceCents) * item.quantity
        return {
          productId: product.id,
          productName: product.name,
          listPriceCents: product.priceCents,
          unitPriceCents,
          quantity: item.quantity,
        }
      })

      const shippingCents = shippingCentsFor(subtotalCents, isPro, settings)
      const totalCents = subtotalCents + shippingCents
      const vatCents = vatIncludedCents(totalCents, settings.vatRatePermille)

      // Décrément conditionnel : échoue si une commande concurrente a vidé le stock.
      for (const line of lines) {
        const updated = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        })
        if (updated.count === 0)
          throw new OrderConflictError(`Stock insuffisant pour ${line.productName}`)
      }

      // Numérotation CMD-AAAA-NNNN — atomique, remplace order.count().
      // La facture recevra son propre numéro (série FAC) à son émission.
      const numero = await nextNumber(tx, SERIES.COMMANDE)

      const created = await tx.order.create({
        data: {
          numero,
          customerId: customer.id,
          clientType: isPro ? ClientType.PRO : ClientType.PRIVE,
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
          items: { create: lines },
        },
        select: { id: true, numero: true, totalCents: true },
      })

      await tx.stockMovement.createMany({
        data: lines.map((l) => ({
          productId: l.productId,
          orderId: created.id,
          delta: -l.quantity,
          reason: StockMovementReason.COMMANDE,
        })),
      })

      return created
    })

    // Confirmation au client et notification à la cidrerie. N'échoue jamais :
    // la commande est déjà enregistrée, elle ne doit pas être perdue si SES
    // est indisponible.
    await notifyOrderPlaced(order.id)

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
