'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { issueInvoiceForOrder } from '@/app/admin/(protected)/commandes/[id]/facture/actions'
import { creditorReference, formatCreditorReference } from '@/lib/reference'

interface FactureIssueProps {
  orderId: string
  invoiceNumber: string | null
  invoicedAt: Date | null
}

const stamp = new Intl.DateTimeFormat('fr-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function FactureIssue({ orderId, invoiceNumber, invoicedAt }: FactureIssueProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (invoiceNumber) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          Facture émise
        </span>
        <span className="font-mono text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          {invoiceNumber}
        </span>
        <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
          {invoicedAt && `Émise le ${stamp.format(invoicedAt)} · `}
          Référence {formatCreditorReference(creditorReference(invoiceNumber))}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
        Facture
      </span>
      <button
        onClick={() =>
          startTransition(async () => {
            await issueInvoiceForOrder(orderId)
            router.refresh()
          })
        }
        disabled={pending}
        className="btn-primary text-sm disabled:opacity-50"
      >
        {pending ? 'Émission…' : 'Émettre la facture'}
      </button>
      <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
        Attribue le numéro de la série FAC, définitif. Tant qu&apos;elle n&apos;est pas émise, le
        document reste un projet. L&apos;émission se fait aussi automatiquement à l&apos;expédition.
      </p>
    </div>
  )
}
