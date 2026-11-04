import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mapping factice : les vrais IDs sont propres à chaque space
Object.assign(process.env, {
  PFC_PAYMENT_MODES: JSON.stringify({ CARTE: [11], TWINT: [14], FACTURE: [15] }),
})

const mocks = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  orderUpdate: vi.fn(),
  attemptsSuperseded: vi.fn(),
  attemptUpdate: vi.fn(),
  readTransaction: vi.fn(),
  notifyOrderPlaced: vi.fn(),
  recordAudit: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const tx = {
    order: { updateMany: (args: unknown) => mocks.orderUpdate(args) },
    paymentTransaction: {
      updateMany: (args: unknown) => mocks.attemptsSuperseded(args),
      update: (args: unknown) => mocks.attemptUpdate(args),
    },
  }
  return {
    prisma: {
      order: { findUnique: async () => mocks.order },
      $transaction: (run: (t: typeof tx) => Promise<unknown>) => run(tx),
    },
  }
})
vi.mock('@/lib/payments/postfinance', () => ({ readTransaction: mocks.readTransaction }))
vi.mock('@/lib/notifications', () => ({ notifyOrderPlaced: mocks.notifyOrderPlaced }))
vi.mock('@/lib/audit', () => ({ recordAudit: mocks.recordAudit, recordSystemAudit: vi.fn() }))

import { acceptPaymentToVerify } from '@/lib/payments/sync'

const toVerify = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  numero: 'CMD-2026-0042',
  status: 'A_VERIFIER',
  totalCents: 5800,
  paymentChoice: 'CARTE',
  paymentTransactions: [
    { id: 'a2', transactionId: BigInt(1002), state: 'FAILED', paymentChoice: 'CARTE' },
    { id: 'a1', transactionId: BigInt(1001), state: 'FULFILL', paymentChoice: 'TWINT' },
  ],
  ...overrides,
})
const remote = (overrides: Record<string, unknown> = {}) => ({
  state: 'FULFILL',
  currency: 'CHF',
  authorizationAmountCents: 5800,
  paymentMethod: 'TWINT',
  paymentMethodConfigurationId: 14,
  authorizedOn: new Date('2026-10-28T10:00:00Z'),
  completedOn: new Date('2026-10-28T10:00:05Z'),
  decisionOn: new Date('2026-10-28T10:00:06Z'),
  ...overrides,
})

describe('Décision sur une commande à vérifier', () => {
  beforeEach(() => {
    mocks.order = toVerify()
    mocks.orderUpdate.mockReset().mockResolvedValue({ count: 1 })
    mocks.attemptsSuperseded.mockReset().mockResolvedValue({ count: 1 })
    mocks.attemptUpdate.mockReset().mockResolvedValue({})
    mocks.readTransaction.mockReset()
    mocks.notifyOrderPlaced.mockReset()
    mocks.recordAudit.mockReset()
  })

  it('paiement au bon montant : commande À traiter, transaction active, emails, trace', async () => {
    mocks.readTransaction
      .mockResolvedValueOnce(remote({ state: 'FAILED', authorizationAmountCents: 5800 }))
      .mockResolvedValueOnce(remote())
    mocks.notifyOrderPlaced.mockResolvedValue(true)
    expect(await acceptPaymentToVerify('o1')).toEqual({
      ok: true,
      message: 'Paiement accepté : commande passée « À traiter », emails envoyés.',
    })
    expect(mocks.orderUpdate.mock.calls[0][0].data).toMatchObject({
      status: 'A_TRAITER',
      paymentChoice: 'TWINT',
      paymentMethod: 'Paiement en ligne (TWINT)',
      paidAt: new Date('2026-10-28T10:00:05Z'),
    })
    expect(mocks.attemptUpdate.mock.calls[0][0]).toMatchObject({
      where: { id: 'a1' },
      data: { supersededAt: null },
    })
    expect(mocks.recordAudit.mock.calls[0][0]).toBe('PAIEMENT_CONFIRME')
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
  })

  it('emails non partis : le message ne prétend pas le contraire', async () => {
    mocks.readTransaction.mockResolvedValue(remote())
    mocks.notifyOrderPlaced.mockResolvedValue(false)
    const result = await acceptPaymentToVerify('o1')
    expect(result.ok && result.message).toContain("L'envoi des emails a échoué")
    expect(result.ok && result.message).not.toContain('emails envoyés')
  })

  it('facture acceptée : acceptée sur facture, pas payée tant que non encaissée', async () => {
    mocks.order = toVerify({
      paymentChoice: 'FACTURE',
      paymentTransactions: [
        { id: 'a1', transactionId: BigInt(1001), state: 'AUTHORIZED', paymentChoice: 'FACTURE' },
      ],
    })
    mocks.readTransaction.mockResolvedValue(
      remote({ state: 'AUTHORIZED', paymentMethodConfigurationId: 15, completedOn: null })
    )
    expect((await acceptPaymentToVerify('o1')).ok).toBe(true)
    const { data } = mocks.orderUpdate.mock.calls[0][0]
    expect(data.invoiceAcceptedAt).toEqual(new Date('2026-10-28T10:00:00Z'))
    expect(data.paidAt).toBeUndefined()
    expect(mocks.recordAudit.mock.calls[0][0]).toBe('FACTURE_ACCEPTEE')
  })

  it('montant différent de la commande : refus, il faut annuler et rembourser', async () => {
    mocks.readTransaction.mockResolvedValue(remote({ authorizationAmountCents: 6300 }))
    const result = await acceptPaymentToVerify('o1')
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toContain('remboursez')
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
  })

  it('aucun paiement reçu : refus', async () => {
    mocks.readTransaction.mockResolvedValue(remote({ state: 'FAILED' }))
    expect((await acceptPaymentToVerify('o1')).ok).toBe(false)
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
  })

  it('commande qui n’est plus à vérifier : refus sans appel à PostFinance', async () => {
    mocks.order = toVerify({ status: 'A_TRAITER' })
    expect((await acceptPaymentToVerify('o1')).ok).toBe(false)
    expect(mocks.readTransaction).not.toHaveBeenCalled()
  })

  it('double clic : le second ne renvoie ni email ni trace', async () => {
    mocks.readTransaction.mockResolvedValue(remote())
    mocks.orderUpdate.mockResolvedValue({ count: 0 })
    expect((await acceptPaymentToVerify('o1')).ok).toBe(false)
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
    expect(mocks.recordAudit).not.toHaveBeenCalled()
  })
})
