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
    return { ok: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Cette catégorie existe déjà.' }
    return { error: 'Erreur inattendue.' }
  }
}

export async function deleteCategory(id: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) return { error: 'Impossible : des produits utilisent cette catégorie.' }

  await prisma.category.delete({ where: { id } })
  revalidatePath('/admin/categories')
  revalidatePath('/admin/produits')
  return { ok: true }
}
export async function moveCategory(id: string, direction: 'up' | 'down') {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const categories = await prisma.category.findMany({ orderBy: { position: 'asc' } })
  const currentIndex = categories.findIndex((c) => c.id === id)
  if (currentIndex === -1) return { error: 'Catégorie introuvable.' }

  if (direction === 'up' && currentIndex > 0) {
    const prev = categories[currentIndex - 1]
    const current = categories[currentIndex]
    await prisma.$transaction([
      prisma.category.update({ where: { id: current.id }, data: { position: prev.position } }),
      prisma.category.update({ where: { id: prev.id }, data: { position: current.position } }),
    ])
  } else if (direction === 'down' && currentIndex < categories.length - 1) {
    const next = categories[currentIndex + 1]
    const current = categories[currentIndex]
    await prisma.$transaction([
      prisma.category.update({ where: { id: current.id }, data: { position: next.position } }),
      prisma.category.update({ where: { id: next.id }, data: { position: current.position } }),
    ])
  }

  revalidatePath('/admin/categories')
  revalidatePath('/admin/produits')
  return { ok: true }
}
