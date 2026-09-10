'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCustomerAction, deleteCustomerAction } from '@/app/admin/(protected)/clients/actions'

interface CustomerDetailFormProps {
  customer: {
    id: string
    customerNumber: number
    firstName: string
    lastName: string
    email: string
    phone: string | null
    address: string
    npa: string
    city: string
    isPro: boolean
    proRatePercent: number | null
    notes: string | null
    createdAt: Date | string
    updatedAt: Date | string
    ordersCount: number
  }
  globalProRate: number
  canManage: boolean
}

export function CustomerDetailForm({
  customer,
  globalProRate,
  canManage,
}: CustomerDetailFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const [firstName, setFirstName] = useState(customer.firstName)
  const [lastName, setLastName] = useState(customer.lastName)
  const [email, setEmail] = useState(customer.email)
  const [phone, setPhone] = useState(customer.phone || '')
  const [address, setAddress] = useState(customer.address)
  const [npa, setNpa] = useState(customer.npa)
  const [city, setCity] = useState(customer.city)
  const [isPro, setIsPro] = useState(customer.isPro)
  const [customRate, setCustomRate] = useState<string>(
    customer.proRatePercent !== null && customer.proRatePercent !== undefined
      ? String(customer.proRatePercent)
      : ''
  )
  const [notes, setNotes] = useState(customer.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    const parsedRate = customRate.trim() ? parseInt(customRate.trim(), 10) : null
    if (
      isPro &&
      parsedRate !== null &&
      (Number.isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100)
    ) {
      setFeedback({
        type: 'error',
        message: 'Le taux de remise doit être compris entre 0 et 100 %.',
      })
      return
    }

    startTransition(async () => {
      const res = await updateCustomerAction(customer.id, {
        firstName,
        lastName,
        email,
        phone,
        address,
        npa,
        city,
        isPro,
        proRatePercent: parsedRate,
        notes,
      })

      if (res.success) {
        setFeedback({ type: 'success', message: 'Fiche client mise à jour avec succès.' })
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la mise à jour.' })
      }
    })
  }

  const handleDelete = () => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer la fiche de ${customer.firstName} ${customer.lastName} ? Cette action est irréversible.`
      )
    ) {
      return
    }

    startTransition(async () => {
      const res = await deleteCustomerAction(customer.id)
      if (res && !res.success) {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la suppression.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {feedback && (
        <div
          className={`p-3 rounded-md text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Conditions tarifaires & B2B */}
      <div className="card p-5 border-l-4 border-purple-600 dark:border-purple-500">
        <h3 className="font-semibold text-text-primary dark:text-text-primary-dark mb-2">
          Conditions tarifaires &amp; Statut professionnel
        </h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-4">
          Définissez si ce client bénéficie des conditions professionnelles et d&apos;une remise
          négociée sur mesure.
        </p>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPro}
              onChange={(e) => setIsPro(e.target.checked)}
              disabled={!canManage || isPending}
              className="mt-0.5 h-4 w-4 rounded border-border dark:border-border-dark text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                Client professionnel (B2B, caviste, restaurant, distributeur)
              </span>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
                Bénéficie des frais de port offerts et du tarif professionnel automatique.
              </p>
            </div>
          </label>

          {isPro && (
            <div className="pl-7 pt-2 border-t border-border dark:border-border-dark space-y-2">
              <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                Taux de remise accordé à ce client (%)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative w-36">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder={String(globalProRate)}
                    disabled={!canManage || isPending}
                    className="input-field w-full text-sm pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-tertiary">%</span>
                </div>
                <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  {customRate.trim() ? (
                    <strong className="text-purple-700 dark:text-purple-400">
                      Remise spécifique de {customRate.trim()}% appliquée
                    </strong>
                  ) : (
                    <span>
                      Taux standard global appliqué : <strong>{globalProRate}%</strong>
                    </span>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
                Laissez vide pour utiliser le taux standard par défaut ({globalProRate}%). Toute
                modification s&apos;appliquera à ses prochaines commandes sans altérer les factures
                déjà émises.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Coordonnées */}
      <div className="card p-5">
        <h3 className="font-semibold text-text-primary dark:text-text-primary-dark mb-4">
          Coordonnées de facturation &amp; livraison
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Prénom *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={!canManage || isPending}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Nom *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={!canManage || isPending}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!canManage || isPending}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+41 79 000 00 00"
              disabled={!canManage || isPending}
              className="input-field w-full text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Adresse (rue et numéro) *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              disabled={!canManage || isPending}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              NPA *
            </label>
            <input
              type="text"
              value={npa}
              onChange={(e) => setNpa(e.target.value)}
              required
              disabled={!canManage || isPending}
              className="input-field w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
              Localité (Ville) *
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              disabled={!canManage || isPending}
              className="input-field w-full text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notes internes pour Jacques & l'équipe */}
      <div className="card p-5">
        <h3 className="font-semibold text-text-primary dark:text-text-primary-dark mb-1">
          Notes internes
        </h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-3">
          Ces notes sont strictement internes à l&apos;équipe Vulcain (jamais visibles par le client
          ou sur les factures).
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex. Préfère être livré le mardi matin au dépôt. Accorder 2 cartons de dégustation offerts par an. Contact chef de cave : Michel au 079..."
          rows={4}
          disabled={!canManage || isPending}
          className="input-field w-full text-sm resize-y"
        />
      </div>

      {/* Boutons d'action */}
      {canManage && (
        <div className="flex items-center justify-between pt-2">
          {customer.ordersCount === 0 ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline px-2 py-1"
            >
              Supprimer cette fiche client
            </button>
          ) : (
            <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
              Client lié à {customer.ordersCount} commande(s) comptabilisée(s).
            </span>
          )}

          <button type="submit" disabled={isPending} className="btn-primary text-sm px-5 py-2.5">
            {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      )}
    </form>
  )
}
