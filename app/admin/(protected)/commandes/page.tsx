import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { OrderStatus } from '@prisma/client'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { SearchCommandes } from '@/components/admin/SearchCommandes'
import { Suspense } from 'react'

type StatusFilter = 'TOUTES' | OrderStatus

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'Toutes', value: 'TOUTES' },
  { label: 'À traiter', value: 'A_TRAITER' },
  { label: 'En préparation', value: 'EN_PREPARATION' },
  { label: 'Expédiées', value: 'EXPEDIEE' },
  { label: 'Annulées', value: 'ANNULEE' },
]

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; page?: string }>
}) {
  const { statut: rawStatut, q, page: pageParam } = await searchParams
  const validStatuts = ['A_TRAITER', 'EN_PREPARATION', 'EXPEDIEE', 'ANNULEE']
  const statut: StatusFilter = validStatuts.includes(rawStatut ?? '')
    ? (rawStatut as OrderStatus)
    : 'TOUTES'

  const user = await currentUser()
  const showMoney = user ? can.seeFinancials(user.role) : false

  const whereClause: any = statut === 'TOUTES' ? {} : { status: statut as OrderStatus }

  if (q) {
    whereClause.OR = [
      { numero: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
      { clientEmail: { contains: q, mode: 'insensitive' } },
    ]
  }

  const page = Math.max(1, parseInt(pageParam || '1', 10))
  const TAKE = 20
  const skip = (page - 1) * TAKE

  const [commandes, statusGroups, filteredTotal] = await Promise.all([
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
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
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

  const totalPages = Math.ceil(filteredTotal / TAKE)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark">
          Commandes
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
          Gérez et suivez toutes les commandes
        </p>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {FILTERS.map(({ label, value }) => {
            const count = value === 'TOUTES' ? totalCount : countMap[value as OrderStatus]
            const isActive = statut === value
            return (
              <Link
                key={value}
                href={value === 'TOUTES' ? '/admin/commandes' : `/admin/commandes?statut=${value}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-bg-card dark:bg-bg-card-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:bg-primary/10'
                }`}
              >
                {label}
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-pill ${
                    isActive ? 'bg-white/20' : 'bg-border dark:bg-border-dark'
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
                <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Total
                </th>
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
                  colSpan={6}
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
                    <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark">
                      {formatCHF(order.totalCents)}
                    </td>
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
