import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import { ResponseError, WebhookEncryptionKeysService } from 'postfinancecheckout'
import { verifyWebhookSignature } from '@/lib/payments/postfinance'

// Identifiants factices : la clé publique est servie par le test, aucun appel réseau
process.env.PFC_SPACE_ID = '1'
process.env.PFC_USER_ID = '2'
process.env.PFC_AUTH_KEY = Buffer.from('cle-de-test-factice').toString('base64')

// Paire ECDSA générée pour le test, au format attendu par le SDK (SPKI DER en base64)
const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const PUBLIC_KEY = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
const otherPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })

const signWith = (content: string, key = pair.privateKey) =>
  sign('sha256', Buffer.from(content), key).toString('base64')
const header = (signature: string, keyId: string, algorithm = 'SHA256withECDSA') =>
  `algorithm=${algorithm}, keyId=${keyId}, signature=${signature}`

const body = JSON.stringify({
  eventId: 138833842,
  entityId: 63762876,
  listenerEntityId: 1472041829003,
  listenerEntityTechnicalName: 'Transaction',
  spaceId: 1,
  webhookListenerId: 285874,
  timestamp: '2026-10-28T14:20:53+0000',
  state: 'FULFILL',
})

const fetchKey = vi.spyOn(WebhookEncryptionKeysService.prototype, 'getWebhooksEncryptionKeysId')

let keyCounter = 0
const freshKeyId = () => `0000000${++keyCounter}-0000-4000-8000-000000000000`

describe('Signature des webhooks PostFinance (ECDSA réelle)', () => {
  beforeEach(() => {
    fetchKey.mockReset()
    fetchKey.mockResolvedValue(PUBLIC_KEY)
  })

  it('accepte une charge signée par la clé annoncée', async () => {
    const keyId = freshKeyId()
    await expect(verifyWebhookSignature(header(signWith(body), keyId), body)).resolves.toBe(true)
    expect(fetchKey).toHaveBeenCalledWith({ id: keyId })
  })

  it('garde la clé publique en mémoire', async () => {
    const keyId = freshKeyId()
    await verifyWebhookSignature(header(signWith(body), keyId), body)
    await verifyWebhookSignature(header(signWith(body), keyId), body)
    expect(fetchKey).toHaveBeenCalledTimes(1)
  })

  it('rejette une charge modifiée après signature', async () => {
    const tampered = body.replace('"FULFILL"', '"FAILED"')
    await expect(
      verifyWebhookSignature(header(signWith(body), freshKeyId()), tampered)
    ).resolves.toBe(false)
  })

  it('rejette une signature faite avec une autre clé', async () => {
    const forged = signWith(body, otherPair.privateKey)
    await expect(verifyWebhookSignature(header(forged, freshKeyId()), body)).resolves.toBe(false)
  })

  it('rejette un algorithme inattendu ou un en-tête mal formé', async () => {
    const sig = signWith(body)
    await expect(
      verifyWebhookSignature(header(sig, freshKeyId(), 'SHA1withRSA'), body)
    ).resolves.toBe(false)
    await expect(verifyWebhookSignature('n importe quoi', body)).resolves.toBe(false)
    await expect(
      verifyWebhookSignature(`keyId=${freshKeyId()}, signature=${sig}`, body)
    ).resolves.toBe(false)
    expect(fetchKey).not.toHaveBeenCalled()
  })

  it('rejette une signature illisible', async () => {
    await expect(verifyWebhookSignature(header('AAAA', freshKeyId()), body)).resolves.toBe(false)
  })

  it('rejette une clé inconnue de PostFinance (404)', async () => {
    fetchKey.mockRejectedValueOnce(new ResponseError(new Response('', { status: 404 })))
    await expect(verifyWebhookSignature(header(signWith(body), freshKeyId()), body)).resolves.toBe(
      false
    )
  })

  it('remonte une panne de l’API (le webhook répondra 503, PostFinance réessaiera)', async () => {
    fetchKey.mockRejectedValueOnce(new ResponseError(new Response('', { status: 500 })))
    await expect(
      verifyWebhookSignature(header(signWith(body), freshKeyId()), body)
    ).rejects.toBeInstanceOf(ResponseError)
  })
})
