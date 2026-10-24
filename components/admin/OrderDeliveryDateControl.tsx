'use client'

import { useState, useTransition, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Check, Loader2, X } from 'lucide-react'
import { updateDeliveryDateAction } from '@/app/admin/(protected)/commandes/[id]/actions'

interface OrderDeliveryDateControlProps {
  orderId: string
  initialDeliveryDate: Date | string | null
}

function formatDateToInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function OrderDeliveryDateControl({
  orderId,
  initialDeliveryDate,
}: OrderDeliveryDateControlProps) {
  const router = useRouter()
  const inputId = useId()
  const [dateValue, setDateValue] = useState<string>(formatDateToInput(initialDeliveryDate))
  const [isPending, startTransition] = useTransition()
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (newVal: string) => {
    setError(null)
    setSavedSuccess(false)
    setDateValue(newVal)

    startTransition(async () => {
      const res = await updateDeliveryDateAction(orderId, newVal ? newVal : null)
      if (res.success) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 2500)
        router.refresh()
      } else {
        setError(res.error || 'Erreur lors de la mise à jour')
      }
    })
  }

  const handleClear = () => {
    handleSave('')
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide flex items-center gap-1.5"
        >
          <Calendar className="w-3.5 h-3.5 text-primary-text" />
          <span>Date de livraison</span>
        </label>
        {dateValue && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="text-[11px] text-text-tertiary hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-0.5"
            title="Effacer la date de livraison"
          >
            <X className="w-3 h-3" />
            <span>Effacer</span>
          </button>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          id={inputId}
          type="date"
          value={dateValue}
          onChange={(e) => handleSave(e.target.value)}
          disabled={isPending}
          className="input-field w-full text-sm py-1.5 pr-8"
        />
        <div className="absolute right-2.5 pointer-events-none flex items-center">
          {isPending ? (
            <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
          ) : savedSuccess ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : null}
        </div>
      </div>

      {savedSuccess && (
        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          Date enregistrée
        </span>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  )
}
