'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClientType } from '@prisma/client'
import { toggleClientType } from '@/app/admin/(protected)/commandes/[id]/facture/actions'

interface FactureControlsProps {
  orderId: string
  clientType: ClientType
  proRatePercent: number
}

export function FactureControls({ orderId, clientType, proRatePercent }: FactureControlsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const isPro = clientType === ClientType.PRO

  const handleToggle = () => {
    startTransition(async () => {
      await toggleClientType(orderId)
      router.refresh()
    })
  }

  return (
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
  )
}
