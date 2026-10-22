'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, Loader2, Plus, User, UserPlus } from 'lucide-react'
import { createCustomerAction } from '@/app/admin/(protected)/clients/actions'
import { CloseIcon } from '@/components/admin/AdminIcons'

interface AdminCustomerModalProps {
  onClose: () => void
  globalProRate?: number
}

export default function AdminCustomerModal({
  onClose,
  globalProRate = 25,
}: AdminCustomerModalProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    npa: '',
    city: '',
    isPro: false,
    customRate: '',
    notes: '',
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const update = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('Veuillez renseigner au moins le prénom, le nom et l’email.')
      return
    }

    let parsedRate: number | null = null
    if (form.isPro && form.customRate.trim()) {
      const num = parseInt(form.customRate.trim(), 10)
      if (Number.isNaN(num) || num < 0 || num > 100) {
        setError('Le taux de remise pro doit être un pourcentage entre 0 et 100.')
        return
      }
      parsedRate = num
    }

    startTransition(async () => {
      const res = await createCustomerAction({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        npa: form.npa || null,
        city: form.city || null,
        isPro: form.isPro,
        proRatePercent: parsedRate,
        notes: form.notes || null,
      })

      if (!res.success || !res.customer) {
        setError(res.error || 'Erreur lors de la création du client.')
        return
      }

      onClose()
      router.refresh()
      router.push(`/admin/clients/${res.customer.id}`)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="card w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border dark:border-border-dark shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary-text flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="customer-modal-title"
                className="text-lg font-bold text-text-primary dark:text-text-primary-dark"
              >
                Nouveau client
              </h2>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
                Créer une fiche client dans le carnet d&apos;adresses sans passer de commande.
              </p>
            </div>
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

          {/* Type de compte */}
          <div>
            <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1.5">
              Type de compte client
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update('isPro', false)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left flex items-center gap-2 transition-all ${
                  !form.isPro
                    ? 'border-primary bg-primary/10 text-primary-text font-semibold shadow-xs'
                    : 'border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page/40'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold">Particulier</div>
                  <div className="text-[10px] text-text-tertiary">Tarifs publics boutique</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => update('isPro', true)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left flex items-center gap-2 transition-all ${
                  form.isPro
                    ? 'border-purple-600 bg-purple-50 text-purple-900 dark:bg-purple-950/50 dark:text-purple-300 font-semibold shadow-xs'
                    : 'border-border dark:border-border-dark text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page/40'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold">Professionnel (B2B)</div>
                  <div className="text-[10px] text-text-tertiary">Remise bar, resto, caviste</div>
                </div>
              </button>
            </div>
          </div>

          {/* Prénom & Nom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Prénom *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Jean"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Dupont"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Email & Téléphone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Adresse email *
              </label>
              <input
                type="email"
                required
                placeholder="jean.dupont@example.ch"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Téléphone (optionnel)
              </label>
              <input
                type="tel"
                placeholder="079 123 45 67"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="input-field text-sm font-mono"
              />
            </div>
          </div>

          {/* Adresse postale */}
          <div>
            <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
              Adresse (rue et numéro)
            </label>
            <input
              type="text"
              placeholder="Ex: Rue de la Gare 14"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                NPA
              </label>
              <input
                type="text"
                placeholder="1000"
                value={form.npa}
                onChange={(e) => update('npa', e.target.value)}
                className="input-field text-sm font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Ville / Localité
              </label>
              <input
                type="text"
                placeholder="Lausanne"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Option taux pro personnalisé */}
          {form.isPro && (
            <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-purple-950 dark:text-purple-200">
                    Taux de remise pro personnalisé (%)
                  </label>
                  <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                    Si vide, le taux standard ({globalProRate}%) s&apos;appliquera à ses futures
                    commandes.
                  </p>
                </div>
              </div>
              <div className="relative max-w-[140px]">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder={String(globalProRate)}
                  value={form.customRate}
                  onChange={(e) => update('customRate', e.target.value)}
                  className="input-field pr-8 text-sm font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-tertiary">
                  %
                </span>
              </div>
            </div>
          )}

          {/* Notes internes */}
          <div>
            <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark mb-1">
              Notes internes (optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Instructions de livraison, préférences, contact de facturation..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className="input-field text-xs sm:text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border dark:border-border-dark">
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
              className="btn-primary text-xs sm:text-sm py-2 px-4 flex items-center gap-2"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Créer le client</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateCustomerButton({ globalProRate }: { globalProRate?: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2"
      >
        <Plus className="w-4 h-4" />
        <span>Nouveau client</span>
      </button>

      {isOpen && (
        <AdminCustomerModal onClose={() => setIsOpen(false)} globalProRate={globalProRate} />
      )}
    </>
  )
}
