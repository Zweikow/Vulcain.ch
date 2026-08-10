'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createProduct,
  updateProduct,
  archiveProduct,
  ProductInput,
} from '@/app/admin/(protected)/produits/actions'
import { chfInputToCents, formatCHF, proUnitPriceCents } from '@/lib/money'

export type AdminProduct = {
  id: string
  name: string
  categoryId: string
  year: number | null
  description: string
  priceCents: number
  stock: number
  stockSeuil: number
  active: boolean
  imageUrl: string | null
  ordered: boolean // figure dans au moins une commande → archivage, pas de suppression
}

interface AdminProductModalProps {
  product?: AdminProduct
  categories: { id: string; name: string }[]
  proRatePercent: number
  onClose: () => void
}

export default function AdminProductModal({
  product,
  categories,
  proRatePercent,
  onClose,
}: AdminProductModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({
    name: product?.name ?? '',
    categoryId: product?.categoryId ?? categories[0]?.id ?? '',
    year: product?.year ? String(product.year) : '',
    priceChf: product ? String(product.priceCents / 100) : '',
    stock: product?.stock ?? 0,
    stockSeuil: product?.stockSeuil ?? 5,
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
    active: product?.active ?? true,
  })

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const priceCents = chfInputToCents(form.priceChf)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const input: ProductInput = {
      name: form.name,
      categoryId: form.categoryId,
      year: form.year ? Number(form.year) : null,
      description: form.description,
      priceCents,
      stock: Number(form.stock),
      stockSeuil: Number(form.stockSeuil),
      active: form.active,
      imageUrl: form.imageUrl,
    }
    startTransition(async () => {
      const result = product ? await updateProduct(product.id, input) : await createProduct(input)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveProduct(product!.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border dark:border-border-dark">
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {product ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-tertiary dark:text-text-tertiary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Nom + Catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Nom du produit
              </label>
              <input
                className="input-field"
                placeholder="Cidre Brut 2024"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Catégorie
              </label>
              <select
                className="input-field"
                value={form.categoryId}
                onChange={(e) => update('categoryId', e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Millésime + Prix public + Prix pro dérivé */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Millésime
              </label>
              <input
                type="number"
                className="input-field tabular"
                placeholder="2026"
                value={form.year}
                onChange={(e) => update('year', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix public (CHF)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                className="input-field tabular"
                placeholder="24.00"
                value={form.priceChf}
                onChange={(e) => update('priceChf', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix pro (−{proRatePercent}%)
              </label>
              {/* Dérivé du taux unique de Setting — jamais saisi (DESIGN.md §2) */}
              <input
                className="input-field tabular opacity-60"
                value={
                  priceCents > 0 ? formatCHF(proUnitPriceCents(priceCents, proRatePercent)) : '—'
                }
                disabled
              />
            </div>
          </div>

          {/* Stock + Seuil d'alerte */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Stock
              </label>
              <input
                type="number"
                min="0"
                className="input-field tabular"
                value={form.stock}
                onChange={(e) => update('stock', Number(e.target.value))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Seuil d&apos;alerte stock
              </label>
              <input
                type="number"
                min="0"
                className="input-field tabular"
                value={form.stockSeuil}
                onChange={(e) => update('stockSeuil', Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Description
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Description du produit..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          {/* Image */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Image du produit
            </label>
            <div className="border-2 border-dashed border-border dark:border-border-dark rounded-md p-4 flex flex-col items-center gap-1 text-text-tertiary dark:text-text-tertiary-dark">
              <span className="font-mono text-[11px]">photo bouteille 1:1 — 800×600 min</span>
              <span className="text-xs">L&apos;upload direct arrivera avec le stockage S3</span>
            </div>
            <input
              className="input-field mt-1"
              placeholder="https://… (URL de l'image, facultatif)"
              value={form.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
            />
          </div>

          {/* Visibilité boutique */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              Visible dans la boutique
            </label>
            <button
              type="button"
              onClick={() => update('active', !form.active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors ${
                form.active ? 'bg-primary' : 'bg-border dark:bg-border-dark'
              }`}
              aria-label="Basculer la visibilité"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="rounded-md bg-[#FDF2F2] px-3 py-2 text-sm text-[#C62828]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border dark:border-border-dark">
            <div>
              {product &&
                (confirmDelete ? (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary dark:text-text-secondary-dark">
                      {product.ordered ? 'Archiver ce produit ?' : 'Supprimer définitivement ?'}
                    </span>
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={pending}
                      className="btn-danger text-xs px-3 py-1.5"
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-text-tertiary dark:text-text-tertiary-dark hover:underline"
                    >
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-sm text-text-error hover:underline"
                  >
                    {product.ordered ? 'Archiver' : 'Supprimer'}
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {product?.ordered && (
            <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
              Ce produit figure dans des commandes : il ne peut pas être supprimé, seulement
              archivé. Les factures passées restent intactes.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
