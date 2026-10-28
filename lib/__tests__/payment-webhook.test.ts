import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  events: new Map<bigint, { processedAt: Date | null; outcome: string | null }>(),
  verifyWebhookSignature: vi.fn(),
  syncPaymentTransaction: vi.fn(),
}))

vi.mock('@/lib/payments/config', () => ({
  readPostFinanceConfig: () => ({ spaceId: 30140, userId: 1, authKey: 'factice' }),
}))
vi.mock('@/lib/payments/postfinance', () => ({
  verifyWebhookSignature: mocks.verifyWebhookSignature,
  describePostFinanceError: async () => 'erreur simulée',
}))
vi.mock('@/lib/payments/sync', () => ({
  syncPaymentTransaction: mocks.syncPaymentTransaction,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentWebhookEvent: {
      findUnique: async ({ where }: { where: { eventId: bigint } }) =>
        mocks.events.get(where.eventId) ?? null,
      create: async ({ data }: { data: { eventId: bigint } }) => {
        mocks.events.set(data.eventId, { processedAt: null, outcome: null })
      },
      update: async ({
        where,
        data,
      }: {
        where: { eventId: bigint }
        data: { processedAt: Date; outcome: string }
      }) => {
        mocks.events.set(where.eventId, { processedAt: data.processedAt, outcome: data.outcome })
      },
    },
  },
}))

import { POST } from '@/app/api/webhooks/postfinance/route'

function webhook(
  payload: Record<string, unknown>,
  signature: string | null = 'algorithm=SHA256withECDSA, keyId=test, signature=AAAA'
) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signature) headers.set('x-signature', signature)
  return new Request('https://dev.drinkcider.ch/api/webhooks/postfinance', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }) as unknown as NextRequest
}

const payload = (eventId: number, state = 'FULFILL', spaceId = 30140) => ({
  eventId,
  entityId: 63762876,
  listenerEntityId: 1472041829003,
  listenerEntityTechnicalName: 'Transaction',
  spaceId,
  webhookListenerId: 285874,
  timestamp: '2026-10-28T14:20:53+0000',
  state,
})

describe('Webhook PostFinance', () => {
  beforeEach(() => {
    mocks.events.clear()
    mocks.verifyWebhookSignature.mockReset().mockResolvedValue(true)
    mocks.syncPaymentTransaction
      .mockReset()
      .mockResolvedValue({
        outcome: 'payee',
        orderId: 'o1',
        numero: 'CMD-2026-0001',
        newlyPaid: true,
      })
  })

  it('rejette une requête sans signature, sans rien traiter', async () => {
    const res = await POST(webhook(payload(1), null))
    expect(res.status).toBe(401)
    expect(mocks.verifyWebhookSignature).not.toHaveBeenCalled()
    expect(mocks.syncPaymentTransaction).not.toHaveBeenCalled()
  })

  it('rejette une signature invalide, sans rien traiter', async () => {
    mocks.verifyWebhookSignature.mockResolvedValue(false)
    const res = await POST(webhook(payload(1)))
    expect(res.status).toBe(401)
    expect(mocks.syncPaymentTransaction).not.toHaveBeenCalled()
    expect(mocks.events.size).toBe(0)
  })

  it('vérifie la signature sur le corps brut reçu', async () => {
    await POST(webhook(payload(7)))
    const [, rawBody] = mocks.verifyWebhookSignature.mock.calls[0]
    expect(rawBody).toBe(JSON.stringify(payload(7)))
  })

  it('répond 503 si la signature ne peut pas être vérifiée (API indisponible)', async () => {
    mocks.verifyWebhookSignature.mockRejectedValue(new Error('réseau'))
    const res = await POST(webhook(payload(1)))
    expect(res.status).toBe(503)
    expect(mocks.syncPaymentTransaction).not.toHaveBeenCalled()
  })

  it('traite une notification authentique et relit la transaction', async () => {
    const res = await POST(webhook(payload(1)))
    expect(res.status).toBe(200)
    expect(mocks.syncPaymentTransaction).toHaveBeenCalledWith(63762876, 'webhook')
    expect(mocks.events.get(BigInt(1))?.processedAt).toBeInstanceOf(Date)
  })

  it('idempotent : la même notification rejouée n’est traitée qu’une fois', async () => {
    const first = await POST(webhook(payload(1)))
    const second = await POST(webhook(payload(1)))
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ statut: 'déjà traité' })
    expect(mocks.syncPaymentTransaction).toHaveBeenCalledTimes(1)
  })

  it('ignore (200) une notification d’un autre space', async () => {
    const res = await POST(webhook(payload(2, 'FULFILL', 99999)))
    expect(res.status).toBe(200)
    expect(mocks.syncPaymentTransaction).not.toHaveBeenCalled()
  })

  it('répond 503 sur panne passagère, puis traite au nouvel essai de PostFinance', async () => {
    mocks.syncPaymentTransaction.mockRejectedValueOnce(new Error('base indisponible'))
    const failed = await POST(webhook(payload(3)))
    expect(failed.status).toBe(503)
    expect(mocks.events.get(BigInt(3))?.processedAt).toBeNull()

    const retried = await POST(webhook(payload(3)))
    expect(retried.status).toBe(200)
    expect(mocks.syncPaymentTransaction).toHaveBeenCalledTimes(2)
    expect(mocks.events.get(BigInt(3))?.processedAt).toBeInstanceOf(Date)
  })

  it('une charge signée mais illisible est ignorée sans erreur', async () => {
    const res = await POST(webhook({ bonjour: 'monde' }))
    expect(res.status).toBe(200)
    expect(mocks.syncPaymentTransaction).not.toHaveBeenCalled()
  })
})
