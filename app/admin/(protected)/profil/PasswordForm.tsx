'use client'

import { useState, useTransition } from 'react'
import { updatePassword } from './actions'

export function PasswordForm() {
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus(null)
    const formData = new FormData(e.currentTarget)
    const form = e.target as HTMLFormElement

    startTransition(async () => {
      const result = await updatePassword(formData)
      setStatus(result)
      if (result.success) {
        form.reset()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      {status?.error && (
        <div className="p-3 text-sm text-[#C62828] bg-[#FDF2F2] rounded-md border border-[#F3D5D5] dark:border-[#5a2a2a] dark:bg-[#2a1717] dark:text-[#EF5350]">
          {status.error}
        </div>
      )}
      {status?.success && (
        <div className="p-3 text-sm text-[#2E7D32] bg-[#E8F5E9] rounded-md border border-[#C8E6C9] dark:border-[#1b3a1d] dark:bg-[#0a210d] dark:text-[#81C784]">
          {status.success}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
          Mot de passe actuel
        </label>
        <input name="currentPassword" type="password" required className="input-field" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
          Nouveau mot de passe
        </label>
        <input name="newPassword" type="password" required className="input-field" minLength={8} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
          Confirmer le nouveau mot de passe
        </label>
        <input
          name="confirmPassword"
          type="password"
          required
          className="input-field"
          minLength={8}
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary mt-2 self-start">
        {isPending ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
      </button>
    </form>
  )
}
