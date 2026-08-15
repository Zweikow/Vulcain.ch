import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { ProduitsClient } from '@/components/admin/ProduitsClient'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'

export default async function ProduitsPage() {
  // Le préparateur consulte le catalogue pour retrouver une cuvée, sans voir
  // les prix ni pouvoir toucher aux quantités.
  const user = await currentUser()
  const canEdit = user ? can.manageCatalogue(user.role) : false
  const showMoney = user ? can.seeFinancials(user.role) : false

  const [produits, categories, settings] = await Promise.all([
    prisma.product.findMany({
      where: { archived: false },
      include: {
        category: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
    }),
    prisma.category.findMany({ orderBy: { position: 'asc' }, select: { id: true, name: true } }),
    getSettings(),
  ])

  return (
    <ProduitsClient
      produits={produits.map((p) => ({
        id: p.id,
        articleNumber: p.articleNumber,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        year: p.year,
        description: p.description ?? '',
        priceCents: p.priceCents,
        stock: p.stock,
        stockSeuil: p.stockSeuil,
        active: p.active,
        isBio: p.isBio,
        isVegan: p.isVegan,
        alcoholVolume: p.alcoholVolume,
        imageUrl: p.imageUrl,
        ordered: p._count.orderItems > 0,
      }))}
      categories={categories}
      proRatePercent={settings.proRatePercent}
      canEdit={canEdit}
      showMoney={showMoney}
    />
  )
}
