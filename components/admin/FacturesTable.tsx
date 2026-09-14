'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatCHF, getInvoicePaymentStatus } from '@/lib/money'
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge'
import {
  markOrderAsPaidAction,
  markOrderAsUnpaidAction,
  sendPaymentReminderAction,
} from '@/app/admin/(protected)/commandes/paiements/actions'
import { sendInvoiceEmailAction } from '@/app/admin/(protected)/commandes/[id]/actions'
import { FileTextIcon, SearchIcon, EyeIcon, MailIcon } from '@/components/admin/AdminIcons'

export interface FactureItem {
  id: string
  numero: string
  invoiceNumber: string | null
  invoicedAt: Date | string | null
  createdAt: Date | string
  status: string
  totalCents: number
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  paidAt: Date | string | null
  paymentMethod: string | null
  reminderCount: number
  lastReminderAt: Date | string | null
  isPickup: boolean
  carrier: string | null
  customer?: {
    customerNumber?: number | null
    isPro?: boolean
  } | null
  items: {
    id: string
    productName: string
    quantity: number
    unitPriceCents: number
  }[]
  emailLogs?: {
    id: string
    type: string
    sentAt: Date | string
    success: boolean
  }[]
}

interface FacturesTableProps {
  orders: FactureItem[]
  settings: {
    paymentTermsDays: number
    [key: string]: any
  }
  counts: {
    total: number
    paid: number
    pending: number
    overdue: number
  }
  currentFilter: 'TOUS' | 'PAYEE' | 'EN_ATTENTE' | 'EN_RETARD'
  searchQuery: string
  totals: {
    totalInvoicedCents: number
    totalPaidCents: number
    totalDueCents: number
  }
}

const PAYMENT_METHODS = [
  'Virement bancaire',
  'QR-facture',
  'TWINT',
  'Espèces (au caveau)',
  'Carte de crédit / Débit',
  'Autre / Compensation',
]

