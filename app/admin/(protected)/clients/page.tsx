import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { formatCHF, getInvoicePaymentStatus } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { SearchClients } from '@/components/admin/SearchClients'
import { CheckIcon } from '@/components/admin/AdminIcons'

export const dynamic = 'force-dynamic'

type ClientFilter = 'TOUS' | 'PRO' | 'PRIVE' | 'IMPAYE'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; page?: string }>
}) {
  const { type: rawType, q, page: pageParam } = await searchParams
  const validFilters = ['TOUS', 'PRO', 'PRIVE', 'IMPAYE']
  const currentFilter: ClientFilter = validFilters.includes(rawType ?? '')
    ? (rawType as ClientFilter)
    : 'TOUS'

  const user = await currentUser()
  const showMoney = user ? can.seeFinancials(user.role) : false
  const settings = await getSettings()

  const andConditions: any[] = []

  if (currentFilter === 'PRO') {
    andConditions.push({ isPro: true })
  } else if (currentFilter === 'PRIVE') {
    andConditions.push({ isPro: false })
  } else if (currentFilter === 'IMPAYE') {
    andConditions.push({
      orders: {
        some: {
          paidAt: null,
          status: { not: 'ANNULEE' },
        },
      },
    })
  }

  if (q && q.trim()) {
    const term = q.trim()
    const parsedNum = parseInt(term, 10)
    const orClauses: any[] = [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { city: { contains: term, mode: 'insensitive' } },
      { address: { contains: term, mode: 'insensitive' } },
    ]
    if (!Number.isNaN(parsedNum)) {
      orClauses.push({ customerNumber: parsedNum })
    }
    andConditions.push({ OR: orClauses })
  }

  const whereClause = andConditions.length > 0 ? { AND: andConditions } : {}

  const page = Math.max(1, parseInt(pageParam || '1', 10))
  const TAKE = 25
  const skip = (page - 1) * TAKE

  const [customers, totalCount, proCount, privateCount, unpaidClientsCount, filteredTotal] =
    await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: TAKE,
        skip,
        include: {
          orders: {
            select: {
              id: true,
              totalCents: true,
              status: true,
              paidAt: true,
              invoicedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.customer.count(),
      prisma.customer.count({ where: { isPro: true } }),
      prisma.customer.count({ where: { isPro: false } }),
      prisma.customer.count({
        where: {
          orders: {
            some: {
              paidAt: null,
              status: { not: 'ANNULEE' },
            },
          },
        },
      }),
      prisma.customer.count({ where: whereClause }),
    ])

  const totalPages = Math.ceil(filteredTotal / TAKE)

  const FILTERS = [
    { label: 'Tous les clients', value: 'TOUS' as ClientFilter, count: totalCount },
    { label: 'Professionnels (B2B)', value: 'PRO' as ClientFilter, count: proCount },
    { label: 'Particuliers', value: 'PRIVE' as ClientFilter, count: privateCount },
    {
      label: 'Avec factures en attente',
      value: 'IMPAYE' as ClientFilter,
      count: unpaidClientsCount,
      alert: unpaidClientsCount > 0,
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark">
            Carnet de clients
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Consultez les fiches clients, gérez les remises négociées et l&apos;historique des
            commandes.
          </p>
        </div>
        {user && can.manageOrders(user.role) && (
          <Link
            href="/admin/commandes/nouvelle"
            className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2"
          >
            <span>+</span>
            <span>Nouvelle commande client</span>
          </Link>
        )}
      </div>

      {/* Cartes métriques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
            Total clients
          </div>
          <div className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mt-1">
            {totalCount}
          </div>
          <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-0.5">
            Numérotation continue 100001+
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
            Comptes Pros
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
            {proCount}
          </div>
          <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-0.5">
            Tarifs B2B &amp; cavistes
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
            Particuliers
          </div>
          <div className="text-2xl font-bold text-text-primary dark:text-text-primary-dark mt-1">
            {privateCount}
          </div>
          <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-0.5">
            Commandes en direct
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">
            Clients avec impayés
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${unpaidClientsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
          >
            {unpaidClientsCount}
          </div>
          <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-0.5">
            {unpaidClientsCount > 0 ? 'Factures 30j en attente' : 'Tous à jour !'}
          </div>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ label, value, count, alert }) => {
            const isActive = currentFilter === value
            return (
              <Link
                key={value}
                href={value === 'TOUS' ? '/admin/clients' : `/admin/clients?type=${value}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : alert
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                      : 'bg-bg-card dark:bg-bg-card-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:bg-primary/10'
                }`}
              >
                {label}
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-pill ${
                    isActive
                      ? 'bg-white/20'
                      : alert
                        ? 'bg-amber-200/80 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100'
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
          <SearchClients />
        </Suspense>
      </div>

      {/* Table des clients */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark">
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                N° Client
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Client
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Statut &amp; Remise
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Localité
              </th>
              <th className="text-center px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Commandes
              </th>
              {showMoney && (
                <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Total dépensé
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Facturation
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={showMoney ? 8 : 7}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  Aucun client ne correspond à cette recherche.
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const validOrders = c.orders.filter((o) => o.status !== 'ANNULEE')
                const totalSpent = validOrders.reduce((sum, o) => sum + o.totalCents, 0)
                const hasUnpaid = validOrders.some((o) => !o.paidAt)
                const hasOverdue = validOrders.some((o) => {
                  if (o.paidAt) return false
                  const st = getInvoicePaymentStatus(o, settings.paymentTermsDays)
                  return st.isOverdue
                })

                return (
                  <tr
                    key={c.id}
                    className="border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        {c.customerNumber ? `N° ${c.customerNumber}` : '—'}
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-medium text-text-primary dark:text-text-primary-dark hover:underline block"
                      >
                        {c.lastName.toUpperCase()} {c.firstName}
                      </Link>
                      <div className="text-xs text-text-secondary dark:text-text-secondary-dark">
                        {c.email}
                        {c.phone && ` · ${c.phone}`}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {c.isPro ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          <span>PRO</span>
                          <span>
                            (
                            {c.proRatePercent !== null && c.proRatePercent !== undefined
                              ? `${c.proRatePercent}%`
                              : `${settings.proRatePercent}%`}
                            )
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
                          Particulier
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark text-xs">
                      {c.npa} {c.city || 'Suisse'}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-bg-page dark:bg-bg-page-dark font-medium">
                        {c.orders.length}
                      </span>
                    </td>

                    {showMoney && (
                      <td className="px-4 py-3 text-right font-medium text-text-primary dark:text-text-primary-dark">
                        {formatCHF(totalSpent)}
                      </td>
                    )}

                    <td className="px-4 py-3">
                      {hasOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          Retard
                        </span>
                      ) : hasUnpaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          En attente
                        </span>
                      ) : c.orders.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span>À jour</span>
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Consulter →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 gap-4">
          {page > 1 ? (
            <Link
              href={`/admin/clients?${new URLSearchParams({
                ...(rawType && { type: rawType }),
                ...(q && { q }),
                page: String(page - 1),
              }).toString()}`}
              className="px-3 py-1.5 text-sm rounded border border-border dark:border-border-dark hover:bg-bg-page dark:hover:bg-bg-page-dark transition-colors"
            >
              ← Précédent
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-sm rounded border border-border dark:border-border-dark opacity-50 cursor-not-allowed">
              ← Précédent
            </span>
          )}

          <span className="text-sm text-text-secondary dark:text-text-secondary-dark">
            Page {page} sur {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/admin/clients?${new URLSearchParams({
                ...(rawType && { type: rawType }),
                ...(q && { q }),
                page: String(page + 1),
              }).toString()}`}
              className="px-3 py-1.5 text-sm rounded border border-border dark:border-border-dark hover:bg-bg-page dark:hover:bg-bg-page-dark transition-colors"
            >
              Suivant →
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-sm rounded border border-border dark:border-border-dark opacity-50 cursor-not-allowed">
              Suivant →
            </span>
          )}
        </div>
      )}
    </div>
  )
}
