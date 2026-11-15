'use client'

import { createContext, useContext, useState, useTransition } from 'react'
import { saveSettings, type SaveSettingsResult } from '@/app/admin/(protected)/parametres/actions'

const ResultContext = createContext<SaveSettingsResult | null>(null)

/**
 * Formulaire de l'écran Paramètres. Les champs restent rendus par la page
 * (composant serveur) ; ce composant envoie la saisie et affiche la réponse.
 *
 * Envoi par `onSubmit`, comme PasswordChange : un `action` de formulaire remet
 * tous les champs à leur valeur enregistrée après l'envoi, et la saisie serait
 * perdue quand l'enregistrement est refusé.
 */
export function SettingsForm({ children }: { children: React.ReactNode }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<SaveSettingsResult | null>(null)

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    startTransition(async () => {
      const res = await saveSettings(data)
      setResult(res)
      const iban = form.elements.namedItem('iban')
      if (!(iban instanceof HTMLInputElement)) return
      // Enregistré : le champ montre l'IBAN tel qu'il figurera sur la facture.
      if (res.ok) iban.value = res.iban
      else if (res.ibanError) iban.focus()
    })
  }

  return (
    <ResultContext.Provider value={result}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {children}

        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <p role="status" aria-live="polite" className="text-sm">
            {result?.ok === true && (
              <span className="text-text-success dark:text-text-success-dark">
                Paramètres enregistrés.
              </span>
            )}
            {result?.ok === false && (
              <span className="text-text-error dark:text-text-error-dark">{result.error}</span>
            )}
          </p>
          <button disabled={pending} className="btn-primary disabled:opacity-50">
            {pending ? 'Enregistrement…' : 'Enregistrer les paramètres'}
          </button>
        </div>
      </form>
    </ResultContext.Provider>
  )
}

/** Champ IBAN, avec le message du contrôle serveur juste en dessous. */
export function IbanField({ defaultValue }: { defaultValue: string }) {
  const result = useContext(ResultContext)
  const error = result?.ok === false ? result.ibanError : undefined

  return (
    <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
      IBAN
      <input
        name="iban"
        defaultValue={defaultValue}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'iban-error' : undefined}
        className={`input-field mt-1 font-mono${
          error
            ? ' border-text-error focus:ring-text-error dark:border-text-error-dark dark:focus:ring-text-error-dark'
            : ''
        }`}
      />
      {error ? (
        <span
          id="iban-error"
          className="mt-1 block font-normal text-text-error dark:text-text-error-dark"
        >
          {error}
        </span>
      ) : (
        <span className="mt-1 block font-normal text-text-tertiary dark:text-text-tertiary-dark">
          Compte qui reçoit les paiements : IBAN classique CH ou LI, pas de QR-IBAN.
        </span>
      )}
    </label>
  )
}
