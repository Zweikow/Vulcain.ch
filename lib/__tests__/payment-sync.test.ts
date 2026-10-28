import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TransactionSnapshot } from '@/lib/payments/postfinance'

// Base factice en mémoire : reproduit les clauses conditionnelles (updateMany)
// dont dépend l'idempotence.
type Attempt = {
  id: string
  orderId: string
  transactionId: bigint
  state: string
  amountCents: number
  [key: string]: unknown
}
type Order = {
  id: string
  numero: string
  status: string
  totalCents: number
  paidAt: Date | null
  paymentMethod: string | null
}

const mocks = vi.hoisted(() => ({
  attempts: [] as Attempt[],
  orders: new Map<string, Order>(),
  readTransaction: vi.fn(),
  notifyOrderPlaced: vi.fn(),
  recordAudit: vi.fn(),
  recordSystemAudit: vi.fn(),
}))

vi.mock('@/lib/payments/postfinance', () => ({ readTransaction: mocks.readTransaction }))
vi.mock('@/lib/notifications', () => ({ notifyOrderPlaced: mocks.notifyOrderPlaced }))
vi.mock('@/lib/audit', () => ({
  recordAudit: mocks.recordAudit,
  recordSystemAudit: mocks.recordSystemAudit,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentTransaction: {
      findUnique: async ({ where }: { where: { transactionId: bigint } }) => {
        const a = mocks.attempts.find((x) => x.transactionId === where.transactionId)
        if (!a) return null
        const o = mocks.orders.get(a.orderId)!
        return {
          id: a.id,
          state: a.state,
          amountCents: a.amountCents,
          order: { id: o.id, numero: o.numero, status: o.status, totalCents: o.totalCents },
        }
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; state: { notIn: string[] } }
        data: Record<string, unknown>
      }) => {
        const a = mocks.attempts.find((x) => x.id === where.id)
        if (!a || where.state.notIn.includes(a.state)) return { count: 0 }
        Object.assign(a, data)
        return { count: 1 }
      },
      count: async ({
        where,
      }: {
        where: { orderId: string; id: { not: string }; state: string }
      }) =>
        mocks.attempts.filter(
          (x) => x.orderId === where.orderId && x.id !== where.id.not && x.state === where.state
        ).length,
    },
    order: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; status: string; paidAt: null }
        data: Partial<Order>
      }) => {
        const o = mocks.orders.get(where.id)
        if (!o || o.status !== where.status || o.paidAt !== null) return { count: 0 }
        Object.assign(o, data)
        return { count: 1 }
      },
    },
  },
}))

import { syncPaymentTransaction } from '@/lib/payments/sync'

function remote(state: string, overrides: Partial<TransactionSnapshot> = {}): TransactionSnapshot {
  return {
    id: 1001,
    state,
    currency: 'CHF',
    authorizationAmountCents: 7190,
    paymentMethod: 'TWINT',
    failureMessage: null,
    authorizedOn: new Date('2026-10-28T10:00:00Z'),
    completedOn:
      state === 'FULFILL' || state === 'COMPLETED' ? new Date('2026-10-28T10:00:05Z') : null,
    failedOn: state === 'FAILED' ? new Date('2026-10-28T10:00:05Z') : null,
    decisionOn: state === 'FULFILL' ? new Date('2026-10-28T10:00:06Z') : null,
    ...overrides,
  }
}

function seed(orderStatus = 'EN_ATTENTE_PAIEMENT') {
  mocks.orders.clear()
  mocks.attempts.length = 0
  mocks.orders.set('o1', {
    id: 'o1',
    numero: 'CMD-2026-0042',
    status: orderStatus,
    totalCents: 7190,
    paidAt: null,
    paymentMethod: null,
  })
  mocks.attempts.push({
    id: 'a1',
    orderId: 'o1',
    transactionId: BigInt(1001),
    state: 'PENDING',
    amountCents: 7190,
  })
}

const auditActions = () => mocks.recordSystemAudit.mock.calls.map((c) => c[0])

