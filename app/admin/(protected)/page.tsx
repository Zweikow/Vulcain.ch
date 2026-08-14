import Link from 'next/link'
import { formatCHF } from '@/lib/money'
import { getDashboard, PERIODES, type DashboardData, type Periode } from '@/lib/dashboard'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

const EMPTY: DashboardData = {
  revenueCents: 0,
  shippedCount: 0,
  proShippedCount: 0,
  openOrders: 0,
  urgentOrders: 0,
  bottlesToPick: 0,
  averageBasketCents: 0,
  productCount: 0,
  buckets: [],
  alerts: [],
  topSales: [],
}

const heure = new Intl.DateTimeFormat('fr-CH', { hour: '2-digit', minute: '2-digit' })

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  // Le tableau de bord est financier de bout en bout : un préparateur est
  // renvoyé vers son écran de travail.
  await requireCapability(can.seeDashboard)

  const { periode: rawPeriode } = await searchParams
  const periode: Periode = (
    ['1M', '4M', '6M', '1A'].includes(rawPeriode ?? '') ? rawPeriode : '1M'
  ) as Periode

  let data = EMPTY
  let unavailable = false
  try {
    data = await getDashboard(periode)
  } catch (error) {
    console.warn('Données du tableau de bord indisponibles', error)
    unavailable = true
  }

  // Chaque indicateur porte une seconde ligne qui le qualifie : un chiffre sans
  // référent ne dit rien (DESIGN.md §3).
  const kpis = [
    {
      label: "Chiffre d'affaires",
      icon: '💰',
      value: formatCHF(data.revenueCents),
      detail:
        data.shippedCount === 0
          ? 'aucune expédition sur la période'
          : `${data.shippedCount} expédiée${data.shippedCount > 1 ? 's' : ''}${
              data.proShippedCount > 0 ? `, dont ${data.proShippedCount} pro` : ''
            }`,
      href: '/admin/commandes?statut=EXPEDIEE',
    },
    {
      label: 'Commandes à traiter',
      icon: '📦',
      value: String(data.openOrders),
      detail:
        data.urgentOrders > 0
          ? `${data.urgentOrders} livraison${data.urgentOrders > 1 ? 's' : ''} sous 48 h`
          : 'aucune échéance proche',
      href: '/admin/preparation',
    },
    {
      label: 'Bouteilles à sortir',
      icon: '🍾',
      value: String(data.bottlesToPick),
      detail:
        data.openOrders === 0
          ? 'plus rien à préparer'
          : `pour ${data.openOrders} commande${data.openOrders > 1 ? 's' : ''} ouverte${data.openOrders > 1 ? 's' : ''}`,
      href: '/admin/preparation',
    },
    {
      label: 'Panier moyen',
      icon: '🧾',
      value: formatCHF(data.averageBasketCents),
      detail: `${data.productCount} référence${data.productCount > 1 ? 's' : ''} au catalogue`,
      href: '/admin/produits',
    },
  ]

  return (
    <div>
      {/* En-tête */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-semibold text-text-primary dark:text-text-primary-dark">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
            Aperçu de l&apos;activité artisanale · mis à jour à {heure.format(new Date())}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIODES.map(({ label, value }) => (
            <Link
              key={value}
              href={`/admin?periode=${value}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                periode === value
                  ? 'bg-primary text-text-on-primary'
                  : 'border border-border bg-bg-card text-text-secondary hover:bg-primary/10 dark:border-border-dark dark:bg-bg-card-dark dark:text-text-secondary-dark'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {unavailable && (
        <div className="card mb-6 border-[#F3D5D5] bg-[#FDF2F2] p-4 text-sm text-[#C62828] dark:border-[#5a2a2a] dark:bg-[#2a1717] dark:text-[#EF5350]">
          Les données sont momentanément indisponibles. Vérifiez la connexion à la base.
        </div>
      )}

      {/* Indicateurs */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="card p-5 transition-colors hover:border-text-tertiary dark:hover:border-text-tertiary-dark"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-text-tertiary dark:text-text-tertiary-dark">
                {kpi.label}
              </span>
              <span aria-hidden>{kpi.icon}</span>
            </div>
            <p className="tabular mt-2 font-display text-2xl font-semibold text-text-primary dark:text-text-primary-dark">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-text-secondary dark:text-text-secondary-dark">
              {kpi.detail}
            </p>
          </Link>
        ))}
      </div>

      {/* Graphique et alertes */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
            Évolution du chiffre d&apos;affaires
          </h2>
          <RevenueChart buckets={data.buckets} />
        </section>

        <section className="card flex flex-col p-5">
          <h2 className="mb-4 font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
            Alerte de stock
          </h2>
          {/* N'apparaît que si un produit actif passe sous son seuil (DESIGN.md §3) */}
          {data.alerts.length === 0 ? (
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
              Aucun produit actif sous son seuil d&apos;alerte.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.alerts.map((a) => {
                const critical = a.stock === 0
                return (
                  <li key={a.id}>
                    <Link
                      href="/admin/produits"
                      className={`flex items-center justify-between gap-2 rounded-lg border p-3 transition-opacity hover:opacity-80 ${
                        critical
                          ? 'border-[#C62828]/20 bg-[#FDF2F2] dark:bg-[#2a1717]'
                          : 'border-[#FFB300]/30 bg-[#FFF8E1] dark:bg-[#3d2a0a]'
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                          {a.name}
                        </span>
                        <span
                          className={`text-sm ${critical ? 'text-[#C62828] dark:text-[#EF5350]' : 'text-text-warning dark:text-[#FF9800]'}`}
                        >
                          {a.stock === 0
                            ? 'épuisé'
                            : `${a.stock} bouteille${a.stock > 1 ? 's' : ''} restante${a.stock > 1 ? 's' : ''}`}
                          {' · seuil '}
                          {a.threshold}
                        </span>
                      </span>
                      <span aria-hidden className="text-text-tertiary dark:text-text-tertiary-dark">
                        ›
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Meilleures ventes */}
      <section className="card overflow-hidden">
        <div className="border-b border-border p-5 dark:border-border-dark">
          <h2 className="font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
            Meilleures ventes
          </h2>
        </div>
        {data.topSales.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-tertiary dark:text-text-tertiary-dark">
            Aucune vente sur la période.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabular w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-page text-left text-[11px] uppercase tracking-[.08em] text-text-secondary dark:border-border-dark dark:bg-bg-page-dark dark:text-text-secondary-dark">
                  <th className="px-4 py-3 font-semibold">Cuvée</th>
                  <th className="px-4 py-3 font-semibold">Catégorie</th>
                  <th className="px-4 py-3 text-right font-semibold">Ventes</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenus</th>
                  <th className="px-4 py-3 text-right font-semibold">Tendance</th>
                </tr>
              </thead>
              <tbody>
                {data.topSales.map((s) => (
                  <tr
                    key={s.productName}
                    className="border-b border-border-light last:border-0 hover:bg-bg-page/50 dark:border-border-light-dark dark:hover:bg-bg-page-dark/50"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                      {s.productName}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {s.categoryName}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary dark:text-text-primary-dark">
                      {s.quantity} btl
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary dark:text-text-primary-dark">
                      {formatCHF(s.revenueCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.trend === null ? (
                        <span className="text-text-tertiary dark:text-text-tertiary-dark">
                          nouveau
                        </span>
                      ) : (
                        <span
                          className={
                            s.trend > 0
                              ? 'text-text-success'
                              : s.trend < 0
                                ? 'text-text-error'
                                : 'text-text-tertiary dark:text-text-tertiary-dark'
                          }
                        >
                          {s.trend > 0 ? '↑' : s.trend < 0 ? '↓' : '—'} {Math.abs(s.trend)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
