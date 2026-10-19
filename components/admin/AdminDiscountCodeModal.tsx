'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DiscountType } from '@prisma/client'
import {
  createDiscountCode,
  updateDiscountCode,
  DiscountCodeInput,
} from '@/app/admin/(protected)/promotions/codes-actions'
import { chfInputToCents } from '@/lib/money'
import { CloseIcon } from '@/components/admin/AdminIcons'

export type AdminDiscountCode = {
  id: string
  code: string
  description: string | null
  type: DiscountType
  percentage: number | null
  amountCents: number | null
  minSubtotalCents: number | null
  maxUses: number | null
  usedCount: number
  active: boolean
  startDate: Date | string | null
  endDate: Date | string | null
}

interface AdminDiscountCodeModalProps {
  discountCode?: AdminDiscountCode | null
  onClose: () => void
}

export default function AdminDiscountCodeModal({
  discountCode,
  onClose,
}: AdminDiscountCodeModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(discountCode?.id)

  const formatDateForInput = (d: Date | string | null | undefined) => {
    if (!d) return ''
    const date = new Date(d)
    if (isNaN(date.getTime())) return ''
    return date.toISOString().split('T')[0]
  }

  const [form, setForm] = useState({
    code: discountCode?.code ?? '',
    description: discountCode?.description ?? '',
    type: discountCode?.type ?? DiscountType.PERCENTAGE,
    percentage: discountCode?.percentage ? String(discountCode.percentage) : '10',
    amountChf: discountCode?.amountCents ? String(discountCode.amountCents / 100) : '10.00',
    minSubtotalChf: discountCode?.minSubtotalCents
      ? String(discountCode.minSubtotalCents / 100)
      : '',
    maxUses: discountCode?.maxUses ? String(discountCode.maxUses) : '',
    active: discountCode?.active ?? true,
    startDate: formatDateForInput(discountCode?.startDate),
    endDate: formatDateForInput(discountCode?.endDate),
  })

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanCode = form.code.trim().toUpperCase()
    if (!cleanCode) {
      setError('Veuillez saisir un code')
      return
    }

    const input: DiscountCodeInput = {
      code: cleanCode,
      description: form.description.trim() || null,
      type: form.type,
      percentage: form.type === 'PERCENTAGE' ? Number(form.percentage) : null,
      amountCents: form.type === 'FIXED_AMOUNT' ? chfInputToCents(form.amountChf) : null,
      minSubtotalCents: form.minSubtotalChf.trim() ? chfInputToCents(form.minSubtotalChf) : null,
      maxUses: form.maxUses.trim() ? parseInt(form.maxUses, 10) : null,
      active: form.active,
      startDate: form.startDate ? `${form.startDate}T00:00:00.000Z` : null,
      endDate: form.endDate ? `${form.endDate}T23:59:59.999Z` : null,
    }

    startTransition(async () => {
      const res = isEditing
        ? await updateDiscountCode(discountCode!.id, input)
        : await createDiscountCode(input)

      if (res.error) {
        setError(res.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="card w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border dark:border-border-dark shrink-0">
          <div>
            <h2
              id="discount-modal-title"
              className="text-lg font-bold text-text-primary dark:text-text-primary-dark"
            >
              {isEditing ? 'Modifier le code promo' : 'Nouveau code de réduction'}
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
              Code à saisir par le client dans son panier pour obtenir un rabais.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            aria-label="Fermer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40 font-medium">
              {error}
            </div>
          )}

          {/* Code & Statut */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Code promo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: OUVERTURE10"
                value={form.code}
                onChange={(e) => update('code', e.target.value.toUpperCase())}
                className="input-field font-mono font-bold tracking-wider uppercase text-sm"
              />
              <span className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark mt-0.5 block">
                Lettres majuscules et chiffres recommandés
              </span>
            </div>

            <div className="flex items-center h-10 pb-2">
              <label className="relative flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => update('active', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-text-primary dark:text-text-primary-dark">
                  Code actif
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
              Description / Contexte (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Campagne Instagram ouverture du site - 10% rabais global"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="input-field text-xs sm:text-sm"
            />
          </div>

          {/* Type de réduction */}
          <div>
            <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-2">
              Type de réduction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update('type', DiscountType.PERCENTAGE)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  form.type === DiscountType.PERCENTAGE
                    ? 'border-primary bg-primary/10 text-primary-text font-semibold shadow-sm'
                    : 'border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page/40'
                }`}
              >
                Pourcentage (−%)
              </button>
              <button
                type="button"
                onClick={() => update('type', DiscountType.FIXED_AMOUNT)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  form.type === DiscountType.FIXED_AMOUNT
                    ? 'border-primary bg-primary/10 text-primary-text font-semibold shadow-sm'
                    : 'border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page/40'
                }`}
              >
                Montant fixe (−CHF)
              </button>
            </div>
          </div>

          {/* Valeur de la réduction */}
          {form.type === DiscountType.PERCENTAGE ? (
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Taux de remise (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  placeholder="10"
                  value={form.percentage}
                  onChange={(e) => update('percentage', e.target.value)}
                  className="input-field pr-8 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-tertiary">
                  %
                </span>
              </div>
              <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark mt-1">
                Exemple : 10% de réduction déduit sur l&apos;ensemble des articles du panier.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Montant de la remise (CHF) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="10.00"
                  value={form.amountChf}
                  onChange={(e) => update('amountChf', e.target.value)}
                  className="input-field pr-12 text-sm font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-tertiary">
                  CHF
                </span>
              </div>
              <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark mt-1">
                Déduit directement du sous-total du panier.
              </p>
            </div>
          )}

          {/* Conditions : Panier minimum et Max utilisations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Panier minimum (CHF)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Laisser vide = aucun"
                  value={form.minSubtotalChf}
                  onChange={(e) => update('minSubtotalChf', e.target.value)}
                  className="input-field pr-12 text-xs sm:text-sm font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-text-tertiary">
                  CHF
                </span>
              </div>
              <span className="text-[10px] text-text-tertiary dark:text-text-tertiary-dark mt-0.5 block">
                Ex: 50.00 pour exiger 50 CHF d&apos;achat
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Utilisations maximales
              </label>
              <input
                type="number"
                min="1"
                placeholder="Laisser vide = illimité"
                value={form.maxUses}
                onChange={(e) => update('maxUses', e.target.value)}
                className="input-field text-xs sm:text-sm font-mono"
              />
              <span className="text-[10px] text-text-tertiary dark:text-text-tertiary-dark mt-0.5 block">
                {isEditing && discountCode?.usedCount !== undefined
                  ? `Déjà utilisé ${discountCode.usedCount} fois`
                  : 'Ex: 100 pour les 100 premiers clients'}
              </span>
            </div>
          </div>

          {/* Dates de validité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Date de début (optionnel)
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                className="input-field text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Date de fin (optionnel)
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                className="input-field text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="btn-secondary text-xs sm:text-sm py-2 px-4"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="btn-primary text-xs sm:text-sm py-2 px-5 flex items-center gap-1.5"
            >
              {pending ? (
                <span>Enregistrement...</span>
              ) : (
                <span>{isEditing ? 'Mettre à jour' : 'Créer le code promo'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
