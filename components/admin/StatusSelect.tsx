'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { OrderStatus } from '@prisma/client'
import { STATUS_LABELS } from '@/components/admin/StatusBadge'

interface StatusSelectProps {
  orderId: string
  currentStatus: OrderStatus
}

const STATUS_ORDER: OrderStatus[] = [
  'A_TRAITER',
  'EN_PREPARATION',
  'EXPEDIEE',
]

export function StatusSelect({ orderId, currentStatus }: StatusSelectProps) {
  const router = useRouter()
  const [status, setStatus] = useState<OrderStatus>(currentStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleChange(newStatus: OrderStatus) {
    setError(null)
    const res = await fetch(`/api/admin/commandes/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!res.ok) {
      setError('Erreur lors de la mise à jour du statut.')
      return
    }

    setStatus(newStatus)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide">
        Statut
      </label>
      <div className="flex gap-2 flex-wrap">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => handleChange(s)}
            disabled={isPending || s === status}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              s === status
                ? 'bg-primary text-white'
                : 'bg-bg-card dark:bg-bg-card-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:bg-primary/10'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-text-error dark:text-[#EF5350] mt-1">{error}</p>
      )}
    </div>
  )
}
