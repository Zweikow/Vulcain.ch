import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { formatCHF } from '@/lib/money'
import { getDashboard, PERIODES, type DashboardData, type Periode } from '@/lib/dashboard'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import {
  RevenueIcon,
  MarginIcon,
  PreparationIcon,
  BottleIcon,
  CommandesIcon,
  FacturesIcon,
  CoinsIcon,
  TruckIcon,
  AlertCircleIcon,
  CheckIcon,
} from '@/components/admin/AdminIcons'

const EMPTY: DashboardData = {
  revenueCents: 0,
  previousRevenueCents: 0,
  revenueTrend: null,
  marginCents: 0,
  previousMarginCents: 0,
  marginTrend: null,
  purchaseTotalCents: 0,
  shippedCount: 0,
  proShippedCount: 0,
  paidRevenueCents: 0,
  unpaidRevenueCents: 0,
  overdueInvoiceCount: 0,
  overdueTotalCents: 0,
  overdueInvoices: [],
  openOrders: 0,
  pickupOrdersCount: 0,
  shippingOrdersCount: 0,
  missingTrackingCount: 0,
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
  const validPeriodes = PERIODES.map((p) => p.value)
  const periode: Periode = validPeriodes.includes(rawPeriode as Periode)
    ? (rawPeriode as Periode)
    : '1M'

  let data = EMPTY
  let unavailable = false
  try {
    data = await getDashboard(periode)
  } catch (error) {
    console.warn('Données du tableau de bord indisponibles', error)
    unavailable = true
  }

  // Grille 2x3 : 3 cartes Finance/Ventes + 3 cartes Logistique/Cave
  const kpis = [
    {
      label: "Chiffre d'affaires",
      icon: RevenueIcon,
      value: formatCHF(data.revenueCents),
      trend: data.revenueTrend,
      detail:
        data.shippedCount === 0
          ? 'aucune expédition sur la période'
          : `${data.shippedCount} expédiée${data.shippedCount > 1 ? 's' : ''}${
              data.proShippedCount > 0 ? ` (dont ${data.proShippedCount} pro)` : ''
            }`,
      badge: null,
      href: '/admin/commandes?statut=EXPEDIEE',
    },
    {
      label: 'Marge brute',
      icon: MarginIcon,
      value: formatCHF(data.marginCents),
      trend: data.marginTrend,
      detail:
        data.revenueCents > 0
          ? `${Math.round((data.marginCents / data.revenueCents) * 100)}% de marge · Achats : ${formatCHF(data.purchaseTotalCents)}`
          : `Achats : ${formatCHF(data.purchaseTotalCents)}`,
      badge: null,
      href: '/admin/commandes?statut=EXPEDIEE',
    },
    {
      label: 'Trésorerie encaissée',
      icon: CoinsIcon,
      value: formatCHF(data.paidRevenueCents),
      trend: null,
      badge:
        data.overdueInvoiceCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded bg-[#FDF2F2] px-1.5 py-0.5 text-[11px] font-semibold text-[#C62828] dark:bg-[#2a1717] dark:text-[#EF5350]">
            <AlertCircleIcon className="w-3 h-3" />
            {data.overdueInvoiceCount} en retard
          </span>
        ) : null,
      detail:
        data.overdueInvoiceCount > 0
          ? `${data.overdueInvoiceCount} retard${data.overdueInvoiceCount > 1 ? 's' : ''} (${formatCHF(data.overdueTotalCents)}) · En attente : ${formatCHF(data.unpaidRevenueCents)}`
          : `En attente de règlement : ${formatCHF(data.unpaidRevenueCents)}`,
      href: '/admin/factures',
    },
    {
      label: 'Commandes à traiter',
      icon: PreparationIcon,
      value: String(data.openOrders),
      trend: null,
      badge:
        data.urgentOrders > 0 ? (
          <span className="inline-flex items-center gap-1 rounded bg-[#FFF8E1] px-1.5 py-0.5 text-[11px] font-semibold text-text-warning dark:bg-[#3d2a0a] dark:text-[#FF9800]">
            {data.urgentOrders} &lt; 48h
          </span>
        ) : null,
      detail:
        data.openOrders === 0
          ? 'aucune commande en attente'
          : `${data.shippingOrdersCount} DPD · ${data.pickupOrdersCount} retrait${data.pickupOrdersCount > 1 ? 's' : ''} cave`,
      href: '/admin/preparation',
    },
    {
      label: 'Bouteilles à sortir',
      icon: BottleIcon,
      value: String(data.bottlesToPick),
      trend: null,
      badge: null,
      detail:
        data.openOrders === 0
          ? 'plus rien à préparer'
          : `pour ${data.openOrders} commande${data.openOrders > 1 ? 's' : ''} en cours`,
      href: '/admin/preparation',
    },
    {
      label: 'Panier moyen',
      icon: CommandesIcon,
      value: formatCHF(data.averageBasketCents),
      trend: null,
      badge: null,
      detail: `${data.productCount} référence${data.productCount > 1 ? 's' : ''} actives au catalogue`,
      href: '/admin/produits',
    },
  ]

  return (
    <div>
      {/* En-tête avec titre et actions rapides */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-semibold text-text-primary dark:text-text-primary-dark">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
            Aperçu de l&apos;activité artisanale · mis à jour à {heure.format(new Date())}
          </p>

          {/* Raccourcis d'actions rapides */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/admin/commandes/nouvelle"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-text-on-primary shadow-sm hover:bg-primary/90 transition-colors"
            >
              <span className="text-sm leading-none font-bold">+</span>
              <span>Nouvelle commande</span>
            </Link>
            <Link
              href="/admin/preparation"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-primary/10 transition-colors dark:border-border-dark dark:bg-bg-card-dark dark:text-text-primary-dark"
            >
              <PreparationIcon className="w-3.5 h-3.5 text-primary-text" />
              <span>Préparation cave</span>
              {data.openOrders > 0 && (
                <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.2 text-[11px] font-semibold text-primary-text">
                  {data.openOrders}
                </span>
              )}
            </Link>
            <Link
              href="/admin/factures"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-primary/10 transition-colors dark:border-border-dark dark:bg-bg-card-dark dark:text-text-primary-dark"
            >
              <FacturesIcon className="w-3.5 h-3.5 text-primary-text" />
              <span>Factures & Règlements</span>
              {data.overdueInvoiceCount > 0 && (
                <span className="ml-0.5 rounded-full bg-[#FDF2F2] px-1.5 py-0.2 text-[11px] font-semibold text-[#C62828] dark:bg-[#2a1717] dark:text-[#EF5350]">
                  {data.overdueInvoiceCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Sélecteur de période et export CSV */}
        <div className="flex flex-col items-start md:items-end gap-3">
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
          <a
            href={`/api/admin/export-achats?periode=${periode}`}
            className="text-xs font-medium text-text-secondary hover:text-primary-text transition-colors flex items-center gap-1 bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark px-2 py-1 rounded-md shadow-sm"
          >
            <ArrowDown className="h-3 w-3" aria-hidden /> Décompte d&apos;achat CSV
          </a>
        </div>
      </div>

      {unavailable && (
        <div className="card mb-6 border-[#F3D5D5] bg-[#FDF2F2] p-4 text-sm text-[#C62828] dark:border-[#5a2a2a] dark:bg-[#2a1717] dark:text-[#EF5350]">
          Les données sont momentanément indisponibles. Vérifiez la connexion à la base.
        </div>
      )}

      {/* Grille d'indicateurs 2x3 */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="card p-5 transition-colors hover:border-text-tertiary dark:hover:border-text-tertiary-dark flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-text-tertiary dark:text-text-tertiary-dark">
                    {kpi.label}
                  </span>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 dark:bg-primary/15 text-primary-text shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <p className="tabular font-display text-2xl font-semibold text-text-primary dark:text-text-primary-dark">
                    {kpi.value}
                  </p>
                  {kpi.trend !== null && (
                    <span
                      className={`text-xs font-semibold ${
                        kpi.trend > 0
                          ? 'text-text-success'
                          : kpi.trend < 0
                            ? 'text-text-error'
                            : 'text-text-tertiary dark:text-text-tertiary-dark'
                      }`}
                    >
                      {kpi.trend > 0 ? (
                        <ArrowUp className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                      ) : kpi.trend < 0 ? (
                        <ArrowDown className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                      ) : (
                        '—'
                      )}{' '}
                      {Math.abs(kpi.trend)}%
                    </span>
                  )}
                  {kpi.badge}
                </div>
              </div>
              <p className="mt-2 text-xs text-text-secondary dark:text-text-secondary-dark">
                {kpi.detail}
              </p>
            </Link>
          )
        })}
      </div>

      {/* Graphique et panneau d'alertes */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
            Évolution du chiffre d&apos;affaires
          </h2>
          <RevenueChart buckets={data.buckets} />
        </section>

        {/* Panneau d'alertes : Trésorerie en retard, Suivis manquants, Stock bas */}
        <section className="card flex flex-col p-5 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
              Alertes & Suivi
            </h2>
            {data.overdueInvoiceCount > 0 ||
            data.alerts.length > 0 ||
            data.missingTrackingCount > 0 ? (
              <span className="rounded-full bg-[#FDF2F2] px-2 py-0.5 text-xs font-semibold text-[#C62828] dark:bg-[#2a1717] dark:text-[#EF5350]">
                {(data.overdueInvoiceCount > 0 ? 1 : 0) +
                  data.alerts.length +
                  (data.missingTrackingCount > 0 ? 1 : 0)}{' '}
                action
                {(data.overdueInvoiceCount > 0 ? 1 : 0) +
                  data.alerts.length +
                  (data.missingTrackingCount > 0 ? 1 : 0) >
                1
                  ? 's'
                  : ''}
              </span>
            ) : null}
          </div>

          {/* 1. Alerte factures en retard (> 30j) */}
          {data.overdueInvoiceCount > 0 && (
            <div className="rounded-lg border border-[#C62828]/20 bg-[#FDF2F2] p-3 text-sm dark:bg-[#2a1717]">
              <div className="flex items-center justify-between gap-1 text-[#C62828] dark:text-[#EF5350] font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertCircleIcon className="w-4 h-4" />
                  {data.overdueInvoiceCount} facture{data.overdueInvoiceCount > 1 ? 's' : ''} en
                  retard
                </span>
                <span className="tabular font-display">{formatCHF(data.overdueTotalCents)}</span>
              </div>
              <ul className="mt-2 space-y-1.5 border-t border-[#C62828]/10 pt-2 text-xs">
                {data.overdueInvoices.slice(0, 3).map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/admin/factures?recherche=${encodeURIComponent(inv.numero)}`}
                      className="flex items-center justify-between text-text-primary dark:text-text-primary-dark hover:underline"
                    >
                      <span className="truncate max-w-[160px]">
                        {inv.clientName} ({inv.invoiceNumber ?? inv.numero})
                      </span>
                      <span className="font-semibold text-[#C62828] dark:text-[#EF5350] tabular ml-2 shrink-0">
                        +{inv.daysOverdue} j · {formatCHF(inv.totalCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-right">
                <Link
                  href="/admin/factures"
                  className="text-xs font-medium text-[#C62828] dark:text-[#EF5350] hover:underline"
                >
                  Gérer les factures en retard{' '}
                  <ArrowRight className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                </Link>
              </div>
            </div>
          )}

          {/* 2. Alerte expéditions sans numéro de suivi */}
          {data.missingTrackingCount > 0 && (
            <Link
              href="/admin/commandes?statut=EXPEDIEE"
              className="flex items-center justify-between rounded-lg border border-[#FFB300]/30 bg-[#FFF8E1] p-3 text-xs text-text-warning transition-opacity hover:opacity-85 dark:bg-[#3d2a0a] dark:text-[#FF9800]"
            >
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{data.missingTrackingCount}</strong> expédition
                  {data.missingTrackingCount > 1 ? 's' : ''} sans numéro de suivi DPD
                </span>
              </div>
              <span aria-hidden>›</span>
            </Link>
          )}

          {/* 3. Alertes de stock */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary dark:text-text-tertiary-dark">
              Niveaux de stock
            </h3>
            {data.alerts.length === 0 ? (
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Tous les stocks sont au-dessus de leur seuil d&apos;alerte.
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
                        <span className="truncate">
                          <span className="block text-sm font-semibold text-text-primary dark:text-text-primary-dark truncate">
                            {a.name}
                          </span>
                          <span
                            className={`text-xs ${
                              critical
                                ? 'text-[#C62828] dark:text-[#EF5350]'
                                : 'text-text-warning dark:text-[#FF9800]'
                            }`}
                          >
                            {a.stock === 0
                              ? 'épuisé'
                              : `${a.stock} bouteille${a.stock > 1 ? 's' : ''} restante${a.stock > 1 ? 's' : ''}`}
                            {' · seuil '}
                            {a.threshold}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className="text-text-tertiary dark:text-text-tertiary-dark"
                        >
                          ›
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Statut serein si aucune alerte */}
          {data.overdueInvoiceCount === 0 &&
            data.alerts.length === 0 &&
            data.missingTrackingCount === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-page/50 p-3 text-xs text-text-secondary dark:border-border-dark dark:bg-bg-page-dark/50 dark:text-text-secondary-dark">
                <CheckIcon className="w-4 h-4 text-text-success shrink-0" />
                <span>Tous les indicateurs opérationnels et financiers sont au vert.</span>
              </div>
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
                  <th className="hidden sm:table-cell px-4 py-3 font-semibold">Catégorie</th>
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
                    <td className="hidden sm:table-cell px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
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
                          {s.trend > 0 ? (
                            <ArrowUp className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                          ) : s.trend < 0 ? (
                            <ArrowDown className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                          ) : (
                            '—'
                          )}{' '}
                          {Math.abs(s.trend)}%
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
