import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { OrderStatus } from '@prisma/client'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { SearchCommandes } from '@/components/admin/SearchCommandes'
import { Suspense } from 'react'
import { CommandesTableWithSelection } from '@/components/admin/CommandesTableWithSelection'

type FilterValue = 'TOUTES' | OrderStatus | 'IMPAYEES' | 'EN_RETARD'

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; page?: string }>
}) {
  const { statut: rawStatut, q, page: pageParam } = await searchParams
  const validFilters = [
    'TOUTES',
    'A_TRAITER',
    'EN_PREPARATION',
    'EXPEDIEE',
    'ANNULEE',
    'IMPAYEES',
    'EN_RETARD',
  ]
  const statut: FilterValue = validFilters.includes(rawStatut ?? '')
    ? (rawStatut as FilterValue)
    : 'TOUTES'

  const user = await currentUser()
  const showMoney = user ? can.seeFinancials(user.role) : false
  const settings = await getSettings()

  const thirtyDaysAgo = new Date(Date.now() - settings.paymentTermsDays * 24 * 60 * 60 * 1000)

  // Construction de la clause de recherche et de statut
  const andConditions: any[] = []

  if (statut === 'IMPAYEES') {
    andConditions.push({ paidAt: null, status: { not: 'ANNULEE' } })
  } else if (statut === 'EN_RETARD') {
    andConditions.push({
      paidAt: null,
      status: { not: 'ANNULEE' },
      OR: [
        { invoicedAt: { lte: thirtyDaysAgo } },
        { invoicedAt: null, createdAt: { lte: thirtyDaysAgo } },
      ],
    })
  } else if (statut !== 'TOUTES') {
    andConditions.push({ status: statut as OrderStatus })
  }

  if (q) {
    andConditions.push({
      OR: [
        { numero: { contains: q, mode: 'insensitive' } },
        { clientName: { contains: q, mode: 'insensitive' } },
        { clientEmail: { contains: q, mode: 'insensitive' } },
      ],
    })
  }

  const whereClause = andConditions.length > 0 ? { AND: andConditions } : {}

  const page = Math.max(1, parseInt(pageParam || '1', 10))
  const TAKE = 20
  const skip = (page - 1) * TAKE

  const [commandes, statusGroups, unpaidTotal, overdueTotal, filteredTotal] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: TAKE,
      skip,
      select: {
        id: true,
        numero: true,
        clientName: true,
        clientEmail: true,
        totalCents: true,
        status: true,
        paidAt: true,
        paymentMethod: true,
        invoicedAt: true,
        reminderCount: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.order.count({ where: { paidAt: null, status: { not: 'ANNULEE' } } }),
    prisma.order.count({
      where: {
        paidAt: null,
        status: { not: 'ANNULEE' },
        OR: [
          { invoicedAt: { lte: thirtyDaysAgo } },
          { invoicedAt: null, createdAt: { lte: thirtyDaysAgo } },
        ],
      },
    }),
    prisma.order.count({ where: whereClause }),
  ])

  const countMap: Record<OrderStatus, number> = {
    A_TRAITER: 0,
    EN_PREPARATION: 0,
    EXPEDIEE: 0,
    ANNULEE: 0,
  }
  let totalCount = 0
  for (const group of statusGroups) {
    countMap[group.status] = group._count._all
    totalCount += group._count._all
  }

  const filtersList: { label: string; value: FilterValue; count: number; alert?: boolean }[] = [
    { label: 'Toutes', value: 'TOUTES', count: totalCount },
    { label: 'À traiter', value: 'A_TRAITER', count: countMap['A_TRAITER'] },
    { label: 'En préparation', value: 'EN_PREPARATION', count: countMap['EN_PREPARATION'] },
    { label: 'Expédiées', value: 'EXPEDIEE', count: countMap['EXPEDIEE'] },
    { label: 'Annulées', value: 'ANNULEE', count: countMap['ANNULEE'] },
    ...(showMoney
      ? [
          { label: 'Impayées', value: 'IMPAYEES' as const, count: unpaidTotal },
          {
            label: 'En retard',
            value: 'EN_RETARD' as const,
            count: overdueTotal,
            alert: overdueTotal > 0,
          },
        ]
      : []),
  ]

  const totalPages = Math.ceil(filteredTotal / TAKE)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark">
            Commandes
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Gérez et suivez toutes les commandes
          </p>
        </div>
        {user && can.manageOrders(user.role) && (
          <Link
            href="/admin/commandes/nouvelle"
            className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2"
          >
            <span>+</span>
            <span>Nouvelle commande</span>
          </Link>
        )}
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {filtersList.map(({ label, value, count, alert }) => {
            const isActive = statut === value
            return (
              <Link
                key={value}
                href={value === 'TOUTES' ? '/admin/commandes' : `/admin/commandes?statut=${value}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : alert
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                      : 'bg-bg-card dark:bg-bg-card-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:bg-primary/10'
                }`}
              >
                {label}
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-pill ${
                    isActive
                      ? 'bg-white/20'
                      : alert
                        ? 'bg-rose-200/60 dark:bg-rose-800/60 text-rose-900 dark:text-rose-100'
                        : 'bg-border dark:bg-border-dark'
                  }`}
                >
                  {count}
                </span>
              </Link>
            )
          })}
        </div>

        <Suspense
          fallback={
            <input
              type="text"
              placeholder="Rechercher..."
              className="input-field w-64 text-sm"
              disabled
            />
          }
        >
          <SearchCommandes />
        </Suspense>
      </div>

      {/* Table avec sélection multiple et export Planzer */}
      <CommandesTableWithSelection
        commandes={commandes}
        showMoney={showMoney}
        settings={settings}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 gap-4">
          {page > 1 ? (
            <Link
              href={`/admin/commandes?${new URLSearchParams({
                ...(rawStatut && { statut: rawStatut }),
                ...(q && { q }),
                page: (page - 1).toString(),
              }).toString()}`}
              className="px-3 py-1.5 text-sm bg-bg-card dark:bg-bg-card-dark rounded-md border border-border dark:border-border-dark hover:bg-primary/10 transition-colors"
            >
              Précédent
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-sm rounded-md border border-transparent text-text-tertiary dark:text-text-tertiary-dark cursor-not-allowed">
              Précédent
            </span>
          )}

          <span className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
            Page {page} sur {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/admin/commandes?${new URLSearchParams({
                ...(rawStatut && { statut: rawStatut }),
                ...(q && { q }),
                page: (page + 1).toString(),
              }).toString()}`}
              className="px-3 py-1.5 text-sm bg-bg-card dark:bg-bg-card-dark rounded-md border border-border dark:border-border-dark hover:bg-primary/10 transition-colors"
            >
              Suivant
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-sm rounded-md border border-transparent text-text-tertiary dark:text-text-tertiary-dark cursor-not-allowed">
              Suivant
            </span>
          )}
        </div>
      )}
    </div>
  )
}
