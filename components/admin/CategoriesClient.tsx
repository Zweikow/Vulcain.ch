'use client'

import { useState, useTransition } from 'react'
import {
  createCategory,
  deleteCategory,
  moveCategory,
} from '@/app/admin/(protected)/categories/actions'
import { useRouter } from 'next/navigation'

export function CategoriesClient({
  categories,
  canEdit,
}: {
  categories: { id: string; name: string; _count: { products: number } }[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!name.trim()) return
    startTransition(async () => {
      setError('')
      const res = await createCategory({ name })
      if (res?.error) {
        setError(res.error)
      } else {
        setName('')
        router.refresh()
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setError('')
      const res = await deleteCategory(id)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const handleMove = (id: string, direction: 'up' | 'down') => {
    startTransition(async () => {
      setError('')
      const res = await moveCategory(id, direction)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark">
          Catégories
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
          Gérez les catégories du catalogue
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-[#FDF2F2] border border-[#F3D5D5] text-[#C62828] px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {canEdit && (
        <div className="card p-4 flex gap-2 mb-6 items-center">
          <input
            type="text"
            placeholder="Nouvelle catégorie"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={pending || !name.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {pending ? 'Création...' : 'Ajouter'}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark text-left">
              <th className="px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Nom
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Produits
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  Aucune catégorie
                </td>
              </tr>
            ) : (
              categories.map((c, index) => (
                <tr
                  key={c.id}
                  className="border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50"
                >
                  <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                    {c._count.products}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center bg-bg-page-dark/5 dark:bg-bg-page/10 rounded overflow-hidden mr-4">
                          <button
                            onClick={() => handleMove(c.id, 'up')}
                            disabled={pending || index === 0}
                            className="px-2 py-1 hover:bg-bg-page-dark/10 dark:hover:bg-bg-page/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                            title="Monter"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMove(c.id, 'down')}
                            disabled={pending || index === categories.length - 1}
                            className="px-2 py-1 hover:bg-bg-page-dark/10 dark:hover:bg-bg-page/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs border-l border-border dark:border-border-dark"
                            title="Descendre"
                          >
                            ↓
                          </button>
                        </div>
                        {confirmDeleteId === c.id ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-text-secondary dark:text-text-secondary-dark">
                              Sûr ?
                            </span>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={pending}
                              className="text-text-error hover:underline font-medium"
                            >
                              Oui
                            </button>
                            <span className="text-border dark:text-border-dark">|</span>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={pending}
                              className="text-text-tertiary hover:underline dark:text-text-tertiary-dark"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            disabled={pending || c._count.products > 0}
                            title={
                              c._count.products > 0
                                ? 'Impossible de supprimer : cette catégorie contient des produits.'
                                : 'Supprimer cette catégorie'
                            }
                            className={`text-text-error hover:underline ${
                              c._count.products > 0
                                ? 'opacity-30 cursor-not-allowed hover:no-underline'
                                : 'disabled:opacity-50'
                            }`}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
