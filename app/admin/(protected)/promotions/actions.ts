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
  revalidatePath('/admin/categories')
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

export type ProductPostPromoAction = {
  productId: string
  action: 'KEEP' | 'ARCHIVE' | 'CHANGE_CATEGORY'
  newCategoryId?: string
}

export async function deletePromotion(
  id: string,
  options?: {
    deleteAllWithSameName?: boolean
    productActions?: ProductPostPromoAction[]
    archiveProduct?: boolean
  }
) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  try {
    const promo = await prisma.promotion.findUnique({
      where: { id },
      select: { id: true, name: true, productId: true },
    })

    if (!promo) return { error: 'Promotion introuvable' }

    // Déterminer la liste des promotions à supprimer
    let promoIds = [promo.id]
    if (options?.deleteAllWithSameName) {
      const sameNamePromos = await prisma.promotion.findMany({
        where: { name: promo.name },
        select: { id: true },
      })
      promoIds = sameNamePromos.map((p) => p.id)
    }

    // Traitement des actions spécifiques par produit
    if (options?.productActions && options.productActions.length > 0) {
      for (const item of options.productActions) {
        if (item.action === 'ARCHIVE') {
          await prisma.product.update({
            where: { id: item.productId },
            data: { archived: true, active: false },
          })
        } else if (item.action === 'CHANGE_CATEGORY' && item.newCategoryId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { categoryId: item.newCategoryId },
          })
        }
      }
    } else if (options?.archiveProduct && promo.productId) {
      await prisma.product.update({
        where: { id: promo.productId },
        data: { archived: true, active: false },
      })
    }

    await prisma.promotion.deleteMany({
      where: { id: { in: promoIds } },
    })
    revalidate()
    return { ok: true }
  } catch (err: any) {
    return { error: err.message || 'Impossible de supprimer la promotion' }
  }
}
