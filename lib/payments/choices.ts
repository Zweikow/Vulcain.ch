/**
 * Modes de paiement proposés au client sur le formulaire de commande. Ce
 * fichier ne contient rien de secret : il sert aussi au navigateur. La
 * correspondance avec les configurations PostFinance est côté serveur
 * (lib/payments/modes.ts).
 */

export const PAYMENT_CHOICES = [
  'CARTE',
  'POSTFINANCE_CARD',
  'POSTFINANCE_PAY',
  'TWINT',
  'FACTURE',
] as const

export type PaymentChoiceValue = (typeof PAYMENT_CHOICES)[number]

export const PAYMENT_CHOICE_LABELS: Record<PaymentChoiceValue, string> = {
  CARTE: 'Carte de crédit/débit',
  POSTFINANCE_CARD: 'PostFinance Card',
  POSTFINANCE_PAY: 'PostFinance Pay',
  TWINT: 'TWINT',
  FACTURE: 'Facture (PowerPay)',
}

export function isPaymentChoice(value: unknown): value is PaymentChoiceValue {
  return typeof value === 'string' && (PAYMENT_CHOICES as readonly string[]).includes(value)
}

/** Mode de paiement d'une commande, pour l'admin et les documents. */
export function paymentModeLabel(order: {
  paymentMode: string
  paymentChoice?: PaymentChoiceValue | null
}): string {
  if (order.paymentChoice) return PAYMENT_CHOICE_LABELS[order.paymentChoice]
  return order.paymentMode === 'EN_LIGNE' ? 'Paiement en ligne' : 'Facture Drinkcider'
}
