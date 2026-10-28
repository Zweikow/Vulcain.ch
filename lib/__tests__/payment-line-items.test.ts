import { describe, it, expect } from 'vitest'
import {
  buildPaymentLines,
  toSdkLineItems,
  PaymentLinesMismatchError,
  type PayableOrder,
} from '@/lib/payments/line-items'
import { calculateDiscount } from '@/lib/discount-codes'
import { centsToApiAmount, apiAmountToCents, shippingCentsFor } from '@/lib/money'

const settings = { shippingCents: 1000, francoCents: 12000 }

/** Commande telle que POST /api/commandes l'enregistre : centimes, promo, port, total. */
function orderFrom(
  items: { unitPriceCents: number; quantity: number; productName?: string }[],
  promo?: { code: string; type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number },
  isPro = false
): PayableOrder {
  const gross = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0)
  const promoDiscountCents = promo
    ? calculateDiscount(
        promo.type,
        gross,
        promo.type === 'PERCENTAGE' ? promo.value : null,
        promo.type === 'FIXED_AMOUNT' ? promo.value : null
      )
    : 0
  const subtotalCents = Math.max(0, gross - promoDiscountCents)
  const shippingCents = shippingCentsFor(subtotalCents, isPro, settings)
  return {
    totalCents: subtotalCents + shippingCents,
    shippingCents,
    promoCode: promo?.code ?? null,
    promoDiscountCents,
    items: items.map((i, n) => ({
      id: `ligne-${n}`,
      productName: i.productName ?? `Cidre ${n}`,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      articleNumber: 100 + n,
    })),
  }
}

const sum = (lines: { amountCents: number }[]) => lines.reduce((s, l) => s + l.amountCents, 0)

