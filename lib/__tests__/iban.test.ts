import { describe, it, expect } from 'vitest'
import { isIBANValid } from 'swissqrbill/utils'
import { checkIban, ibanErrorMessage, type IbanCheck } from '@/lib/iban'

// IBAN d'exemple des documentations suisses des paiements, fictifs :
// - IBAN classique repris dans les exemples de QR-facture ;
// - QR-IBAN de l'exemple des « Swiss Implementation Guidelines for the
//   QR-bill » de SIX (IID 31999, dans la plage QR 30000 à 31999).
const IBAN_EXEMPLE = 'CH93 0076 2011 6238 5295 7'
const QR_IBAN_EXEMPLE = 'CH44 3199 9123 0008 8901 2'

// Construits à partir de l'IBAN d'exemple, clé MOD 97 recalculée : ils passent
// la clé de contrôle, seul le pays décide. Aucun ne peut être un vrai compte :
// un IBAN français compte 27 caractères, et l'IID 00762 n'est pas un
// établissement du Liechtenstein.
const IBAN_FRANCAIS_FICTIF = 'FR36 0076 2011 6238 5295 7'
const IBAN_LIECHTENSTEIN_FICTIF = 'LI09 0076 2011 6238 5295 7'

function failure(check: IbanCheck) {
  if (check.ok) throw new Error(`IBAN accepté à tort : ${check.iban}`)
  return check
}

describe('lib/iban - checkIban', () => {
  it('accepte un IBAN valide groupé par 4', () => {
    expect(checkIban(IBAN_EXEMPLE)).toEqual({ ok: true, iban: IBAN_EXEMPLE })
  })

  it('accepte le même IBAN sans espaces et le rend groupé par 4', () => {
    expect(checkIban('CH9300762011623852957')).toEqual({ ok: true, iban: IBAN_EXEMPLE })
  })

  it('ignore la casse, les espaces irréguliers et insécables', () => {
    expect(checkIban('  ch93 00762011 6238 5295   7 ')).toEqual({
      ok: true,
      iban: IBAN_EXEMPLE,
    })
  })

  it('accepte un IBAN du Liechtenstein', () => {
    expect(checkIban(IBAN_LIECHTENSTEIN_FICTIF)).toEqual({
      ok: true,
      iban: IBAN_LIECHTENSTEIN_FICTIF,
    })
  })

  it('refuse une clé de contrôle fausse', () => {
    expect(failure(checkIban('CH94 0076 2011 6238 5295 7')).error).toBe('checksum')
  })

  it('refuse un caractère faux', () => {
    expect(failure(checkIban('CH93 0076 2011 6238 5295 8')).error).toBe('checksum')
  })

  it('refuse deux caractères voisins inversés', () => {
    // 6238 devient 6283
    expect(failure(checkIban('CH93 0076 2011 6283 5295 7')).error).toBe('checksum')
  })

  it('refuse un IBAN étranger, même avec une clé de contrôle juste', () => {
    expect(isIBANValid(IBAN_FRANCAIS_FICTIF)).toBe(true)
    expect(failure(checkIban(IBAN_FRANCAIS_FICTIF)).error).toBe('country')
  })

  it('refuse un QR-IBAN, même avec une clé de contrôle juste', () => {
    expect(isIBANValid(QR_IBAN_EXEMPLE)).toBe(true)
    expect(failure(checkIban(QR_IBAN_EXEMPLE)).error).toBe('qr-iban')
  })

  it('refuse un caractère manquant ou en trop, et dit combien il y en a', () => {
    const short = failure(checkIban('CH93 0076 2011 6238 5295'))
    expect(short).toEqual({ ok: false, error: 'length', length: 20 })
    expect(ibanErrorMessage(short)).toContain('Celui-ci en compte 20')
    expect(failure(checkIban('CH93 0076 2011 6238 5295 77')).error).toBe('length')
  })

  it('refuse les signes autres que lettres et chiffres', () => {
    expect(failure(checkIban('CH93-0076-2011-6238-5295-7')).error).toBe('characters')
  })

  it("refuse une lettre dans la clé ou dans le numéro d'institut", () => {
    expect(failure(checkIban('CH9X 0076 2011 6238 5295 7')).error).toBe('format')
    expect(failure(checkIban('CH93 O076 2011 6238 5295 7')).error).toBe('format')
  })

  it('refuse un champ vide', () => {
    expect(failure(checkIban('   ')).error).toBe('empty')
  })
})

describe('lib/iban - ibanErrorMessage', () => {
  it('donne le message demandé pour une faute de frappe', () => {
    expect(ibanErrorMessage(failure(checkIban('CH94 0076 2011 6238 5295 7')))).toBe(
      "Cet IBAN n'est pas valide : vérifiez chaque caractère."
    )
  })

  it("explique pourquoi un QR-IBAN est refusé et ce qu'il faut saisir", () => {
    const message = ibanErrorMessage(failure(checkIban(QR_IBAN_EXEMPLE)))
    expect(message).toContain('QR-IBAN')
    expect(message).toContain("l'IBAN classique")
  })

  it('écrit sans point d’exclamation ni tiret long', () => {
    const errors = [
      '',
      'CH93-0076',
      IBAN_FRANCAIS_FICTIF,
      'CH93 0076',
      'CH9X 0076 2011 6238 5295 7',
      'CH94 0076 2011 6238 5295 7',
      QR_IBAN_EXEMPLE,
    ]
    for (const raw of errors) {
      const message = ibanErrorMessage(failure(checkIban(raw)))
      expect(message).not.toMatch(/[!–—]/)
    }
  })
})
