import { prisma } from '@/lib/prisma'
import { getPublicSettings } from '@/lib/settings'
import { Product } from '@/types'
import JsonLd from '@/components/JsonLd'
import BoutiqueClient from '@/components/BoutiqueClient'

// Catalogue lu en base à chaque requête — un produit désactivé disparaît aussitôt.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const [dbProducts, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, archived: false },
      include: {
        category: { select: { name: true } },
        producer: { select: { name: true } },
      },
      orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
    }),
    getPublicSettings(),
  ])

  const newSince = Date.now() - 60 * 24 * 3600 * 1000
  const products: Product[] = dbProducts.map((p) => {
    const isLastUnits = p.stock > 0 && p.stock <= p.stockSeuil
    return {
      id: p.id,
      name: p.name,
      category: p.category.name as Product['category'],
      producerName: p.producer?.name ?? undefined,
      year: p.year ?? undefined,
      bottleSize: (p.bottleSize as '75cl' | '27.5cl') || '75cl',
      origin: (p.origin as 'CH' | 'FR') || 'CH',
      priceCents: p.priceCents,
      stock: p.stock,
      description: p.description ?? '',
      image: p.imageUrl ?? undefined,
      active: p.active,
      isLastUnits,
      isNew: !isLastUnits && p.createdAt.getTime() > newSince,
      isBio: p.isBio,
      isVegan: p.isVegan,
      articleNumber: p.articleNumber,
    }
  })

  return (
    <>
      <JsonLd products={products} />
      <BoutiqueClient products={products} settings={settings} />
    </>
  )
}
