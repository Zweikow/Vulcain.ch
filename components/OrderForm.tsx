'use client'

import { useState, useRef, useCallback } from 'react'
import { CustomerInfo, CartItem } from '@/types'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { shippingCentsFor } from '@/lib/money'
import { PublicSettings } from '@/lib/settings'
import { User, Check, ShieldCheck, Mail, MapPin, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
    if (!form.firstName) e.firstName = 'Prénom requis'
    if (!form.lastName) e.lastName = 'Nom requis'
    if (!form.address) e.address = 'Adresse requise'
    if (!form.npa) e.npa = 'NPA requis'
    if (!form.lieu) e.lieu = 'Localité requise'
    if (!form.deliveryDate) e.deliveryDate = 'Délai souhaité requis'
    if (!form.email) e.email = 'Adresse e-mail requise'
    if (!ageConfirmed)
      e.ageConfirmed = "La vente d'alcool en Suisse est réservée aux personnes majeures (+18 ans)"
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
      deliveryDate: form.deliveryDate || undefined,
      message: form.message || undefined,
      acceptsMarketing: form.acceptsMarketing,
      ageConfirmed,
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      turnstileToken: turnstileToken.current,
      website: '', // honeypot
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
    <Card className="border border-border/80 bg-card shadow-sm">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary-text">
            <User className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Coordonnées de livraison &amp; Facturation
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Expédition en Suisse par transporteur spécialisé vins &amp; cidres
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Ligne Nom / Prénom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Prénom <span className="text-primary-text">*</span>
              </label>
              <Input
                className={errors.firstName ? 'border-destructive' : ''}
                placeholder="Ex. Alexandre"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
              />
              {errors.firstName && (
                <span className="text-xs text-destructive">{errors.firstName}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nom <span className="text-primary-text">*</span>
              </label>
              <Input
                className={errors.lastName ? 'border-destructive' : ''}
                placeholder="Ex. Bovet"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
              />
              {errors.lastName && (
                <span className="text-xs text-destructive">{errors.lastName}</span>
              )}
            </div>
          </div>

          {/* Adresse postale */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                Adresse de livraison <span className="text-primary-text">*</span>
              </span>
            </label>
            <Input
              className={errors.address ? 'border-destructive' : ''}
              placeholder="Rue, numéro et compléments"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
            {errors.address && <span className="text-xs text-destructive">{errors.address}</span>}
          </div>

          {/* NPA + Ville */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <label className="text-xs font-semibold text-foreground">
                NPA <span className="text-primary-text">*</span>
              </label>
              <Input
                className={errors.npa ? 'border-destructive' : ''}
                placeholder="Ex. 1700"
                value={form.npa}
                onChange={(e) => update('npa', e.target.value)}
              />
              {errors.npa && <span className="text-xs text-destructive">{errors.npa}</span>}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">
                Localité (Suisse) <span className="text-primary-text">*</span>
              </label>
              <Input
                className={errors.lieu ? 'border-destructive' : ''}
                placeholder="Ex. Fribourg"
                value={form.lieu}
                onChange={(e) => update('lieu', e.target.value)}
              />
              {errors.lieu && <span className="text-xs text-destructive">{errors.lieu}</span>}
            </div>
          </div>

          {/* Date souhaitée + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>
                  Date de livraison souhaitée <span className="text-primary-text">*</span>
                </span>
              </label>
              <Input
                type="date"
                className={errors.deliveryDate ? 'border-destructive' : ''}
                value={form.deliveryDate}
                onChange={(e) => update('deliveryDate', e.target.value)}
              />
              {errors.deliveryDate && (
                <span className="text-xs text-destructive">{errors.deliveryDate}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>
                  Adresse e-mail (pour la facture) <span className="text-primary-text">*</span>
                </span>
              </label>
              <Input
                type="email"
                className={errors.email ? 'border-destructive' : ''}
                placeholder="votre@email.ch"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
              {errors.email && <span className="text-xs text-destructive">{errors.email}</span>}
            </div>
          </div>

          {/* Message ou instructions particulières */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Instructions pour le livreur (optionnel)
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              rows={3}
              placeholder="Ex. Laisser devant la porte d'entrée en cas d'absence, digicode..."
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
            />
          </div>

          {/* Consentements & Checkboxes */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border/50">
            {/* Consentement marketing */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.acceptsMarketing}
                  onChange={(e) => update('acceptsMarketing', e.target.checked)}
                />
                <div className="w-5 h-5 rounded-[5px] border-2 border-muted-foreground/60 bg-card peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card flex items-center justify-center transition-colors">
                  {form.acceptsMarketing && (
                    <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                Je souhaite recevoir occasionnellement les annonces des nouveaux millésimes et
                cuvées spéciales de Drinkcider.
              </span>
            </label>

            {/* Obligation légale majorité */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={ageConfirmed}
                  onChange={(e) => {
                    setAgeConfirmed(e.target.checked)
                    setErrors((prev) => ({ ...prev, ageConfirmed: undefined }))
                  }}
                />
                <div
                  className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card ${
                    ageConfirmed
                      ? 'bg-primary border-primary'
                      : errors.ageConfirmed
                        ? 'border-destructive bg-card'
                        : 'border-muted-foreground/60 bg-card'
                  }`}
                >
                  {ageConfirmed && (
                    <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-foreground leading-relaxed">
                Je certifie avoir 18 ans révolus (obligation légale suisse pour l&apos;achat de
                boissons fermentées).
              </span>
            </label>
            {errors.ageConfirmed && (
              <span className="text-xs text-destructive font-medium pl-7">
                {errors.ageConfirmed}
              </span>
            )}
          </div>

          {/* Honeypot invisible anti-spam */}
          <input
            type="text"
            name="website"
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* Cloudflare Turnstile */}
          <TurnstileWidget onToken={handleTurnstileToken} />

          <Button
            type="submit"
            disabled={sending || items.length === 0}
            variant="default"
            size="lg"
            className="w-full mt-2 h-auto min-h-11 py-3 px-4 whitespace-normal text-center font-semibold shadow-sm"
          >
            {sending ? (
              'Transmission sécurisée en cours…'
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Confirmer et commander sur facture</span>
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