describe('Lignes de paiement PostFinance', () => {
  it('sans promo, sous le franco : produits + port, somme égale au total', () => {
    const order = orderFrom([
      { unitPriceCents: 1850, quantity: 2 },
      { unitPriceCents: 2490, quantity: 1 },
    ])
    const lines = buildPaymentLines(order)
    expect(lines.map((l) => l.type)).toEqual(['PRODUCT', 'PRODUCT', 'SHIPPING'])
    expect(lines[0].amountCents).toBe(3700)
    expect(lines[2]).toMatchObject({ type: 'SHIPPING', amountCents: 1000, quantity: 1 })
    expect(sum(lines)).toBe(order.totalCents)
    expect(order.totalCents).toBe(7190)
  })

  it('sans promo, franco atteint : aucune ligne de port', () => {
    const order = orderFrom([{ unitPriceCents: 2500, quantity: 6 }])
    const lines = buildPaymentLines(order)
    expect(order.shippingCents).toBe(0)
    expect(lines.some((l) => l.type === 'SHIPPING')).toBe(false)
    expect(sum(lines)).toBe(15000)
  })

  it('avec code promo en pourcentage : ligne DISCOUNT négative, arrondi au centime', () => {
    // 3 × 19.95 = 59.85 ; 15 % = 8.9775 → 8.98 ; reste 50.87, + port 10.00
    const order = orderFrom([{ unitPriceCents: 1995, quantity: 3 }], {
      code: 'AUTOMNE15',
      type: 'PERCENTAGE',
      value: 15,
    })
    const lines = buildPaymentLines(order)
    const discount = lines.find((l) => l.type === 'DISCOUNT')!
    expect(discount.amountCents).toBe(-898)
    expect(discount.name).toBe('Code promo AUTOMNE15')
    expect(sum(lines)).toBe(order.totalCents)
    expect(order.totalCents).toBe(6087)
  })

  it('avec code promo fixe, franco atteint malgré la remise : aucune ligne de port', () => {
    const order = orderFrom([{ unitPriceCents: 3000, quantity: 5 }], {
      code: 'MOINS20',
      type: 'FIXED_AMOUNT',
      value: 2000,
    })
    const lines = buildPaymentLines(order)
    expect(lines.map((l) => l.type)).toEqual(['PRODUCT', 'DISCOUNT'])
    expect(sum(lines)).toBe(13000)
  })

  it('avec code promo qui fait repasser sous le franco : le port réapparaît', () => {
    // 125.00 - 10 % = 112.50 < 120.00 : port facturé, comme le calcule la boutique
    const order = orderFrom([{ unitPriceCents: 2500, quantity: 5 }], {
      code: 'DIX',
      type: 'PERCENTAGE',
      value: 10,
    })
    const lines = buildPaymentLines(order)
    expect(lines.map((l) => l.type)).toEqual(['PRODUCT', 'DISCOUNT', 'SHIPPING'])
    expect(sum(lines)).toBe(12250)
  })

  it('bouteilles offertes (ligne à 0) et prix pro déjà appliqués : pas de ligne en plus', () => {
    const order = orderFrom([
      { unitPriceCents: 1600, quantity: 3, productName: 'Cidre brut' },
      { unitPriceCents: 0, quantity: 1, productName: 'Cidre brut - 3+1 (1 offert)' },
    ])
    const lines = buildPaymentLines(order)
    expect(lines.filter((l) => l.type === 'PRODUCT').map((l) => l.amountCents)).toEqual([4800, 0])
    expect(sum(lines)).toBe(order.totalCents)
  })

  it('refuse une commande dont les montants ne se recoupent pas', () => {
    const order = { ...orderFrom([{ unitPriceCents: 1000, quantity: 2 }]), totalCents: 2999 }
    expect(() => buildPaymentLines(order)).toThrow(PaymentLinesMismatchError)
  })

  it('accepte une ligne de frais à venir (FEE) incluse dans le total', () => {
    const base = orderFrom([{ unitPriceCents: 2000, quantity: 1 }])
    const order = { ...base, totalCents: base.totalCents + 250 }
    const lines = buildPaymentLines(order, [
      {
        uniqueId: 'frais-facture',
        type: 'FEE',
        name: 'Frais de paiement par facture',
        quantity: 1,
        amountCents: 250,
        shippingRequired: false,
      },
    ])
    expect(lines.at(-1)?.type).toBe('FEE')
    expect(sum(lines)).toBe(order.totalCents)
  })

  it('la somme des montants décimaux envoyés redonne le total, sur 500 paniers variés', () => {
    // Générateur déterministe : le test ne dépend pas du hasard
    let seed = 42
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed % n
    }
    for (let k = 0; k < 500; k++) {
      const items = Array.from({ length: 1 + rand(5) }, () => ({
        unitPriceCents: 500 + rand(4000),
        quantity: 1 + rand(12),
      }))
      const promo =
        rand(3) === 0
          ? { code: 'P', type: 'PERCENTAGE' as const, value: 5 + rand(30) }
          : rand(3) === 0
            ? { code: 'F', type: 'FIXED_AMOUNT' as const, value: 100 + rand(3000) }
            : undefined
      const order = orderFrom(items, promo)
      const sdkItems = toSdkLineItems(buildPaymentLines(order))
      const totalCents = sdkItems.reduce((s, l) => s + apiAmountToCents(l.amountIncludingTax), 0)
      expect(totalCents).toBe(order.totalCents)
    }
  })

  it('format SDK : montants décimaux, nom tronqué, sku = numéro d’article', () => {
    const order = orderFrom([{ unitPriceCents: 1999, quantity: 1, productName: 'x'.repeat(200) }])
    const [product, shipping] = toSdkLineItems(buildPaymentLines(order))
    expect(product).toMatchObject({ type: 'PRODUCT', amountIncludingTax: 19.99, sku: '100' })
    expect(product.name.length).toBeLessThanOrEqual(150)
    expect(shipping).toMatchObject({ type: 'SHIPPING', amountIncludingTax: 10 })
  })
})

describe('Conversion centimes ↔ montant API', () => {
  it('convertit exactement', () => {
    expect(centsToApiAmount(1999)).toBe(19.99)
    expect(centsToApiAmount(5)).toBe(0.05)
    expect(centsToApiAmount(100)).toBe(1)
    expect(centsToApiAmount(-1050)).toBe(-10.5)
    expect(apiAmountToCents(19.99)).toBe(1999)
    expect(apiAmountToCents(0.29)).toBe(29)
  })

  it('refuse un montant non entier en centimes', () => {
    expect(() => centsToApiAmount(10.5)).toThrow()
  })
})
