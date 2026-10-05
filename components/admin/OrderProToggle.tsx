'use client'

import { Zap } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClientType } from '@prisma/client'
import { toggleOrderProAction } from '@/app/admin/(protected)/commandes/[id]/actions'

interface OrderProToggleProps {
  orderId: string
  clientType: ClientType
  isCustomerPro: boolean
  proRatePercent: number
  canManage: boolean
}

export function OrderProToggle({
  orderId,
  clientType,
  isCustomerPro,
  proRatePercent,
  canManage,
}: OrderProToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isPro = clientType === ClientType.PRO

  const handleToggle = () => {
    setError(null)
    startTransition(async () => {
      const res = await toggleOrderProAction(orderId)
      if (res.success) {
        router.refresh()
      } else {
        setError(res.error || 'Erreur lors du recalcul')
      }
    })
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="inline-flex items-center gap-2 flex-wrap">
        {isPro ? (
          <>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              PRO (−{proRatePercent}%)
            </span>
            {canManage && (
              <button
                type="button"
                onClick={handleToggle}
                disabled={isPending}
                title="Revenir aux conditions tarifaires particulier (prix catalogue et frais de port standard)"
                className="text-[11px] text-text-tertiary hover:text-text-secondary dark:text-text-tertiary-dark dark:hover:text-text-secondary-dark underline hover:no-underline transition-colors disabled:opacity-50"
              >
                {isPending ? 'Recalcul…' : 'Basculer en particulier'}
              </button>
            )}
          </>
        ) : (
          <>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark">
              Particulier
            </span>
            {canManage && (
              <button
                type="button"
                onClick={handleToggle}
                disabled={isPending}
                title={
                  isCustomerPro
                    ? 'Le client est enregistré PRO : cliquer pour appliquer la remise pro et offrir les frais de port sur cette commande'
                    : 'Valider ce client comme professionnel, appliquer automatiquement la remise et offrir les frais de port'
                }
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>
                  {isPending
                    ? 'Recalcul…'
                    : isCustomerPro
                      ? `Appliquer le tarif PRO (−${proRatePercent}%)`
                      : `Passer en PRO (−${proRatePercent}%)`}
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{error}</span>
      )}
    </div>
  )
}
