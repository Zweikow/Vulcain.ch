import { describe, it, expect } from 'vitest'
import { SwissQRBill } from 'swissqrbill/svg'
import { isQRReferenceValid } from 'swissqrbill/utils'
import {
  creditorReference,
  formatCreditorReference,
  formatQrReference,
  isValidCreditorReference,
  isValidQrReference,
  paymentReference,
  qrCheckDigit,
  qrReference,
} from '@/lib/reference'
import {
  invoiceEmail,
  paymentReminderEmail,
  shippingNotice,
  type MailOrder,
  type MailSettings,
} from '@/lib/mail-templates'

// QR-IBAN d'exemple publié par SIX (Implementation Guidelines QR-facture) :
// une valeur de test, jamais un compte réel.
const SIX_QR_IBAN = 'CH44 3199 9123 0008 8901 2'
const CLASSIC_IBAN = 'CH57 0900 0000 1703 3189 6'

describe('Référence RF (ISO 11649)', () => {
  it("reproduit l'exemple officiel de la norme : RF18 5390 0754 7034", () => {
    expect(creditorReference('539007547034')).toBe('RF18539007547034')
    expect(isValidCreditorReference('RF18 5390 0754 7034')).toBe(true)
    expect(isValidCreditorReference('RF19 5390 0754 7034')).toBe(false)
  })

  it('dérive la référence du numéro de facture et la groupe par 4', () => {
    expect(creditorReference('FAC-2026-0001')).toBe('RF59FAC20260001')
    expect(formatCreditorReference('RF59FAC20260001')).toBe('RF59 FAC2 0260 001')
  })
})

describe('Référence QR (QRR, norme SIX)', () => {
  it("valide le chiffre de contrôle contre l'exemple officiel SIX", () => {
    // 21 00000 00003 13947 14300 09017 : 26 chiffres puis le contrôle 7
    expect(qrCheckDigit('21000000000313947143000901')).toBe('7')
    expect(isValidQrReference('21 00000 00003 13947 14300 09017')).toBe(true)
    expect(isValidQrReference('21 00000 00003 13947 14300 09018')).toBe(false)
    expect(isValidQrReference('21 00000 00003 13947 14300 0901')).toBe(false)
  })

  it("s'imprime en 2 chiffres puis en groupes de 5", () => {
    expect(formatQrReference('210000000003139471430009017')).toBe(
      '21 00000 00003 13947 14300 09017'
    )
  })

  it("encode le chiffre de série, l'année et le numéro", () => {
    expect(qrReference('FAC-2026-0001')).toBe('000000000000000001202600014')
    expect(formatQrReference(qrReference('FAC-2026-0001'))).toBe('00 00000 00000 00000 12026 00014')
    expect(qrReference('CMD-2026-0001')).toMatch(/^0{17}22026/)
    expect(qrReference('AV-2026-0001')).toMatch(/^0{17}32026/)
  })

  it('donne une référence distincte par série pour le même numéro', () => {
    const refs = ['FAC', 'CMD', 'AV'].map((series) => qrReference(`${series}-2026-0001`))
    expect(new Set(refs).size).toBe(3)
  })

  it('reste unique sur plusieurs années et séries, et valide pour la bibliothèque', () => {
    const refs = new Set<string>()
    let count = 0
    for (const series of ['FAC', 'CMD', 'AV']) {
      for (const year of [2026, 2027]) {
        for (const n of [1, 2, 9, 10, 99, 100, 999, 1000, 1234, 9999, 10000, 12345, 123456]) {
          const ref = qrReference(`${series}-${year}-${String(n).padStart(4, '0')}`)
          expect(ref).toHaveLength(27)
          expect(isValidQrReference(ref)).toBe(true)
          expect(isQRReferenceValid(ref)).toBe(true)
          refs.add(ref)
          count++
        }
      }
    }
    expect(refs.size).toBe(count)
  })

  it("ramène les zéros de tête : un numéro ne donne qu'une référence", () => {
    expect(qrReference('fac-2026-00001')).toBe(qrReference('FAC-2026-0001'))
    expect(qrReference('FAC-2026-12345')).not.toBe(qrReference('FAC-2026-1234'))
  })

  it('refuse un numéro hors des séries connues', () => {
    expect(() => qrReference('XYZ-2026-0001')).toThrow()
    expect(() => qrReference('FAC20260001')).toThrow()
    expect(() => qrReference('')).toThrow()
  })
})

