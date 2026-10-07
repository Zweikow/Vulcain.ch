'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

const schema = z.object({
  name: z.string().min(1).max(100),
})

export async function createCategory(input: { name: string }) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: 'Nom invalide' }

  try {
    const max = await prisma.category.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = (max?.position ?? -1) + 1
    await prisma.category.create({ data: { ...parsed.data, position } })
    revalidatePath('/admin/categories')
    revalidatePath('/admin/produits')
    revalidatePath('/')
    return { ok: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Cette catégorie existe déjà.' }
    return { error: 'Erreur inattendue.' }
  }
}

export async function deleteCategory(id: string, targetCategoryId?: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) {
    if (!targetCategoryId) {
      return { error: 'Impossible : des produits utilisent cette catégorie.' }
    }
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: targetCategoryId },
    })
  }

  try {
    await prisma.category.delete({ where: { id } })
    revalidatePath('/admin/categories')
    revalidatePath('/admin/produits')
    revalidatePath('/')
    return { ok: true }
  } catch (e: any) {
    return { error: e.message || 'Erreur inattendue.' }
  }
}

export async function moveCategory(id: string, direction: 'up' | 'down') {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const categories = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  })
  const currentIndex = categories.findIndex((c) => c.id === id)
  if (currentIndex === -1) return { error: 'Catégorie introuvable.' }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (targetIndex < 0 || targetIndex >= categories.length) {
    return { ok: true }
  }

  // Swap dans la liste
  const item = categories[currentIndex]
  categories.splice(currentIndex, 1)
  categories.splice(targetIndex, 0, item)

  // Réassignation séquentielle stricte de 0 à N pour éliminer tout doublon
  await prisma.$transaction(
    categories.map((cat, idx) =>
      prisma.category.update({
        where: { id: cat.id },
        data: { position: idx },
      })
    )
  )

  revalidatePath('/admin/categories')
  revalidatePath('/admin/produits')
  revalidatePath('/')
  return { ok: true }
}
