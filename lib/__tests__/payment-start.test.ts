import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TransactionCreate } from 'postfinancecheckout'

// Mapping factice : les vrais IDs sont propres à chaque space
const MAPPING = {
  CARTE: [11],
  POSTFINANCE_CARD: [12],
  POSTFINANCE_PAY: [13],
  TWINT: [14],
  FACTURE: [15],
}
Object.assign(process.env, {
  PFC_ENABLED: 'true',
  PFC_SPACE_ID: '1',
  PFC_USER_ID: '2',
  PFC_AUTH_KEY: Buffer.from('cle-de-test-factice').toString('base64'),
  PFC_MODE_CHOICE_ENABLED: 'true',
  PFC_INVOICE_ENABLED: 'true',
  PFC_PAYMENT_MODES: JSON.stringify(MAPPING),
})

const mocks = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  createTransaction: vi.fn(),
  readTransaction: vi.fn(),
  superseded: vi.fn(),
  created: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: async () => mocks.order },
    paymentTransaction: {
      updateMany: (args: unknown) => mocks.superseded(args),
      create: (args: unknown) => mocks.created(args),
    },
    $transaction: async (ops: unknown[]) => Promise.all(ops),
  },
}))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ invoiceFeeCents: 500 }) }))
vi.mock('@/lib/audit', () => ({ recordCustomerAudit: vi.fn() }))
vi.mock('@/lib/payments/postfinance', () => ({
  createTransaction: mocks.createTransaction,
  readTransaction: mocks.readTransaction,
  getPaymentPageUrl: async (id: number) => `https://paiement.example/${id}`,
  postFinanceSpaceId: () => 1,
  describePostFinanceError: async () => 'erreur simulée',
}))

import { startOnlinePayment } from '@/lib/payments/checkout'

function orderWith(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    numero: 'CMD-2026-0042',
    status: 'EN_ATTENTE_PAIEMENT',
    paymentMode: 'EN_LIGNE',
    paymentToken: 'x'.repeat(32),
    paidAt: null,
    invoiceAcceptedAt: null,
    invoiceUnavailable: false,
    paymentChoice: 'TWINT',
    invoiceFeeCents: 0,
    totalCents: 5800,
    shippingCents: 1000,
    promoCode: null,
    promoDiscountCents: 0,
    clientName: 'Test Client',
    clientEmail: 'client@example.com',
    address: 'Rue du Test 1',
    npa: '1700',
    city: 'Fribourg',
    customer: { firstName: 'Test', lastName: 'Client' },
    items: [
      {
        id: 'l1',
        productName: '3 Pépins 2010',
        unitPriceCents: 3000,
        quantity: 1,
        product: { articleNumber: 101 },
      },
      {
        id: 'l2',
        productName: '3 Pépins 2023',
        unitPriceCents: 1800,
        quantity: 1,
        product: { articleNumber: 102 },
      },
    ],
    paymentTransactions: [],
    ...overrides,
  }
}

const sentTransaction = (): TransactionCreate => mocks.createTransaction.mock.calls[0][0]

describe('Ouverture du paiement : verrou du mode côté serveur', () => {
  beforeEach(() => {
    mocks.createTransaction.mockReset().mockResolvedValue({ id: 999, state: 'PENDING' })
    mocks.readTransaction.mockReset()
    mocks.superseded.mockReset().mockResolvedValue({ count: 0 })
    mocks.created.mockReset().mockResolvedValue({})
  })

  it('TWINT : transaction limitée aux IDs TWINT, encaissement immédiat, sans supplément', async () => {
    mocks.order = orderWith()
    const result = await startOnlinePayment('o1')
    expect(result).toEqual({ ok: true, paymentPageUrl: 'https://paiement.example/999' })
    const sent = sentTransaction()
    expect(sent.allowedPaymentMethodConfigurations).toEqual([14])
    expect(sent.completionBehavior).toBe('COMPLETE_IMMEDIATELY')
    expect(sent.lineItems.map((l) => l.type)).toEqual(['PRODUCT', 'PRODUCT', 'SHIPPING'])
    expect(mocks.created.mock.calls[0][0].data).toMatchObject({
      paymentChoice: 'TWINT',
      amountCents: 5800,
    })
  })

  it('facture : limitée aux IDs PowerPay, encaissement différé, ligne « Supplément facture »', async () => {
    mocks.order = orderWith({ paymentChoice: 'FACTURE', invoiceFeeCents: 500, totalCents: 6300 })
    await startOnlinePayment('o1')
    const sent = sentTransaction()
    expect(sent.allowedPaymentMethodConfigurations).toEqual([15])
    expect(sent.completionBehavior).toBe('COMPLETE_DEFERRED')
    const fee = sent.lineItems.at(-1)!
    expect(fee).toMatchObject({ type: 'FEE', name: 'Supplément facture', amountIncludingTax: 5 })
    const total = sent.lineItems.reduce((s, l) => s + Math.round(l.amountIncludingTax * 100), 0)
    expect(total).toBe(6300)
  })

  it('sans choix de mode : tous les modes sauf la facture', async () => {
    mocks.order = orderWith({ paymentChoice: null })
    await startOnlinePayment('o1')
    expect(sentTransaction().allowedPaymentMethodConfigurations).toEqual([11, 12, 13, 14])
  })

  it('facture déjà échouée pour la commande : aucune transaction, mode à rechoisir', async () => {
    mocks.order = orderWith({
      paymentChoice: 'FACTURE',
      invoiceUnavailable: true,
      invoiceFeeCents: 500,
      totalCents: 6300,
    })
    expect(await startOnlinePayment('o1')).toEqual({ ok: false, reason: 'mode_indisponible' })
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })

  it('transaction active d’un autre mode : jamais réutilisée, remplacée par une nouvelle', async () => {
    mocks.order = orderWith({
      paymentTransactions: [
        {
          id: 'a1',
          transactionId: BigInt(555),
          state: 'PENDING',
          amountCents: 5800,
          paymentChoice: 'CARTE',
        },
      ],
    })
    mocks.readTransaction.mockResolvedValue({ id: 555, state: 'PENDING' })
    await startOnlinePayment('o1')
    expect(mocks.createTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.superseded.mock.calls[0][0]).toMatchObject({
      where: { orderId: 'o1', supersededAt: null },
      data: { supersededAt: expect.any(Date) },
    })
  })

  it('transaction active du même mode, encore ouverte et au bon montant : réutilisée', async () => {
    mocks.order = orderWith({
      paymentTransactions: [
        {
          id: 'a1',
          transactionId: BigInt(555),
          state: 'PENDING',
          amountCents: 5800,
          paymentChoice: 'TWINT',
        },
      ],
    })
    mocks.readTransaction.mockResolvedValue({ id: 555, state: 'PENDING' })
    expect(await startOnlinePayment('o1')).toEqual({
      ok: true,
      paymentPageUrl: 'https://paiement.example/555',
    })
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })
})
