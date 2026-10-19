'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { DiscountType } from '@prisma/client'
import { normalizePromoCode } from '@/lib/discount-codes'

const discountCodeSchema = z.object({
  code: z
    .string()
    .min(2, 'Le code doit contenir au moins 2 caractères')
    .max(50, 'Le code ne peut excéder 50 caractères')
    .transform((val) => normalizePromoCode(val)),
  description: z.string().max(500).nullable().optional(),
  type: z.nativeEnum(DiscountType),
  percentage: z.coerce
    .number()
    .int()
    .min(1, 'Le pourcentage doit être compris entre 1 et 100')
    .max(100, 'Le pourcentage ne peut excéder 100%')
    .nullable()
    .optional(),
  amountCents: z.coerce
    .number()
    .int()
    .min(1, 'Le montant doit être supérieur à 0')
    .nullable()
    .optional(),
  minSubtotalCents: z.coerce.number().int().min(0).nullable().optional(),
  maxUses: z.coerce.number().int().min(1).nullable().optional(),
  active: z.boolean().default(true),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
})

export type DiscountCodeInput = z.infer<typeof discountCodeSchema>

function revalidate() {
  revalidatePath('/admin/promotions')
  revalidatePath('/admin/codes-promo')
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/api/commandes')
}

export async function createDiscountCode(input: DiscountCodeInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = discountCodeSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? 'Données invalides' }
  }

  const {
    code,
    description,
    type,
    percentage,
    amountCents,
    minSubtotalCents,
    maxUses,
    active,
    startDate,
    endDate,
  } = parsed.data

  if (type === 'PERCENTAGE' && (!percentage || percentage <= 0)) {
    return { error: 'Veuillez renseigner un pourcentage de réduction valide (1-100%)' }
  }

  if (type === 'FIXED_AMOUNT' && (!amountCents || amountCents <= 0)) {
    return { error: 'Veuillez renseigner un montant de réduction supérieur à zéro' }
  }

  try {
    const existing = await prisma.discountCode.findUnique({
      where: { code },
    })

    if (existing) {
      return { error: `Le code promo "${code}" existe déjà.` }
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        code,
        description: description || null,
        type,
        percentage: type === 'PERCENTAGE' ? percentage : null,
        amountCents: type === 'FIXED_AMOUNT' ? amountCents : null,
        minSubtotalCents: minSubtotalCents && minSubtotalCents > 0 ? minSubtotalCents : null,
        maxUses: maxUses && maxUses > 0 ? maxUses : null,
        active,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    revalidate()
    return { ok: true, discountCode }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('createDiscountCode error:', err)
    return { error: err.message || 'Impossible de créer le code promo' }
  }
}

export async function updateDiscountCode(id: string, input: DiscountCodeInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = discountCodeSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message ?? 'Données invalides' }
  }

  const {
    code,
    description,
    type,
    percentage,
    amountCents,
    minSubtotalCents,
    maxUses,
    active,
    startDate,
    endDate,
  } = parsed.data

  try {
    const existingWithSameCode = await prisma.discountCode.findFirst({
      where: { code, NOT: { id } },
    })

    if (existingWithSameCode) {
      return { error: `Le code promo "${code}" est déjà utilisé par un autre enregistrement.` }
    }

    const discountCode = await prisma.discountCode.update({
      where: { id },
      data: {
        code,
        description: description || null,
        type,
        percentage: type === 'PERCENTAGE' ? percentage : null,
        amountCents: type === 'FIXED_AMOUNT' ? amountCents : null,
        minSubtotalCents: minSubtotalCents && minSubtotalCents > 0 ? minSubtotalCents : null,
        maxUses: maxUses && maxUses > 0 ? maxUses : null,
        active,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    revalidate()
    return { ok: true, discountCode }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('updateDiscountCode error:', err)
    return { error: err.message || 'Impossible de modifier le code promo' }
  }
}

export async function toggleDiscountCodeActive(id: string, active: boolean) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  try {
    await prisma.discountCode.update({
      where: { id },
      data: { active },
    })
    revalidate()
    return { ok: true }
  } catch (err: any) {
    return { error: err.message || 'Impossible de modifier le statut du code' }
  }
}

export async function deleteDiscountCode(id: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  try {
    await prisma.discountCode.delete({
      where: { id },
    })
    revalidate()
    return { ok: true }
  } catch (err: any) {
    return { error: err.message || 'Impossible de supprimer le code promo' }
  }
}
