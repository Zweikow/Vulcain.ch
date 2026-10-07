'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { PromoType } from '@prisma/client'

const promoSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  badgeText: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  type: z.nativeEnum(PromoType),
  buyQuantity: z.coerce.number().int().min(1).nullable().optional(),
  getFreeQuantity: z.coerce.number().int().min(1).nullable().optional(),
  discountPercent: z.coerce.number().int().min(1).max(100).nullable().optional(),
  discountCents: z.coerce.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
  productId: z.string().min(1, 'Produit requis'),
})

export type PromoInput = z.infer<typeof promoSchema>

function revalidate() {
  revalidatePath('/admin/promotions')
  revalidatePath('/admin/produits')
  revalidatePath('/')
  revalidatePath('/api/commandes')
}

export async function createPromotion(input: PromoInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = promoSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? 'Données invalides' }
  }

  try {
    const promo = await prisma.promotion.create({
      data: parsed.data,
    })
    revalidate()
    return { ok: true, promo }
  } catch (err: any) {
    return { error: err.message || 'Impossible de créer la promotion' }
  }
}

export async function updatePromotion(id: string, input: PromoInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = promoSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? 'Données invalides' }
  }

  try {
    const promo = await prisma.promotion.update({
      where: { id },
      data: parsed.data,
    })
    revalidate()
    return { ok: true, promo }
  } catch (err: any) {
    return { error: err.message || 'Impossible de modifier la promotion' }
  }
}

export async function togglePromotionActive(id: string, active: boolean) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  try {
    await prisma.promotion.update({
      where: { id },
      data: { active },
    })
    revalidate()
    return { ok: true }
  } catch (err: any) {
    return { error: err.message || 'Impossible de basculer la promotion' }
  }
}

export async function deletePromotion(id: string, options?: { archiveProduct?: boolean }) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  try {
    const promo = await prisma.promotion.findUnique({
      where: { id },
      select: { id: true, productId: true },
    })

    if (!promo) return { error: 'Promotion introuvable' }

    if (options?.archiveProduct && promo.productId) {
      await prisma.product.update({
        where: { id: promo.productId },
        data: { archived: true, active: false },
      })
    }

    await prisma.promotion.delete({
      where: { id },
    })
    revalidate()
    return { ok: true }
  } catch (err: any) {
    return { error: err.message || 'Impossible de supprimer la promotion' }
  }
}
