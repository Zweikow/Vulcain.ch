import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { getOrderRatelimit } from '@/lib/ratelimit'
import { orderSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  // 1. Rate limiting by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
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
    return NextResponse.json(
      { error: 'Vérification de sécurité échouée' },
      { status: 403 }
    )
  }

  // 5. Server-side price recalculation — never trust client total
  const productIds = result.data.items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    select: { id: true, price: true },
  })

  const priceMap = new Map(products.map((p) => [p.id, p.price]))

  // Verify all products exist and are active
  const missingProduct = result.data.items.find((i) => !priceMap.has(i.productId))
  if (missingProduct) {
    return NextResponse.json(
      { error: 'Un ou plusieurs produits sont indisponibles' },
      { status: 422 }
    )
  }

  const serverTotal = result.data.items.reduce((sum, item) => {
    const price = priceMap.get(item.productId)!
    return sum + Number(price) * item.quantity
  }, 0)

  // 6. Generate order number
  const count = await prisma.order.count()
  const numero = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  // 7. Create order in DB
  const order = await prisma.order.create({
    data: {
      numero,
      clientName: `${result.data.firstName} ${result.data.lastName}`,
      clientEmail: result.data.email,
      clientPhone: result.data.phone ?? null,
      address: result.data.address,
      npa: result.data.npa,
      city: result.data.city,
      total: serverTotal,
      items: {
        create: result.data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: priceMap.get(item.productId)!,
        })),
      },
    },
    select: { numero: true },
  })

  return NextResponse.json({ orderId: order.numero }, { status: 201 })
}
