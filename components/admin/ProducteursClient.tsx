'use client'

import { Pencil, Trash2, Check, X, Wine } from 'lucide-react'
import { useState, useTransition } from 'react'
import {
  createProducer,
  updateProducer,
  deleteProducer,
} from '@/app/admin/(protected)/producteurs/actions'
import { useRouter } from 'next/navigation'

interface ProducerItem {
  id: string
  name: string
  _count: { products: number }
}

export function ProducteursClient({
  producers,
  canEdit,
}: {
  producers: ProducerItem[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!name.trim()) return
    startTransition(async () => {
      setError('')
      const res = await createProducer({ name })
      if (res?.error) {
        setError(res.error)
      } else {
        setName('')
        router.refresh()
      }
    })
  }

  const handleStartEdit = (p: ProducerItem) => {
    setEditingId(p.id)
    setEditName(p.name)
    setError('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return
    startTransition(async () => {
      setError('')
      const res = await updateProducer(id, { name: editName })
      if (res?.error) {
        setError(res.error)
      } else {
        setEditingId(null)
        setEditName('')
        router.refresh()
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      setError('')
      const res = await deleteProducer(id)
      if (res?.error) {
        setError(res.error)
      } else {
        setConfirmDeleteId(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark flex items-center gap-2">
            <span>Producteurs</span>
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Gérez les cidriculteurs et artisans partenaires du catalogue Drinkcider
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#FDF2F2] dark:bg-red-950/40 border border-[#F3D5D5] dark:border-red-900/50 text-[#C62828] dark:text-red-300 px-4 py-3 rounded-xl text-sm shadow-xs">
          {error}
        </div>
      )}

      {canEdit && (
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            placeholder="Nouveau producteur (ex. Cidrerie du Vulcain)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={pending || !name.trim()}
            className="btn-primary text-sm disabled:opacity-50 shrink-0"
          >
            {pending ? 'Ajout...' : 'Ajouter un producteur'}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border dark:border-border-dark bg-bg-page/50 dark:bg-bg-page-dark/50 text-left">
                <th className="px-4 py-3.5 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Nom du producteur
                </th>
                <th className="px-4 py-3.5 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Produits associés
                </th>
                <th className="px-4 py-3.5 text-right font-medium text-text-secondary dark:text-text-secondary-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border-dark">
              {producers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-12 text-center text-text-tertiary dark:text-text-tertiary-dark"
                  >
                    Aucun producteur enregistré.
                  </td>
                </tr>
              ) : (
                producers.map((p) => {
                  const isEditing = editingId === p.id
                  const hasProducts = p._count.products > 0

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-bg-page/40 dark:hover:bg-bg-page-dark/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                        {isEditing ? (
                          <div className="flex items-center gap-2 max-w-sm">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(p.id)
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                              className="input-field py-1 text-sm flex-1"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(p.id)}
                              disabled={pending || !editName.trim()}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-colors"
                              title="Enregistrer"
                              aria-label="Enregistrer"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={pending}
                              className="p-1.5 text-text-tertiary hover:bg-bg-page dark:hover:bg-bg-page-dark rounded-lg transition-colors"
                              title="Annuler"
                              aria-label="Annuler"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            hasProducts
                              ? 'bg-primary/10 text-primary-text dark:bg-primary/20'
                              : 'bg-bg-page dark:bg-bg-page-dark text-text-tertiary dark:text-text-tertiary-dark'
                          }`}
                        >
                          <Wine className="w-3 h-3 opacity-70" />
                          {p._count.products} référence{p._count.products > 1 ? 's' : ''}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-2">
                            {!isEditing && (
                              <button
                                onClick={() => handleStartEdit(p)}
                                disabled={pending}
                                className="p-1.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark rounded-lg transition-colors"
                                title="Modifier le nom"
                                aria-label="Modifier le nom"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {confirmDeleteId === p.id ? (
                              <div className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md border border-red-200 dark:border-red-900/50">
                                <span className="text-red-700 dark:text-red-300 font-medium">
                                  Confirmer ?
                                </span>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  disabled={pending}
                                  className="text-text-error hover:underline font-bold"
                                >
                                  Oui
                                </button>
                                <span className="text-text-tertiary">|</span>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  disabled={pending}
                                  className="text-text-secondary hover:underline"
                                >
                                  Non
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(p.id)}
                                disabled={pending || hasProducts}
                                title={
                                  hasProducts
                                    ? 'Impossible de supprimer : ce producteur a des produits associés.'
                                    : 'Supprimer ce producteur'
                                }
                                className={`p-1.5 rounded-lg transition-colors ${
                                  hasProducts
                                    ? 'opacity-30 cursor-not-allowed text-text-tertiary'
                                    : 'text-text-error hover:bg-red-50 dark:hover:bg-red-950/30'
                                }`}
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
