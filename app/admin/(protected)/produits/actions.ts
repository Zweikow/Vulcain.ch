'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

import { generateUniqueProductSlug, generateUniqueProducerSlug } from '@/lib/slug'

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Le nom du produit est requis')
    .max(200, 'Le nom est trop long (max 200 caractères)'),
  categoryId: z.string().trim().min(1, 'La catégorie est requise'),
  producerId: z.preprocess((val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'string') {
      const trimmed = val.trim()
      return trimmed === '' ? null : trimmed
    }
    return val
  }, z.string().nullable().optional()),
  year: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null
    if (typeof val === 'string') {
      const parsed = parseInt(val.trim(), 10)
      if (isNaN(parsed)) return val
      return parsed > 0 && parsed < 100 ? 2000 + parsed : parsed
    }
    if (typeof val === 'number') {
      return val > 0 && val < 100 ? 2000 + val : val
    }
    return val
  }, z.number().int('Le millésime doit être une année entière').min(1900, 'Le millésime doit être supérieur à 1900').max(2100, 'Le millésime doit être inférieur à 2100').nullable().optional()),
  description: z.preprocess((val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'string') {
      const trimmed = val.trim()
      return trimmed === '' ? null : trimmed
    }
    return val
  }, z.string().max(2000, 'La description ne doit pas dépasser 2000 caractères').nullable().optional()),
  priceCents: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return 0
      if (typeof val === 'string') {
        const n = Number(val.replace(',', '.').trim())
        return isNaN(n) ? val : n
      }
      return val
    },
    z
      .number()
      .int('Le prix doit être un nombre entier de centimes')
      .min(0, 'Le prix ne peut pas être négatif')
      .max(100_000_00, 'Le prix est trop élevé')
  ),
  compareAtPriceCents: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null
    if (typeof val === 'string') {
      const n = Number(val.replace(',', '.').trim())
      return isNaN(n) ? val : n
    }
    return val
  }, z.number().int('Le prix barré doit être un nombre entier de centimes').min(0, 'Le prix barré ne peut pas être négatif').max(100_000_00, 'Le prix barré est trop élevé').nullable().optional()),
  purchasePriceCents: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return 0
    if (typeof val === 'string') {
      const n = Number(val.replace(',', '.').trim())
      return isNaN(n) ? val : n
    }
    return val
  }, z.number().int("Le prix d'achat doit être un nombre entier de centimes").min(0, "Le prix d'achat ne peut pas être négatif").max(100_000_00, "Le prix d'achat est trop élevé").default(0)),
  stock: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return 0
      if (typeof val === 'string') {
        const n = parseInt(val.replace(',', '.').trim(), 10)
        return isNaN(n) ? val : n
      }
      return val
    },
    z
      .number()
      .int('Le stock doit être un nombre entier')
      .min(0, 'Le stock ne peut pas être négatif')
  ),
  stockSeuil: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return 5
      if (typeof val === 'string') {
        const n = parseInt(val.replace(',', '.').trim(), 10)
        return isNaN(n) ? val : n
      }
      return val
    },
    z
      .number()
      .int('Le seuil de stock doit être un nombre entier')
      .min(0, 'Le seuil de stock ne peut pas être négatif')
  ),
  bottlesPerUnit: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return 1
    if (typeof val === 'string') {
      const n = parseInt(val.trim(), 10)
      return isNaN(n) ? val : n
    }
    return val
  }, z.number().int('Le nombre de bouteilles par unité doit être un entier').min(1, 'Minimum 1 bouteille par unité').default(1)),
  active: z.boolean().default(true),
  bottleSize: z.string().trim().default('75cl'),
  origin: z.string().trim().default('CH'),
  isBio: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  alcoholVolume: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null
      if (typeof val === 'string') {
        const cleaned = val.replace(',', '.').replace('%', '').trim()
        const n = Number(cleaned)
        return isNaN(n) ? val : n
      }
      return val
    },
    z
      .number({ message: "Le volume d'alcool doit être un nombre" })
      .min(0, "Le volume d'alcool ne peut pas être négatif")
      .max(100, "Le volume d'alcool ne peut pas dépasser 100%")
      .nullable()
      .optional()
  ),
  imageUrl: z.preprocess((val) => {
    if (val === null || val === undefined) return null
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return null
      if (
        !trimmed.startsWith('/') &&
        !trimmed.startsWith('http://') &&
        !trimmed.startsWith('https://') &&
        !trimmed.startsWith('blob:') &&
        !trimmed.startsWith('data:')
      ) {
        return '/' + trimmed
      }
      return trimmed
    }
    return val
  }, z.string().nullable().optional()),
})

export type ProductInput = {
  name: string
  categoryId: string
  producerId?: string | null
  year?: number | null
  description?: string | null
  priceCents: number
  compareAtPriceCents?: number | null
  purchasePriceCents?: number
  stock: number
  stockSeuil: number
  bottlesPerUnit?: number
  active: boolean
  bottleSize?: string
  origin?: string
  isBio?: boolean
  isVegan?: boolean
  alcoholVolume?: number | null
  imageUrl?: string | null
}

function revalidate(slug?: string | null) {
  revalidatePath('/admin/produits')
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/producteurs')
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
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message || 'Données invalides' }
  }

  try {
    const slug = await generateUniqueProductSlug(parsed.data.name, parsed.data.year)
    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        slug,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl || null,
        producerId: parsed.data.producerId || null,
      },
    })
    revalidate(product.slug)
    return { ok: true }
  } catch (error: any) {
    console.error('Erreur lors de la création du produit:', error)
    if (error?.code === 'P2002') {
      return { error: 'Un produit portant ce nom ou ce slug existe déjà.' }
    }
    return { error: 'Une erreur est survenue lors de la création du produit.' }
  }
}

export async function updateProduct(id: string, input: ProductInput) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue?.message || 'Données invalides' }
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl || null,
        producerId: parsed.data.producerId || null,
      },
      select: { slug: true },
    })
    revalidate(product.slug)
    return { ok: true }
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du produit:', error)
    if (error?.code === 'P2002') {
      return { error: 'Un produit portant ce nom ou ce slug existe déjà.' }
    }
    return { error: 'Une erreur est survenue lors de la mise à jour du produit.' }
  }
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
