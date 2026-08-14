// Tout calcul monétaire se fait en centimes entiers. Aucun Number flottant
// ne doit transporter un montant (DESIGN.md §2). Seul endroit qui calcule.

/** Prix pro dérivé du prix public et du taux de remise unique (Setting). */
export function proUnitPriceCents(publicCents: number, proRatePercent: number): number {
  return Math.round((publicCents * (100 - proRatePercent)) / 100)
}

/** TVA incluse dans un montant TTC, au taux en pour-mille (81 = 8.1%). */
export function vatIncludedCents(totalCents: number, vatRatePermille: number): number {
  return Math.round((totalCents * vatRatePermille) / (1000 + vatRatePermille))
}

/**
 * TVA d'une commande. Nulle tant que la cidrerie n'est pas assujettie : on ne
 * peut pas faire état d'une TVA qu'on ne perçoit pas. Passer par cette fonction
 * plutôt que par le taux seul, qui reste renseigné en prévision du jour où le
 * seuil d'assujettissement sera franchi.
 */
export function orderVatCents(
  totalCents: number,
  settings: { vatSubject: boolean; vatRatePermille: number }
): number {
  if (!settings.vatSubject) return 0
  return vatIncludedCents(totalCents, settings.vatRatePermille)
}

/** Port : offert aux professionnels et dès le seuil de franco. */
export function shippingCentsFor(
  subtotalCents: number,
  isPro: boolean,
  settings: { shippingCents: number; francoCents: number }
): number {
  if (isPro || subtotalCents >= settings.francoCents) return 0
  return settings.shippingCents
}

/** Format suisse : CHF 129.00 */
export function formatCHF(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const francs = Math.floor(abs / 100)
  const centimes = String(abs % 100).padStart(2, '0')
  return `${sign}CHF ${francs.toLocaleString('fr-CH').replace(/ |\s/g, "'")}.${centimes}`
}

/**
 * Format des montants de la facture papier : « 192.-- » quand il n'y a pas de
 * centimes, « 192.50 » sinon. Convention suisse reprise du modèle de la cidrerie.
 */
export function formatInvoiceAmount(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const francs = Math.floor(abs / 100)
    .toLocaleString('fr-CH')
    .replace(/[\s  ]/g, "'")
  const rest = abs % 100
  return rest === 0 ? `${sign}${francs}.--` : `${sign}${francs}.${String(rest).padStart(2, '0')}`
}

/** Saisie admin en CHF (ex. « 24.50 ») → centimes entiers. */
export function chfInputToCents(value: string | number): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}
