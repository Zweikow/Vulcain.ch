'use client'

import { useState, useRef, useCallback } from 'react'
import { CustomerInfo, CartItem } from '@/types'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { shippingCentsFor } from '@/lib/money'
import { PublicSettings } from '@/lib/settings'
import { UserIcon } from '@/components/Icons'

interface OrderFormProps {
  items: CartItem[]
  settings: PublicSettings
  onSubmit: (customer: CustomerInfo, orderId: string, totalCents: number) => void
}

export default function OrderForm({ items, settings, onSubmit }: OrderFormProps) {
  const [form, setForm] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    address: '',
    npa: '',
    lieu: '',
    deliveryDate: '',
    email: '',
    message: '',
    acceptsMarketing: false,
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof CustomerInfo | 'ageConfirmed', string>>
  >({})
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [sending, setSending] = useState(false)

  const turnstileToken = useRef<string>('')

  const handleTurnstileToken = useCallback((token: string) => {
    turnstileToken.current = token
  }, [])

  // Estimation en centimes — le total qui fait foi est recalculé par le serveur.
  const grossSubtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )

  let promoDiscountCents = 0
  for (const item of items) {
    const promo = item.product.activePromotion
    if (!promo) continue
    if (promo.type === 'BUY_X_GET_Y_FREE' && promo.buyQuantity && promo.getFreeQuantity) {
      if (item.quantity >= promo.buyQuantity) {
        const sets = Math.floor(item.quantity / promo.buyQuantity)
        const freeUnits = sets * promo.getFreeQuantity
        promoDiscountCents += freeUnits * item.product.priceCents
      }
    } else if (promo.type === 'PERCENTAGE' && promo.discountPercent) {
      promoDiscountCents += Math.round(
        item.quantity * item.product.priceCents * (promo.discountPercent / 100)
      )
    } else if (promo.type === 'FIXED_DISCOUNT' && promo.discountCents) {
      promoDiscountCents += item.quantity * promo.discountCents
    }
  }

  const subtotalCents = Math.max(0, grossSubtotalCents - promoDiscountCents)
  const estimatedTotalCents =
    subtotalCents + (items.length > 0 ? shippingCentsFor(subtotalCents, false, settings) : 0)

  const validate = () => {
    const e: typeof errors = {}
    if (!form.firstName) e.firstName = 'Requis'
    if (!form.lastName) e.lastName = 'Requis'
    if (!form.address) e.address = 'Requis'
    if (!form.npa) e.npa = 'Requis'
    if (!form.lieu) e.lieu = 'Requis'
    if (!form.deliveryDate) e.deliveryDate = 'Requis'
    if (!form.email) e.email = 'Requis'
    if (!ageConfirmed) e.ageConfirmed = "La vente d'alcool est réservée aux personnes majeures"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (items.length === 0) {
      alert('Votre panier est vide')
      return
    }

    // Aucun prix n'est envoyé : le serveur recalcule tout depuis la base.
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      address: form.address,
      npa: form.npa,
      city: form.lieu,
      deliveryDate: form.deliveryDate || undefined,
      message: form.message || undefined,
      acceptsMarketing: form.acceptsMarketing,
      ageConfirmed,
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      turnstileToken: turnstileToken.current,
      website: '', // honeypot field — always empty for real users
    }

    setSending(true)
    try {
      const res = await fetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.error ?? 'Une erreur est survenue. Veuillez réessayer.')
        return
      }

      const { orderId, totalCents } = await res.json()
      onSubmit(form, orderId, totalCents ?? estimatedTotalCents)
    } finally {
      setSending(false)
    }
  }

  const update = (field: keyof CustomerInfo, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <form onSubmit={handleSubmit} className="heroui-card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3 pb-3 border-b border-divider">
        <div className="w-9 h-9 rounded-xl bg-default-100 flex items-center justify-center text-default-600">
          <UserIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-base text-text-primary dark:text-text-primary-dark">
            Vos coordonnées de livraison
          </h2>
          <p className="text-xs text-default-400">
            Facturation par bulletin QR envoyé avec votre colis
          </p>
        </div>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-default-600 dark:text-default-400">
            Nom *
          </label>
          <input
            className={`heroui-input ${errors.firstName ? '!border-red-500 !ring-red-500/20' : ''}`}
            placeholder="Votre nom"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
          />
          {errors.firstName && <span className="text-xs text-red-500">{errors.firstName}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-default-600 dark:text-default-400">
            Prénom *
          </label>
          <input
            className={`heroui-input ${errors.lastName ? '!border-red-500 !ring-red-500/20' : ''}`}
            placeholder="Votre prénom"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
          />
          {errors.lastName && <span className="text-xs text-red-500">{errors.lastName}</span>}
        </div>
      </div>

      {/* Address */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-default-600 dark:text-default-400">
          Adresse *
        </label>
        <input
          className={`heroui-input ${errors.address ? '!border-red-500 !ring-red-500/20' : ''}`}
          placeholder="Rue et numéro"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
        />
        {errors.address && <span className="text-xs text-red-500">{errors.address}</span>}
      </div>

      {/* NPA + Lieu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-default-600 dark:text-default-400">
            NPA (Code postal) *
          </label>
          <input
            className={`heroui-input ${errors.npa ? '!border-red-500 !ring-red-500/20' : ''}`}
            placeholder="1000"
            value={form.npa}
            onChange={(e) => update('npa', e.target.value)}
          />
          {errors.npa && <span className="text-xs text-red-500">{errors.npa}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-default-600 dark:text-default-400">
            Localité *
          </label>
          <input
            className={`heroui-input ${errors.lieu ? '!border-red-500 !ring-red-500/20' : ''}`}
            placeholder="Votre ville ou village"
            value={form.lieu}
            onChange={(e) => update('lieu', e.target.value)}
          />
          {errors.lieu && <span className="text-xs text-red-500">{errors.lieu}</span>}
        </div>
      </div>

      {/* Delivery date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-default-600 dark:text-default-400">
          Délai / Date souhaitée de livraison *
        </label>
        <input
          type="date"
          className={`heroui-input ${errors.deliveryDate ? '!border-red-500 !ring-red-500/20' : ''}`}
          value={form.deliveryDate}
          onChange={(e) => update('deliveryDate', e.target.value)}
        />
        {errors.deliveryDate && <span className="text-xs text-red-500">{errors.deliveryDate}</span>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-default-600 dark:text-default-400">
          Email de confirmation *
        </label>
        <input
          type="email"
          className={`heroui-input ${errors.email ? '!border-red-500 !ring-red-500/20' : ''}`}
          placeholder="votre@email.ch"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
        {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-default-600 dark:text-default-400">
          Instructions spéciales ou message pour la livraison
        </label>
        <textarea
          className="heroui-input resize-none"
          rows={3}
          placeholder="Code d'immeuble, instructions de dépôt en cas d'absence..."
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
        />
      </div>

      {/* Checkboxes HeroUI Style */}
      <div className="flex flex-col gap-3 pt-2 border-t border-divider">
        {/* Marketing consent */}
        <label className="flex items-start gap-3 cursor-pointer group select-none">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={form.acceptsMarketing}
              onChange={(e) => update('acceptsMarketing', e.target.checked)}
            />
            <div
              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                form.acceptsMarketing
                  ? 'bg-primary border-primary text-[#153243]'
                  : 'border-divider bg-default-100 group-hover:border-default-400'
              }`}
            >
              {form.acceptsMarketing && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-default-600 dark:text-default-400 group-hover:text-text-primary transition-colors">
            J&apos;accepte de recevoir des informations et nouveautés exclusives de Drinkcider
          </span>
        </label>

        {/* Confirmation de majorité */}
        <label className="flex items-start gap-3 cursor-pointer group select-none">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={ageConfirmed}
              onChange={(e) => {
                setAgeConfirmed(e.target.checked)
                setErrors((prev) => ({ ...prev, ageConfirmed: undefined }))
              }}
            />
            <div
              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                ageConfirmed
                  ? 'bg-primary border-primary text-[#153243]'
                  : errors.ageConfirmed
                    ? '!border-red-500 bg-red-50 dark:bg-red-950/20'
                    : 'border-divider bg-default-100 group-hover:border-default-400'
              }`}
            >
              {ageConfirmed && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs font-medium text-text-primary dark:text-text-primary-dark">
            Je certifie sur l&apos;honneur avoir 18 ans révolus (la vente d&apos;alcool est
            interdite aux mineurs) *
          </span>
        </label>
        {errors.ageConfirmed && (
          <span className="text-xs text-red-500 pl-8">{errors.ageConfirmed}</span>
        )}
      </div>

      {/* Honeypot — invisible pour les humains */}
      <input
        type="text"
        name="website"
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {/* Turnstile invisible */}
      <TurnstileWidget onToken={handleTurnstileToken} />

      <button
        type="submit"
        disabled={sending}
        className="heroui-btn-primary w-full py-3.5 text-base rounded-2xl disabled:opacity-50 mt-2"
      >
        {sending ? 'Traitement de votre commande en cours…' : 'Confirmer et passer commande'}
      </button>
    </form>
  )
}
