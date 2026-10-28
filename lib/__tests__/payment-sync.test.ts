import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TransactionSnapshot } from '@/lib/payments/postfinance'

// Mapping factice : les vrais IDs sont propres à chaque space
Object.assign(process.env, {
  PFC_PAYMENT_MODES: JSON.stringify({
    CARTE: [11],
    POSTFINANCE_CARD: [12],
    POSTFINANCE_PAY: [13],
    TWINT: [14],
    FACTURE: [15],
  }),
})

// Base factice en mémoire : reproduit les clauses conditionnelles (updateMany)
// dont dépendent l'idempotence et la double vérification.
type Row = Record<string, unknown>
type Attempt = Row & { id: string; orderId: string; transactionId: bigint; state: string }
type Order = Row & { id: string; status: string; paidAt: Date | null }

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key]
    if (expected === null) return actual === null || actual === undefined
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      const cond = expected as Row
      if ('notIn' in cond) return !(cond.notIn as unknown[]).includes(actual)
      if ('not' in cond) return cond.not === null ? actual != null : actual !== cond.not
    }
    return actual === expected
  })
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
          paymentChoice: a.paymentChoice ?? null,
          supersededAt: a.supersededAt ?? null,
          order: {
            id: o.id,
            numero: o.numero,
            status: o.status,
            totalCents: o.totalCents,
            paymentChoice: o.paymentChoice ?? null,
          },
        }
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = mocks.attempts.filter((a) => matches(a, where))
        rows.forEach((a) => Object.assign(a, data))
        return { count: rows.length }
      },
      count: async ({ where }: { where: Row }) =>
        mocks.attempts.filter((a) => matches(a, where)).length,
    },
    order: {
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = [...mocks.orders.values()].filter((o) => matches(o, where))
        rows.forEach((o) => Object.assign(o, data))
        return { count: rows.length }
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
    paymentMethodConfigurationId: 14,
    failureMessage: null,
    authorizedOn: new Date('2026-10-28T10:00:00Z'),
    completedOn:
      state === 'FULFILL' || state === 'COMPLETED' ? new Date('2026-10-28T10:00:05Z') : null,
    failedOn: state === 'FAILED' ? new Date('2026-10-28T10:00:05Z') : null,
    decisionOn: state === 'FULFILL' ? new Date('2026-10-28T10:00:06Z') : null,
    ...overrides,
  }
}

function seed(orderOverrides: Row = {}, attemptOverrides: Row = {}) {
  mocks.orders.clear()
  mocks.attempts.length = 0
  mocks.orders.set('o1', {
    id: 'o1',
    numero: 'CMD-2026-0042',
    status: 'EN_ATTENTE_PAIEMENT',
    totalCents: 7190,
    paidAt: null,
    paymentMethod: null,
    paymentChoice: null,
    invoiceAcceptedAt: null,
    invoiceUnavailable: false,
    ...orderOverrides,
  })
  mocks.attempts.push({
    id: 'a1',
    orderId: 'o1',
    transactionId: BigInt(1001),
    state: 'PENDING',
    amountCents: 7190,
    paymentChoice: null,
    supersededAt: null,
    ...attemptOverrides,
  })
}

const auditActions = () => mocks.recordSystemAudit.mock.calls.map((c) => c[0])
const order = () => mocks.orders.get('o1')!

beforeEach(() => {
  seed()
  mocks.readTransaction.mockReset()
  mocks.notifyOrderPlaced.mockReset()
  mocks.recordAudit.mockReset()
  mocks.recordSystemAudit.mockReset()
})

