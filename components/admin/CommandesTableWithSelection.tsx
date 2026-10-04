'use client'

import { Loader2, X } from 'lucide-react'
import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderStatus } from '@prisma/client'
import { formatCHF } from '@/lib/money'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge'
import { TruckIcon } from '@/components/admin/AdminIcons'
import { getDefaultPlanzerDates } from '@/lib/planzer'

export interface OrderRowData {
  id: string
  numero: string
  clientName: string
  clientEmail: string
  totalCents: number
  status: OrderStatus
  paidAt: Date | string | null
  paymentMethod: string | null
  invoicedAt: Date | string | null
  reminderCount: number
  createdAt: Date | string
  assignedTo?: { name: string } | null
}

interface CommandesTableWithSelectionProps {
  commandes: OrderRowData[]
  showMoney: boolean
  settings: {
    paymentTermsDays: number
  }
}

export function CommandesTableWithSelection({
  commandes,
  showMoney,
  settings,
}: CommandesTableWithSelectionProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

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

  const allSelected = commandes.length > 0 && selectedIds.length === commandes.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(commandes.map((c) => c.id))
    }
  }

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleExport = async () => {
    if (selectedIds.length === 0) return

    setFeedback(null)
    setIsExporting(true)

    try {
      const response = await fetch('/api/admin/export-planzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedIds,
          pickupDate,
          markAsPreparing,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur lors de la génération de l'export Planzer.")
      }

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
        message: `Export CSV Planzer téléchargé avec succès (${selectedIds.length} commande${
          selectedIds.length > 1 ? 's' : ''
        }).`,
      })

      setSelectedIds([])

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
    <div className="flex flex-col gap-4">
      {/* Barre d'action Planzer flottante / fixe si des commandes sont sélectionnées */}
      {selectedIds.length > 0 && (
        <div className="card p-4 bg-gradient-to-r from-bg-card to-primary/10 dark:from-bg-card-dark dark:to-primary/20 border-2 border-primary shadow-lg flex flex-wrap items-center justify-between gap-4 sticky top-20 md:top-4 z-20">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-primary text-primary-foreground font-semibold">
              <TruckIcon className="w-4 h-4" />
              <strong>{selectedIds.length}</strong> commande{selectedIds.length > 1 ? 's' : ''}{' '}
              sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </span>

            <div className="flex items-center gap-2">
              <label
                htmlFor="cmdPickupDate"
                className="font-medium text-text-secondary dark:text-text-secondary-dark"
              >
                Date d&apos;enlèvement (Les Paccots) :
              </label>
              <input
                type="date"
                id="cmdPickupDate"
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
                className="h-3.5 w-3.5 rounded border-border text-primary-text focus:ring-primary cursor-pointer"
              />
              <span>Passer en préparation à l&apos;export</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Désélectionner
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary text-xs px-4 py-2 font-semibold flex items-center gap-2 shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="inline-block h-[1em] w-[1em] align-[-0.125em] animate-spin" />{' '}
                  Export en cours...
                </>
              ) : (
                <>
                  <TruckIcon className="w-4 h-4" />
                  Exporter Planzer (.csv)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-md text-xs flex items-center justify-between ${
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
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mobile : une carte par commande, rien n'est coupé */}
      <div className="md:hidden flex flex-col gap-3">
        {commandes.length > 0 && (
          <label className="flex items-center gap-2 px-1 text-sm text-text-secondary dark:text-text-secondary-dark cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-5 w-5 rounded border-border text-primary-text focus:ring-primary cursor-pointer"
            />
            Tout sélectionner
          </label>
        )}
        {commandes.length === 0 ? (
          <div className="card p-6 text-center text-sm text-text-tertiary dark:text-text-tertiary-dark">
            Aucune commande
          </div>
        ) : (
          commandes.map((order) => {
            const isSelected = selectedIds.includes(order.id)
            return (
              <div
                key={order.id}
                className={`card p-4 flex items-start gap-3 ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10' : ''
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`Sélectionner commande ${order.numero}`}
                  checked={isSelected}
                  onChange={() => toggleRow(order.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-primary-text focus:ring-primary cursor-pointer"
                />
                <Link
                  href={`/admin/commandes/${order.id}`}
                  className="flex-1 min-w-0 flex flex-col gap-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary-text">
                      {order.numero}
                    </span>
                    {showMoney && (
                      <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-text-primary-dark">
                        {formatCHF(order.totalCents)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-text-primary dark:text-text-primary-dark truncate">
                    {order.clientName}
                  </span>
                  <span className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">
                    {order.clientEmail}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <StatusBadge status={order.status} />
                    {showMoney && (
                      <PaymentStatusBadge
                        paidAt={order.paidAt ? new Date(order.paidAt) : null}
                        paymentMethod={order.paymentMethod}
                        invoicedAt={order.invoicedAt ? new Date(order.invoicedAt) : null}
                        createdAt={new Date(order.createdAt)}
                        reminderCount={order.reminderCount}
                        paymentTermsDays={settings.paymentTermsDays}
                      />
                    )}
                    <span className="ml-auto text-xs text-text-tertiary dark:text-text-tertiary-dark tabular-nums">
                      {new Date(order.createdAt).toLocaleDateString('fr-CH')}
                    </span>
                  </div>
                  {order.assignedTo && (
                    <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
                      Prep: {order.assignedTo.name}
                    </span>
                  )}
                </Link>
              </div>
            )
          })
        )}
      </div>

      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark">
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border text-primary-text focus:ring-primary cursor-pointer"
                />
              </th>
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
                  colSpan={showMoney ? 8 : 6}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  Aucune commande
                </td>
              </tr>
            ) : (
              commandes.map((order) => {
                const isSelected = selectedIds.includes(order.id)
                return (
                  <tr
                    key={order.id}
                    className={`border-b border-border dark:border-border-dark last:border-0 transition-colors ${
                      isSelected
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : 'hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50'
                    }`}
                  >
                    <td className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner commande ${order.numero}`}
                        checked={isSelected}
                        onChange={() => toggleRow(order.id)}
                        className="h-4 w-4 rounded border-border text-primary-text focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/commandes/${order.id}`}
                        className="font-mono text-xs text-primary-text hover:underline font-semibold"
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
                            paidAt={order.paidAt ? new Date(order.paidAt) : null}
                            paymentMethod={order.paymentMethod}
                            invoicedAt={order.invoicedAt ? new Date(order.invoicedAt) : null}
                            createdAt={new Date(order.createdAt)}
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
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
