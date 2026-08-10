import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod'
import { issueInvoice } from '@/lib/invoices'

const patchSchema = z.object({
  status: z.enum(['A_TRAITER', 'EN_PREPARATION', 'EXPEDIEE']),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  // Montants en centimes entiers — sérialisables tels quels, aucune conversion.
  return NextResponse.json(order)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const result = patchSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 422 })
  }

  const newStatus = result.data.status as OrderStatus
  const shippedAt = newStatus === OrderStatus.EXPEDIEE ? new Date() : null

  let order
  try {
    order = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
        ...(shippedAt !== null ? { shippedAt } : {}),
      },
      select: { id: true, status: true, shippedAt: true },
    })
  } catch (e: unknown) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }
    throw e
  }

  // Une commande expédiée a forcément une facture émise (idempotent).
  if (newStatus === OrderStatus.EXPEDIEE) await issueInvoice(id)

  return NextResponse.json(order)
}