describe('Synchronisation d’une transaction PostFinance', () => {
  it('FULFILL : commande payée, passée À traiter, emails envoyés une fois', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')

    expect(result).toMatchObject({ outcome: 'payee', newlyPaid: true })
    expect(order().status).toBe('A_TRAITER')
    expect(order().paidAt).toEqual(new Date('2026-10-28T10:00:05Z'))
    expect(order().paymentMethod).toBe('Paiement en ligne (TWINT)')
    expect(mocks.attempts[0].state).toBe('FULFILL')
    expect(mocks.attempts[0].paymentMethodConfigurationId).toBe(BigInt(14))
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
    expect(order().status).toBe('EN_ATTENTE_PAIEMENT')
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
  })

  it('FAILED : commande conservée en attente, échec tracé une seule fois', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FAILED', { failureMessage: 'Carte refusée' }))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    await syncPaymentTransaction(BigInt(1001), 'webhook')

    expect(result).toMatchObject({ outcome: 'echouee', state: 'FAILED' })
    expect(order().status).toBe('EN_ATTENTE_PAIEMENT')
    expect(mocks.attempts[0].failureReason).toBe('Carte refusée')
    expect(auditActions()).toEqual(['PAIEMENT_ECHOUE'])
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
  })

  it('montant différent de la commande : à vérifier, jamais confirmée en silence', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL', { authorizationAmountCents: 100 }))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    await syncPaymentTransaction(BigInt(1001), 'webhook')

    expect(result.outcome).toBe('a_verifier')
    expect(order().status).toBe('A_VERIFIER')
    expect(order().paidAt).toBeNull()
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
    expect(auditActions()).toEqual(['PAIEMENT_A_VERIFIER'])
  })

  it('devise autre que CHF : à vérifier', async () => {
    mocks.readTransaction.mockResolvedValue(remote('FULFILL', { currency: 'EUR' }))
    expect((await syncPaymentTransaction(BigInt(1001), 'webhook')).outcome).toBe('a_verifier')
    expect(order().paidAt).toBeNull()
  })

  it('paiement reçu sur une commande annulée : anomalie, remboursement à faire', async () => {
    seed({ status: 'ANNULEE' })
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result.outcome).toBe('anomalie')
    expect(order().status).toBe('ANNULEE')
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
      paymentChoice: null,
      supersededAt: null,
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
    expect(order().status).toBe('EN_ATTENTE_PAIEMENT')
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

describe('Double vérification du mode et de la transaction active (lot B)', () => {
  it('mode utilisé conforme au mode choisi : commande payée', async () => {
    seed({ paymentChoice: 'TWINT' }, { paymentChoice: 'TWINT' })
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    expect(await syncPaymentTransaction(BigInt(1001), 'webhook')).toMatchObject({
      outcome: 'payee',
      newlyPaid: true,
    })
  })

  it('mode utilisé différent du mode choisi : à vérifier, aucun email', async () => {
    seed({ paymentChoice: 'TWINT' }, { paymentChoice: 'TWINT' })
    mocks.readTransaction.mockResolvedValue(
      remote('FULFILL', { paymentMethod: 'Visa', paymentMethodConfigurationId: 11 })
    )
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result).toMatchObject({ outcome: 'a_verifier' })
    expect(result.outcome === 'a_verifier' && result.detail).toContain('Carte de crédit/débit')
    expect(order().status).toBe('A_VERIFIER')
    expect(order().paidAt).toBeNull()
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
    expect(auditActions()).toEqual(['PAIEMENT_A_VERIFIER'])
  })

  it('mode utilisé inconnu de PostFinance (configuration absente) : à vérifier', async () => {
    seed({ paymentChoice: 'CARTE' }, { paymentChoice: 'CARTE' })
    mocks.readTransaction.mockResolvedValue(
      remote('FULFILL', { paymentMethodConfigurationId: null })
    )
    expect((await syncPaymentTransaction(BigInt(1001), 'webhook')).outcome).toBe('a_verifier')
  })

  it('transaction remplacée mais payée, commande encore en attente : à vérifier', async () => {
    seed({ paymentChoice: 'CARTE' }, { paymentChoice: 'TWINT', supersededAt: new Date() })
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result).toMatchObject({ outcome: 'a_verifier' })
    expect(order().status).toBe('A_VERIFIER')
    expect(mocks.notifyOrderPlaced).not.toHaveBeenCalled()
  })

  it('transaction remplacée payée après confirmation de la commande : remboursement signalé', async () => {
    seed(
      { status: 'A_TRAITER', paidAt: new Date(), paymentChoice: 'CARTE' },
      { paymentChoice: 'TWINT', supersededAt: new Date() }
    )
    mocks.readTransaction.mockResolvedValue(remote('FULFILL'))
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result.outcome).toBe('anomalie')
    expect(order().status).toBe('A_TRAITER')
    expect(auditActions()).toEqual(['PAIEMENT_ANOMALIE'])
  })

  it('facture utilisée sans avoir été choisie (parcours sans choix) : à vérifier', async () => {
    mocks.readTransaction.mockResolvedValue(
      remote('AUTHORIZED', { paymentMethodConfigurationId: 15 })
    )
    expect((await syncPaymentTransaction(BigInt(1001), 'webhook')).outcome).toBe('a_verifier')
  })
})

