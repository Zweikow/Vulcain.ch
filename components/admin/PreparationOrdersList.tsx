'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderStatus } from '@prisma/client'
import { formatCHF } from '@/lib/money'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { calculateOrderPackages, getDefaultPlanzerDates } from '@/lib/planzer'
import { advanceStatus } from '@/app/admin/(protected)/preparation/actions'
import { TruckIcon } from '@/components/admin/AdminIcons'

export interface PreparationOrder {
  id: string
  numero: string
  status: OrderStatus
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  clientType?: string | null
  address: string
  npa: string
  city: string
  totalCents: number
  isPickup: boolean
  deliveryDate?: Date | string | null
  message?: string | null
  carrier?: string | null
  items: Array<{
    id: string
    productName: string
    quantity: number
    bottlesPerUnit?: number
    bottleSize?: string | null
  }>
}

interface PreparationOrdersListProps {
  orders: PreparationOrder[]
  showMoney: boolean
  nextActionLabels: Partial<Record<OrderStatus, string>>
}

export function PreparationOrdersList({
  orders,
  showMoney,
  nextActionLabels,
}: PreparationOrdersListProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Calcul de la date d'enlèvement par défaut (aujourd'hui ou demain si >14h, décalé si weekend)
  const defaultPickupStr = useMemo(() => {
    const d = getDefaultPlanzerDates().pickupDate
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pickupDate, setPickupDate] = useState<string>(defaultPickupStr)
  const [markAsPreparing, setMarkAsPreparing] = useState<boolean>(true)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  // Commandes expédiables (non retrait en cave)
  const shippableOrders = useMemo(() => orders.filter((o) => !o.isPickup), [orders])

  // Données des commandes actuellement sélectionnées
  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.includes(o.id) && !o.isPickup),
    [orders, selectedIds]
  )

  // Calcul du nombre de colis et du poids total estimé pour la sélection
  const selectionStats = useMemo(() => {
    let totalPackages = 0
    let totalWeight = 0
    for (const order of selectedOrders) {
      const pkgs = calculateOrderPackages({
        id: order.id,
        numero: order.numero,
        clientName: order.clientName,
        clientEmail: order.clientEmail,
        clientPhone: order.clientPhone,
        clientType: order.clientType,
        address: order.address,
        npa: order.npa,
        city: order.city,
        isPickup: order.isPickup,
        items: order.items,
      })
      totalPackages += pkgs.length
      totalWeight += pkgs.reduce((sum, p) => sum + p.weightKg, 0)
    }
    return {
      packagesCount: totalPackages,
      totalWeightKg: Math.round(totalWeight * 10) / 10,
    }
  }, [selectedOrders])

  const toggleOrder = (orderId: string) => {
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    )
  }

  const selectAllShippable = () => {
    setSelectedIds(shippableOrders.map((o) => o.id))
  }

  const deselectAll = () => {
    setSelectedIds([])
  }

  const handleExport = async (singleOrderId?: string) => {
    const idsToExport = singleOrderId ? [singleOrderId] : selectedIds
    if (idsToExport.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Veuillez cocher au moins une commande à exporter.',
      })
      return
    }

    setFeedback(null)
    setIsExporting(true)

    try {
      const response = await fetch('/api/admin/export-planzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: idsToExport,
          pickupDate,
          markAsPreparing,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur lors de la génération de l'export Planzer.")
      }

      // Téléchargement du fichier CSV
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `planzer_commandes_${pickupDate}.csv`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) filename = match[1]
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setFeedback({
        type: 'success',
        message: `Fichier CSV Planzer téléchargé avec succès (${idsToExport.length} commande${
          idsToExport.length > 1 ? 's' : ''
        }, ${selectionStats.packagesCount || 1} colis).`,
      })

      // Décocher si tout a été exporté
      if (!singleOrderId) {
        setSelectedIds([])
      }

      if (markAsPreparing) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Une erreur inattendue est survenue.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Barre d'actions & Export Planzer */}
      <div className="card p-4 bg-gradient-to-r from-bg-card to-primary/5 dark:from-bg-card-dark dark:to-primary/10 border border-primary/20 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary dark:text-primary-dark">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
                Export Planzer Colis
                <span className="text-xs font-normal text-text-tertiary">
                  (Collecte : Les Paccots · Stock)
                </span>
              </h3>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Sélectionnez les commandes à expédier pour générer le fichier CSV d&apos;import
                officiel Planzer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length === 0 ? (
              <button
                type="button"
                onClick={selectAllShippable}
                disabled={shippableOrders.length === 0}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Tout cocher ({shippableOrders.length})
              </button>
            ) : (
              <button
                type="button"
                onClick={deselectAll}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Tout décocher
              </button>
            )}
          </div>
        </div>

        {/* Panneau de configuration d'export actif si au moins 1 commande cochée */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/80 dark:border-border-dark/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-primary text-white font-medium">
                <strong>{selectedIds.length}</strong> commande{selectedIds.length > 1 ? 's' : ''}{' '}
                sélectionnée{selectedIds.length > 1 ? 's' : ''}
              </span>

              <span className="text-text-secondary dark:text-text-secondary-dark font-medium">
                📦 {selectionStats.packagesCount} colis estimés · ~{selectionStats.totalWeightKg} kg
              </span>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="pickupDate"
                  className="font-medium text-text-secondary dark:text-text-secondary-dark"
                >
                  Date d&apos;enlèvement :
                </label>
                <input
                  type="date"
                  id="pickupDate"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="input px-2 py-1 text-xs rounded border border-border bg-bg-page dark:bg-bg-page-dark"
                />
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary dark:text-text-secondary-dark">
                <input
                  type="checkbox"
                  checked={markAsPreparing}
                  onChange={(e) => setMarkAsPreparing(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                <span>Passer automatiquement en préparation</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => handleExport()}
              disabled={isExporting}
              className="btn-primary text-xs px-4 py-2 font-semibold shadow-sm flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <span className="animate-spin">⏳</span> Génération du CSV...
                </>
              ) : (
                <>
                  <TruckIcon className="w-4 h-4" />
                  Télécharger CSV Planzer ({selectedIds.length})
                </>
              )}
            </button>
          </div>
        )}

        {/* Message de confirmation ou d'erreur */}
        {feedback && (
          <div
            className={`mt-3 p-2.5 rounded-md text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-text-tertiary hover:text-text-primary ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Cartes de commandes */}
      {orders.map((order) => {
        const isSelected = selectedIds.includes(order.id)
        const orderPkgs = calculateOrderPackages({
          id: order.id,
          numero: order.numero,
          clientName: order.clientName,
          clientEmail: order.clientEmail,
          clientPhone: order.clientPhone,
          clientType: order.clientType,
          address: order.address,
          npa: order.npa,
          city: order.city,
          isPickup: order.isPickup,
          items: order.items,
        })
        const totalWeight = Math.round(orderPkgs.reduce((sum, p) => sum + p.weightKg, 0) * 10) / 10

        return (
          <article
            key={order.id}
            className={`card p-5 transition-all ${
              isSelected
                ? 'ring-2 ring-primary border-transparent bg-primary/[0.02] dark:bg-primary/[0.04]'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {/* Case à cocher multi-sélection */}
                {order.isPickup ? (
                  <span
                    title="Commande à retirer à la cave (non éligible Planzer)"
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                  >
                    🏠 Retrait cave
                  </span>
                ) : (
                  <input
                    type="checkbox"
                    id={`select-order-${order.id}`}
                    aria-label={`Sélectionner la commande ${order.numero} pour l'export Planzer`}
                    checked={isSelected}
                    onChange={() => toggleOrder(order.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                )}

                <Link
                  href={`/admin/commandes/${order.id}`}
                  className="font-mono text-sm font-semibold text-text-primary dark:text-text-primary-dark hover:underline"
                >
                  {order.numero}
                </Link>
                <StatusBadge status={order.status} />

                {order.clientType === 'PRO' && (
                  <span className="rounded-pill bg-accent-mauve-dark px-2.5 py-0.5 text-xs font-semibold text-white">
                    Pro
                  </span>
                )}

                {!order.isPickup && (
                  <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
                    📦 {orderPkgs.length} colis (~{totalWeight} kg)
                  </span>
                )}
              </div>

              {showMoney && (
                <span className="tabular text-sm font-bold text-text-primary dark:text-text-primary-dark">
                  {formatCHF(order.totalCents)}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
              {order.clientName} · {order.address}, {order.npa} {order.city}
              {order.deliveryDate && (
                <>
                  {' '}
                  · livraison souhaitée le{' '}
                  {new Date(order.deliveryDate).toLocaleDateString('fr-CH')}
                </>
              )}
            </p>

            {/* Articles en pastilles lisibles à distance */}
            <ul className="mt-3 flex flex-wrap gap-2">
              {order.items.map((item) => {
                const bpu = item.bottlesPerUnit || 1
                return (
                  <li
                    key={item.id}
                    className="rounded-pill bg-bg-page dark:bg-bg-page-dark px-3 py-1.5 text-sm font-medium text-text-primary dark:text-text-primary-dark"
                  >
                    <span className="font-bold">{item.quantity}</span>
                    {bpu > 1
                      ? ` carton${item.quantity > 1 ? 's' : ''} (${item.quantity * bpu} bout.)`
                      : ' ×'}{' '}
                    {item.productName}
                  </li>
                )
              })}
            </ul>

            {order.message && (
              <p className="mt-3 rounded-md bg-[#FFF8E1] dark:bg-[#3d2a0a] px-3 py-2 text-sm text-text-warning dark:text-[#FF9800]">
                {order.message}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              {/* Bouton d'export unitaire rapide Planzer */}
              <div>
                {!order.isPickup && (
                  <button
                    type="button"
                    onClick={() => handleExport(order.id)}
                    disabled={isExporting}
                    className="btn-secondary text-xs flex items-center gap-1 text-text-secondary dark:text-text-secondary-dark hover:text-primary"
                    title="Télécharger immédiatement le fichier CSV Planzer pour cette seule commande"
                  >
                    <TruckIcon className="w-3.5 h-3.5" />
                    Exporter Planzer (.csv)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={
                    showMoney
                      ? `/admin/commandes/${order.id}/facture`
                      : `/admin/commandes/${order.id}`
                  }
                  className="btn-secondary text-sm"
                >
                  {showMoney ? 'Voir la facture' : 'Voir le détail'}
                </Link>
                {nextActionLabels[order.status] && (
                  <form action={advanceStatus.bind(null, order.id)}>
                    <button className="btn-primary text-sm">
                      {nextActionLabels[order.status]}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
