'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

import { generateUniqueProductSlug, generateUniqueProducerSlug } from '@/lib/slug'

const productSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().min(1),
  producerId: z.string().nullable().optional(),
  year: z.coerce.number().int().min(1990).max(2100).nullable().optional(),
  description: z.string().max(500),
  priceCents: z.coerce.number().int().min(0).max(100_000_00),
  compareAtPriceCents: z.coerce.number().int().min(0).max(100_000_00).nullable().optional(),
  purchasePriceCents: z.coerce.number().int().min(0).max(100_000_00).default(0),
  stock: z.coerce.number().int().min(0),
  stockSeuil: z.coerce.number().int().min(0),
  bottlesPerUnit: z.coerce.number().int().min(1).default(1),
  active: z.boolean(),
  bottleSize: z.enum(['75cl', '27.5cl']).default('75cl'),
  origin: z.enum(['CH', 'FR']).default('CH'),
  isBio: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  alcoholVolume: z.coerce.number().min(0).max(100).nullable().optional(),
  imageUrl: z.string().url().or(z.string().startsWith('/')).or(z.literal('')).nullable().optional(),
})

export type ProductInput = z.infer<typeof productSchema>

function revalidate(slug?: string | null) {
  revalidatePath('/admin/produits')
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/sitemap.xml')
  if (slug) {
    revalidatePath(`/produits/${slug}`)
  }
}

export async function getProducers() {
  return prisma.producer.findMany({ orderBy: { name: 'asc' } })
}

export async function createProducer(name: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Nom du producteur requis' }

  try {
    const slug = await generateUniqueProducerSlug(trimmed)
    const producer = await prisma.producer.upsert({
      where: { name: trimmed },
      update: {},
      create: { name: trimmed, slug },
    })
    revalidate()
    return { ok: true, producer }
  } catch {
    return { error: 'Impossible de créer le producteur' }
  }
}

export async function createProduct(input: ProductInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: 'Complétez les champs requis' }

  const slug = await generateUniqueProductSlug(parsed.data.name, parsed.data.year)
  const product = await prisma.product.create({
    data: { ...parsed.data, slug, imageUrl: parsed.data.imageUrl || null },
  })
  revalidate(product.slug)
  return { ok: true }
}

export async function updateProduct(id: string, input: ProductInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return { error: 'Complétez les champs requis' }

  const product = await prisma.product.update({
    where: { id },
    data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null },
    select: { slug: true },
  })
  revalidate(product.slug)
  return { ok: true }
}

export async function updateProductStockInline(id: string, stock: number) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const product = await prisma.product.update({
    where: { id },
    data: { stock: Math.max(0, stock) },
    select: { slug: true },
  })
  revalidate(product.slug)
  return { ok: true }
}

export async function toggleProductActive(id: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return

  const product = await prisma.product.findUnique({
    where: { id },
    select: { active: true, archived: true, slug: true },
  })
  if (!product || product.archived) return
  await prisma.product.update({ where: { id }, data: { active: !product.active } })
  revalidate(product.slug)
}

/**
 * Un produit cité dans une commande ne se supprime jamais : il s'archive
 * (DESIGN.md §2). Un produit jamais commandé peut être supprimé réellement.
 */
export async function archiveProduct(id: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const product = await prisma.product.findUnique({ where: { id }, select: { slug: true } })
  const orderCount = await prisma.orderItem.count({ where: { productId: id } })
  if (orderCount === 0) {
    await prisma.stockMovement.deleteMany({ where: { productId: id } })
    await prisma.product.delete({ where: { id } })
    revalidate(product?.slug)
    return { ok: true, deleted: true }
  }

  await prisma.product.update({ where: { id }, data: { archived: true, active: false } })
  revalidate(product?.slug)
  return { ok: true, deleted: false }
}

export async function updateProductImage(id: string, imageUrl: string | null) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const product = await prisma.product.update({
    where: { id },
    data: { imageUrl: imageUrl ? imageUrl.trim() : null },
    select: { slug: true },
  })
  revalidate(product.slug)
  return { ok: true }
}
