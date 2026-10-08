import { prisma } from '@/lib/prisma'

/**
 * Transforme une chaine de caracteres en slug URL propre :
 * - Minuscules
 * - Suppression des accents et caracteres speciaux
 * - Tirets simples uniquement (jamais de tiret long)
 * - Suppression des tirets en debut et fin
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

/**
 * Genere un slug unique pour un produit.
 * Si le nom et l'annee existent, combine les deux si l'annee n'est pas deja dans le nom.
 * En cas de collision, ajoute un suffixe numerique (-2, -3, etc.).
 */
export async function generateUniqueProductSlug(
  name: string,
  year?: number | null
): Promise<string> {
  let base = slugify(name)
  if (year && !base.includes(String(year))) {
    base = `${base}-${year}`
  }
  if (!base) base = 'produit'

  let candidate = base
  let counter = 1

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
    counter += 1
    candidate = `${base}-${counter}`
  }
}

/**
 * Genere un slug unique pour une categorie.
 * En cas de collision, ajoute un suffixe numerique (-2, -3, etc.).
 */
export async function generateUniqueCategorySlug(name: string): Promise<string> {
  let base = slugify(name)
  if (!base) base = 'categorie'

  let candidate = base
  let counter = 1

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
    counter += 1
    candidate = `${base}-${counter}`
  }
}

/**
 * Genere un slug unique pour un producteur.
 * En cas de collision, ajoute un suffixe numerique (-2, -3, etc.).
 */
export async function generateUniqueProducerSlug(name: string): Promise<string> {
  let base = slugify(name)
  if (!base) base = 'producteur'

  let candidate = base
  let counter = 1

  while (true) {
    const existing = await prisma.producer.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
    counter += 1
    candidate = `${base}-${counter}`
  }
}