describe('Facture PowerPay (lot B)', () => {
  const invoiceOrder = () =>
    seed(
      { paymentChoice: 'FACTURE', totalCents: 6300 },
      { paymentChoice: 'FACTURE', amountCents: 6300 }
    )
  const accepted = (state = 'AUTHORIZED') =>
    remote(state, {
      authorizationAmountCents: 6300,
      paymentMethod: 'Facture (PowerPay)',
      paymentMethodConfigurationId: 15,
    })

  it('solvabilité acceptée (AUTHORIZED) : acceptée sur facture, distincte de payée', async () => {
    invoiceOrder()
    mocks.readTransaction.mockResolvedValue(accepted())
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result).toMatchObject({ outcome: 'acceptee', newlyAccepted: true })
    expect(order().status).toBe('A_TRAITER')
    expect(order().invoiceAcceptedAt).toEqual(new Date('2026-10-28T10:00:00Z'))
    expect(order().paidAt).toBeNull()
    expect(order().paymentMethod).toBe('Facture (PowerPay)')
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
    expect(auditActions()).toEqual(['FACTURE_ACCEPTEE'])
  })

  it('rejeu de l’acceptation : ni second email ni seconde trace', async () => {
    invoiceOrder()
    mocks.readTransaction.mockResolvedValue(accepted())
    await syncPaymentTransaction(BigInt(1001), 'webhook')
    const replay = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(replay).toMatchObject({ outcome: 'acceptee', newlyAccepted: false })
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
  })

  it('encaissement à l’expédition (FULFILL) : facture réglée par MF Group', async () => {
    invoiceOrder()
    mocks.readTransaction.mockResolvedValueOnce(accepted())
    await syncPaymentTransaction(BigInt(1001), 'webhook')
    mocks.readTransaction.mockResolvedValueOnce(accepted('FULFILL'))
    await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(order().paidAt).toEqual(new Date('2026-10-28T10:00:05Z'))
    expect(mocks.notifyOrderPlaced).toHaveBeenCalledTimes(1)
  })

  it('refus ou abandon (FAILED) : facture retirée pour la commande, commande conservée', async () => {
    invoiceOrder()
    mocks.readTransaction.mockResolvedValue(
      remote('FAILED', { paymentMethodConfigurationId: null, failureMessage: 'Annulé' })
    )
    const result = await syncPaymentTransaction(BigInt(1001), 'webhook')
    expect(result).toMatchObject({ outcome: 'echouee' })
    expect(order().status).toBe('EN_ATTENTE_PAIEMENT')
    expect(order().invoiceUnavailable).toBe(true)
    expect(auditActions()).toEqual(['PAIEMENT_ECHOUE'])
  })

  it('montant facturé sans le supplément : à vérifier', async () => {
    invoiceOrder()
    mocks.readTransaction.mockResolvedValue(
      remote('AUTHORIZED', { authorizationAmountCents: 5800, paymentMethodConfigurationId: 15 })
    )
    expect((await syncPaymentTransaction(BigInt(1001), 'webhook')).outcome).toBe('a_verifier')
    expect(order().invoiceAcceptedAt).toBeNull()
  })
})
