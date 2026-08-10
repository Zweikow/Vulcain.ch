import { prisma } from '@/lib/prisma'
import { getPublicSettings } from '@/lib/settings'
import { Product } from '@/types'
import BoutiqueClient from '@/components/BoutiqueClient'

// Catalogue lu en base à chaque requête — un produit désactivé disparaît aussitôt.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const [dbProducts, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, archived: false },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    getPublicSettings(),
  ])

  const products: Product[] = dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category.name as Product['category'],
    year: p.year ?? undefined,
    priceCents: p.priceCents,
    stock: p.stock,
    description: p.description ?? '',
    image: p.imageUrl ?? undefined,
    active: p.active,
  }))

  return <BoutiqueClient products={products} settings={settings} />
}
