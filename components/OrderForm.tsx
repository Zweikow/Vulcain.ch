'use client'

import { useState, useRef, useCallback } from 'react'
import { CustomerInfo, CartItem, AppliedPromoCode } from '@/types'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { shippingCentsFor, invoiceFeeCentsFor, formatCHF } from '@/lib/money'
import { PublicSettings } from '@/lib/settings'
import { PAYMENT_CHOICE_LABELS, type PaymentChoiceValue } from '@/lib/payments/choices'
import { User, Check, ShieldCheck, Mail, MapPin, Phone, Tag } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface OrderFormProps {
  items: CartItem[]
  settings: PublicSettings
  appliedPromo?: AppliedPromoCode | null
  /** Paiement en ligne PostFinance actif : redirection vers la Payment Page après la commande */
  onlinePayment?: boolean
  /** Modes proposés quand le choix du mode est actif : le serveur revalide le mode reçu */
  paymentChoices?: PaymentChoiceValue[]
  paymentChoice?: PaymentChoiceValue | null
  onPaymentChoiceChange?: (choice: PaymentChoiceValue) => void
  onSubmit: (customer: CustomerInfo, orderId: string, totalCents: number) => void
}

export default function OrderForm({
  items,
  settings,
  appliedPromo,
  onlinePayment = false,
  paymentChoices = [],
  paymentChoice = null,
  onPaymentChoiceChange,
  onSubmit,
}: OrderFormProps) {
  const [form, setForm] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    address: '',
    npa: '',
    lieu: '',
    email: '',
    phone: '',
    message: '',
    acceptsMarketing: false,
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof CustomerInfo | 'ageConfirmed' | 'paymentChoice', string>>
  >({})
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [sending, setSending] = useState(false)
  // Verrou immédiat contre le double envoi : l'état React n'est à jour qu'au rendu suivant
  const submitLock = useRef(false)
  const modeChoice = paymentChoices.length > 0

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

  const itemsSubtotalCents = Math.max(0, grossSubtotalCents - promoDiscountCents)

  let codeDiscountCents = 0
  if (appliedPromo) {
    if (appliedPromo.type === 'PERCENTAGE' && appliedPromo.percentage) {
      codeDiscountCents = Math.round(itemsSubtotalCents * (appliedPromo.percentage / 100))
    } else if (appliedPromo.type === 'FIXED_AMOUNT' && appliedPromo.amountCents) {
      codeDiscountCents = Math.min(itemsSubtotalCents, appliedPromo.amountCents)
    } else {
      codeDiscountCents = Math.min(itemsSubtotalCents, appliedPromo.discountCents)
    }
  }

  const subtotalCents = Math.max(0, itemsSubtotalCents - codeDiscountCents)
  const shippingCents = items.length > 0 ? shippingCentsFor(subtotalCents, false, settings) : 0
  const invoiceFeeCents = invoiceFeeCentsFor(paymentChoice, settings)
  const estimatedTotalCents = subtotalCents + shippingCents + invoiceFeeCents

  const validate = () => {
    const e: typeof errors = {}
    if (!form.firstName) e.firstName = 'Prénom requis'
    if (!form.lastName) e.lastName = 'Nom requis'
    if (!form.address) e.address = 'Adresse requise'
    if (!form.npa) e.npa = 'NPA requis'
    if (!form.lieu) e.lieu = 'Localité requise'
    if (!form.email) e.email = 'Adresse e-mail requise'
    if (!form.phone?.trim()) {
      e.phone = 'Numéro de téléphone requis'
    } else {
      const digits = form.phone.replace(/[\s\.\-\/\(\)\+]/g, '')
      if (!/^\d{8,15}$/.test(digits)) {
        e.phone = 'Numéro invalide (ex: 079 123 45 67)'
      }
    }
    if (modeChoice && !paymentChoice) e.paymentChoice = 'Choisissez un mode de paiement'
    if (!ageConfirmed)
      e.ageConfirmed = "La vente d'alcool en Suisse est réservée aux personnes majeures (+18 ans)"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLock.current) return
    if (!validate()) return
    if (items.length === 0) {
      alert('Votre panier est vide')
      return
    }

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone.trim(),
      address: form.address,
      npa: form.npa,
      city: form.lieu,
      message: form.message || undefined,
      acceptsMarketing: form.acceptsMarketing,
      ageConfirmed,
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      promoCode: appliedPromo?.code || undefined,
      paymentChoice: modeChoice ? (paymentChoice ?? undefined) : undefined,
      turnstileToken: turnstileToken.current,
      website: '', // honeypot
    }

    submitLock.current = true
    setSending(true)
    let redirecting = false
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

      const { orderId, totalCents, redirectUrl } = await res.json()
      if (redirectUrl) {
        // Paiement en ligne : la commande est enregistrée, place à la Payment Page.
        // Le choix reste figé et le bouton désactivé jusqu'au changement de page.
        redirecting = true
        window.location.assign(redirectUrl)
        return
      }
      onSubmit(form, orderId, totalCents ?? estimatedTotalCents)
    } finally {
      if (!redirecting) {
        submitLock.current = false
        setSending(false)
      }
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

          {/* Adresse e-mail + Téléphone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>
                  Adresse e-mail (pour la facture) <span className="text-primary-text">*</span>
                </span>
              </label>
              <Input
                type="email"
                autoComplete="email"
                className={errors.email ? 'border-destructive' : ''}
                placeholder="votre@email.ch"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
              {errors.email && <span className="text-xs text-destructive">{errors.email}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>
                  Téléphone (pour la livraison) <span className="text-primary-text">*</span>
                </span>
              </label>
              <Input
                type="tel"
                autoComplete="tel"
                className={errors.phone ? 'border-destructive' : ''}
                placeholder="Ex. 079 123 45 67"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
              {errors.phone && <span className="text-xs text-destructive">{errors.phone}</span>}
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

          {/* Mode de paiement : aucun présélectionné, le choix est figé à l'envoi */}
          {modeChoice && (
            <fieldset
              disabled={sending}
              className="flex flex-col gap-2 pt-2 border-t border-border/50"
            >
              <legend className="text-xs font-semibold text-foreground pt-2 pb-1">
                Mode de paiement <span className="text-primary-text">*</span>
              </legend>
              {paymentChoices.map((choice) => (
                <label
                  key={choice}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    paymentChoice === choice
                      ? 'border-primary bg-primary/5'
                      : errors.paymentChoice
                        ? 'border-destructive bg-card'
                        : 'border-input bg-card hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentChoice"
                    value={choice}
                    checked={paymentChoice === choice}
                    onChange={() => {
                      onPaymentChoiceChange?.(choice)
                      setErrors((prev) => ({ ...prev, paymentChoice: undefined }))
                    }}
                    className="w-4 h-4 shrink-0 accent-primary"
                  />
                  <span className="flex-1 text-foreground">{PAYMENT_CHOICE_LABELS[choice]}</span>
                  {choice === 'FACTURE' && settings.invoiceFeeCents > 0 && (
                    <span className="tabular text-xs text-muted-foreground shrink-0">
                      + {formatCHF(settings.invoiceFeeCents)}
                    </span>
                  )}
                </label>
              ))}
              {errors.paymentChoice && (
                <span className="text-xs text-destructive font-medium">{errors.paymentChoice}</span>
              )}
              {paymentChoice === 'FACTURE' && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Réservée aux particuliers. PowerPay (MF Group) contrôle votre solvabilité : la
                  page PostFinance vous demandera votre date de naissance, votre sexe et
                  l&apos;acceptation de ses conditions. La facture vous sera envoyée par email avec
                  l&apos;avis d&apos;expédition.
                </p>
              )}
            </fieldset>
          )}

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

          {/* Rappel du code promo appliqué */}
          {appliedPromo && codeDiscountCents > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
                <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Code promo appliqué : <strong className="font-mono">{appliedPromo.code}</strong>
                </span>
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular shrink-0">
                −{formatCHF(codeDiscountCents)}
              </span>
            </div>
          )}

          {/* Récapitulatif : suit le mode choisi, le total qui fait foi vient du serveur */}
          {modeChoice && items.length > 0 && (
            <dl className="flex flex-col gap-1 rounded-xl border border-border/60 p-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Articles</dt>
                <dd className="tabular font-medium text-foreground">{formatCHF(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Frais de port</dt>
                <dd className="tabular font-medium text-foreground">
                  {shippingCents === 0 ? 'Offerts' : formatCHF(shippingCents)}
                </dd>
              </div>
              {invoiceFeeCents > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Supplément facture</dt>
                  <dd className="tabular font-medium text-foreground">
                    {formatCHF(invoiceFeeCents)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-1.5 mt-1 border-t border-border/50 text-sm font-semibold text-foreground">
                <dt>Total à payer</dt>
                <dd className="tabular">{formatCHF(estimatedTotalCents)}</dd>
              </div>
            </dl>
          )}

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
                <span>
                  {modeChoice ? (
                    <>
                      {paymentChoice === 'FACTURE' ? 'Commander sur facture' : 'Commander et payer'}{' '}
                      <span className="tabular">{formatCHF(estimatedTotalCents)}</span>
                    </>
                  ) : onlinePayment ? (
                    'Commander et payer en ligne'
                  ) : (
                    'Confirmer et commander sur facture'
                  )}
                </span>
              </span>
            )}
          </Button>
          {onlinePayment && (
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {modeChoice
                ? 'Vous serez dirigé vers la page de paiement sécurisée de PostFinance, limitée au mode choisi.'
                : 'Vous serez dirigé vers la page de paiement sécurisée de PostFinance : carte, PostFinance Card, PostFinance Pay ou TWINT.'}{' '}
              Les clients professionnels reçoivent une facture à 30 jours.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
