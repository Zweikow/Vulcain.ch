import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge'
import { OrderStatus } from '@prisma/client'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { SearchCommandes } from '@/components/admin/SearchCommandes'
import { Suspense } from 'react'

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

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark">
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                N°
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Client
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Email
              </th>
              {showMoney && (
                <>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                    Paiement
                  </th>
                </>
              )}
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Statut
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {commandes.length === 0 ? (
              <tr>
                <td
                  colSpan={showMoney ? 7 : 5}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  Aucune commande
                </td>
              </tr>
            ) : (
              commandes.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/commandes/${order.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {order.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark">
                    <Link href={`/admin/commandes/${order.id}`} className="hover:underline">
                      {order.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                    {order.clientEmail}
                  </td>
                  {showMoney && (
                    <>
                      <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark font-medium">
                        {formatCHF(order.totalCents)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge
                          paidAt={order.paidAt}
                          paymentMethod={order.paymentMethod}
                          invoicedAt={order.invoicedAt}
                          createdAt={order.createdAt}
                          reminderCount={order.reminderCount}
                          paymentTermsDays={settings.paymentTermsDays}
                        />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                    {order.assignedTo && (
                      <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-1">
                        Prep: {order.assignedTo.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                    {new Date(order.createdAt).toLocaleDateString('fr-CH')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