describe('Synchronisation d’une transaction PostFinance', () => {
  beforeEach(() => {
    seed()
    mocks.readTransaction.mockReset()
    mocks.notifyOrderPlaced.mockReset()
    mocks.recordAudit.mockReset()
    mocks.recordSystemAudit.mockReset()
  })

  it('FULFILL : commande payée, passée À traiter, emails envoyés une fois', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')

    expect(result).toMatchObject({ outcome: 'payee', newlyPaid: true })
    const order = mocks.orders.get('o1')!
    expect(order.status).toBe('A_TRAITER')
    expect(order.paidAt).toEqual(new Date('2026-10-28T10:00:05Z'))
    expect(order.paymentMethod).toBe('Paiement en ligne (TWINT)')
    expect(mocks.attempts[0].state).toBe('FULFILL')
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
    expect(auditActions()).toEqual(['PAIEMENT_CONFIRME'])
  })

  it('idempotent : rejouer la notification ne renvoie ni email ni trace', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    await syncPaymentTransaction(BigInt(1001), 'webhook')
    const replay = await syncPaymentTransaction(BigInt(1001), 'webhook')

    expect(replay).toMatchObject({ outcome: 'payee', newlyPaid: false })
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
    expect(auditActions()).toEqual(['PAIEMENT_CONFIRME'])
  })

  it('idempotent : deux notifications simultanées ne paient la commande qu’une fois', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    const results = await Promise.all([
      syncPaymentTransaction(BigInt(1001), 'webhook'),
      syncPaymentTransaction(BigInt(1001), 'webhook'),
    ])
    expect(results.filter((r) => r.outcome === 'payee' && r.newlyPaid)).toHaveLength(1)
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
  })

  it('COMPLETED sans FULFILL : la commande attend', async () => {
    mocks.readTransaction.mockResolvedValue(remote('COMPLETED'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result).toMatchObject({ outcome: 'en_cours', state: 'COMPLETED' })
    expect(mocks.orders.get('o1')!.status).toBe('EN_ATTENTE_PAIEMENT')
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
  })

  it('FAILED : commande conservée en attente, échec tracé une seule fois', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FAILED', { failureMessage: 'Carte refusée' }))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    await syncPaymentTransaction(BigInt(1001), 'webhook')

    expect(result).toMatchObject({ outcome: 'echouee', state: 'FAILED' })
    expect(mocks.orders.get('o1')!.status).toBe('EN_ATTENTE_PAIEMENT')
    expect(mocks.attempts[0].failureReason).toBe('Carte refusée')
    expect(auditActions()).toEqual(['PAIEMENT_ECHOUE'])
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
  })

  it('montant différent de la commande : anomalie, commande non validée', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL', { authorizationAmountCents: 100 }))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    await syncPaymentTransaction(BigInt(1001), 'webhook')

    expect(result.outcome).toBe('anomalie')
    expect(mocks.orders.get('o1')!.status).toBe('EN_ATTENTE_PAIEMENT')
    expect(mocks.orders.get('o1')!.paidAt).toBeNull()
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
    expect(auditActions()).toEqual(['PAIEMENT_ANOMALIE'])
  })

  it('devise autre que CHF : anomalie', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL', { currency: 'EUR' }))
    expect((await syncPaymentTransaction(BigInt(1001), 'webhook')).outcome).toBe('anomalie')
    expect(mocks.orders.get('o1')!.paidAt).toBeNull()
  })

  it('paiement reçu sur une commande annulée : anomalie, remboursement à faire', async () => {
    seed('ANNULEE')
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result.outcome).toBe('anomalie')
    expect(mocks.orders.get('o1')!.status).toBe('ANNULEE')
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
  })

  it('second paiement réussi pour une commande déjà payée : anomalie', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    await syncPaymentTransaction(BigInt(1001), 'webhook')
    mocks.attempts.push({
      id: 'a2',
      orderId: 'o1',
      transactionId: BigInt(1002),
      state: 'PENDING',
      amountCents: 7190,
    })
    const result = await syncPaymentTransaction(BigInt(1002), 'webhook')
    expect(result.outcome).toBe('anomalie')
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
    expect(auditActions()).toEqual(['PAIEMENT_CONFIRME', 'PAIEMENT_ANOMALIE'])
  })

  it('DECLINE : ne pas expédier, anomalie tracée', async () => {
    mocks.readTransaction.mockResolvedValue(remote('DECLINE'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result.outcome).toBe('anomalie')
    expect(mocks.orders.get('o1')!.status).toBe('EN_ATTENTE_PAIEMENT')
  })

  it('un état final enregistré n’est jamais écrasé par une notification plus ancienne', async () => {
    mocks.readTransaction.mockResolvedValueOnce(remote('FULFILL'))
    await syncPaymentTransaction(BigInt(1001), 'webhook')
    mocks.readTransaction.mockResolvedValueOnce(remote('COMPLETED'))
    await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(mocks.attempts[0].state).toBe('FULFILL')
  })

  it('transaction inconnue de cette base : ignorée sans appel à PostFinance', async () => {
    const result = await syncPaymentTransaction(BigInt(999), 'webhook')
    expect(result.outcome).toBe('ignoree')
    expect(mocks.readTransaction).not.toHaveBeenCalled()
  })

  it('vérification depuis l’admin : trace au nom de l’utilisateur connecté', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    await syncPaymentTransaction(BigInt(1001), 'admin')
    expect(mocks.recordAudit).toHaveBeenCalledTimes(1)
    expect(mocks.recordSystemAudit).not.toHaveBeenCalled()
  })
})
