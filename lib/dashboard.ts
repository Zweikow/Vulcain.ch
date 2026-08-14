import { ClientType, OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Agrégations du tableau de bord. Les commandes annulées sont exclues partout :
 * elles n'ont produit ni chiffre d'affaires ni travail de cave.
 */

export type Periode = '1M' | '4M' | '6M' | '1A'

export const PERIODES: { label: string; value: Periode }[] = [
  { label: '1 mois', value: '1M' },
  { label: '4 mois', value: '4M' },
  { label: '6 mois', value: '6M' },
  { label: '1 an', value: '1A' },
]

export function periodStart(periode: Periode, from = new Date()): Date {
  const d = new Date(from)
  switch (periode) {
    case '4M':
      return new Date(d.getFullYear(), d.getMonth() - 4, d.getDate())
    case '6M':
      return new Date(d.getFullYear(), d.getMonth() - 6, d.getDate())
    case '1A':
      return new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())
    default:
      return new Date(d.getFullYear(), d.getMonth() - 1, d.getDate())
  }
}

export type ChartBucket = {
  label: string
  privateCents: number
  proCents: number
}

export type DashboardData = {
  revenueCents: number
  shippedCount: number
  proShippedCount: number
  openOrders: number
  urgentOrders: number
  bottlesToPick: number
  averageBasketCents: number
  productCount: number
  buckets: ChartBucket[]
  alerts: { id: string; name: string; stock: number; threshold: number }[]
  topSales: {
    productName: string
    categoryName: string
    quantity: number
    revenueCents: number
    trend: number | null // % vs période précédente, null si pas de comparaison possible
  }[]
}

const MOIS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

/** Découpe la période en tranches : par semaine sur un mois, par mois au-delà. */
function buildBuckets(periode: Periode, since: Date): { start: Date; end: Date; label: string }[] {
  const now = new Date()
  const out: { start: Date; end: Date; label: string }[] = []

  if (periode === '1M') {
    const cursor = new Date(since)
    while (cursor < now) {
      const start = new Date(cursor)
      const end = new Date(cursor)
      end.setDate(end.getDate() + 7)
      out.push({
        start,
        end: end > now ? now : end,
        label: `${start.getDate()} ${MOIS[start.getMonth()]}`,
      })
      cursor.setDate(cursor.getDate() + 7)
    }
    return out
  }

  const cursor = new Date(since.getFullYear(), since.getMonth(), 1)
  while (cursor <= now) {
    const start = new Date(cursor)
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    out.push({ start, end, label: MOIS[start.getMonth()] })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

export async function getDashboard(periode: Periode): Promise<DashboardData> {
  const since = periodStart(periode)
  const previousSince = periodStart(periode, since) // période précédente de même longueur
  const notCancelled = { status: { not: OrderStatus.ANNULEE } }
  const urgentBefore = new Date(Date.now() + 2 * 24 * 3600 * 1000)

  const [periodOrders, openOrders, previousItems, alerts, productCount] = await Promise.all([
    prisma.order.findMany({
      where: { ...notCancelled, createdAt: { gte: since } },
      select: {
        createdAt: true,
        clientType: true,
        totalCents: true,
        status: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPriceCents: true,
            product: { select: { category: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { status: { in: [OrderStatus.A_TRAITER, OrderStatus.EN_PREPARATION] } },
      select: {
        clientType: true,
        deliveryDate: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: { ...notCancelled, createdAt: { gte: previousSince, lt: since } },
      },
      select: { productName: true, quantity: true },
    }),
    prisma.product.findMany({
      where: { archived: false, active: true },
      select: { id: true, name: true, stock: true, stockSeuil: true },
      orderBy: { stock: 'asc' },
    }),
    prisma.product.count({ where: { archived: false, active: true } }),
  ])

  // Indicateurs
  const shipped = periodOrders.filter((o) => o.status === OrderStatus.EXPEDIEE)
  const revenueCents = shipped.reduce((n, o) => n + o.totalCents, 0)
  const proShippedCount = shipped.filter((o) => o.clientType === ClientType.PRO).length
  const averageBasketCents = shipped.length > 0 ? Math.round(revenueCents / shipped.length) : 0
  const bottlesToPick = openOrders.reduce(
    (n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0),
    0
  )
  const urgentOrders = openOrders.filter(
    (o) => o.deliveryDate !== null && o.deliveryDate <= urgentBefore
  ).length

  // Série du graphique : chiffre d'affaires expédié, réparti privé / pro
  const buckets: ChartBucket[] = buildBuckets(periode, since).map(({ start, end, label }) => {
    const inBucket = shipped.filter((o) => o.createdAt >= start && o.createdAt < end)
    return {
      label,
      privateCents: inBucket
        .filter((o) => o.clientType !== ClientType.PRO)
        .reduce((n, o) => n + o.totalCents, 0),
      proCents: inBucket
        .filter((o) => o.clientType === ClientType.PRO)
        .reduce((n, o) => n + o.totalCents, 0),
    }
  })

  // Meilleures ventes, avec tendance sur la période précédente de même durée
  const previousQty = new Map<string, number>()
  for (const item of previousItems) {
    previousQty.set(item.productName, (previousQty.get(item.productName) ?? 0) + item.quantity)
  }

  const sales = new Map<string, { category: string; quantity: number; revenueCents: number }>()
  for (const order of periodOrders) {
    for (const item of order.items) {
      const current = sales.get(item.productName) ?? {
        category: item.product?.category?.name ?? '—',
        quantity: 0,
        revenueCents: 0,
      }
      current.quantity += item.quantity
      current.revenueCents += item.quantity * item.unitPriceCents
      sales.set(item.productName, current)
    }
  }

  const topSales = [...sales.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5)
    .map(([productName, s]) => {
      const before = previousQty.get(productName) ?? 0
      return {
        productName,
        categoryName: s.category,
        quantity: s.quantity,
        revenueCents: s.revenueCents,
        trend: before > 0 ? Math.round(((s.quantity - before) / before) * 100) : null,
      }
    })

  return {
    revenueCents,
    shippedCount: shipped.length,
    proShippedCount,
    openOrders: openOrders.length,
    urgentOrders,
    bottlesToPick,
    averageBasketCents,
    productCount,
    buckets,
    alerts: alerts
      .filter((p) => p.stock <= p.stockSeuil)
      .map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.stockSeuil })),
    topSales,
  }
}
