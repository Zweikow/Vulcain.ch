'use client'

import { useState, useRef, useCallback } from 'react'
import { CustomerInfo, CartItem } from '@/types'
import { TurnstileWidget } from '@/components/TurnstileWidget'

interface OrderFormProps {
  items: CartItem[]
  onSubmit: (customer: CustomerInfo, orderId: string, total: number) => void
}

export default function OrderForm({ items, onSubmit }: OrderFormProps) {
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
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({})

  const turnstileToken = useRef<string>('')

  const handleTurnstileToken = useCallback((token: string) => {
    turnstileToken.current = token
  }, [])

  const total =
    items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) +
    (items.length > 0 ? 10 : 0)

  const validate = () => {
    const e: typeof errors = {}
    if (!form.firstName) e.firstName = 'Requis'
    if (!form.lastName) e.lastName = 'Requis'
    if (!form.address) e.address = 'Requis'
    if (!form.npa) e.npa = 'Requis'
    if (!form.lieu) e.lieu = 'Requis'
    if (!form.deliveryDate) e.deliveryDate = 'Requis'
    if (!form.email) e.email = 'Requis'
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

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      address: form.address,
      npa: form.npa,
      city: form.lieu,
      total,
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.product.price,
      })),
      turnstileToken: turnstileToken.current,
      website: '', // honeypot field — always empty for real users
    }

    const res = await fetch('/api/commandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      alert('Une erreur est survenue. Veuillez réessayer.')
      return
    }

    const { orderId } = await res.json()
    onSubmit(form, orderId, total)
  }

  const update = (field: keyof CustomerInfo, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-text-secondary dark:text-text-secondary-dark">👤</span>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          Vos coordonnées
        </h2>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
            Nom
          </label>
          <input
            className={`input-field ${errors.firstName ? 'border-text-error' : ''}`}
            placeholder="Votre nom"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
          />
          {errors.firstName && <span className="text-xs text-text-error">{errors.firstName}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
            Prénom
          </label>
          <input
            className={`input-field ${errors.lastName ? 'border-text-error' : ''}`}
            placeholder="Votre prénom"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
          />
          {errors.lastName && <span className="text-xs text-text-error">{errors.lastName}</span>}
        </div>
      </div>

      {/* Address */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          Adresse
        </label>
        <input
          className={`input-field ${errors.address ? 'border-text-error' : ''}`}
          placeholder="Rue et numéro"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
        />
        {errors.address && <span className="text-xs text-text-error">{errors.address}</span>}
      </div>

      {/* NPA + Lieu */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
            NPA
          </label>
          <input
            className={`input-field ${errors.npa ? 'border-text-error' : ''}`}
            placeholder="1000"
            value={form.npa}
            onChange={(e) => update('npa', e.target.value)}
          />
          {errors.npa && <span className="text-xs text-text-error">{errors.npa}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
            Lieu
          </label>
          <input
            className={`input-field ${errors.lieu ? 'border-text-error' : ''}`}
            placeholder="Votre ville"
            value={form.lieu}
            onChange={(e) => update('lieu', e.target.value)}
          />
          {errors.lieu && <span className="text-xs text-text-error">{errors.lieu}</span>}
        </div>
      </div>

      {/* Delivery date */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          Délai/souhaits pour la livraison
        </label>
        <input
          type="date"
          className={`input-field ${errors.deliveryDate ? 'border-text-error' : ''}`}
          value={form.deliveryDate}
          onChange={(e) => update('deliveryDate', e.target.value)}
        />
        {errors.deliveryDate && (
          <span className="text-xs text-text-error">{errors.deliveryDate}</span>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          Email
        </label>
        <input
          type="email"
          className={`input-field ${errors.email ? 'border-text-error' : ''}`}
          placeholder="votre@email.ch"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
        {errors.email && <span className="text-xs text-text-error">{errors.email}</span>}
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          Message pour la livraison
        </label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Votre message ou instructions de livraison..."
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
        />
      </div>

      {/* Marketing consent */}
      <label className="flex items-start gap-2 cursor-pointer">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            className="sr-only"
            checked={form.acceptsMarketing}
            onChange={(e) => update('acceptsMarketing', e.target.checked)}
          />
          <div
            className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
              form.acceptsMarketing
                ? 'bg-primary border-primary'
                : 'border-border dark:border-border-dark bg-bg-input dark:bg-bg-input-dark'
            }`}
          >
            {form.acceptsMarketing && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
          J&apos;accepte de recevoir des informations promotionnelles de la Cidrerie de Vulcain
        </span>
      </label>

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

      <button type="submit" className="btn-primary w-full mt-2">
        Passer la commande
      </button>
    </form>
  )
}
