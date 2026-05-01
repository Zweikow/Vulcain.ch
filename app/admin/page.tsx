import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { OrderStatus } from '@prisma/client'

type Periode = '1M' | '4M' | '6M' | '1A'

const PERIODES: { label: string; value: Periode }[] = [
  { label: '1 mois', value: '1M' },
  { label: '4 mois', value: '4M' },
  { label: '6 mois', value: '6M' },
  { label: '1 an', value: '1A' },
]

function getPeriodStart(periode: Periode): Date {
  const d = new Date()
  switch (periode) {
    case '4M': d.setMonth(d.getMonth() - 4); break
    case '6M': d.setMonth(d.getMonth() - 6); break
    case '1A': d.setFullYear(d.getFullYear() - 1); break
    default:   d.setMonth(d.getMonth() - 1); break
  }
  return d
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  const { periode: rawPeriode } = await searchParams
  const periode: Periode = (['1M', '4M', '6M', '1A'].includes(rawPeriode ?? '')
    ? rawPeriode
    : '1M') as Periode

  const since = getPeriodStart(periode)

  const [aTraiter, enPreparation, expediee, caResult, recentOrders] =
    await Promise.all([
      prisma.order.count({
        where: { status: OrderStatus.A_TRAITER, createdAt: { gte: since } },
      }),
      prisma.order.count({
        where: { status: OrderStatus.EN_PREPARATION, createdAt: { gte: since } },
      }),
      prisma.order.count({
        where: { status: OrderStatus.EXPEDIEE, createdAt: { gte: since } },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          numero: true,
          clientName: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

  const caTotal = Number(caResult._sum.total ?? 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary-dark">
            Tableau de bord
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Vue d'ensemble de la cidrerie
          </p>
        </div>

        {/* Filtres période */}
        <div className="flex gap-2">
          {PERIODES.map(({ label, value }) => (
            <Link
              key={value}
              href={`/admin?periode=${value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periode === value
                  ? 'bg-primary text-white'
                  : 'bg-bg-card dark:bg-bg-card-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:bg-primary/10'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-xs text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide mb-1">
            À traiter
          </div>
          <div className="text-3xl font-bold text-text-warning dark:text-[#FF9800]">
            {aTraiter}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide mb-1">
            En préparation
          </div>
          <div className="text-3xl font-bold text-[#1565C0] dark:text-[#64B5F6]">
            {enPreparation}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide mb-1">
            Expédiées
          </div>
          <div className="text-3xl font-bold text-text-success dark:text-[#81C784]">
            {expediee}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide mb-1">
            Chiffre d'affaires
          </div>
          <div className="text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            CHF {caTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Commandes récentes */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
          <h2 className="font-medium text-text-primary dark:text-text-primary-dark">
            Commandes récentes
          </h2>
          <Link
            href="/admin/commandes"
            className="text-sm text-primary hover:text-primary-hover"
          >
            Voir toutes →
          </Link>
        </div>
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
                Total
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Statut
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  Aucune commande sur cette période
                </td>
              </tr>
            ) : (
              recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-text-primary dark:text-text-primary-dark">
                    {order.numero}
                  </td>
                  <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark">
                    {order.clientName}
                  </td>
                  <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark">
                    CHF {Number(order.total).toFixed(2)}
                  </td>
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
