'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

import { generateUniqueProducerSlug } from '@/lib/slug'

const schema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
})

export async function createProducer(input: { name: string }) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Nom invalide' }

  try {
    const slug = await generateUniqueProducerSlug(parsed.data.name)
    const producer = await prisma.producer.create({
      data: { name: parsed.data.name, slug },
    })
    revalidatePath('/admin/producteurs')
    revalidatePath('/admin/produits')
    revalidatePath('/producteurs')
    revalidatePath('/')
    return { ok: true, producer }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Ce producteur existe déjà.' }
    return { error: 'Erreur inattendue lors de la création.' }
  }
}

const updateProducerSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  description: z.string().trim().max(2000, 'La description est trop longue').optional().nullable(),
  region: z.string().trim().max(100, 'La région est trop longue').optional().nullable(),
  photoUrl: z.string().trim().max(500, 'Le lien photo est trop long').optional().nullable(),
})

export async function updateProducer(
  id: string,
  input: {
    name: string
    description?: string | null
    region?: string | null
    photoUrl?: string | null
  }
) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const parsed = updateProducerSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Données invalides' }

  try {
    const producer = await prisma.producer.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ? parsed.data.description.trim() : null,
        region: parsed.data.region ? parsed.data.region.trim() : null,
        photoUrl: parsed.data.photoUrl ? parsed.data.photoUrl.trim() : null,
      },
    })
    revalidatePath('/admin/producteurs')
    revalidatePath('/admin/produits')
    revalidatePath('/producteurs')
    revalidatePath(`/producteurs/${producer.slug}`)
    revalidatePath('/')
    return { ok: true, producer }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'Ce nom de producteur est déjà utilisé.' }
    return { error: 'Erreur inattendue lors de la mise à jour.' }
  }
}

export async function deleteProducer(id: string) {
  const guard = await assertCapability(can.manageCatalogue)
  if (!guard.ok) return { error: guard.error }

  const count = await prisma.product.count({ where: { producerId: id } })
  if (count > 0) {
    return {
      error: `Impossible : ${count} produit${count > 1 ? 's sont associés' : ' est associé'} à ce producteur.`,
    }
  }

  try {
    await prisma.producer.delete({ where: { id } })
    revalidatePath('/admin/producteurs')
    revalidatePath('/admin/produits')
    revalidatePath('/producteurs')
    revalidatePath('/')
    return { ok: true }
  } catch {
    return { error: 'Erreur inattendue lors de la suppression.' }
  }
}
