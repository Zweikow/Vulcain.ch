import { isQRIBAN } from 'swissqrbill/utils'
import type { Series } from '@/lib/numbering'

/**
 * Référence de paiement des factures. Son type suit le compte configuré dans
 * les paramètres :
 * - QR-IBAN : référence QR suisse (QRR), 27 chiffres avec contrôle modulo 10
 *   récursif. C'est la seule référence qu'une banque accepte sur un QR-IBAN.
 * - IBAN classique : référence créancier ISO 11649, la « référence RF » (SCOR).
 *
 * `paymentReference` est la seule fonction à appeler pour afficher ou encoder
 * une référence : QR-code, facture imprimée, admin, emails et rappels.
 */

export type PaymentReferenceType = 'QRR' | 'SCOR'

export interface PaymentReference {
  type: PaymentReferenceType
  /** Sans espaces : la valeur du QR-code et des relevés camt. */
  reference: string
  /** Groupée pour l'impression et les emails. */
  formatted: string
}

/** Référence de paiement d'un document (FAC-2026-0001), selon le type d'IBAN configuré. */
export function paymentReference(iban: string, documentNumber: string): PaymentReference {
  if (isQRIBAN(iban.replace(/\s+/g, '').toUpperCase())) {
    const reference = qrReference(documentNumber)
    return { type: 'QRR', reference, formatted: formatQrReference(reference) }
  }
  const reference = creditorReference(documentNumber)
  return { type: 'SCOR', reference, formatted: formatCreditorReference(reference) }
}

// --- Référence RF (ISO 11649, type SCOR) ------------------------------------
// Format : RF + 2 chiffres de contrôle + jusqu'à 21 caractères alphanumériques.
// Les chiffres de contrôle suivent ISO 7064 MOD 97-10, comme un IBAN.

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
 * Construit la référence RF (SCOR) à partir d'un identifiant métier.
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

// --- Référence QR (QRR, norme SIX) ------------------------------------------

/**
 * Chiffre de série en tête de la partie utile : sans lui, CMD-2026-0001 et
 * FAC-2026-0001 donneraient la même référence. Un chiffre attribué est
 * définitif, les références déjà envoyées en dépendent.
 */
const QR_SERIES_DIGIT: Record<Series, string> = {
  FAC: '1',
  CMD: '2',
  AV: '3',
}

/** Chiffres de la référence QR avant son chiffre de contrôle. */
const QR_BODY_LENGTH = 26

/** Table de report du modulo 10 récursif (norme SIX). */
const MOD10_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]

/** Chiffre de contrôle modulo 10 récursif d'une suite de chiffres. */
export function qrCheckDigit(digits: string): string {
  let carry = 0
  for (const digit of digits) {
    carry = MOD10_TABLE[(carry + Number(digit)) % 10]
  }
  return String((10 - carry) % 10)
}

/**
 * Référence QR d'un document : 26 chiffres puis le chiffre de contrôle.
 * La partie utile, alignée à droite et précédée de zéros, est le chiffre de
 * série, l'année puis le numéro sur 4 chiffres au moins :
 * FAC-2026-0001 → 00 00000 00000 00000 12026 00014
 */
export function qrReference(documentNumber: string): string {
  const match = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(documentNumber.trim().toUpperCase())
  const seriesDigit = match ? QR_SERIES_DIGIT[match[1] as Series] : undefined
  if (!match || !seriesDigit) {
    throw new Error(
      `Référence QR impossible pour « ${documentNumber} » (attendu : FAC, CMD ou AV-AAAA-NNNN)`
    )
  }
  // Zéros de tête ramenés à 4 chiffres : un numéro ne donne qu'une référence.
  const sequence = match[3].replace(/^0+/, '').padStart(4, '0')
  const body = `${seriesDigit}${match[2]}${sequence}`
  if (body.length > QR_BODY_LENGTH) {
    throw new Error(`Référence QR impossible pour « ${documentNumber} » (numéro trop long)`)
  }
  const padded = body.padStart(QR_BODY_LENGTH, '0')
  return `${padded}${qrCheckDigit(padded)}`
}

/** Vérifie une référence QR complète : 27 chiffres dont le dernier est le contrôle. */
export function isValidQrReference(reference: string): boolean {
  const clean = reference.replace(/\s+/g, '')
  return /^\d{27}$/.test(clean) && qrCheckDigit(clean.slice(0, QR_BODY_LENGTH)) === clean[26]
}

/** Groupes d'impression de la norme : 2 chiffres puis groupes de 5. */
export function formatQrReference(reference: string): string {
  const clean = reference.replace(/\s+/g, '')
  return `${clean.slice(0, 2)} ${clean.slice(2).replace(/(\d{5})(?=\d)/g, '$1 ')}`
}
