'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PromoType } from '@prisma/client'
import {
  createPromotion,
  updatePromotion,
  PromoInput,
} from '@/app/admin/(protected)/promotions/actions'
import { formatCHF, chfInputToCents } from '@/lib/money'
import { CloseIcon } from '@/components/admin/AdminIcons'

export type PromoProductItem = {
  id: string
  name: string
  bottleSize: string
  bottlesPerUnit: number
  priceCents: number
  categoryName?: string
}

export type AdminPromotion = {
  id: string
  name: string
  badgeText: string | null
  description: string | null
  type: PromoType
  buyQuantity: number | null
  getFreeQuantity: number | null
  discountPercent: number | null
  discountCents: number | null
  active: boolean
  productId: string
}

interface AdminPromoModalProps {
  promotion?: AdminPromotion
  products: PromoProductItem[]
  onClose: () => void
}

export default function AdminPromoModal({ promotion, products, onClose }: AdminPromoModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultProductId = promotion?.productId ?? products[0]?.id ?? ''

  const [form, setForm] = useState({
    name: promotion?.name ?? '',
    productId: defaultProductId,
    type: promotion?.type ?? PromoType.BUY_X_GET_Y_FREE,
    buyQuantity: promotion?.buyQuantity ? String(promotion.buyQuantity) : '3',
    getFreeQuantity: promotion?.getFreeQuantity ? String(promotion.getFreeQuantity) : '1',
    discountPercent: promotion?.discountPercent ? String(promotion.discountPercent) : '15',
    discountChf: promotion?.discountCents ? String(promotion.discountCents / 100) : '5.00',
    badgeText: promotion?.badgeText ?? '',
    description: promotion?.description ?? '',
    active: promotion?.active ?? true,
  })

  const selectedProduct = products.find((p) => p.id === form.productId)

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }

      // Auto-suggest badgeText si vide ou s'il s'agissait du badge auto
      if (
        key === 'type' ||
        key === 'discountPercent' ||
        key === 'buyQuantity' ||
        key === 'getFreeQuantity'
      ) {
        if (!prev.badgeText || prev.badgeText.startsWith('-') || prev.badgeText.includes('+')) {
          if (next.type === PromoType.PERCENTAGE) {
            next.badgeText = `-${next.discountPercent}%`
          } else if (next.type === PromoType.BUY_X_GET_Y_FREE) {
            next.badgeText = `${next.buyQuantity}+${next.getFreeQuantity} OFFERT`
          } else if (next.type === PromoType.FIXED_DISCOUNT) {
            next.badgeText = `-${next.discountChf} CHF`
          }
        }
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.productId) {
      setError('Sélectionnez un produit')
      return
    }

    const input: PromoInput = {
      name: form.name.trim() || `Offre ${selectedProduct?.name ?? ''}`,
      productId: form.productId,
      type: form.type,
      badgeText: form.badgeText.trim() || null,
      description: form.description.trim() || null,
      active: form.active,
      buyQuantity:
        form.type === PromoType.BUY_X_GET_Y_FREE ? parseInt(form.buyQuantity) || 3 : null,
      getFreeQuantity:
        form.type === PromoType.BUY_X_GET_Y_FREE ? parseInt(form.getFreeQuantity) || 1 : null,
      discountPercent:
        form.type === PromoType.PERCENTAGE ? parseInt(form.discountPercent) || 0 : null,
      discountCents:
        form.type === PromoType.FIXED_DISCOUNT ? chfInputToCents(form.discountChf) : null,
    }

    startTransition(async () => {
      const res = promotion
        ? await updatePromotion(promotion.id, input)
        : await createPromotion(input)

      if (res?.error) {
        setError(res.error)
        return
      }

      router.refresh()
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg bg-bg-card dark:bg-bg-card-dark shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border dark:border-border-dark mb-4">
          <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
            {promotion ? 'Modifier la promotion' : 'Nouvelle promotion boutique'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            aria-label="Fermer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-[#FDF2F2] text-[#C62828] text-xs font-medium border border-[#F3D5D5]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Sélection du produit */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
              Produit concerné dans la boutique
            </label>
            <select
              value={form.productId}
              onChange={(e) => update('productId', e.target.value)}
              className="input-field"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.bottleSize} ·{' '}
                  {p.bottlesPerUnit > 1 ? `Carton ${p.bottlesPerUnit} bout.` : '1 bout.'} ·{' '}
                  {formatCHF(p.priceCents)})
                </option>
              ))}
            </select>
          </div>

          {/* Type de promotion */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
              Type d&apos;offre promotionnelle
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => update('type', PromoType.BUY_X_GET_Y_FREE)}
                className={`p-2 rounded-md border text-xs font-semibold text-center transition-colors ${
                  form.type === PromoType.BUY_X_GET_Y_FREE
                    ? 'border-primary bg-primary/10 text-primary-text dark:bg-primary/20'
                    : 'border-border dark:border-border-dark text-text-secondary hover:bg-bg-page dark:hover:bg-bg-page-dark'
                }`}
              >
                X achetés = Y offert
              </button>
              <button
                type="button"
                onClick={() => update('type', PromoType.PERCENTAGE)}
                className={`p-2 rounded-md border text-xs font-semibold text-center transition-colors ${
                  form.type === PromoType.PERCENTAGE
                    ? 'border-primary bg-primary/10 text-primary-text dark:bg-primary/20'
                    : 'border-border dark:border-border-dark text-text-secondary hover:bg-bg-page dark:hover:bg-bg-page-dark'
                }`}
              >
                Remise en %
              </button>
              <button
                type="button"
                onClick={() => update('type', PromoType.FIXED_DISCOUNT)}
                className={`p-2 rounded-md border text-xs font-semibold text-center transition-colors ${
                  form.type === PromoType.FIXED_DISCOUNT
                    ? 'border-primary bg-primary/10 text-primary-text dark:bg-primary/20'
                    : 'border-border dark:border-border-dark text-text-secondary hover:bg-bg-page dark:hover:bg-bg-page-dark'
                }`}
              >
                Rabais fixe (CHF)
              </button>
            </div>
          </div>

          {/* Paramètres selon le type */}
          {form.type === PromoType.BUY_X_GET_Y_FREE && (
            <div className="p-3 rounded-md bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark flex flex-col gap-2">
              <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Règle « Achetés / Offerts » (ex: modèle de l&apos;offre estivale)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
                    Quantité achetée
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      className="input-field tabular"
                      value={form.buyQuantity}
                      onChange={(e) => update('buyQuantity', e.target.value)}
                      required
                    />
                    <span className="text-xs text-text-secondary">unités</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
                    Quantité offerte
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      className="input-field tabular"
                      value={form.getFreeQuantity}
                      onChange={(e) => update('getFreeQuantity', e.target.value)}
                      required
                    />
                    <span className="text-xs text-text-secondary">gratuite(s)</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark italic">
                Exemple : pour {form.buyQuantity} cartons commandés, {form.getFreeQuantity} carton
                est offert dans le panier.
              </p>
            </div>
          )}

          {form.type === PromoType.PERCENTAGE && (
            <div className="p-3 rounded-md bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark flex flex-col gap-2">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Pourcentage de réduction (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="input-field tabular w-24"
                  value={form.discountPercent}
                  onChange={(e) => update('discountPercent', e.target.value)}
                  required
                />
                <span className="text-xs font-semibold text-text-secondary">
                  % de rabais sur le prix public
                </span>
              </div>
            </div>
          )}

          {form.type === PromoType.FIXED_DISCOUNT && (
            <div className="p-3 rounded-md bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark flex flex-col gap-2">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Montant du rabais par unité (CHF)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  className="input-field tabular w-28"
                  value={form.discountChf}
                  onChange={(e) => update('discountChf', e.target.value)}
                  required
                />
                <span className="text-xs font-semibold text-text-secondary">
                  CHF déduits par unité vendue
                </span>
              </div>
            </div>
          )}

          {/* Nom interne & Ruban visuel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Nom interne de l&apos;offre
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Offre Estivale 2026"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Texte du ruban boutique
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: -19% ou 3+1 OFFERT"
                value={form.badgeText}
                onChange={(e) => update('badgeText', e.target.value)}
              />
            </div>
          </div>

          {/* Description publique optionnelle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Description de l&apos;offre (affichée au panier)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Achetez 3 cartons de 24, le 4e carton vous est offert !"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          {/* Aperçu du ruban Drinkcider */}
          <div className="p-3 rounded-md bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                Aperçu du ruban boutique :
              </span>
              <span className="text-[11px] text-text-tertiary">{selectedProduct?.name}</span>
            </div>
            {form.badgeText ? (
              <div
                className="relative bg-[#B8837E] dark:bg-[#977390] text-white font-bold text-xs py-1 px-3 shadow-sm select-none"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)',
                }}
              >
                {form.badgeText}
              </div>
            ) : (
              <span className="text-xs text-text-tertiary italic">Aucun ruban</span>
            )}
          </div>

          {/* Interrupteur Actif / Inactif */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => update('active', e.target.checked)}
                className="w-4 h-4 rounded text-primary-text focus:ring-primary border-border"
              />
              <span className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                Offre active dans la boutique
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border dark:border-border-dark mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="btn-secondary text-xs py-2"
            >
              Annuler
            </button>
            <button type="submit" disabled={pending} className="btn-primary text-xs py-2">
              {pending
                ? 'Enregistrement...'
                : promotion
                  ? 'Enregistrer les modifications'
                  : 'Créer la promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