const longDate = new Intl.DateTimeFormat('fr-CH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function FacturesTable({
  orders,
  settings,
  counts,
  currentFilter,
  searchQuery,
  totals,
}: FacturesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  // Modale d'encaissement
  const [payModalOrder, setPayModalOrder] = useState<FactureItem | null>(null)
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0])
  const [paidDateStr, setPaidDateStr] = useState(() => new Date().toISOString().split('T')[0])

  // Modale de relance
  const [reminderModalOrder, setReminderModalOrder] = useState<FactureItem | null>(null)
  const [customNote, setCustomNote] = useState('')

  // Gestion de la sélection multiple
  const allIdsOnPage = orders.map((o) => o.id)
  const allSelected =
    allIdsOnPage.length > 0 && allIdsOnPage.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...allIdsOnPage])))
    }
  }

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Filtrage par onglets
  const handleTabChange = (filter: 'TOUS' | 'PAYEE' | 'EN_ATTENTE' | 'EN_RETARD') => {
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'TOUS') {
      params.delete('status')
    } else {
      params.set('status', filter)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  // Recherche
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const query = (form.elements.namedItem('q') as HTMLInputElement).value
    const params = new URLSearchParams(searchParams.toString())
    if (query.trim()) {
      params.set('q', query.trim())
    } else {
      params.delete('q')
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  // Envoi de la facture par email
  const handleSendInvoiceEmail = (orderId: string, invoiceNum: string | null) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await sendInvoiceEmailAction(orderId)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Facture ${invoiceNum || ''} renvoyée avec succès par email !`,
        })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Erreur lors de l'envoi de l'email.",
        })
      }
    })
  }

  // Enregistrement de paiement
  const handleConfirmPayment = () => {
    if (!payModalOrder) return
    setFeedback(null)
    startTransition(async () => {
      const res = await markOrderAsPaidAction(payModalOrder.id, selectedMethod, paidDateStr)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Facture ${payModalOrder.invoiceNumber || payModalOrder.numero} marquée comme payée.`,
        })
        setPayModalOrder(null)
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Erreur lors de l'enregistrement de l'encaissement.",
        })
      }
    })
  }

  // Annulation d'encaissement
  const handleCancelPayment = (orderId: string, invoiceNum: string | null) => {
    if (
      !confirm(
        `Remettre la facture ${invoiceNum || ''} en attente de paiement ? L'encaissement sera effacé.`
      )
    ) {
      return
    }
    setFeedback(null)
    startTransition(async () => {
      const res = await markOrderAsUnpaidAction(orderId)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Facture ${invoiceNum || ''} remise en attente de paiement.`,
        })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Erreur lors de l'annulation de l'encaissement.",
        })
      }
    })
  }

  // Envoi de relance
  const handleConfirmReminder = () => {
    if (!reminderModalOrder) return
    setFeedback(null)
    startTransition(async () => {
      const res = await sendPaymentReminderAction(reminderModalOrder.id, customNote)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Rappel de paiement envoyé pour la facture ${reminderModalOrder.invoiceNumber || reminderModalOrder.numero} (Relance n°${res.reminderCount}).`,
        })
        setReminderModalOrder(null)
        setCustomNote('')
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Erreur lors de l'envoi du rappel.",
        })
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Bandeau KPIs financiers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex flex-col gap-1 border-l-4 border-l-primary dark:border-l-secondary">
          <span className="text-xs uppercase tracking-wider font-semibold text-text-tertiary dark:text-text-tertiary-dark">
            Total Facturé
          </span>
          <span className="text-2xl font-bold font-display text-text-primary dark:text-text-primary-dark tabular">
            {formatCHF(totals.totalInvoicedCents)}
          </span>
          <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
            {counts.total} facture{counts.total > 1 ? 's' : ''} émise{counts.total > 1 ? 's' : ''}
          </span>
        </div>

        <div className="card p-4 flex flex-col gap-1 border-l-4 border-l-emerald-600 dark:border-l-emerald-400">
          <span className="text-xs uppercase tracking-wider font-semibold text-text-tertiary dark:text-text-tertiary-dark">
            Total Encaissé
          </span>
          <span className="text-2xl font-bold font-display text-emerald-700 dark:text-emerald-400 tabular">
            {formatCHF(totals.totalPaidCents)}
          </span>
          <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
            {counts.paid} facture{counts.paid > 1 ? 's' : ''} réglée{counts.paid > 1 ? 's' : ''}
          </span>
        </div>

        <div className="card p-4 flex flex-col gap-1 border-l-4 border-l-amber-600 dark:border-l-amber-400">
          <span className="text-xs uppercase tracking-wider font-semibold text-text-tertiary dark:text-text-tertiary-dark">
            Reste à Encaisser
          </span>
          <span className="text-2xl font-bold font-display text-amber-700 dark:text-amber-400 tabular">
            {formatCHF(totals.totalDueCents)}
          </span>
          <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
            {counts.pending + counts.overdue} en attente ({counts.overdue} en retard)
          </span>
        </div>
      </div>

      {/* Message de notification / retour d'action */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Fermer
          </button>
        </div>
      )}

      {/* 2. Barre d'action groupée (si sélection active) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 bg-primary text-white dark:bg-bg-card-dark dark:text-text-primary-dark dark:border dark:border-secondary p-3.5 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-secondary/30 flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </span>
            <span className="text-sm font-medium">
              {selectedIds.length === 1
                ? '1 facture sélectionnée'
                : `${selectedIds.length} factures sélectionnées`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-white/80 hover:text-white dark:text-text-secondary-dark dark:hover:text-white px-3 py-1.5"
            >
              Tout désélectionner
            </button>

            <a
              href={`/admin/factures/print?ids=${selectedIds.join(',')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs sm:text-sm py-1.5 px-3.5 flex items-center gap-1.5 font-semibold bg-white text-primary hover:bg-slate-100 dark:bg-secondary dark:text-primary dark:hover:brightness-110 rounded-lg shadow-sm"
            >
              <FileTextIcon className="w-4 h-4" />
              <span>Exporter la sélection en un seul PDF</span>
            </a>
          </div>
        </div>
      )}

      {/* 3. Filtres & Moteur de Recherche */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Onglets de statut */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 border-b border-border dark:border-border-dark md:border-none">
          <button
            onClick={() => handleTabChange('TOUS')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              currentFilter === 'TOUS'
                ? 'bg-primary text-white dark:bg-secondary dark:text-primary'
                : 'text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark'
            }`}
          >
            <span>Toutes</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                currentFilter === 'TOUS' ? 'bg-white/20' : 'bg-border dark:bg-border-dark'
              }`}
            >
              {counts.total}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('PAYEE')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              currentFilter === 'PAYEE'
                ? 'bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white'
                : 'text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark'
            }`}
          >
            <span>Payées</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                currentFilter === 'PAYEE'
                  ? 'bg-white/20'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {counts.paid}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('EN_ATTENTE')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              currentFilter === 'EN_ATTENTE'
                ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-primary'
                : 'text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark'
            }`}
          >
            <span>En attente</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                currentFilter === 'EN_ATTENTE'
                  ? 'bg-white/20'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('EN_RETARD')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              currentFilter === 'EN_RETARD'
                ? 'bg-rose-700 text-white dark:bg-rose-600 dark:text-white'
                : 'text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark'
            }`}
          >
            <span>En retard</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                currentFilter === 'EN_RETARD'
                  ? 'bg-white/20'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {counts.overdue}
            </span>
          </button>
        </div>

        {/* Champ de recherche */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="N° commande, facture, client..."
              className="input text-sm w-full pl-9 pr-3 py-1.5"
            />
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          </div>
          <button type="submit" className="btn-secondary text-sm py-1.5 px-3 shrink-0">
            Filtrer
          </button>
        </form>
      </div>

      {/* 4. Table des Factures */}
      <div className="card overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-text-secondary dark:text-text-secondary-dark flex flex-col items-center gap-2">
            <FileTextIcon className="w-10 h-10 text-text-tertiary mb-1" />
            <p className="font-semibold text-base">Aucune facture ne correspond à ces critères.</p>
            <p className="text-xs text-text-tertiary">
              Modifiez votre recherche ou sélectionnez un autre statut.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border dark:border-border-dark bg-bg-page/60 dark:bg-bg-page-dark/40 text-text-tertiary dark:text-text-tertiary-dark text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      title={allSelected ? 'Tout désélectionner' : 'Tout sélectionner sur la page'}
                    />
                  </th>
                  <th className="py-3 px-3">Facture & Commande</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Émission / Échéance</th>
                  <th className="py-3 px-3 text-right">Montant</th>
                  <th className="py-3 px-3">Paiement</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border-dark">
                {orders.map((order) => {
                  const isSelected = selectedIds.includes(order.id)
                  const status = getInvoicePaymentStatus(
                    {
                      paidAt: order.paidAt,
                      paymentMethod: order.paymentMethod,
                      invoicedAt: order.invoicedAt,
                      createdAt: order.createdAt,
                    },
                    settings.paymentTermsDays
                  )

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-bg-page/40 dark:hover:bg-bg-page-dark/30 transition-colors ${
                        isSelected ? 'bg-secondary/10 dark:bg-secondary/15' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(order.id)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* N° Facture & N° Commande */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          {order.invoiceNumber ? (
                            <Link
                              href={`/admin/commandes/${order.id}/facture`}
                              className="font-mono font-bold text-primary dark:text-secondary hover:underline text-sm"
                            >
                              {order.invoiceNumber}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-amber-700 dark:text-amber-400 font-semibold">
                              (À émettre)
                            </span>
                          )}
                          <Link
                            href={`/admin/commandes/${order.id}`}
                            className="font-mono text-xs text-text-tertiary dark:text-text-tertiary-dark hover:underline"
                          >
                            Cmd {order.numero}
                          </Link>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col max-w-[200px] truncate">
                          <span className="font-medium text-text-primary dark:text-text-primary-dark truncate">
                            {order.clientName}
                          </span>
                          <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark truncate">
                            {order.clientEmail}
                          </span>
                          {order.customer?.isPro && (
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-400">
                              Client Pro
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-3 text-xs">
                        <div className="flex flex-col">
                          <span className="text-text-primary dark:text-text-primary-dark">
                            {longDate.format(new Date(order.invoicedAt || order.createdAt))}
                          </span>
                          <span
                            className={`${
                              status.isOverdue
                                ? 'text-rose-600 font-semibold'
                                : 'text-text-tertiary dark:text-text-tertiary-dark'
                            }`}
                          >
                            Échéance : {longDate.format(status.dueDate)}
                          </span>
                        </div>
                      </td>

                      {/* Montant TTC */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-text-primary dark:text-text-primary-dark tabular">
                            {formatCHF(order.totalCents)}
                          </span>
                          <span className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
                            {order.items.reduce((s, i) => s + i.quantity, 0)} btl.
                          </span>
                        </div>
                      </td>

                      {/* Statut de paiement */}
                      <td className="py-3.5 px-3">
                        <PaymentStatusBadge
                          paidAt={order.paidAt}
                          paymentMethod={order.paymentMethod}
                          invoicedAt={order.invoicedAt}
                          createdAt={order.createdAt}
                          reminderCount={order.reminderCount}
                          paymentTermsDays={settings.paymentTermsDays}
                          showDetails={true}
                        />
                      </td>

                      {/* Actions rapides */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Voir / Imprimer document A4 */}
                          <Link
                            href={`/admin/commandes/${order.id}/facture`}
                            className="p-1.5 rounded hover:bg-bg-page dark:hover:bg-bg-page-dark text-text-secondary hover:text-text-primary transition-colors"
                            title="Voir et imprimer la facture A4"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Link>

                          {/* Renvoyer par email */}
                          <button
                            onClick={() => handleSendInvoiceEmail(order.id, order.invoiceNumber)}
                            disabled={isPending}
                            className="p-1.5 rounded hover:bg-bg-page dark:hover:bg-bg-page-dark text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                            title="Renvoyer la facture officielle par email au client"
                          >
                            <MailIcon className="w-4 h-4" />
                          </button>

                          {/* Action de paiement */}
                          {status.isPaid ? (
                            <button
                              onClick={() => handleCancelPayment(order.id, order.invoiceNumber)}
                              disabled={isPending}
                              className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-secondary transition-colors"
                              title="Annuler l'encaissement (remettre en attente)"
                            >
                              Annuler
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setPayModalOrder(order)
                                setSelectedMethod(PAYMENT_METHODS[0])
                                setPaidDateStr(new Date().toISOString().split('T')[0])
                              }}
                              disabled={isPending}
                              className="text-xs px-2.5 py-1 rounded font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors"
                              title="Enregistrer l'encaissement"
                            >
                              Payer
                            </button>
                          )}

                          {/* Relance si impayée et en retard */}
                          {!status.isPaid && status.isOverdue && (
                            <button
                              onClick={() => {
                                setReminderModalOrder(order)
                                setCustomNote('')
                              }}
                              disabled={isPending}
                              className="text-xs px-2 py-1 rounded font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors"
                              title="Envoyer un rappel de paiement"
                            >
                              Rappel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modale d'enregistrement de paiement */}
      {payModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold font-display text-text-primary dark:text-text-primary-dark">
              Enregistrer un encaissement
            </h3>

            <div className="p-3 bg-bg-page dark:bg-bg-page-dark rounded-lg text-sm flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-text-secondary">Facture :</span>
                <span className="font-mono font-bold">
                  {payModalOrder.invoiceNumber || payModalOrder.numero}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Client :</span>
                <span className="font-medium">{payModalOrder.clientName}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-1">
                <span className="text-text-secondary">Montant total :</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular">
                  {formatCHF(payModalOrder.totalCents)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Mode de règlement</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="input text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Date du paiement</label>
              <input
                type="date"
                value={paidDateStr}
                onChange={(e) => setPaidDateStr(e.target.value)}
                className="input text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setPayModalOrder(null)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isPending}
                className="btn-primary text-sm py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {isPending ? 'Enregistrement...' : 'Confirmer le règlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modale d'envoi de rappel */}
      {reminderModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold font-display text-text-primary dark:text-text-primary-dark">
              Envoyer un rappel de paiement
            </h3>

            <p className="text-sm text-text-secondary">
              Un email de rappel courtois avec le bulletin QR de paiement sera envoyé à{' '}
              <strong className="text-text-primary">{reminderModalOrder.clientEmail}</strong> pour
              la facture{' '}
              <strong className="font-mono">
                {reminderModalOrder.invoiceNumber || reminderModalOrder.numero}
              </strong>{' '}
              ({formatCHF(reminderModalOrder.totalCents)}).
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Note personnalisée optionnelle (ajoutée à l&apos;email)
              </label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={3}
                placeholder="Ex: Merci pour votre visite la semaine dernière..."
                className="input text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setReminderModalOrder(null)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReminder}
                disabled={isPending}
                className="btn-primary text-sm py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isPending ? 'Envoi...' : 'Envoyer le rappel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
