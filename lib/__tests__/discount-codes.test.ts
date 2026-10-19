import { describe, it, expect } from 'vitest'
import {
  normalizePromoCode,
  calculateDiscount,
  validateDiscountCodeRules,
  DiscountType,
} from '@/lib/discount-codes'

describe('lib/discount-codes', () => {
  describe('normalizePromoCode', () => {
    it('met le code en majuscules et supprime les espaces superflus', () => {
      expect(normalizePromoCode('  ouverture10  ')).toBe('OUVERTURE10')
      expect(normalizePromoCode('insta-vulcain')).toBe('INSTA-VULCAIN')
    })

    it('supprime le dièse initial si tapé comme un hashtag', () => {
      expect(normalizePromoCode('#OUVERTURE10')).toBe('OUVERTURE10')
      expect(normalizePromoCode('  #promo2026 ')).toBe('PROMO2026')
    })
  })

  describe('calculateDiscount', () => {
    it('calcule correctement une remise en pourcentage (10%)', () => {
      // 10% sur 120 CHF (12000 centimes) -> 12 CHF (1200 centimes)
      expect(calculateDiscount(DiscountType.PERCENTAGE, 12000, 10, null)).toBe(1200)
    })

    it('arrondit au centime le plus proche pour les pourcentages', () => {
      // 10% sur 19.50 CHF (1950 centimes) -> 195 centimes
      expect(calculateDiscount(DiscountType.PERCENTAGE, 1950, 10, null)).toBe(195)
      // 15% sur 19.50 CHF (1950 centimes) -> 292.5 -> 293 centimes
      expect(calculateDiscount(DiscountType.PERCENTAGE, 1950, 15, null)).toBe(293)
    })

    it('calcule correctement une remise en montant fixe', () => {
      // 15 CHF (1500 centimes) de remise fixe sur 50 CHF (5000 centimes)
      expect(calculateDiscount(DiscountType.FIXED_AMOUNT, 5000, null, 1500)).toBe(1500)
    })

    it('borne la remise fixe au montant du sous-total', () => {
      // 50 CHF de remise sur un panier de 30 CHF -> 30 CHF max
      expect(calculateDiscount(DiscountType.FIXED_AMOUNT, 3000, null, 5000)).toBe(3000)
    })

    it('retourne 0 si le sous-total est nul ou négatif', () => {
      expect(calculateDiscount(DiscountType.PERCENTAGE, 0, 10, null)).toBe(0)
      expect(calculateDiscount(DiscountType.FIXED_AMOUNT, -100, null, 1000)).toBe(0)
    })
  })

  describe('validateDiscountCodeRules', () => {
    const baseCode = {
      id: 'dc-1',
      code: 'OUVERTURE10',
      description: 'Campagne Instagram ouverture site',
      type: DiscountType.PERCENTAGE,
      percentage: 10,
      amountCents: null,
      minSubtotalCents: null,
      maxUses: null,
      usedCount: 0,
      active: true,
      startDate: null,
      endDate: null,
    }

    it('valide un code actif sans restrictions particulières', () => {
      const res = validateDiscountCodeRules(baseCode, 10000)
      expect(res.valid).toBe(true)
      if (res.valid) {
        expect(res.discountCents).toBe(1000) // 10 CHF
      }
    })

    it('refuse un code inactif', () => {
      const res = validateDiscountCodeRules({ ...baseCode, active: false }, 10000)
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toContain('désactivé')
      }
    })

    it('refuse un code avant sa date de début', () => {
      const future = new Date(Date.now() + 24 * 3600 * 1000)
      const res = validateDiscountCodeRules({ ...baseCode, startDate: future }, 10000, new Date())
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toContain("n'est pas encore actif")
      }
    })

    it('refuse un code après sa date d expiration', () => {
      const past = new Date(Date.now() - 24 * 3600 * 1000)
      const res = validateDiscountCodeRules({ ...baseCode, endDate: past }, 10000, new Date())
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toContain('expiré')
      }
    })

    it('refuse un code qui a atteint son quota d utilisations', () => {
      const res = validateDiscountCodeRules({ ...baseCode, maxUses: 50, usedCount: 50 }, 10000)
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toContain('maximal')
      }
    })

    it('autorise un code sous son quota d utilisations', () => {
      const res = validateDiscountCodeRules({ ...baseCode, maxUses: 50, usedCount: 49 }, 10000)
      expect(res.valid).toBe(true)
    })

    it('refuse si le panier est inférieur au seuil minimum exigé', () => {
      const res = validateDiscountCodeRules(
        { ...baseCode, minSubtotalCents: 5000 }, // 50 CHF min
        3000 // 30 CHF
      )
      expect(res.valid).toBe(false)
      if (!res.valid) {
        expect(res.error).toContain('panier minimum')
      }
    })

    it('accepte si le panier atteint ou dépasse le seuil minimum exigé', () => {
      const res = validateDiscountCodeRules({ ...baseCode, minSubtotalCents: 5000 }, 5000)
      expect(res.valid).toBe(true)
      if (res.valid) {
        expect(res.discountCents).toBe(500)
      }
    })
  })
})
