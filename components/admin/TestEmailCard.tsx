'use client'

import { useState, useTransition } from 'react'
import { sendTestEmailAction } from '@/app/admin/(protected)/parametres/actions'
import { MailIcon, SendIcon, CheckIcon, CloseIcon } from '@/components/admin/AdminIcons'

interface TestEmailCardProps {
  defaultEmail: string
}

export function TestEmailCard({ defaultEmail }: TestEmailCardProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await sendTestEmailAction(email)
      if (res.success) {
        setResult({
          type: 'success',
          message: `Email de test envoyé avec succès à ${email} ! Vérifiez votre boîte de réception.`,
        })
      } else {
        setResult({
          type: 'error',
          message: res.error || "Échec de l'envoi du test via Amazon SES.",
        })
      }
    })
  }

  return (
    <section className="card p-6 mt-4">
      <h2 className="font-semibold text-[16px] text-text-primary dark:text-text-primary-dark flex items-center gap-2">
        <MailIcon className="w-5 h-5 text-primary-text" /> Test de la messagerie (Amazon SES)
      </h2>
      <p className="mt-1 text-xs text-text-tertiary dark:text-text-tertiary-dark">
        Permet d&apos;envoyer un email d&apos;essai immédiat pour valider la configuration SES et
        vérifier le rendu visuel.
      </p>

      {result && (
        <div
          className={`mt-3 p-3 rounded-md text-xs font-medium flex items-center gap-2 ${
            result.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {result.type === 'success' ? (
            <CheckIcon className="w-4 h-4 shrink-0 text-green-600" />
          ) : (
            <CloseIcon className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <form onSubmit={handleSendTest} className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre-email@exemple.ch"
          required
          className="input-field flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-secondary text-sm px-4 py-2 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {isPending ? (
            'Envoi en cours…'
          ) : (
            <>
              <SendIcon className="w-4 h-4 text-current" />
              <span>Envoyer un email de test</span>
            </>
          )}
        </button>
      </form>
    </section>
  )
}
