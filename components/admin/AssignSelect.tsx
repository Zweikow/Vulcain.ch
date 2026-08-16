'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface AssignSelectProps {
  orderId: string
  currentAssigneeId: string | null
  users: { id: string; name: string }[]
}

export function AssignSelect({ orderId, currentAssigneeId, users }: AssignSelectProps) {
  const router = useRouter()
  const [assigneeId, setAssigneeId] = useState<string | null>(currentAssigneeId)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newAssigneeId = e.target.value === '' ? null : e.target.value
    setError(null)

    const res = await fetch(`/api/admin/commandes/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId: newAssigneeId }),
    })

    if (!res.ok) {
      setError("Erreur lors de l'assignation.")
      return
    }

    setAssigneeId(newAssigneeId)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide"
        htmlFor="assignee"
      >
        Préparateur
      </label>
      <select
        id="assignee"
        value={assigneeId ?? ''}
        onChange={handleChange}
        disabled={isPending}
        className="input-field w-full text-sm py-1.5"
        style={{ paddingRight: '2rem' }}
      >
        <option value="">-- Non assigné --</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#C62828] dark:text-[#EF5350] mt-1">{error}</p>}
    </div>
  )
}
