'use client'

import { useRouter } from 'next/navigation'

interface FactureOrderSelectProps {
  currentId: string
  orders: { id: string; numero: string; invoiceNumber: string | null; clientName: string }[]
}

/** Passer d'une facture à l'autre sans revenir en arrière (DESIGN.md §3). */
export function FactureOrderSelect({ currentId, orders }: FactureOrderSelectProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="facture-select"
        className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark"
      >
        Facture
      </label>
      <select
        id="facture-select"
        value={currentId}
        onChange={(e) => router.push(`/admin/commandes/${e.target.value}/facture`)}
        className="input-field font-mono text-xs"
      >
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.invoiceNumber ?? o.numero} — {o.clientName}
          </option>
        ))}
      </select>
    </div>
  )
}
