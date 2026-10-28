import { describe, it, expect, vi, beforeEach } from 'vitest'
import { orderTotalsFor } from '@/lib/money'

// Mapping factice : les vrais IDs sont propres à chaque space
Object.assign(process.env, {
  PFC_ENABLED: 'true',
  PFC_SPACE_ID: '1',
  PFC_USER_ID: '2',
  PFC_AUTH_KEY: Buffer.from('cle-de-test-factice').toString('base64'),
  PFC_MODE_CHOICE_ENABLED: 'true',
  PFC_INVOICE_ENABLED: 'true',
  PFC_PAYMENT_MODES: JSON.stringify({
    CARTE: [11],
    POSTFINANCE_CARD: [12],
    POSTFINANCE_PAY: [13],
    TWINT: [14],
    FACTURE: [15],
  }),
})

const settings = { invoiceFeeCents: 500, vatSubject: false, vatRatePermille: 81 }

const mocks = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  updated: vi.fn(),
  readTransaction: vi.fn(),
  audit: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      // Comme Prisma : un objet neuf à chaque lecture
      findUnique: async () => (mocks.order ? { ...mocks.order } : null),
      updateMany: async (args: { data: Record<string, unknown> }) => {
        mocks.updated(args)
        Object.assign(mocks.order!, args.data)
        return { count: 1 }
      },
    },
  },
}))
vi.mock('@/lib/settings', () => ({ getSettings: async () => settings }))
vi.mock('@/lib/audit', () => ({ recordCustomerAudit: mocks.audit }))
vi.mock('@/lib/payments/postfinance', () => ({ readTransaction: mocks.readTransaction }))

import { changePaymentChoice } from '@/lib/payments/checkout'

// Commande : 48.00 d'articles (promo déduite) et 10.00 de port
const pending = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  numero: 'CMD-2026-0042',
  status: 'EN_ATTENTE_PAIEMENT',
  paymentMode: 'EN_LIGNE',
  paidAt: null,
  invoiceAcceptedAt: null,
  invoiceUnavailable: false,
  subtotalCents: 4800,
  shippingCents: 1000,
  paymentChoice: 'TWINT',
  invoiceFeeCents: 0,
  totalCents: 5800,
  paymentTransactions: [],
  ...overrides,
})

describe('Total selon le mode (lib/money)', () => {
  it('supplément seulement pour la facture, TVA nulle tant que non assujetti', () => {
    expect(
      orderTotalsFor({ subtotalCents: 4800, shippingCents: 1000 }, 'FACTURE', settings)
    ).toEqual({
      invoiceFeeCents: 500,
      totalCents: 6300,
      vatCents: 0,
    })
    expect(orderTotalsFor({ subtotalCents: 4800, shippingCents: 1000 }, 'TWINT', settings)).toEqual(
      {
        invoiceFeeCents: 0,
        totalCents: 5800,
        vatCents: 0,
      }
    )
  })

  it('assujetti : le supplément suit la TVA de la commande', () => {
    const vat = { ...settings, vatSubject: true }
    // 63.00 TTC à 8.1 % : 4.72 de TVA incluse, supplément compris
    expect(
      orderTotalsFor({ subtotalCents: 4800, shippingCents: 1000 }, 'FACTURE', vat).vatCents
    ).toBe(472)
  })
})

describe('Changement de mode avant paiement', () => {
  beforeEach(() => {
    mocks.updated.mockReset()
    mocks.readTransaction.mockReset()
    mocks.audit.mockReset()
  })

  it('TWINT vers facture : supplément ajouté, total recalculé, changement tracé', async () => {
    mocks.order = pending()
    expect(await changePaymentChoice('o1', 'FACTURE')).toEqual({ ok: true })
    expect(mocks.updated.mock.calls[0][0].data).toEqual({
      paymentChoice: 'FACTURE',
      invoiceFeeCents: 500,
      totalCents: 6300,
      vatCents: 0,
    })
    expect(mocks.audit).toHaveBeenCalledTimes(1)
  })

  it('refus PowerPay puis bascule sur TWINT : facture refusée, supplément retiré', async () => {
    mocks.order = pending({
      paymentChoice: 'FACTURE',
      invoiceFeeCents: 500,
      totalCents: 6300,
      invoiceUnavailable: true,
    })
    expect(await changePaymentChoice('o1', 'FACTURE')).toEqual({
      ok: false,
      reason: 'mode_indisponible',
    })
    expect(await changePaymentChoice('o1', 'TWINT')).toEqual({ ok: true })
    expect(mocks.order).toMatchObject({
      paymentChoice: 'TWINT',
      invoiceFeeCents: 0,
      totalCents: 5800,
    })
  })

  it('mode inconnu : rejeté, rien n’est modifié', async () => {
    mocks.order = pending()
    expect(await changePaymentChoice('o1', 'BITCOIN')).toEqual({
      ok: false,
      reason: 'mode_indisponible',
    })
    expect(mocks.updated).not.toHaveBeenCalled()
  })

  it('commande déjà payée ou acceptée sur facture : plus de changement possible', async () => {
    for (const done of [
      { paidAt: new Date() },
      { invoiceAcceptedAt: new Date() },
      { status: 'A_TRAITER' },
    ]) {
      mocks.order = pending(done)
      expect(await changePaymentChoice('o1', 'CARTE')).toEqual({ ok: false, reason: 'non_payable' })
    }
    expect(mocks.updated).not.toHaveBeenCalled()
  })

  it('paiement en cours d’encaissement sur la transaction active : on attend', async () => {
    mocks.order = pending({
      paymentTransactions: [{ transactionId: BigInt(555), state: 'PROCESSING' }],
    })
    mocks.readTransaction.mockResolvedValue({ id: 555, state: 'AUTHORIZED' })
    expect(await changePaymentChoice('o1', 'CARTE')).toEqual({ ok: false, reason: 'en_cours' })
    expect(mocks.updated).not.toHaveBeenCalled()
  })
})
