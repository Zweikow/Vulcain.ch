'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  sendInvoiceEmailAction,
  resendConfirmationAction,
  resendShippingNoticeAction,
  updateTrackingAction,
  updatePickupAction,
} from '@/app/admin/(protected)/commandes/[id]/actions'
import {
  TruckIcon,
  MailIcon,
  CloseIcon,
  SendIcon,
  FacturesIcon,
} from '@/components/admin/AdminIcons'

interface EmailLog {
  id: string
  type: string
  recipient: string
  subject: string
  sentAt: Date | string
  success: boolean
  error?: string | null
}

interface OrderEmailActionsProps {
  orderId: string
  orderNumber: string
  clientEmail: string
  trackingNumber: string | null
  carrier: string | null
  isPickup: boolean
  emailLogs: EmailLog[]
}

export default function OrderEmailActions({
  orderId,
  orderNumber,
  clientEmail,
  trackingNumber: initialTracking,
  carrier: initialCarrier,
  isPickup: initialPickup,
  emailLogs,
}: OrderEmailActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const [carrier, setCarrier] = useState(initialCarrier || 'DPD')
  const [tracking, setTracking] = useState(initialTracking || '')
  const [isPickup, setIsPickup] = useState(initialPickup)
  const [isSavingTracking, setIsSavingTracking] = useState(false)

  const handleSendInvoice = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await sendInvoiceEmailAction(orderId)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Facture envoyée avec succès par email !' })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Erreur lors de l'envoi de la facture.",
        })
      }
    })
  }

  const handleResendConfirmation = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await resendConfirmationAction(orderId)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Confirmation de commande renvoyée avec succès !',
        })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Erreur lors du renvoi de l'email.",
        })
      }
    })
  }

  const handleResendShipping = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await resendShippingNoticeAction(orderId)
      if (res.success) {
        setFeedback({
          type: 'success',
          message: "Avis d'expédition / mise à disposition renvoyé avec succès !",
        })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || "Erreur lors du renvoi de l'avis.",
        })
      }
    })
  }

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingTracking(true)
    setFeedback(null)
    try {
      const [trackRes, pickRes] = await Promise.all([
        updateTrackingAction(orderId, tracking, carrier),
        updatePickupAction(orderId, isPickup),
      ])
      if (trackRes.success && pickRes.success) {
        setFeedback({
          type: 'success',
          message: 'Paramètres de transport enregistrés avec succès.',
        })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: trackRes.error || pickRes.error || 'Erreur lors de la sauvegarde.',
        })
      }
    } finally {
      setIsSavingTracking(false)
    }
  }

  const dpdUrl =
    tracking && carrier.toUpperCase().includes('DPD')
      ? `https://tracking.dpd.de/status/fr_CH/parcel/${encodeURIComponent(tracking.trim())}`
      : null

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Bloc Paramètres de transport (DPD & Retrait cave) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-text-primary dark:text-text-primary-dark flex items-center gap-2">
            <TruckIcon className="w-4 h-4 text-primary dark:text-primary-dark" /> Expédition &
            Transporteur
          </h2>
          {dpdUrl && (
            <a
              href={dpdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary dark:text-primary-dark hover:underline flex items-center gap-1"
            >
              Suivre le colis DPD en direct ↗
            </a>
          )}
        </div>

        <form onSubmit={handleSaveTracking} className="flex flex-col gap-4 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              id="isPickup"
              checked={isPickup}
              onChange={(e) => setIsPickup(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isPickup" className="text-text-primary dark:text-text-primary-dark">
              <strong>Retrait convenu à la cave</strong> (convenu par téléphone ou client pro)
            </label>
          </div>

          {!isPickup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Transporteur
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="ex: DPD"
                  className="input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                  Numéro de colis DPD (Tracking)
                </label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="ex: 01234567890123"
                  className="input w-full text-sm font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end mt-1">
            <button
              type="submit"
              disabled={isSavingTracking}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              {isSavingTracking ? 'Enregistrement…' : 'Enregistrer le transport'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Bloc Actions Rapides Emails & Historique */}
      <div className="card p-5">
        <h2 className="font-medium text-text-primary dark:text-text-primary-dark mb-3 flex items-center gap-2">
          <MailIcon className="w-4 h-4 text-primary dark:text-primary-dark" /> Notifications &
          Emails ({orderNumber} — {clientEmail})
        </h2>

        {feedback && (
          <div
            className={`p-3 rounded-md text-xs font-medium mb-4 flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 p-0.5 rounded"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Boutons d'envoi */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={isPending}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
          >
            <SendIcon className="w-3.5 h-3.5" /> Renvoyer confirmation
          </button>

          <button
            type="button"
            onClick={handleSendInvoice}
            disabled={isPending}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 border-primary/40 text-primary dark:text-primary-dark font-medium"
          >
            <FacturesIcon className="w-3.5 h-3.5" /> Envoyer facture au client
          </button>

          <button
            type="button"
            onClick={handleResendShipping}
            disabled={isPending}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
          >
            <TruckIcon className="w-3.5 h-3.5" /> Renvoyer avis{' '}
            {isPickup ? 'de retrait' : "d'expédition"}
          </button>
        </div>

        {/* Tableau d'historique */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark mb-2">
            Historique des envois ({emailLogs.length})
          </h3>

          {emailLogs.length === 0 ? (
            <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark italic py-2">
              Aucun envoi tracé pour le moment pour cette commande.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark font-medium">
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Destinataire</th>
                    <th className="py-2 pr-4">Date & Heure</th>
                    <th className="py-2 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 dark:divide-border-dark/50">
                  {emailLogs.map((log) => {
                    const dateFormatted = new Date(log.sentAt).toLocaleString('fr-CH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                        <td className="py-2 pr-4 font-semibold text-text-primary dark:text-text-primary-dark">
                          {log.type.replace('_', ' ')}
                        </td>
                        <td className="py-2 pr-4 text-text-secondary dark:text-text-secondary-dark font-mono text-[11px]">
                          {log.recipient}
                        </td>
                        <td className="py-2 pr-4 text-text-tertiary dark:text-text-tertiary-dark">
                          {dateFormatted}
                        </td>
                        <td className="py-2 text-right">
                          {log.success ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                              Envoyé
                            </span>
                          ) : (
                            <span
                              title={log.error || 'Erreur'}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 cursor-help"
                            >
                              Échec
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
