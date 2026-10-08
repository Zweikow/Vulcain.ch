'use client'

import {
  ArrowDown,
  ArrowUp,
  Trash2,
  AlertCircle,
  Pencil,
  Sparkles,
  Globe,
  CheckCircle2,
} from 'lucide-react'
import { useState, useTransition } from 'react'
import {
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
} from '@/app/admin/(protected)/categories/actions'
import { useRouter } from 'next/navigation'

export interface CategoryItem {
  id: string
  name: string
  slug: string
  description?: string | null
  _count: { products: number }
}

export function CategoriesClient({
  categories,
  canEdit,
}: {
  categories: CategoryItem[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
  })
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string
    name: string
    count: number
  } | null>(null)
  const [transferTargetId, setTransferTargetId] = useState<string>('')

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

  const handleStartEdit = (c: CategoryItem) => {
    setEditingCategory(c)
    setEditForm({
      name: c.name,
      description: c.description || '',
    })
    setError('')
  }

  const handleSaveEdit = () => {
    if (!editingCategory || !editForm.name.trim()) return
    startTransition(async () => {
      setError('')
      const res = await updateCategory(editingCategory.id, {
        name: editForm.name,
        description: editForm.description.trim() ? editForm.description : null,
      })
      if (res?.error) {
        setError(res.error)
      } else {
        setEditingCategory(null)
        router.refresh()
      }
    })
  }

  const handleDelete = (id: string, targetCategoryId?: string) => {
    startTransition(async () => {
      setError('')
      const res = await deleteCategory(id, targetCategoryId)
      if (res?.error) {
        setError(res.error)
      } else {
        setCategoryToDelete(null)
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
          Gérez les catégories du catalogue Drinkcider
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-[#FDF2F2] border border-[#F3D5D5] text-[#C62828] px-4 py-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {canEdit && (
        <div className="card p-4 flex gap-2 mb-6 items-center">
          <input
            type="text"
            placeholder="Nouvelle catégorie"
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
            className="btn-primary text-sm disabled:opacity-50"
          >
            {pending ? 'Création...' : 'Ajouter'}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark text-left">
              <th className="px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Nom
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Statut SEO
              </th>
              <th className="px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Produits
              </th>
              <th className="px-4 py-3 text-right font-medium text-text-secondary dark:text-text-secondary-dark">
                Actions
              </th>
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
              categories.map((c, index) => {
                const isPromo = c.slug === 'offre-speciale-ete'
                const isIndexable = Boolean(
                  !isPromo && c.description && c.description.trim().length > 0
                )

                return (
                  <tr
                    key={c.id}
                    className="border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                      <div>
                        <span className="font-semibold">{c.name}</span>
                        <div className="text-[11px] text-text-tertiary font-mono">
                          /categories/{c.slug}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isPromo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/20">
                          Exclu (Offre promo)
                        </span>
                      ) : isIndexable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Indexé (Sitemap)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Globe className="w-3 h-3" />
                          Noindex (desc. vide)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {c._count.products}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center bg-bg-page-dark/5 dark:bg-bg-page/10 rounded overflow-hidden mr-2">
                            <button
                              onClick={() => handleMove(c.id, 'up')}
                              disabled={pending || index === 0}
                              className="px-2 py-1 hover:bg-bg-page-dark/10 dark:hover:bg-bg-page/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                              title="Monter"
                              aria-label="Monter"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMove(c.id, 'down')}
                              disabled={pending || index === categories.length - 1}
                              className="px-2 py-1 hover:bg-bg-page-dark/10 dark:hover:bg-bg-page/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs border-l border-border dark:border-border-dark"
                              title="Descendre"
                              aria-label="Descendre"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleStartEdit(c)}
                            disabled={pending}
                            className="p-1.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark rounded-lg transition-colors flex items-center gap-1 text-xs"
                            title="Modifier la catégorie"
                            aria-label="Modifier la catégorie"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Modifier</span>
                          </button>

                          <button
                            onClick={() => {
                              setCategoryToDelete({
                                id: c.id,
                                name: c.name,
                                count: c._count.products,
                              })
                              const other = categories.find((cat) => cat.id !== c.id)
                              setTransferTargetId(other?.id || '')
                            }}
                            disabled={pending}
                            title="Supprimer cette catégorie"
                            className="text-xs text-text-error hover:underline transition-colors flex items-center gap-1 p-1"
                          >
                            <Trash2 className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
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

      {/* Modale d'édition de la catégorie */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-bg-card dark:bg-bg-card-dark rounded-xl border border-border dark:border-border-dark shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
                  Modifier la catégorie
                </h3>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                  Éditez le nom et la description SEO de la catégorie
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                disabled={pending}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field w-full text-xs"
                  placeholder="Ex. Cidres doux"
                />
              </div>

              <div>
                <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Slug (URL permanente)
                </label>
                <input
                  type="text"
                  value={editingCategory.slug}
                  disabled
                  className="input-field w-full text-xs bg-bg-page/50 dark:bg-bg-page-dark/50 cursor-not-allowed text-text-tertiary font-mono"
                />
                <p className="text-[11px] text-text-tertiary mt-1">
                  Le slug est figé pour préserver le référencement Google.
                </p>
              </div>

              <div>
                <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Description éditoriale & SEO
                </label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="input-field w-full text-xs resize-none"
                  placeholder="Présentation de la famille de produits, typicités gustatives, méthode d'élaboration..."
                />
                <div className="mt-2 p-2.5 rounded-lg bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark text-[11px] text-text-secondary dark:text-text-secondary-dark flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Règle SEO :</strong> Une description rédigée rend la page catégorie
                    indexable par Google et l&apos;ajoute au sitemap XML. Si la description est vide
                    (ou pour l&apos;offre spéciale été), la page reste protégée en noindex et hors
                    sitemap.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                disabled={pending}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={pending || !editForm.name.trim()}
                className="btn-primary text-xs py-2 px-4 disabled:opacity-50"
              >
                {pending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de suppression sécurisée avec transfert de produits */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-bg-card dark:bg-bg-card-dark rounded-xl border border-border dark:border-border-dark shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
                  Supprimer la catégorie « {categoryToDelete.name} » ?
                </h3>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                  {categoryToDelete.count > 0
                    ? `Cette catégorie contient encore ${categoryToDelete.count} article(s). Choisissez où les déplacer avant de supprimer la catégorie.`
                    : 'Cette catégorie ne contient aucun article. Elle sera définitivement supprimée.'}
                </p>
              </div>
            </div>

            {categoryToDelete.count > 0 && (
              <div className="p-3.5 rounded-lg bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark space-y-2">
                <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                  Transférer les {categoryToDelete.count} article(s) vers :
                </label>
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="input-field w-full text-xs"
                >
                  {categories
                    .filter((cat) => cat.id !== categoryToDelete.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat._count.products} article
                        {cat._count.products > 1 ? 's' : ''})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={pending}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    categoryToDelete.id,
                    categoryToDelete.count > 0 ? transferTargetId : undefined
                  )
                }
                disabled={pending || (categoryToDelete.count > 0 && !transferTargetId)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                {pending
                  ? 'Suppression...'
                  : categoryToDelete.count > 0
                    ? 'Transférer et supprimer'
                    : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
