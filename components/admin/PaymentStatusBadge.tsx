import { getInvoicePaymentStatus } from '@/lib/money'

interface PaymentStatusBadgeProps {
  paidAt: Date | string | null
  paymentMethod?: string | null
  invoicedAt?: Date | string | null
  createdAt: Date | string
  reminderCount?: number
  paymentTermsDays?: number
  showDetails?: boolean
}

export function PaymentStatusBadge({
  paidAt,
  paymentMethod,
  invoicedAt,
  createdAt,
  reminderCount = 0,
  paymentTermsDays = 30,
  showDetails = false,
}: PaymentStatusBadgeProps) {
  const status = getInvoicePaymentStatus(
    { paidAt, paymentMethod, invoicedAt, createdAt },
    paymentTermsDays
  )

  if (status.isPaid) {
    return (
      <div className="inline-flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          Payée
        </span>
        {showDetails && status.paidAt && (
          <span className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
            Le {status.paidAt.toLocaleDateString('fr-CH')}
            {status.paymentMethod ? ` (${status.paymentMethod})` : ''}
          </span>
        )}
      </div>
    )
  }

  if (status.isOverdue) {
    return (
      <div className="inline-flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-pulse" />
          Retard {status.daysOverdue}j
        </span>
        {reminderCount > 0 && (
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
            {reminderCount} relance{reminderCount > 1 ? 's' : ''} envoyée
            {reminderCount > 1 ? 's' : ''}
          </span>
        )}
        {showDetails && (
          <span className="text-[11px] text-rose-600 dark:text-rose-400">
            Échue le {status.dueDate.toLocaleDateString('fr-CH')}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        En attente
      </span>
      {reminderCount > 0 && (
        <span className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
          {reminderCount} rappel{reminderCount > 1 ? 's' : ''}
        </span>
      )}
      {showDetails && (
        <span className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
          Échéance {status.dueDate.toLocaleDateString('fr-CH')}
        </span>
      )}
    </div>
  )
}
