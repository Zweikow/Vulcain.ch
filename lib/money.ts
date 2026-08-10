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

/** Saisie admin en CHF (ex. « 24.50 ») → centimes entiers. */
export function chfInputToCents(value: string | number): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}
