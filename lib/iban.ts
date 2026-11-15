import { formatIBAN, isIBANValid, isQRIBAN } from 'swissqrbill/utils'

/**
 * Contrôle de l'IBAN saisi dans les paramètres : c'est le compte qui reçoit
 * l'argent des clients (facture, QR-facture, e-mails). Une faute de frappe y
 * enverrait les paiements ailleurs, d'où un contrôle complet avant
 * l'enregistrement.
 *
 * - Espaces et casse ignorés : « ch93 0076 ... » vaut « CH93 0076 ... ».
 * - Suisse ou Liechtenstein seulement : la QR-facture n'accepte pas d'autre
 *   compte créancier.
 * - 21 caractères : CH ou LI, 2 chiffres de contrôle, 5 chiffres d'institut
 *   (IID), 12 caractères de compte.
 * - Clé de contrôle ISO 7064 MOD 97-10 (`isIBANValid` de swissqrbill), qui
 *   détecte toute faute sur un caractère et les inversions de deux caractères
 *   voisins.
 * - QR-IBAN refusé : nos références de paiement sont des références RF
 *   (`lib/reference.ts`), qui exigent un IBAN classique. Avec un QR-IBAN, le
 *   QR-code passerait à une référence QRR alors que les e-mails, l'admin et la
 *   facture imprimée continueraient d'annoncer la référence RF : une banque
 *   refuse un virement vers un QR-IBAN sans référence QRR.
 */

const IBAN_LENGTH = 21
const IBAN_PATTERN = /^(CH|LI)\d{2}\d{5}[0-9A-Z]{12}$/
const ACCEPTED_COUNTRIES = ['CH', 'LI']

export type IbanError =
  'empty' | 'characters' | 'country' | 'length' | 'format' | 'checksum' | 'qr-iban'

export type IbanCheck =
  /** IBAN normalisé : majuscules, groupé par 4 (« CH93 0076 2011 6238 5295 7 »). */
  | { ok: true; iban: string }
  /** `length` : nombre de caractères saisis, espaces non compris. */
  | { ok: false; error: IbanError; length: number }

/** Retire les espaces (insécables compris) et passe en majuscules. */
export function compactIban(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

export function checkIban(raw: string): IbanCheck {
  const compact = compactIban(raw)
  const fail = (error: IbanError): IbanCheck => ({ ok: false, error, length: compact.length })

  if (compact.length === 0) return fail('empty')
  if (!/^[0-9A-Z]+$/.test(compact)) return fail('characters')
  if (!ACCEPTED_COUNTRIES.includes(compact.slice(0, 2))) return fail('country')
  if (compact.length !== IBAN_LENGTH) return fail('length')
  if (!IBAN_PATTERN.test(compact)) return fail('format')
  if (!isIBANValid(compact)) return fail('checksum')
  if (isQRIBAN(compact)) return fail('qr-iban')
  return { ok: true, iban: formatIBAN(compact) }
}

/** Message affiché sous le champ IBAN : il dit quoi corriger. */
export function ibanErrorMessage(check: Extract<IbanCheck, { ok: false }>): string {
  switch (check.error) {
    case 'empty':
      return "Saisissez l'IBAN du compte qui reçoit les paiements."
    case 'characters':
      return 'Un IBAN ne comporte que des lettres et des chiffres : retirez les autres signes.'
    case 'country':
      return 'La QR-facture exige un IBAN suisse ou liechtensteinois, qui commence par CH ou LI.'
    case 'length':
      return `Un IBAN suisse ou liechtensteinois compte 21 caractères, espaces non compris. Celui-ci en compte ${check.length} : vérifiez chaque caractère.`
    case 'format':
    case 'checksum':
      return "Cet IBAN n'est pas valide : vérifiez chaque caractère."
    case 'qr-iban':
      return "Ceci est un QR-IBAN. Nos factures portent une référence RF, qui exige l'IBAN classique du compte : saisissez celui-ci."
  }
}
