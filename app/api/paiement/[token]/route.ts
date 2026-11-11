import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { getPaymentRatelimit } from '@/lib/ratelimit'
import { paymentPagePath, startOnlinePayment } from '@/lib/payments/checkout'

const TOKEN = /^[A-Za-z0-9_-]{32}$/

/**
 * Relance du paiement en ligne depuis la page de la commande (simple
 * formulaire HTML) : rouvre la Payment Page de la tentative en cours, ou en
 * crée une nouvelle après un refus ou un abandon. La commande n'est jamais
 * recréée, et le montant reste celui enregistré en base.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!TOKEN.test(token)) {
    return NextResponse.json({ error: 'Lien de paiement invalide' }, { status: 404 })
  }
  const backToOrder = (motif: string) =>
    NextResponse.redirect(`${getSiteUrl()}${paymentPagePath(token)}?motif=${motif}`, 303)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
  const { success: withinLimit } = await getPaymentRatelimit().limit(ip)
  if (!withinLimit) return backToOrder('trop_de_tentatives')

  const order = await prisma.order.findUnique({
    where: { paymentToken: token },
    select: { id: true },
  })
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const result = await startOnlinePayment(order.id)
  if (result.ok) return NextResponse.redirect(result.paymentPageUrl, 303)
  return backToOrder(result.reason)
}
