'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'
import {
  createUser,
  deleteUser,
  resetUserPassword,
} from '@/app/admin/(protected)/utilisateurs/actions'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/permissions'

export type AdminUser = {
  id: string
  username: string
  name: string
  role: Role
  createdAt: Date
}

// Libellés et descriptions partagés avec le reste de l'application.

const stamp = new Intl.DateTimeFormat('fr-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const EMPTY: { username: string; name: string; role: Role; password: string } = {
  username: '',
  name: '',
  role: Role.PREPARATEUR,
  password: '',
}

export function UsersClient({
  users,
  currentUserId,
}: {
  users: AdminUser[]
  currentUserId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ error?: string; message?: string } | null>(null)

  const run = (fn: () => Promise<{ error?: string; message?: string }>, onOk?: () => void) =>
    startTransition(async () => {
      const result = await fn()
      setFeedback(result)
      if (!result.error) {
        onOk?.()
        router.refresh()
      }
    })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-semibold text-text-primary dark:text-text-primary-dark">
            Utilisateurs
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
            {users.length} compte{users.length > 1 ? 's' : ''} · un préparateur accède aux commandes
            et au catalogue, pas aux paramètres ni au journal
          </p>
        </div>
        <button className="btn-primary" onClick={() => setOpen((v) => !v)}>
          {open ? 'Fermer' : '+ Ajouter un compte'}
        </button>
      </div>

      {feedback?.error && (
        <p className="card mb-4 border-[#F3D5D5] bg-[#FDF2F2] p-3 text-sm text-[#C62828] dark:border-[#5a2a2a] dark:bg-[#2a1717] dark:text-[#EF5350]">
          {feedback.error}
        </p>
      )}
      {feedback?.message && (
        <p className="card mb-4 border-[#CDE8D4] bg-[#E8F5E9] p-3 text-sm text-text-success dark:border-[#254a2f] dark:bg-[#16281b]">
          {feedback.message}
        </p>
      )}

      {open && (
        <section className="card mb-6 p-6">
          <h2 className="font-semibold text-[16px] text-text-primary dark:text-text-primary-dark">
            Nouveau compte
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Nom d&apos;utilisateur
              <input
                className="input-field mt-1 font-mono"
                placeholder="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Nom affiché
              <input
                className="input-field mt-1"
                placeholder="Prénom Nom"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Rôle
              <select
                className="input-field mt-1"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                <option value={Role.PREPARATEUR}>Préparateur</option>
                <option value={Role.GESTIONNAIRE}>Gestionnaire</option>
                <option value={Role.ADMIN}>Administrateur</option>
              </select>
              <span className="mt-1 block font-normal text-text-tertiary dark:text-text-tertiary-dark">
                {ROLE_DESCRIPTIONS[form.role]}
              </span>
            </label>
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Mot de passe initial
              <input
                type="password"
                className="input-field mt-1"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-text-tertiary dark:text-text-tertiary-dark">
            Douze caractères au minimum. Communiquez-le de vive voix, et invitez la personne à le
            changer depuis Paramètres à sa première connexion.
          </p>
          <button
            className="btn-primary mt-4 text-sm disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              run(
                () => createUser(form),
                () => {
                  setForm(EMPTY)
                  setOpen(false)
                }
              )
            }
          >
            {pending ? 'Création…' : 'Créer le compte'}
          </button>
        </section>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-page text-left text-[11px] uppercase tracking-[.08em] text-text-secondary dark:border-border-dark dark:bg-bg-page-dark dark:text-text-secondary-dark">
              <th className="px-4 py-3 font-semibold">Utilisateur</th>
              <th className="px-4 py-3 font-semibold">Nom</th>
              <th className="px-4 py-3 font-semibold">Rôle</th>
              <th className="px-4 py-3 font-semibold">Créé le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border-light last:border-0 dark:border-border-light-dark"
              >
                <td className="px-4 py-3 font-mono font-medium text-text-primary dark:text-text-primary-dark">
                  {u.username}
                  {u.id === currentUserId && (
                    <span className="ml-2 font-sans text-xs text-text-tertiary dark:text-text-tertiary-dark">
                      (vous)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                  {u.name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${
                      u.role === Role.ADMIN
                        ? 'bg-accent-mauve-dark text-white'
                        : 'bg-border-light text-text-secondary dark:bg-border-dark dark:text-text-secondary-dark'
                    }`}
                  >
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="tabular px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                  {stamp.format(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {resetFor === u.id ? (
                    <span className="flex flex-wrap items-center justify-end gap-2">
                      <input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        className="input-field w-48 text-xs"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => resetUserPassword(u.id, newPassword),
                            () => {
                              setResetFor(null)
                              setNewPassword('')
                            }
                          )
                        }
                      >
                        Valider
                      </button>
                      <button
                        className="text-xs text-text-tertiary hover:underline dark:text-text-tertiary-dark"
                        onClick={() => setResetFor(null)}
                      >
                        Annuler
                      </button>
                    </span>
                  ) : confirmDelete === u.id ? (
                    <span className="flex items-center justify-end gap-2 text-xs">
                      <span className="text-text-secondary dark:text-text-secondary-dark">
                        Supprimer {u.username} ?
                      </span>
                      <button
                        className="btn-danger px-3 py-1.5 text-xs disabled:opacity-50"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => deleteUser(u.id),
                            () => setConfirmDelete(null)
                          )
                        }
                      >
                        Confirmer
                      </button>
                      <button
                        className="text-text-tertiary hover:underline dark:text-text-tertiary-dark"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-3 text-sm">
                      <button
                        className="text-text-secondary hover:underline dark:text-text-secondary-dark"
                        onClick={() => setResetFor(u.id)}
                      >
                        Réinitialiser
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          className="text-text-error hover:underline"
                          onClick={() => setConfirmDelete(u.id)}
                        >
                          Supprimer
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
