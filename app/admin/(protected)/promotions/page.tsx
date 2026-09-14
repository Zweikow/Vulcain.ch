import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { PromotionsClient, PromotionRow } from '@/components/admin/PromotionsClient'
import { PromoProductItem } from '@/components/admin/AdminPromoModal'

export default async function PromotionsPage() {
  const user = await currentUser()
  if (!user || !can.manageCatalogue(user.role)) {
    redirect('/admin')
  }

  const [dbPromotions, dbProducts] = await Promise.all([
    prisma.promotion.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            bottleSize: true,
            bottlesPerUnit: true,
            priceCents: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { archived: false },
      select: {
        id: true,
        name: true,
        bottleSize: true,
        bottlesPerUnit: true,
        priceCents: true,
        category: { select: { name: true } },
      },
      orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
    }),
  ])

  const promotions: PromotionRow[] = dbPromotions.map((p) => ({
    id: p.id,
    name: p.name,
    badgeText: p.badgeText,
    description: p.description,
    type: p.type,
    buyQuantity: p.buyQuantity,
    getFreeQuantity: p.getFreeQuantity,
    discountPercent: p.discountPercent,
    discountCents: p.discountCents,
    active: p.active,
    productId: p.productId,
    productName: p.product.name,
    productBottleSize: p.product.bottleSize,
    productBottlesPerUnit: p.product.bottlesPerUnit,
    productPriceCents: p.product.priceCents,
    categoryName: p.product.category.name,
  }))

  const products: PromoProductItem[] = dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    bottleSize: p.bottleSize,
    bottlesPerUnit: p.bottlesPerUnit,
    priceCents: p.priceCents,
    categoryName: p.category.name,
  }))

  return (
    <PromotionsClient
      promotions={promotions}
      products={products}
      canEdit={can.manageCatalogue(user.role)}
    />
  )
}
