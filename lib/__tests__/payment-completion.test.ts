import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  readTransaction: vi.fn(),
  completeTransactionOnline: vi.fn(),
  syncPaymentTransaction: vi.fn(),
  recordAudit: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: async () => mocks.order } },
}))
vi.mock('@/lib/audit', () => ({ recordAudit: mocks.recordAudit }))
vi.mock('@/lib/payments/sync', () => ({ syncPaymentTransaction: mocks.syncPaymentTransaction }))
vi.mock('@/lib/payments/postfinance', () => ({
  readTransaction: mocks.readTransaction,
  completeTransactionOnline: mocks.completeTransactionOnline,
  describePostFinanceError: async () => 'HTTP 403 : droit manquant',
}))

import { completeInvoiceBeforeShipping } from '@/lib/payments/completion'

const accepted = {
  id: 'o1',
  numero: 'CMD-2026-0042',
  invoiceAcceptedAt: new Date('2026-10-28T10:00:00Z'),
  paymentTransactions: [{ transactionId: BigInt(1001) }],
}
const complete = () => completeInvoiceBeforeShipping('o1', { pollDelayMs: 0 })

describe('Encaissement PowerPay avant expédition', () => {
  beforeEach(() => {
    mocks.order = accepted
    mocks.readTransaction.mockReset()
    mocks.completeTransactionOnline.mockReset().mockResolvedValue(undefined)
    mocks.syncPaymentTransaction.mockReset().mockResolvedValue({ outcome: 'acceptee' })
    mocks.recordAudit.mockReset()
  })

  it('commande qui n’est pas sur facture PowerPay : rien à encaisser', async () => {
    mocks.order = { ...accepted, invoiceAcceptedAt: null }
    expect(await complete()).toEqual({ ok: true, detail: 'sans_objet' })
    expect(mocks.readTransaction).not.toHaveBeenCalled()
  })

  it('AUTHORIZED : encaisse, attend FULFILL, trace et aligne la base', async () => {
    mocks.readTransaction
      .mockResolvedValueOnce({ state: 'AUTHORIZED' })
      .mockResolvedValueOnce({ state: 'COMPLETED' })
      .mockResolvedValueOnce({ state: 'FULFILL' })
    expect(await complete()).toEqual({ ok: true, detail: 'encaissee' })
    expect(mocks.completeTransactionOnline).toHaveBeenCalledTimes(1)
    expect(mocks.completeTransactionOnline).toHaveBeenCalledWith(1001)
    expect(mocks.recordAudit.mock.calls[0][0]).toBe('FACTURE_ENCAISSEE')
    expect(mocks.syncPaymentTransaction).toHaveBeenCalledWith(BigInt(1001), 'admin')
  })

  it('déjà encaissée : pas de second encaissement', async () => {
    mocks.readTransaction.mockResolvedValue({ state: 'FULFILL' })
    expect(await complete()).toEqual({ ok: true, detail: 'encaissee' })
    expect(mocks.completeTransactionOnline).not.toHaveBeenCalled()
  })

  it('verdict encore en attente après le délai : expédition permise, le webhook finira', async () => {
    mocks.readTransaction.mockResolvedValue({ state: 'AUTHORIZED' })
    expect(await complete()).toEqual({ ok: true, detail: 'en_cours' })
  })

  it('PostFinance refuse l’encaissement : erreur, commande non expédiée', async () => {
    mocks.readTransaction.mockResolvedValue({ state: 'AUTHORIZED' })
    mocks.completeTransactionOnline.mockRejectedValue(new Error('403'))
    const result = await complete()
    expect(result).toMatchObject({ ok: false })
    expect(result.ok === false && result.error).toContain('HTTP 403')
    expect(mocks.syncPaymentTransaction).not.toHaveBeenCalled()
    expect(mocks.recordAudit).not.toHaveBeenCalled()
  })

  it('DECLINE après encaissement : ne pas expédier', async () => {
    mocks.readTransaction
      .mockResolvedValueOnce({ state: 'AUTHORIZED' })
      .mockResolvedValueOnce({ state: 'DECLINE' })
    const result = await complete()
    expect(result).toMatchObject({ ok: false })
    expect(result.ok === false && result.error).toContain('ne pas expédier')
  })

  it('autorisation expirée (FAILED) : erreur, aucun encaissement tenté', async () => {
    mocks.readTransaction.mockResolvedValue({ state: 'FAILED' })
    expect((await complete()).ok).toBe(false)
    expect(mocks.completeTransactionOnline).not.toHaveBeenCalled()
  })

  it('une erreur de synchronisation ne bloque pas une expédition déjà encaissée', async () => {
    mocks.readTransaction.mockResolvedValue({ state: 'FULFILL' })
    mocks.syncPaymentTransaction.mockRejectedValue(new Error('base indisponible'))
    expect(await complete()).toEqual({ ok: true, detail: 'encaissee' })
  })
})
