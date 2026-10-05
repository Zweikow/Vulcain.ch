'use client'

import { useState, useTransition } from 'react'
import { setMaintenanceMode } from '@/app/admin/(protected)/parametres/actions'

export function MaintenanceToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    const next = !enabled
    const question = next
      ? 'Passer la boutique en maintenance ? Les visiteurs verront un avis de fermeture et aucune commande ne pourra être passée.'
      : 'Rouvrir la boutique ? Le catalogue et les commandes seront de nouveau accessibles.'
    if (!window.confirm(question)) return

    setError(null)
    startTransition(async () => {
      const res = await setMaintenanceMode(next)
      if (res.ok) setEnabled(next)
      else setError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Mode maintenance de la boutique
          </p>
          <p className="mt-1 text-xs text-text-secondary dark:text-text-secondary-dark">
            Affiche un avis de fermeture à la place du catalogue et refuse toute commande. Le
            back-office reste accessible.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Mode maintenance de la boutique"
          onClick={toggle}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${
            enabled ? 'bg-text-error dark:bg-text-error-dark' : 'bg-border dark:bg-border-dark'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <p
        className={`text-xs font-semibold ${
          enabled
            ? 'text-text-error dark:text-text-error-dark'
            : 'text-text-success dark:text-text-success-dark'
        }`}
        aria-live="polite"
      >
        {pending
          ? 'Enregistrement…'
          : enabled
            ? 'Boutique fermée : les commandes sont suspendues.'
            : 'Boutique en ligne : les commandes sont ouvertes.'}
      </p>

      {error && <p className="text-xs text-text-error dark:text-text-error-dark">{error}</p>}
    </div>
  )
}
