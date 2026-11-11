import { describe, it, expect } from 'vitest'
import {
  availablePaymentChoices,
  checkPaymentChoice,
  choiceOfConfiguration,
  configurationIdsFor,
  configurationIdsWithoutInvoice,
  isInvoiceEnabled,
  readPaymentModes,
} from '@/lib/payments/modes'

// IDs factices : les vrais sont propres à chaque space et vivent dans l'environnement
const MAPPING = {
  CARTE: [11, 21],
  POSTFINANCE_CARD: [12],
  POSTFINANCE_PAY: [13],
  TWINT: [14],
  FACTURE: [15],
}

const env = (overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv =>
  ({
    PFC_ENABLED: 'true',
    PFC_SPACE_ID: '1',
    PFC_USER_ID: '2',
    PFC_AUTH_KEY: Buffer.from('cle-de-test-factice').toString('base64'),
    PFC_MODE_CHOICE_ENABLED: 'true',
    PFC_INVOICE_ENABLED: 'true',
    PFC_PAYMENT_MODES: JSON.stringify(MAPPING),
    ...overrides,
  }) as unknown as NodeJS.ProcessEnv

describe('Mapping des modes de paiement (PFC_PAYMENT_MODES)', () => {
  it('lit le mapping et propose les 5 modes dans l’ordre du formulaire', () => {
    expect(readPaymentModes(env())).toEqual(MAPPING)
    expect(availablePaymentChoices({}, env())).toEqual([
      'CARTE',
      'POSTFINANCE_CARD',
      'POSTFINANCE_PAY',
      'TWINT',
      'FACTURE',
    ])
  })

  it.each([
    ['JSON illisible', '{CARTE:[11]'],
    ['tableau au lieu d’un objet', '[11, 12]'],
    ['mode inconnu', JSON.stringify({ ...MAPPING, BITCOIN: [99] })],
    ['ID non entier', JSON.stringify({ CARTE: ['11'] })],
    ['ID négatif', JSON.stringify({ CARTE: [-1] })],
    ['liste vide', JSON.stringify({ CARTE: [] })],
  ])('mapping invalide (%s) : aucun mode proposé', (_, raw) => {
    expect(readPaymentModes(env({ PFC_PAYMENT_MODES: raw }))).toBeNull()
    expect(availablePaymentChoices({}, env({ PFC_PAYMENT_MODES: raw }))).toEqual([])
  })

  it('un mode avec plusieurs configurations est reconnu par chacune', () => {
    expect(configurationIdsFor('CARTE', env())).toEqual([11, 21])
    expect(choiceOfConfiguration(21, env())).toBe('CARTE')
    expect(choiceOfConfiguration(15, env())).toBe('FACTURE')
    expect(choiceOfConfiguration(99, env())).toBeNull()
    expect(choiceOfConfiguration(null, env())).toBeNull()
  })
})

describe('Interrupteurs et validation du mode reçu du navigateur', () => {
  it('facture coupée : absente du formulaire et refusée par le serveur', () => {
    const off = env({ PFC_INVOICE_ENABLED: 'false' })
    expect(isInvoiceEnabled(off)).toBe(false)
    expect(availablePaymentChoices({}, off)).not.toContain('FACTURE')
    expect(checkPaymentChoice('FACTURE', {}, off)).toEqual({ ok: false, reason: 'indisponible' })
    expect(checkPaymentChoice('TWINT', {}, off)).toEqual({ ok: true })
  })

  it('facture indisponible pour la commande après un échec : refusée, les autres restent', () => {
    expect(availablePaymentChoices({ invoiceUnavailable: true }, env())).toEqual([
      'CARTE',
      'POSTFINANCE_CARD',
      'POSTFINANCE_PAY',
      'TWINT',
    ])
    expect(checkPaymentChoice('FACTURE', { invoiceUnavailable: true }, env())).toEqual({
      ok: false,
      reason: 'indisponible',
    })
  })

  it('choix du mode coupé, ou paiement en ligne coupé : aucun mode accepté', () => {
    for (const off of [env({ PFC_MODE_CHOICE_ENABLED: 'false' }), env({ PFC_ENABLED: 'false' })]) {
      expect(availablePaymentChoices({}, off)).toEqual([])
      expect(checkPaymentChoice('CARTE', {}, off)).toEqual({ ok: false, reason: 'indisponible' })
    }
  })

  it('mode inconnu ou absent : rejeté', () => {
    for (const value of ['BITCOIN', '', undefined, 42, 'carte']) {
      expect(checkPaymentChoice(value, {}, env())).toEqual({ ok: false, reason: 'inconnu' })
    }
  })

  it('mode non cartographié : indisponible même si l’interrupteur est actif', () => {
    const partial = env({ PFC_PAYMENT_MODES: JSON.stringify({ TWINT: [14] }) })
    expect(availablePaymentChoices({}, partial)).toEqual(['TWINT'])
    expect(checkPaymentChoice('CARTE', {}, partial)).toEqual({ ok: false, reason: 'indisponible' })
  })
})

describe('Parcours sans choix du mode', () => {
  it('la facture est exclue de la Payment Page dès que le mapping la connaît', () => {
    expect(configurationIdsWithoutInvoice(env())).toEqual([11, 21, 12, 13, 14])
  })

  it('sans facture cartographiée : aucune restriction', () => {
    const noInvoice = env({ PFC_PAYMENT_MODES: JSON.stringify({ TWINT: [14] }) })
    expect(configurationIdsWithoutInvoice(noInvoice)).toEqual([])
    expect(configurationIdsWithoutInvoice(env({ PFC_PAYMENT_MODES: undefined }))).toEqual([])
  })
})