describe("paymentReference : le type suit l'IBAN configuré", () => {
  it('QR-IBAN : référence QR', () => {
    expect(paymentReference(SIX_QR_IBAN, 'FAC-2026-0001')).toEqual({
      type: 'QRR',
      reference: '000000000000000001202600014',
      formatted: '00 00000 00000 00000 12026 00014',
    })
    expect(paymentReference('ch4431999123000889012', 'FAC-2026-0001').type).toBe('QRR')
  })

  it('IBAN classique : référence RF', () => {
    expect(paymentReference(CLASSIC_IBAN, 'FAC-2026-0001')).toEqual({
      type: 'SCOR',
      reference: 'RF59FAC20260001',
      formatted: 'RF59 FAC2 0260 001',
    })
  })
})

describe('QR-facture : la référence convient au compte', () => {
  const bill = (iban: string, reference: string) =>
    new SwissQRBill(
      {
        currency: 'CHF',
        amount: 152.4,
        creditor: {
          account: iban.replace(/\s+/g, ''),
          name: 'Drinkcider',
          address: 'Chemin des Moilles 16',
          zip: 1619,
          city: 'Les Paccots',
          country: 'CH',
        },
        reference,
        message: 'Facture FAC-2026-0001',
      },
      { language: 'FR' }
    ).toString()

  it('rend le bulletin avec chaque type de compte et imprime la référence groupée', () => {
    for (const iban of [SIX_QR_IBAN, CLASSIC_IBAN]) {
      const ref = paymentReference(iban, 'FAC-2026-0001')
      expect(bill(iban, ref.reference)).toContain(ref.formatted)
    }
  })

  it('la bibliothèque refuse un mauvais appariement, que paymentReference évite', () => {
    expect(() => bill(SIX_QR_IBAN, creditorReference('FAC-2026-0001'))).toThrow()
    expect(() => bill(CLASSIC_IBAN, qrReference('FAC-2026-0001'))).toThrow()
  })
})

describe('Emails : la même référence que le QR-code', () => {
  const order: MailOrder = {
    id: 'cmd-test',
    numero: 'CMD-2026-0042',
    invoiceNumber: 'FAC-2026-0001',
    clientName: 'Jane Doe',
    clientEmail: 'jane@example.com',
    address: 'Chemin des Fleurs 1',
    npa: '1000',
    city: 'Lausanne',
    deliveryDate: null,
    message: null,
    subtotalCents: 14240,
    discountCents: 0,
    shippingCents: 1000,
    totalCents: 15240,
    items: [{ productName: 'Cidre Artisanal', quantity: 2, unitPriceCents: 7120 }],
  }
  const settings = (iban: string): MailSettings => ({
    companyName: 'Drinkcider',
    contactName: 'Bertrand',
    companyAddress: 'Chemin des Moilles 16',
    companyZipCity: '1619 Les Paccots',
    contactEmail: 'info@drinkcider.ch',
    prepDays: 3,
    iban,
    bankName: 'PostFinance',
    paymentTermsDays: 30,
  })
  const mails = (iban: string) => [
    shippingNotice(order, settings(iban)),
    shippingNotice({ ...order, isPickup: true }, settings(iban)),
    invoiceEmail(order, settings(iban)),
    paymentReminderEmail(order, settings(iban)),
  ]

  it('QR-IBAN : référence QR dans le HTML et le texte, aucune référence RF', () => {
    for (const mail of mails(SIX_QR_IBAN)) {
      expect(mail.html).toContain('00 00000 00000 00000 12026 00014')
      expect(mail.text).toContain('Référence : 00 00000 00000 00000 12026 00014')
      expect(mail.html).not.toContain('RF59')
      expect(mail.text).not.toContain('RF59')
    }
  })

  it('IBAN classique : référence RF dans le HTML et le texte', () => {
    for (const mail of mails(CLASSIC_IBAN)) {
      expect(mail.html).toContain('RF59 FAC2 0260 001')
      expect(mail.text).toContain('Référence : RF59 FAC2 0260 001')
    }
  })
})
