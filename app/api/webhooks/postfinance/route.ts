import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { readPostFinanceConfig } from '@/lib/payments/config'
import { describePostFinanceError, verifyWebhookSignature } from '@/lib/payments/postfinance'
import { syncPaymentTransaction, type SyncResult } from '@/lib/payments/sync'

/**
 * Webhook PostFinance Checkout (écouteur sur l'entité Transaction).
 *
 * 1. Signature ECDSA obligatoire (en-tête x-signature), vérifiée sur le corps
 *    brut : sans elle, 401 et rien n'est lu.
 * 2. Déduplication par eventId, puis relecture de la transaction par l'API :
 *    l'état annoncé dans la charge n'est jamais cru sur parole.
 * 3. Réponse 200 dès que le message est authentique, même s'il ne concerne pas
 *    cette base : une suite d'erreurs ferait désactiver l'écouteur par
 *    PostFinance. Seule une panne passagère (base, API) répond 503, pour que
 *    PostFinance réessaie plus tard.
 *
 * Les journaux ne contiennent que des identifiants et des états, jamais la
 * charge ni les en-têtes.
 */

export const dynamic = 'force-dynamic'

const payloadSchema = z.object({
  eventId: z.number().int().positive(),
  entityId: z.number().int().positive(),
  listenerEntityTechnicalName: z.string(),
  spaceId: z.number().int().positive(),
  state: z.string().optional(),
})

function outcomeLabel(result: SyncResult): string {
  switch (result.outcome) {
    case 'ignoree':
      return `ignorée : ${result.detail}`
    case 'payee':
      return result.newlyPaid ? `${result.numero} payée` : `${result.numero} déjà payée`
    case 'anomalie':
      return `${result.numero} : anomalie, voir le journal`
    default:
      return `${result.numero} : ${result.state}`
  }
}

export async function POST(request: NextRequest) {
  const config = readPostFinanceConfig()
  if (!config) {
    console.error('Webhook PostFinance reçu mais PostFinance Checkout non configuré')
    return NextResponse.json({ error: 'Non configuré' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')
  if (!signature) {
    console.warn('Webhook PostFinance rejeté : signature absente')
    return NextResponse.json({ error: 'Signature absente' }, { status: 401 })
  }

  let authentic: boolean
  try {
    authentic = await verifyWebhookSignature(signature, rawBody)
  } catch (error) {
    console.error('Webhook PostFinance : vérification impossible', {
      erreur: await describePostFinanceError(error),
    })
    return NextResponse.json({ error: 'Vérification indisponible' }, { status: 503 })
  }
  if (!authentic) {
    console.warn('Webhook PostFinance rejeté : signature invalide')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  let payload: z.infer<typeof payloadSchema>
  try {
    payload = payloadSchema.parse(JSON.parse(rawBody))
  } catch {
    console.warn('Webhook PostFinance signé mais illisible : ignoré')
    return NextResponse.json({ statut: 'ignoré' })
  }

  if (payload.spaceId !== config.spaceId || payload.listenerEntityTechnicalName !== 'Transaction') {
    console.info('Webhook PostFinance ignoré', {
      entite: payload.listenerEntityTechnicalName,
      autreSpace: payload.spaceId !== config.spaceId,
    })
    return NextResponse.json({ statut: 'ignoré' })
  }

  const eventId = BigInt(payload.eventId)
  try {
    const known = await prisma.paymentWebhookEvent.findUnique({ where: { eventId } })
    if (known?.processedAt) {
      return NextResponse.json({ statut: 'déjà traité' })
    }
    if (!known) {
      try {
        await prisma.paymentWebhookEvent.create({
          data: {
            eventId,
            entityId: BigInt(payload.entityId),
            entityName: payload.listenerEntityTechnicalName,
            state: payload.state?.slice(0, 40) ?? null,
          },
        })
      } catch (error) {
        // Même notification reçue deux fois en parallèle : le traitement,
        // idempotent, peut se dérouler deux fois sans effet de bord.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error
        }
      }
    }

    const result = await syncPaymentTransaction(payload.entityId, 'webhook')
    const outcome = outcomeLabel(result)
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: { processedAt: new Date(), outcome: outcome.slice(0, 200) },
    })
    console.info('Webhook PostFinance traité', {
      eventId: payload.eventId,
      transaction: payload.entityId,
      etat: payload.state,
      resultat: result.outcome,
    })
    return NextResponse.json({ statut: 'traité' })
  } catch (error) {
    console.error('Webhook PostFinance : traitement interrompu, PostFinance réessaiera', {
      eventId: payload.eventId,
      transaction: payload.entityId,
      erreur: await describePostFinanceError(error),
    })
    return NextResponse.json({ error: 'Traitement indisponible' }, { status: 503 })
  }
}
