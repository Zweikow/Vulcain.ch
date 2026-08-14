'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

const productSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().min(1),
  year: z.coerce.number().int().min(1990).max(2100).nullable().optional(),
  description: z.string().max(500),
  priceCents: z.coerce.number().int().min(0).max(100_000_00),
  stock: z.coerce.number().int().min(0),
  stockSeuil: z.coerce.number().int().min(0),
  active: z.boolean(),
  imageUrl: z.string().url().or(z.literal('')),
})

export type ProductInput = z.infer<typeof productSchema>

function revalidate() {
  revalidatePath('/admin/produits')
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function createProduct(input: ProductInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: 'Complétez les champs requis' }

  await prisma.product.create({
    data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null },
  })
  revalidate()
  return { ok: true }
}

export async function updateProduct(id: string, input: ProductInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: 'Complétez les champs requis' }

  await prisma.product.update({
    where: { id },
    data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null },
  })
  revalidate()
  return { ok: true }
}

export async function toggleProductActive(id: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product || product.archived) return
  await prisma.product.update({ where: { id }, data: { active: !product.active } })
  revalidate()
}

/**
 * Un produit cité dans une commande ne se supprime jamais : il s'archive
 * (DESIGN.md §2). Un produit jamais commandé peut être supprimé réellement.
 */
export async function archiveProduct(id: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const orderCount = await prisma.orderItem.count({ where: { productId: id } })
  if (orderCount === 0) {
    await prisma.stockMovement.deleteMany({ where: { productId: id } })
    await prisma.product.delete({ where: { id } })
    revalidate()
    return { ok: true, deleted: true }
  }

  await prisma.product.update({ where: { id }, data: { archived: true, active: false } })
  revalidate()
  return { ok: true, deleted: false }
}
