import { ClientType, OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { getInvoicePaymentStatus } from '@/lib/money'

/**
 * Agrégations du tableau de bord. Les commandes annulées sont exclues partout :
 * elles n'ont produit ni chiffre d'affaires ni travail de cave.
 */

export type Periode = '1M' | '4M' | '6M' | 'YTD' | '1A'

export const PERIODES: { label: string; value: Periode }[] = [
  { label: '30 jours', value: '1M' },
  { label: '4 mois', value: '4M' },
  { label: 'Cette année', value: 'YTD' },
  { label: '1 an', value: '1A' },
]

export function periodStart(periode: Periode, from = new Date()): Date {
  const d = new Date(from)
  switch (periode) {
    case '4M':
      return new Date(d.getFullYear(), d.getMonth() - 4, d.getDate())
    case '6M':
      return new Date(d.getFullYear(), d.getMonth() - 6, d.getDate())
    case 'YTD':
      return new Date(d.getFullYear(), 0, 1)
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
  marginCents: number
}

export type OverdueInvoiceItem = {
  id: string
  numero: string
  invoiceNumber: string | null
  clientName: string
  totalCents: number
  daysOverdue: number
  dueDate: Date
  reminderCount: number
}

export type DashboardData = {
  revenueCents: number
  previousRevenueCents: number
  revenueTrend: number | null
  marginCents: number
  previousMarginCents: number
  marginTrend: number | null
  purchaseTotalCents: number
  shippedCount: number
  proShippedCount: number
  paidRevenueCents: number
  unpaidRevenueCents: number
  overdueInvoiceCount: number
  overdueTotalCents: number
  overdueInvoices: OverdueInvoiceItem[]
  openOrders: number
  pickupOrdersCount: number
  shippingOrdersCount: number
  missingTrackingCount: number
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

  const [
    settings,
    periodOrders,
    openOrders,
    previousOrders,
    unpaidInvoicedOrders,
    alerts,
    productCount,
  ] = await Promise.all([
    getSettings(),
    prisma.order.findMany({
      where: { ...notCancelled, createdAt: { gte: since } },
      select: {
        id: true,
        numero: true,
        createdAt: true,
        clientType: true,
        totalCents: true,
        status: true,
        paidAt: true,
        invoicedAt: true,
        invoiceNumber: true,
        isPickup: true,
        trackingNumber: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPriceCents: true,
            purchasePriceCents: true,
            product: { select: { category: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { status: { in: [OrderStatus.A_TRAITER, OrderStatus.EN_PREPARATION] } },
      select: {
        id: true,
        numero: true,
        clientType: true,
        deliveryDate: true,
        isPickup: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.findMany({
      where: { ...notCancelled, createdAt: { gte: previousSince, lt: since } },
      select: {
        status: true,
        totalCents: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            purchasePriceCents: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        ...notCancelled,
        invoicedAt: { not: null },
        paidAt: null,
      },
      select: {
        id: true,
        numero: true,
        invoiceNumber: true,
        clientName: true,
        totalCents: true,
        invoicedAt: true,
        createdAt: true,
        paidAt: true,
        paymentMethod: true,
        reminderCount: true,
      },
      orderBy: { invoicedAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { archived: false, active: true },
      select: { id: true, name: true, stock: true, stockSeuil: true },
      orderBy: { stock: 'asc' },
    }),
    prisma.product.count({ where: { archived: false, active: true } }),
  ])

  // Indicateurs financiers sur la période
  const shipped = periodOrders.filter((o) => o.status === OrderStatus.EXPEDIEE)
  const revenueCents = shipped.reduce((n, o) => n + o.totalCents, 0)
  const paidRevenueCents = shipped
    .filter((o) => Boolean(o.paidAt))
    .reduce((n, o) => n + o.totalCents, 0)
  const unpaidRevenueCents = shipped.filter((o) => !o.paidAt).reduce((n, o) => n + o.totalCents, 0)

  const purchaseTotalCents = shipped.reduce(
    (total, o) =>
      total + o.items.reduce((sum, item) => sum + item.purchasePriceCents * item.quantity, 0),
    0
  )
  const marginCents = revenueCents - purchaseTotalCents

  // Comparatif avec la période précédente
  const previousShipped = previousOrders.filter((o) => o.status === OrderStatus.EXPEDIEE)
  const previousRevenueCents = previousShipped.reduce((n, o) => n + o.totalCents, 0)
  const previousPurchaseTotalCents = previousShipped.reduce(
    (total, o) =>
      total + o.items.reduce((sum, item) => sum + item.purchasePriceCents * item.quantity, 0),
    0
  )
  const previousMarginCents = previousRevenueCents - previousPurchaseTotalCents

  const revenueTrend =
    previousRevenueCents > 0
      ? Math.round(((revenueCents - previousRevenueCents) / previousRevenueCents) * 100)
      : null

  const marginTrend =
    previousMarginCents > 0
      ? Math.round(((marginCents - previousMarginCents) / previousMarginCents) * 100)
      : null

  // Suivi des factures impayées & retards
  const overdueInvoices: OverdueInvoiceItem[] = unpaidInvoicedOrders
    .map((order) => {
      const status = getInvoicePaymentStatus(order, settings.paymentTermsDays)
      return {
        id: order.id,
        numero: order.numero,
        invoiceNumber: order.invoiceNumber,
        clientName: order.clientName,
        totalCents: order.totalCents,
        daysOverdue: status.daysOverdue,
        dueDate: status.dueDate,
        reminderCount: order.reminderCount,
      }
    })
    .filter((inv) => inv.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  const overdueInvoiceCount = overdueInvoices.length
  const overdueTotalCents = overdueInvoices.reduce((sum, inv) => sum + inv.totalCents, 0)

  // Indicateurs logistiques & cave
  const proShippedCount = shipped.filter((o) => o.clientType === ClientType.PRO).length
  const averageBasketCents = shipped.length > 0 ? Math.round(revenueCents / shipped.length) : 0
  const bottlesToPick = openOrders.reduce(
    (n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0),
    0
  )
  const urgentOrders = openOrders.filter(
    (o) => o.deliveryDate !== null && o.deliveryDate <= urgentBefore
  ).length
  const pickupOrdersCount = openOrders.filter((o) => o.isPickup).length
  const shippingOrdersCount = openOrders.filter((o) => !o.isPickup).length

  const missingTrackingCount = periodOrders.filter(
    (o) =>
      o.status === OrderStatus.EXPEDIEE &&
      !o.isPickup &&
      (!o.trackingNumber || o.trackingNumber.trim() === '')
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
      marginCents: inBucket.reduce(
        (n, o) =>
          n +
          (o.totalCents -
            o.items.reduce((sum, item) => sum + item.purchasePriceCents * item.quantity, 0)),
        0
      ),
    }
  })

  // Meilleures ventes, avec tendance sur la période précédente de même durée
  const previousQty = new Map<string, number>()
  for (const order of previousOrders) {
    for (const item of order.items) {
      previousQty.set(item.productName, (previousQty.get(item.productName) ?? 0) + item.quantity)
    }
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
    previousRevenueCents,
    revenueTrend,
    marginCents,
    previousMarginCents,
    marginTrend,
    purchaseTotalCents,
    shippedCount: shipped.length,
    proShippedCount,
    paidRevenueCents,
    unpaidRevenueCents,
    overdueInvoiceCount,
    overdueTotalCents,
    overdueInvoices,
    openOrders: openOrders.length,
    pickupOrdersCount,
    shippingOrdersCount,
    missingTrackingCount,
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
