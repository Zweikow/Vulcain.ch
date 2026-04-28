'use client'

import { useState } from 'react'
import { Product } from '@/types'

interface AdminProductModalProps {
  product?: Product
  onSave: (product: Omit<Product, 'id'> & { id?: string }) => void
  onClose: () => void
}

export default function AdminProductModal({ product, onSave, onClose }: AdminProductModalProps) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    category: product?.category ?? 'Cidre' as Product['category'],
    year: product?.year ?? new Date().getFullYear(),
    price: product?.price ?? 0,
    stock: product?.stock ?? 0,
    description: product?.description ?? '',
    image: product?.image ?? '',
    active: product?.active ?? true,
  })

  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ ...form, id: product?.id })
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
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name + Category */}
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
                value={form.category}
                onChange={(e) => update('category', e.target.value as Product['category'])}
              >
                <option value="Cidre">Cidre</option>
                <option value="Eau-de-vie">Eau-de-vie</option>
                <option value="Liqueur">Liqueur</option>
                <option value="Cuisine">Cuisine</option>
              </select>
            </div>
          </div>

          {/* Millésime + Prix + Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Millésime
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="2024"
                value={form.year}
                onChange={(e) => update('year', Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix (CHF)
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                className="input-field"
                placeholder="9.50"
                value={form.price}
                onChange={(e) => update('price', Number(e.target.value))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Stock
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                placeholder="12"
                value={form.stock}
                onChange={(e) => update('stock', Number(e.target.value))}
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

          {/* Image URL */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Image du produit
            </label>
            <div className="border-2 border-dashed border-border dark:border-border-dark rounded-md p-4 flex flex-col items-center gap-2 text-text-tertiary dark:text-text-tertiary-dark">
              <span className="text-2xl">↑</span>
              <span className="text-xs">Glissez une image ici ou entrez une URL</span>
            </div>
            <input
              className="input-field mt-1"
              placeholder="https://..."
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              Produit actif
            </label>
            <button
              type="button"
              onClick={() => update('active', !form.active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors focus:outline-none ${
                form.active ? 'bg-primary' : 'bg-border dark:bg-border-dark'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border dark:border-border-dark">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
