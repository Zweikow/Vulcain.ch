import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod'
import { AuditAction } from '@prisma/client'
import { issueInvoice } from '@/lib/invoices'
import { notifyOrderShipped } from '@/lib/notifications'
import { recordAudit } from '@/lib/audit'
import { STATUS_LABELS } from '@/components/admin/StatusBadge'

const patchSchema = z.object({
  status: z.enum(['A_TRAITER', 'EN_PREPARATION', 'EXPEDIEE']).optional(),
  assignedToId: z.string().nullable().optional(),
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

  const { status, assignedToId } = result.data

  // If assignedToId is provided and status is not explicitly sent, default to EN_PREPARATION
  let newStatus = status
  if (assignedToId !== undefined && !status) {
    newStatus = OrderStatus.EN_PREPARATION
  }

  const shippedAt = newStatus === OrderStatus.EXPEDIEE ? new Date() : null

  let order
  try {
    order = await prisma.order.update({
      where: { id },
      data: {
        ...(newStatus ? { status: newStatus } : {}),
        ...(shippedAt !== null ? { shippedAt } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
      select: {
        id: true,
        numero: true,
        status: true,
        shippedAt: true,
        assignedTo: { select: { name: true } },
      },
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

  if (newStatus) {
    await recordAudit(
      AuditAction.STATUT_MODIFIE,
      { type: 'COMMANDE', id, label: order.numero },
      STATUS_LABELS[newStatus]
    )

    if (newStatus === OrderStatus.EXPEDIEE) {
      const invoiceNumber = await issueInvoice(id)
      if (invoiceNumber) {
        await recordAudit(
          AuditAction.FACTURE_EMISE,
          { type: 'COMMANDE', id, label: order.numero },
          invoiceNumber
        )
      }
      await notifyOrderShipped(id)
    }
  }

  return NextResponse.json(order)
}
