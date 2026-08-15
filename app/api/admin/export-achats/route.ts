import { NextRequest, NextResponse } from 'next/server'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { periodStart, Periode } from '@/lib/dashboard'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  // Seul un utilisateur autorisé à voir le tableau de bord peut exporter les données financières
  await requireCapability(can.seeDashboard)

  const searchParams = request.nextUrl.searchParams
  const rawPeriode = searchParams.get('periode')
  const periode: Periode = (
    ['1M', '4M', '6M', '1A'].includes(rawPeriode ?? '') ? rawPeriode : '1M'
  ) as Periode

  const since = periodStart(periode)
  const now = new Date()

  // On récupère toutes les commandes expédiées sur la période
  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.EXPEDIEE,
      createdAt: { gte: since },
    },
    select: {
      items: {
        select: {
          productName: true,
          quantity: true,
          purchasePriceCents: true,
        },
      },
    },
  })

  // Agrégation par produit
  const lines = new Map<
    string,
    { quantity: number; purchasePriceCents: number; totalCents: number }
  >()

  for (const order of orders) {
    for (const item of order.items) {
      if (item.purchasePriceCents === 0) continue // Exclut les produits sans coût d'achat

      const current = lines.get(item.productName) ?? {
        quantity: 0,
        purchasePriceCents: item.purchasePriceCents,
        totalCents: 0,
      }
      current.quantity += item.quantity
      current.totalCents += item.quantity * item.purchasePriceCents
      lines.set(item.productName, current)
    }
  }

  // Construction du CSV
  const csvRows = [
    ['Produit', 'Quantite', 'Prix unitaire achat (CHF)', 'Total achat (CHF)'].join(','),
  ]

  let grandTotalCents = 0
  for (const [productName, data] of lines.entries()) {
    // Protection contre les virgules dans le nom du produit
    const safeName = `"${productName.replace(/"/g, '""')}"`
    const unitPrice = (data.purchasePriceCents / 100).toFixed(2)
    const totalPrice = (data.totalCents / 100).toFixed(2)
    grandTotalCents += data.totalCents

    csvRows.push([safeName, data.quantity, unitPrice, totalPrice].join(','))
  }

  csvRows.push(['Total Général', '', '', (grandTotalCents / 100).toFixed(2)].join(','))

  const csvString = csvRows.join('\n')

  const dateStr = `${since.toISOString().split('T')[0]}_au_${now.toISOString().split('T')[0]}`

  return new NextResponse(csvString, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="decompte_achats_${dateStr}.csv"`,
    },
  })
}
