'use server'

import { revalidatePath } from 'next/cache'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Flux à trois statuts : À traiter → En préparation → Expédiée (DESIGN.md §3).
export async function advanceStatus(orderId: string) {
  const session = await auth()
  if (!session) return

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.status === OrderStatus.EXPEDIEE) return

  await prisma.order.update({
    where: { id: orderId },
    data:
      order.status === OrderStatus.A_TRAITER
        ? { status: OrderStatus.EN_PREPARATION }
        : { status: OrderStatus.EXPEDIEE, shippedAt: new Date() },
  })
  revalidatePath('/admin/preparation')
  revalidatePath('/admin')
}
