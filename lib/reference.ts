/**
 * Référence créancier ISO 11649 — la « référence RF ».
 *
 * C'est le standard international pour référencer une facture dans un virement.
 * Elle fonctionne avec un IBAN classique (type SCOR de la QR-facture suisse),
 * contrairement à la référence QRR qui exige un QR-IBAN et 27 chiffres.
 *
 * Format : RF + 2 chiffres de contrôle + jusqu'à 21 caractères alphanumériques.
 * Les chiffres de contrôle suivent ISO 7064 MOD 97-10, comme un IBAN.
 */

const MAX_REFERENCE_LENGTH = 21

/** Reste de la division par 97, calculé chiffre par chiffre (nombres trop grands pour Number). */
function mod97(numeric: string): number {
  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

/** Lettres converties en nombres : A = 10 … Z = 35. */
function toNumeric(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55))
}

/**
 * Construit la référence RF à partir d'un identifiant métier.
 * Les caractères non alphanumériques sont retirés : FAC-2026-0001 → FAC20260001.
 */
export function creditorReference(raw: string): string {
  const reference = raw.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (reference.length === 0 || reference.length > MAX_REFERENCE_LENGTH) {
    throw new Error(`Référence ISO 11649 invalide : « ${raw} » (1 à 21 caractères alphanumériques)`)
  }
  const checkDigits = 98 - mod97(toNumeric(`${reference}RF00`))
  return `RF${String(checkDigits).padStart(2, '0')}${reference}`
}

/** Vérifie une référence RF complète (utile pour le rapprochement des paiements). */
export function isValidCreditorReference(reference: string): boolean {
  const clean = reference.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (!/^RF\d{2}[0-9A-Z]{1,21}$/.test(clean)) return false
  return mod97(toNumeric(clean.slice(4) + clean.slice(0, 4))) === 1
}

/** Découpe en groupes de 4 pour l'impression : RF18 FAC2 0260 001 */
export function formatCreditorReference(reference: string): string {
  return reference.replace(/(.{4})/g, '$1 ').trim()
}
