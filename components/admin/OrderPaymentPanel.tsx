'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  markOrderAsPaidAction,
  markOrderAsUnpaidAction,
  sendPaymentReminderAction,
} from '@/app/admin/(protected)/commandes/paiements/actions'
import { getInvoicePaymentStatus, formatCHF } from '@/lib/money'
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge'
import { CoinsIcon, CheckIcon, MailIcon } from '@/components/admin/AdminIcons'

interface OrderPaymentPanelProps {
  orderId: string
  orderNumero: string
  invoiceNumber: string | null
  totalCents: number
  clientName: string
  clientEmail: string
  paidAt: Date | string | null
  paymentMethod: string | null
  invoicedAt: Date | string | null
  createdAt: Date | string
  reminderCount: number
  lastReminderAt: Date | string | null
  paymentTermsDays?: number
}

const PAYMENT_METHODS = [
  'Virement bancaire',
  'TWINT',
  'Espèces (au caveau)',
  'Carte de crédit / Débit',
  'Autre / Compensation',
]

export function OrderPaymentPanel({
  orderId,
  orderNumero,
  invoiceNumber,
  totalCents,
  clientName,
  clientEmail,
  paidAt,
  paymentMethod,
  invoicedAt,
  createdAt,
  reminderCount,
  lastReminderAt,
  paymentTermsDays = 30,
}: OrderPaymentPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  // Modals state
  const [showPayModal, setShowPayModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)

  // Pay form state
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0])
  const [paidDateStr, setPaidDateStr] = useState(() => new Date().toISOString().split('T')[0])

  // Reminder form state
  const [customNote, setCustomNote] = useState('')

  const status = getInvoicePaymentStatus(
    { paidAt, paymentMethod, invoicedAt, createdAt },
    paymentTermsDays
  )

  const handleMarkPaid = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await markOrderAsPaidAction(orderId, selectedMethod, paidDateStr)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Encaissement enregistré avec succès.' })
        setShowPayModal(false)
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || "Erreur lors de l'enregistrement" })
      }
    })
  }

  const handleMarkUnpaid = () => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir annuler cet encaissement ? La facture repassera en attente de paiement.'
      )
    ) {
      return
    }
    setFeedback(null)
    startTransition(async () => {
      const res = await markOrderAsUnpaidAction(orderId)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Facture remise en attente de paiement.' })
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || "Erreur lors de l'annulation" })
      }
    })
  }

  const handleSendReminder = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await sendPaymentReminderAction(orderId, customNote)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Rappel n°${res.reminderCount} envoyé avec succès à ${clientEmail}.`,
        })
        setShowReminderModal(false)
        setCustomNote('')
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || "Erreur lors de l'envoi du rappel" })
      }
    })
  }

  return (
    <div className="card p-5 mb-4 border border-border dark:border-border-dark">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border dark:border-border-dark pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CoinsIcon className="w-5 h-5 text-secondary dark:text-secondary-dark" />
            <h2 className="font-medium text-text-primary dark:text-text-primary-dark">
              Suivi du paiement &amp; Facturation
            </h2>
          </div>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            Échéance standard à {paymentTermsDays} jours nets · Montant :{' '}
            <strong>{formatCHF(totalCents)}</strong>
          </p>
        </div>

        <PaymentStatusBadge
          paidAt={paidAt}
          paymentMethod={paymentMethod}
          invoicedAt={invoicedAt}
          createdAt={createdAt}
          reminderCount={reminderCount}
          paymentTermsDays={paymentTermsDays}
          showDetails
        />
      </div>

      {feedback && (
        <div
          className={`mt-4 p-3 rounded-md text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Détails et actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-text-secondary dark:text-text-secondary-dark space-y-1">
          {status.isPaid ? (
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Règlement reçu le {status.paidAt?.toLocaleDateString('fr-CH')} via{' '}
                  <strong>{status.paymentMethod || 'Virement bancaire'}</strong>
                </span>
              </p>
              <p className="text-text-tertiary dark:text-text-tertiary-dark mt-0.5">
                Facture n° {invoiceNumber || orderNumero} acquittée.
              </p>
            </div>
          ) : (
            <div>
              <p>
                Date d&apos;échéance :{' '}
                <strong className={status.isOverdue ? 'text-rose-600 font-bold' : ''}>
                  {status.dueDate.toLocaleDateString('fr-CH')}
                </strong>
                {status.isOverdue && (
                  <span className="text-rose-600 font-medium ml-1.5">
                    ({status.daysOverdue} jour{status.daysOverdue > 1 ? 's' : ''} de retard)
                  </span>
                )}
              </p>
              {reminderCount > 0 && (
                <p className="text-text-tertiary dark:text-text-tertiary-dark">
                  Dernier rappel envoyé le{' '}
                  {lastReminderAt ? new Date(lastReminderAt).toLocaleDateString('fr-CH') : '—'}{' '}
                  (total : {reminderCount})
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status.isPaid ? (
            <button
              onClick={handleMarkUnpaid}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded border border-border dark:border-border-dark text-text-secondary hover:text-rose-600 hover:border-rose-300 transition-colors"
            >
              Annuler l&apos;encaissement
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowPayModal(true)}
                disabled={isPending}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <CheckIcon className="w-3.5 h-3.5 text-current" />
                <span>Encaisser / Marquer payée</span>
              </button>

              <button
                onClick={() => setShowReminderModal(true)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 flex items-center gap-1.5 transition-colors"
              >
                <MailIcon className="w-3.5 h-3.5 text-current" />
                <span>
                  {reminderCount === 0
                    ? 'Envoyer un rappel amical'
                    : `Relance n°${reminderCount + 1}`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODAL ENCAISSEMENT */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-bg-card dark:bg-bg-card-dark rounded-xl max-w-md w-full p-6 shadow-xl border border-border dark:border-border-dark animate-in fade-in zoom-in-95">
            <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary-dark">
              Enregistrer le paiement
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
              Commande <strong className="font-mono">{orderNumero}</strong> · Montant :{' '}
              <strong>{formatCHF(totalCents)}</strong>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Date de réception du paiement
                </label>
                <input
                  type="date"
                  value={paidDateStr}
                  onChange={(e) => setPaidDateStr(e.target.value)}
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Mode de paiement
                </label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={isPending}
                className="btn-primary text-sm px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {isPending ? 'Enregistrement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RAPPEL */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-bg-card dark:bg-bg-card-dark rounded-xl max-w-lg w-full p-6 shadow-xl border border-border dark:border-border-dark animate-in fade-in zoom-in-95">
            <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary-dark">
              {reminderCount === 0
                ? 'Envoyer un rappel de paiement amical'
                : `Envoyer la relance n°${reminderCount + 1}`}
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
              Un email courtois et professionnel sera envoyé à{' '}
              <strong className="text-text-primary dark:text-text-primary-dark">
                {clientEmail}
              </strong>{' '}
              ({clientName}).
            </p>

            <div className="mt-4 p-3 bg-bg-page dark:bg-bg-page-dark rounded-lg text-xs space-y-1.5 border border-border dark:border-border-dark">
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  Facture concernée :
                </span>
                <span className="font-mono font-semibold">{invoiceNumber || orderNumero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  Montant impayé :
                </span>
                <span className="font-semibold">{formatCHF(totalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  Échéance échue le :
                </span>
                <span className="font-semibold text-rose-600">
                  {status.dueDate.toLocaleDateString('fr-CH')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  Statut actuel :
                </span>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {status.isOverdue ? `${status.daysOverdue} jours de retard` : 'En cours'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                Note personnalisée ajoutée au message (facultatif)
              </label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ex. Suite à notre échange téléphonique... ou laissez vide pour le modèle standard."
                rows={3}
                className="input-field w-full text-sm resize-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={isPending}
                className="btn-primary text-sm px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isPending ? 'Envoi en cours...' : 'Envoyer le rappel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
