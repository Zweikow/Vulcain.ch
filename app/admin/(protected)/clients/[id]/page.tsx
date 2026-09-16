import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge'
import { CustomerDetailForm } from '@/components/admin/CustomerDetailForm'
import { CheckIcon, AlertCircleIcon } from '@/components/admin/AdminIcons'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await currentUser()
  const canManage = user ? can.manageCustomers(user.role) : false
  const showMoney = user ? can.seeFinancials(user.role) : false

  const [customer, settings] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            numero: true,
            clientType: true,
            invoiceNumber: true,
            status: true,
            totalCents: true,
            paidAt: true,
            paymentMethod: true,
            invoicedAt: true,
            createdAt: true,
            reminderCount: true,
            items: {
              select: {
                id: true,
                productName: true,
                quantity: true,
              },
            },
          },
        },
      },
    }),
    getSettings(),
  ])

  if (!customer) notFound()

  // La première commande est la plus ancienne de l'historique
  const sortedAscOrders = [...customer.orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const firstOrder = sortedAscOrders.find((o) => o.status !== 'ANNULEE') ?? null

  const validOrders = customer.orders.filter((o) => o.status !== 'ANNULEE')
  const totalSpent = validOrders.reduce((sum, o) => sum + o.totalCents, 0)
  const unpaidOrders = validOrders.filter((o) => !o.paidAt)
  const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.totalCents, 0)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
        <Link href="/admin/clients" className="hover:text-primary transition-colors">
          Clients
        </Link>
        <span>/</span>
        <span className="font-mono text-text-primary dark:text-text-primary-dark">
          {customer.customerNumber ? `N° ${customer.customerNumber}` : customer.lastName}
        </span>
      </div>

      {/* En-tête de la fiche client */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold px-2.5 py-1 rounded bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark">
              {customer.customerNumber ? `N° ${customer.customerNumber}` : 'Client'}
            </span>
            <h1 className="font-display font-semibold text-2xl sm:text-3xl text-text-primary dark:text-text-primary-dark">
              {customer.firstName} {customer.lastName}
            </h1>
            {customer.isPro ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                PRO (
                {customer.proRatePercent !== null && customer.proRatePercent !== undefined
                  ? `${customer.proRatePercent}% sur mesure`
                  : `${settings.proRatePercent}% standard`}
                )
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg-page dark:bg-bg-page-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark">
                Particulier
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-2">
            Client depuis le{' '}
            {new Date(customer.createdAt).toLocaleDateString('fr-CH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/commandes/nouvelle"
            className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2"
          >
            <span>+</span>
            <span>Créer une commande</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonne gauche : Formulaire coordonnées, conditions et notes (7 colonnes) */}
        <div className="lg:col-span-7">
          <CustomerDetailForm
            customer={{
              id: customer.id,
              customerNumber: customer.customerNumber,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              npa: customer.npa,
              city: customer.city,
              isPro: customer.isPro,
              proRatePercent: customer.proRatePercent,
              notes: customer.notes,
              createdAt: customer.createdAt,
              updatedAt: customer.updatedAt,
              ordersCount: customer.orders.length,
            }}
            firstOrder={
              firstOrder
                ? {
                    id: firstOrder.id,
                    numero: firstOrder.numero,
                    clientType: firstOrder.clientType,
                    totalCents: firstOrder.totalCents,
                    status: firstOrder.status,
                  }
                : null
            }
            globalProRate={settings.proRatePercent}
            canManage={canManage}
          />
        </div>

        {/* Colonne droite : Résumé financier & Historique des commandes (5 colonnes) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Métriques d'achat */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-text-primary dark:text-text-primary-dark mb-4">
              Activité &amp; Chiffres
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-bg-page dark:bg-bg-page-dark rounded-lg border border-border dark:border-border-dark">
                <span className="text-xs text-text-secondary dark:text-text-secondary-dark block">
                  Commandes
                </span>
                <span className="text-xl font-bold text-text-primary dark:text-text-primary-dark mt-0.5 block">
                  {customer.orders.length}
                </span>
              </div>

              {showMoney && (
                <div className="p-3 bg-bg-page dark:bg-bg-page-dark rounded-lg border border-border dark:border-border-dark">
                  <span className="text-xs text-text-secondary dark:text-text-secondary-dark block">
                    Total dépensé
                  </span>
                  <span className="text-xl font-bold text-text-primary dark:text-text-primary-dark mt-0.5 block">
                    {formatCHF(totalSpent)}
                  </span>
                </div>
              )}

              {showMoney && (
                <div
                  className={`col-span-2 p-3 rounded-lg border ${unpaidOrders.length > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium block">
                        Factures en attente de paiement
                      </span>
                      <span className="text-base font-bold mt-0.5 block">
                        {unpaidOrders.length === 0
                          ? 'À jour (0 CHF impayé)'
                          : `${unpaidOrders.length} facture(s) · ${formatCHF(unpaidAmount)}`}
                      </span>
                    </div>
                    {unpaidOrders.length === 0 ? (
                      <CheckIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Liste des commandes */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border dark:border-border-dark flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary dark:text-text-primary-dark">
                Historique des commandes ({customer.orders.length})
              </h3>
            </div>

            {customer.orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-tertiary dark:text-text-tertiary-dark">
                Aucune commande enregistrée pour ce client.
              </div>
            ) : (
              <div className="divide-y divide-border dark:divide-border-dark">
                {customer.orders.map((order) => {
                  const totalBottles = order.items.reduce((s, i) => s + i.quantity, 0)
                  return (
                    <div
                      key={order.id}
                      className="p-4 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/admin/commandes/${order.id}`}
                            className="font-mono text-sm font-semibold text-primary hover:underline"
                          >
                            {order.numero}
                          </Link>
                          {order.invoiceNumber && (
                            <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark ml-2">
                              (Facture {order.invoiceNumber})
                            </span>
                          )}
                          <div className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                            {new Date(order.createdAt).toLocaleDateString('fr-CH', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            · {totalBottles} bouteille{totalBottles > 1 ? 's' : ''}
                          </div>
                        </div>

                        <div className="text-right">
                          {showMoney && (
                            <div className="font-semibold text-sm text-text-primary dark:text-text-primary-dark">
                              {formatCHF(order.totalCents)}
                            </div>
                          )}
                          <div className="mt-1 flex items-center justify-end gap-1.5">
                            <StatusBadge status={order.status} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-dashed border-border dark:border-border-dark flex items-center justify-between gap-2">
                        <PaymentStatusBadge
                          paidAt={order.paidAt}
                          paymentMethod={order.paymentMethod}
                          invoicedAt={order.invoicedAt}
                          createdAt={order.createdAt}
                          reminderCount={order.reminderCount}
                          paymentTermsDays={settings.paymentTermsDays}
                        />

                        <div className="flex items-center gap-3 text-xs font-medium">
                          <Link
                            href={`/admin/commandes/${order.id}/facture`}
                            className="text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Facture A4 ↗
                          </Link>
                          <Link
                            href={`/admin/commandes/${order.id}`}
                            className="text-primary hover:underline"
                          >
                            Détails →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
