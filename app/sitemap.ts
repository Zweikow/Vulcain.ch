import type { MetadataRoute } from 'next'
import { prisma, hasDatabaseUrl, isBuildWithoutDatabase } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { getMainImageUrl } from '@/lib/cuvees-gallery'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()

  // Entrées fixes du site
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/producteurs`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/cgv`,
      lastModified: new Date('2026-08-14'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/mentions-legales`,
      lastModified: new Date('2026-08-14'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/confidentialite`,
      lastModified: new Date('2026-08-14'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // En l'absence de base de donnees durant le build statique CI (phase-production-build),
  // on retourne uniquement les routes statiques sans lancer de requete.
  if (isBuildWithoutDatabase()) {
    return staticEntries
  }

  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL est absente : impossible de générer le sitemap à l'exécution.")
  }

  const [dbProducts, dbCategories, dbProducers] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
        archived: false,
      },
      select: {
        slug: true,
        updatedAt: true,
        imageUrl: true,
        articleNumber: true,
        stock: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.category.findMany({
      where: {
        slug: { not: 'offre-speciale-ete' },
        description: { not: null },
      },
      select: {
        slug: true,
        description: true,
      },
    }),
    prisma.producer.findMany({
      where: {
        description: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
        description: true,
      },
    }),
  ])

  // Règle 4 : Une catégorie ou un producteur dont la description est vide reste hors sitemap
  const eligibleCategories = dbCategories.filter(
    (c) => c.description && c.description.trim().length > 0
  )

  const eligibleProducers = dbProducers.filter(
    (p) => p.description && p.description.trim().length > 0
  )

  const latestProductDate = dbProducts[0]?.updatedAt || new Date()

  // Mise a jour de la date sur les entrees fixes
  staticEntries[0].lastModified = latestProductDate
  staticEntries[1].lastModified = latestProductDate

  // Fiches produits avec images réelles pour Google Images (omise si pas de photo)
  const productEntries: MetadataRoute.Sitemap = dbProducts.map((p) => {
    const imgRel = getMainImageUrl(p.imageUrl, p.articleNumber)
    const imgAbsolute = imgRel ? (imgRel.startsWith('http') ? imgRel : `${siteUrl}${imgRel}`) : null

    return {
      url: `${siteUrl}/produits/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: p.stock > 0 ? 0.8 : 0.5,
      ...(imgAbsolute ? { images: [imgAbsolute] } : {}),
    }
  })

  // Pages catégories (avec description renseignée uniquement)
  const categoryEntries: MetadataRoute.Sitemap = eligibleCategories.map((c) => ({
    url: `${siteUrl}/categories/${c.slug}`,
    lastModified: latestProductDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Pages producteurs (avec description renseignée uniquement)
  const producerEntries: MetadataRoute.Sitemap = eligibleProducers.map((p) => ({
    url: `${siteUrl}/producteurs/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [...staticEntries, ...categoryEntries, ...producerEntries, ...productEntries]
}
