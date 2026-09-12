'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClientType } from '@prisma/client'
import { toggleClientType } from '@/app/admin/(protected)/commandes/[id]/facture/actions'
import { sendInvoiceEmailAction } from '@/app/admin/(protected)/commandes/[id]/actions'

import { MailIcon, CheckIcon, CloseIcon } from '@/components/admin/AdminIcons'

interface FactureControlsProps {
  orderId: string
  clientType: ClientType
  proRatePercent: number
}

export function FactureControls({ orderId, clientType, proRatePercent }: FactureControlsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [sendingMail, setSendingMail] = useState(false)
  const [mailFeedback, setMailFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const isPro = clientType === ClientType.PRO

  const handleToggle = () => {
    startTransition(async () => {
      await toggleClientType(orderId)
      router.refresh()
    })
  }

  const handleSendInvoiceEmail = async () => {
    setSendingMail(true)
    setMailFeedback(null)
    try {
      const res = await sendInvoiceEmailAction(orderId)
      if (res.success) {
        setMailFeedback({ type: 'success', message: 'Facture envoyée avec succès par email !' })
      } else {
        setMailFeedback({ type: 'error', message: res.error || "Échec de l'envoi" })
      }
    } finally {
      setSendingMail(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          Tarif appliqué
        </span>
        <button
          onClick={handleToggle}
          disabled={pending}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
            isPro
              ? 'bg-accent-mauve-dark text-white hover:opacity-90'
              : 'bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark hover:bg-primary/10'
          }`}
        >
          {pending ? 'Recalcul…' : isPro ? `Professionnel (−${proRatePercent}%)` : 'Particulier'}
        </button>
        <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
          {isPro
            ? 'La remise professionnelle est appliquée à toutes les lignes et le port est offert. Cliquez pour revenir au tarif particulier.'
            : 'Cliquez pour appliquer le tarif professionnel. Les montants sont recalculés et le statut est enregistré sur la fiche client pour les prochaines commandes.'}
        </p>
      </div>

      <div className="border-t border-border dark:border-border-dark pt-3 flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          Transmission au client
        </span>
        <button
          type="button"
          onClick={handleSendInvoiceEmail}
          disabled={sendingMail}
          className="btn-primary text-sm flex items-center justify-center gap-2 py-2"
        >
          <MailIcon className="w-4 h-4 text-current" />
          <span>{sendingMail ? 'Envoi en cours…' : 'Envoyer la facture par email'}</span>
        </button>
        {mailFeedback && (
          <div
            className={`text-xs font-medium flex items-center gap-1.5 ${
              mailFeedback.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {mailFeedback.type === 'success' ? (
              <CheckIcon className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CloseIcon className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{mailFeedback.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
