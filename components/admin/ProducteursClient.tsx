'use client'

import {
  Pencil,
  Trash2,
  Wine,
  Globe,
  AlertCircle,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react'
import { useState, useTransition } from 'react'
import {
  createProducer,
  updateProducer,
  deleteProducer,
} from '@/app/admin/(protected)/producteurs/actions'
import { useRouter } from 'next/navigation'

export interface ProducerItem {
  id: string
  name: string
  slug: string
  description?: string | null
  region?: string | null
  photoUrl?: string | null
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
  const [editingProducer, setEditingProducer] = useState<ProducerItem | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    region: '',
    photoUrl: '',
  })
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
    setEditingProducer(p)
    setEditForm({
      name: p.name,
      description: p.description || '',
      region: p.region || '',
      photoUrl: p.photoUrl || '',
    })
    setError('')
  }

  const handleSaveEdit = () => {
    if (!editingProducer || !editForm.name.trim()) return
    startTransition(async () => {
      setError('')
      const res = await updateProducer(editingProducer.id, {
        name: editForm.name,
        description: editForm.description.trim() ? editForm.description : null,
        region: editForm.region.trim() ? editForm.region : null,
        photoUrl: editForm.photoUrl.trim() ? editForm.photoUrl : null,
      })
      if (res?.error) {
        setError(res.error)
      } else {
        setEditingProducer(null)
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
        <div className="bg-[#FDF2F2] dark:bg-red-950/40 border border-[#F3D5D5] dark:border-red-900/50 text-[#C62828] dark:text-red-300 px-4 py-3 rounded-xl text-sm shadow-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
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
                  Statut SEO
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
                    colSpan={4}
                    className="px-4 py-12 text-center text-text-tertiary dark:text-text-tertiary-dark"
                  >
                    Aucun producteur enregistré.
                  </td>
                </tr>
              ) : (
                producers.map((p) => {
                  const hasProducts = p._count.products > 0
                  const isIndexable = Boolean(p.description && p.description.trim().length > 0)

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-bg-page/40 dark:hover:bg-bg-page-dark/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                        <div>
                          <span className="font-semibold">{p.name}</span>
                          {p.region && (
                            <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark ml-2">
                              ({p.region})
                            </span>
                          )}
                          <div className="text-[11px] text-text-tertiary font-mono">
                            /producteurs/{p.slug}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isIndexable ? (
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
                            <button
                              onClick={() => handleStartEdit(p)}
                              disabled={pending}
                              className="p-1.5 text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark rounded-lg transition-colors flex items-center gap-1 text-xs"
                              title="Modifier la fiche"
                              aria-label="Modifier la fiche"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Modifier</span>
                            </button>

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

      {/* Modale d'édition complète du producteur */}
      {editingProducer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-bg-card dark:bg-bg-card-dark rounded-xl border border-border dark:border-border-dark shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
                  Modifier le producteur
                </h3>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                  Éditez les détails éditoriaux et SEO du producteur
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProducer(null)}
                disabled={pending}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Nom du producteur *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field w-full text-xs"
                  placeholder="Ex. Jacques Perritaz"
                />
              </div>

              <div>
                <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Slug (URL permanente)
                </label>
                <input
                  type="text"
                  value={editingProducer.slug}
                  disabled
                  className="input-field w-full text-xs bg-bg-page/50 dark:bg-bg-page-dark/50 cursor-not-allowed text-text-tertiary font-mono"
                />
                <p className="text-[11px] text-text-tertiary mt-1">
                  Le slug est figé pour préserver le référencement Google.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Région / Terroir
                  </label>
                  <input
                    type="text"
                    value={editForm.region}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, region: e.target.value }))}
                    className="input-field w-full text-xs"
                    placeholder="Ex. Le Mouret, Fribourg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                    Photo URL
                  </label>
                  <input
                    type="text"
                    value={editForm.photoUrl}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
                    className="input-field w-full text-xs"
                    placeholder="Ex. /images/histoire/jacques-perritaz.jpg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Description éditoriale & SEO
                </label>
                <textarea
                  rows={5}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="input-field w-full text-xs resize-none"
                  placeholder="Présentation du producteur, de son histoire, de sa méthode de vinification naturelle..."
                />
                <div className="mt-2 p-2.5 rounded-lg bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark text-[11px] text-text-secondary dark:text-text-secondary-dark flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Règle SEO :</strong> Une description rédigée rend la page producteur
                    indexable par Google et l&apos;intègre dans le sitemap XML. Si la description
                    est vide, la page reste protégée en noindex et hors sitemap.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProducer(null)}
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
    </div>
  )
}
