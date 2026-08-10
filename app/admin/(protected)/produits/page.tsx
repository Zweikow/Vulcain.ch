import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { ProduitsClient } from '@/components/admin/ProduitsClient'

export default async function ProduitsPage() {
  const [produits, categories, settings] = await Promise.all([
    prisma.product.findMany({
      where: { archived: false },
      include: {
        category: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getSettings(),
  ])

  return (
    <ProduitsClient
      produits={produits.map((p) => ({
        id: p.id,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        year: p.year,
        description: p.description ?? '',
        priceCents: p.priceCents,
        stock: p.stock,
        stockSeuil: p.stockSeuil,
        active: p.active,
        imageUrl: p.imageUrl,
        ordered: p._count.orderItems > 0,
      }))}
      categories={categories}
      proRatePercent={settings.proRatePercent}
    />
  )
}
