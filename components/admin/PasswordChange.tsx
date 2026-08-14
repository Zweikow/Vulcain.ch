'use client'

import { useState, useTransition } from 'react'
import { changePassword } from '@/app/admin/(protected)/parametres/password-actions'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function PasswordChange({ username }: { username: string }) {
  const [form, setForm] = useState(EMPTY)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ error?: string; message?: string } | null>(null)

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await changePassword(form)
      setFeedback(result)
      if (!result.error) setForm(EMPTY)
    })
  }

  return (
    <section className="card p-6">
      <h2 className="font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
        Mot de passe
      </h2>
      <p className="mt-1 text-xs text-text-tertiary dark:text-text-tertiary-dark">
        Connexion au back-office avec le nom d&apos;utilisateur{' '}
        <span className="font-mono">{username}</span>.
      </p>

      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          Mot de passe actuel
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            onChange={update('currentPassword')}
            className="input-field mt-1"
          />
        </label>
        <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          Nouveau mot de passe
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={form.newPassword}
            onChange={update('newPassword')}
            className="input-field mt-1"
          />
        </label>
        <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          Confirmation
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            className="input-field mt-1"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button disabled={pending} className="btn-primary text-sm disabled:opacity-50">
            {pending ? 'Modification…' : 'Changer le mot de passe'}
          </button>
          <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
            Douze caractères au minimum. Une phrase dont vous vous souvenez vaut mieux qu&apos;un
            mot court compliqué.
          </span>
        </div>

        {feedback?.error && (
          <p className="text-sm text-text-error sm:col-span-3">{feedback.error}</p>
        )}
        {feedback?.message && (
          <p className="text-sm text-text-success sm:col-span-3">{feedback.message}</p>
        )}
      </form>
    </section>
  )
}
