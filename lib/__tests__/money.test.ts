import { describe, it, expect } from 'vitest'
import {
  proUnitPriceCents,
  vatIncludedCents,
  orderVatCents,
  shippingCentsFor,
  formatCHF,
  formatInvoiceAmount,
  chfInputToCents,
  getInvoicePaymentStatus,
} from '@/lib/money'

describe('lib/money', () => {
  describe('proUnitPriceCents', () => {
    it('calcule correctement le prix pro avec une remise standard', () => {
      // 20 CHF public avec 20% de remise -> 16 CHF
      expect(proUnitPriceCents(2000, 20)).toBe(1600)
    })

    it('arrondit au centime le plus proche', () => {
      // 19.50 CHF avec 15% -> 1950 * 0.85 = 1657.5 -> 1658 centimes
      expect(proUnitPriceCents(1950, 15)).toBe(1658)
    })

    it('retourne le prix public si le taux est 0', () => {
      expect(proUnitPriceCents(2500, 0)).toBe(2500)
    })
  })

  describe('vatIncludedCents & orderVatCents', () => {
    it('calcule la TVA incluse (taux suisse 8.1% = 81 pour-mille)', () => {
      // Montant TTC 108.10 CHF -> TVA 8.10 CHF (810 centimes)
      expect(vatIncludedCents(10810, 81)).toBe(810)
    })

    it('orderVatCents retourne 0 si non assujetti', () => {
      const settings = { vatSubject: false, vatRatePermille: 81 }
      expect(orderVatCents(10810, settings)).toBe(0)
    })

    it('orderVatCents retourne la TVA si assujetti', () => {
      const settings = { vatSubject: true, vatRatePermille: 81 }
      expect(orderVatCents(10810, settings)).toBe(810)
    })
  })

  describe('shippingCentsFor', () => {
    const settings = { shippingCents: 1500, francoCents: 12000 }

    it('offre les frais de port aux clients professionnels', () => {
      expect(shippingCentsFor(5000, true, settings)).toBe(0)
    })

    it('offre les frais de port des que le seuil de franco est atteint', () => {
      expect(shippingCentsFor(12000, false, settings)).toBe(0)
      expect(shippingCentsFor(15000, false, settings)).toBe(0)
    })

    it('facture les frais de port sous le seuil pour les particuliers', () => {
      expect(shippingCentsFor(11900, false, settings)).toBe(1500)
    })
  })

  describe('formatCHF', () => {
    it('formate correctement les montants usuels en francs suisses', () => {
      expect(formatCHF(12900)).toBe('CHF 129.00')
      expect(formatCHF(0)).toBe('CHF 0.00')
      expect(formatCHF(95)).toBe('CHF 0.95')
    })

    it('formate avec separateur suisse pour les milliers', () => {
      expect(formatCHF(1234500)).toBe("CHF 12'345.00")
    })

    it('gere les montants negatifs', () => {
      expect(formatCHF(-1500)).toBe('-CHF 15.00')
    })
  })

  describe('formatInvoiceAmount', () => {
    it('affiche .-- quand il ny a pas de centimes', () => {
      expect(formatInvoiceAmount(19200)).toBe('192.--')
      expect(formatInvoiceAmount(100000)).toBe("1'000.--")
    })

    it('affiche les centimes exacts sinon', () => {
      expect(formatInvoiceAmount(19250)).toBe('192.50')
      expect(formatInvoiceAmount(19205)).toBe('192.05')
    })
  })

  describe('chfInputToCents', () => {
    it('convertit les chaines avec point ou virgule en centimes', () => {
      expect(chfInputToCents('24.50')).toBe(2450)
      expect(chfInputToCents('24,50')).toBe(2450)
      expect(chfInputToCents(24.5)).toBe(2450)
    })

    it('retourne 0 pour les saisies invalides ou negatives', () => {
      expect(chfInputToCents('-10')).toBe(0)
      expect(chfInputToCents('invalide')).toBe(0)
    })
  })

  describe('getInvoicePaymentStatus', () => {
    it('indique payee si paidAt est renseigne', () => {
      const order = {
        paidAt: new Date('2026-01-15'),
        paymentMethod: 'twint',
        createdAt: new Date('2026-01-10'),
      }
      const status = getInvoicePaymentStatus(order, 30)
      expect(status.isPaid).toBe(true)
      expect(status.isOverdue).toBe(false)
      expect(status.daysOverdue).toBe(0)
    })

    it('calcule correctement l echeance a 30 jours', () => {
      const order = {
        paidAt: null,
        createdAt: new Date('2026-01-01'),
      }
      const status = getInvoicePaymentStatus(order, 30)
      expect(status.isPaid).toBe(false)
      expect(status.dueDate.toISOString().startsWith('2026-01-31')).toBe(true)
    })
  })
})
