import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { OrderStatus } from '@prisma/client'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'

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
  searchParams: Promise<{ statut?: string }>
}) {
  const { statut: rawStatut } = await searchParams
  const validStatuts = ['A_TRAITER', 'EN_PREPARATION', 'EXPEDIEE', 'ANNULEE']
  const statut: StatusFilter = validStatuts.includes(rawStatut ?? '')
    ? (rawStatut as OrderStatus)
    : 'TOUTES'

  const user = await currentUser()
  const showMoney = user ? can.seeFinancials(user.role) : false

  const whereClause = statut === 'TOUTES' ? {} : { status: statut as OrderStatus }

  const [commandes, counts] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numero: true,
        clientName: true,
        clientEmail: true,
        totalCents: true,
        status: true,
        createdAt: true,
      },
    }),
    Promise.all(
      [
        OrderStatus.A_TRAITER,
        OrderStatus.EN_PREPARATION,
        OrderStatus.EXPEDIEE,
        OrderStatus.ANNULEE,
      ].map((s) => prisma.order.count({ where: { status: s } }))
    ),
  ])

  const countMap: Record<OrderStatus, number> = {
    A_TRAITER: counts[0],
    EN_PREPARATION: counts[1],
    EXPEDIEE: counts[2],
    ANNULEE: counts[3],
  }
  const totalCount = counts.reduce((a, b) => a + b, 0)

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

      {/* Filtres */}
      <div className="flex gap-2 mb-6">
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
    </div>
  )
}
