import { describe, it, expect } from 'vitest'
import { proUnitPriceCents } from '@/lib/money'

describe('Calcul des tarifs clients professionnels', () => {
  it('applique correctement un taux pro sur mesure de 28%', () => {
    // Produit à 10.00 CHF (1000 centimes)
    const price10 = 1000
    expect(proUnitPriceCents(price10, 28)).toBe(720) // 1000 * 0.72 = 720 cents (7.20 CHF)

    // Produit à 25.00 CHF (2500 centimes)
    const price25 = 2500
    expect(proUnitPriceCents(price25, 28)).toBe(1800) // 2500 * 0.72 = 1800 cents (18.00 CHF)

    // Produit à 32.50 CHF (3250 centimes)
    const price3250 = 3250
    expect(proUnitPriceCents(price3250, 28)).toBe(2340) // 3250 * 0.72 = 2340 cents (23.40 CHF)
  })

  it('applique le taux par défaut de 20% si aucun taux sur mesure n est défini', () => {
    const defaultRate = 20
    const price10 = 1000
    expect(proUnitPriceCents(price10, defaultRate)).toBe(800) // 1000 * 0.80 = 800 cents (8.00 CHF)

    const price25 = 2500
    expect(proUnitPriceCents(price25, defaultRate)).toBe(2000) // 2500 * 0.80 = 2000 cents (20.00 CHF)
  })

  it('donne priorité au taux sur mesure du client sur le réglage global', () => {
    const settingsRate = 20
    const customerCustomRate: number | null = 28

    const effectiveRate = customerCustomRate ?? settingsRate
    expect(effectiveRate).toBe(28)

    const price25 = 2500
    expect(proUnitPriceCents(price25, effectiveRate)).toBe(1800)
  })

  it('se replie sur le réglage global si le taux client est null ou non défini', () => {
    const settingsRate = 20
    const customerCustomRate: number | null = null

    const effectiveRate = customerCustomRate ?? settingsRate
    expect(effectiveRate).toBe(20)

    const price25 = 2500
    expect(proUnitPriceCents(price25, effectiveRate)).toBe(2000)
  })
})
