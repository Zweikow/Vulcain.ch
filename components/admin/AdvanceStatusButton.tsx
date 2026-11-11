'use client'

import { useState, useTransition } from 'react'
import { advanceStatus } from '@/app/admin/(protected)/preparation/actions'

/** Fait avancer une commande. L'expédition peut échouer (encaissement PowerPay) : l'erreur s'affiche ici. */
export function AdvanceStatusButton({ orderId, label }: { orderId: string; label: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const advance = () => {
    setError(null)
    startTransition(async () => {
      const result = await advanceStatus(orderId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={advance} disabled={isPending} className="btn-primary text-sm">
        {isPending ? 'En cours…' : label}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-text-error dark:text-[#EF5350]">
          {error}
        </p>
      )}
    </div>
  )
}
