import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { FacturesTable, FactureItem } from '@/components/admin/FacturesTable'

export const dynamic = 'force-dynamic'

type FactureFilter = 'TOUS' | 'PAYEE' | 'EN_ATTENTE' | 'EN_RETARD'

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const user = await currentUser()
  if (!user || !can.seeFinancials(user.role)) {
    redirect('/admin')
  }

  const { status: rawStatus, q: rawQ } = await searchParams
  const validFilters: FactureFilter[] = ['TOUS', 'PAYEE', 'EN_ATTENTE', 'EN_RETARD']
  const currentFilter: FactureFilter = validFilters.includes(rawStatus as any)
    ? (rawStatus as FactureFilter)
    : 'TOUS'

  const settings = await getSettings()
  const paymentTermsDays = settings.paymentTermsDays || 30

  // Seuil de date pour les retards de paiement (date du jour - 30 jours)
  const now = new Date()
  const overdueCutoff = new Date(now.getTime() - paymentTermsDays * 24 * 60 * 60 * 1000)

  // Condition de base : commandes non annulées ayant un numéro de facture ou expédiées
  const baseCondition: any = {
    status: { not: 'ANNULEE' },
    OR: [{ invoiceNumber: { not: null } }, { status: 'EXPEDIEE' }],
  }

  // Calcul des compteurs d'onglets
  const [totalCount, paidCount, overdueCount, allOrdersForTotals] = await Promise.all([
    prisma.order.count({ where: baseCondition }),
    prisma.order.count({ where: { ...baseCondition, paidAt: { not: null } } }),
    prisma.order.count({
      where: {
        ...baseCondition,
        paidAt: null,
        createdAt: { lt: overdueCutoff },
      },
    }),
    prisma.order.findMany({
      where: baseCondition,
      select: {
        totalCents: true,
        paidAt: true,
      },
    }),
  ])

  const pendingCount = Math.max(0, totalCount - paidCount - overdueCount)

  // Totaux financiers
  const totalInvoicedCents = allOrdersForTotals.reduce((sum, o) => sum + o.totalCents, 0)
  const totalPaidCents = allOrdersForTotals
    .filter((o) => Boolean(o.paidAt))
    .reduce((sum, o) => sum + o.totalCents, 0)
  const totalDueCents = Math.max(0, totalInvoicedCents - totalPaidCents)

  // Construction de la requête filtrée
  const andClauses: any[] = [baseCondition]

  if (currentFilter === 'PAYEE') {
    andClauses.push({ paidAt: { not: null } })
  } else if (currentFilter === 'EN_ATTENTE') {
    andClauses.push({ paidAt: null, createdAt: { gte: overdueCutoff } })
  } else if (currentFilter === 'EN_RETARD') {
    andClauses.push({ paidAt: null, createdAt: { lt: overdueCutoff } })
  }

  const q = rawQ?.trim() || ''
  if (q) {
    const orSearch: any[] = [
      { numero: { contains: q, mode: 'insensitive' } },
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
      { clientEmail: { contains: q, mode: 'insensitive' } },
    ]
    andClauses.push({ OR: orSearch })
  }

  const orders = await prisma.order.findMany({
    where: { AND: andClauses },
    orderBy: [{ invoiceNumber: 'desc' }, { createdAt: 'desc' }],
    take: 100, // Large limite pour sélection multi-factures
    include: {
      customer: {
        select: {
          customerNumber: true,
          isPro: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitPriceCents: true,
        },
      },
      emailLogs: {
        where: { type: 'FACTURE' },
        orderBy: { sentAt: 'desc' },
        take: 3,
        select: {
          id: true,
          type: true,
          sentAt: true,
          success: true,
        },
      },
    },
  })

  // Formatage des éléments pour le composant client
  const formattedOrders: FactureItem[] = orders.map((o) => ({
    id: o.id,
    numero: o.numero,
    invoiceNumber: o.invoiceNumber,
    invoicedAt: o.invoicedAt ? o.invoicedAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    totalCents: o.totalCents,
    clientName: o.clientName,
    clientEmail: o.clientEmail,
    clientPhone: o.clientPhone,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    paymentMethod: o.paymentMethod,
    reminderCount: o.reminderCount,
    lastReminderAt: o.lastReminderAt ? o.lastReminderAt.toISOString() : null,
    isPickup: o.isPickup,
    carrier: o.carrier,
    customer: o.customer,
    items: o.items,
    emailLogs: o.emailLogs.map((l) => ({
      id: l.id,
      type: l.type,
      sentAt: l.sentAt.toISOString(),
      success: l.success,
    })),
  }))

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary dark:text-text-primary-dark">
            Gestion des Factures
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Suivi comptable, encaissements, relances et export groupé des factures officielles.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-text-secondary">Chargement des factures...</div>
        }
      >
        <FacturesTable
          orders={formattedOrders}
          settings={settings}
          counts={{
            total: totalCount,
            paid: paidCount,
            pending: pendingCount,
            overdue: overdueCount,
          }}
          currentFilter={currentFilter}
          searchQuery={q}
          totals={{
            totalInvoicedCents,
            totalPaidCents,
            totalDueCents,
          }}
        />
      </Suspense>
    </div>
  )
}
