import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PromotionsClient, PromotionRow } from '@/components/admin/PromotionsClient'
import { DiscountCodesClient } from '@/components/admin/DiscountCodesClient'
import { PromoProductItem } from '@/components/admin/AdminPromoModal'
import { Tag, Sparkles } from 'lucide-react'

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'codes' } = await searchParams
  const user = await currentUser()
  if (!user || !can.manageCatalogue(user.role)) {
    redirect('/admin')
  }

  const [dbPromotions, dbProducts, categories, dbDiscountCodes] = await Promise.all([
    prisma.promotion.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            bottleSize: true,
            bottlesPerUnit: true,
            priceCents: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
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
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
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
    productCategoryId: p.product.categoryId,
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

  const activeCodesCount = dbDiscountCodes.filter((c) => c.active).length
  const activePromosCount = promotions.filter((p) => p.active).length

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Navigation par onglets */}
      <div className="flex items-center gap-2 border-b border-border dark:border-border-dark pb-3">
        <Link
          href="/admin/promotions?tab=codes"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            tab === 'codes'
              ? 'bg-primary text-text-on-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark hover:bg-bg-page/60'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Codes promo</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
              tab === 'codes'
                ? 'bg-text-on-primary/15 text-text-on-primary'
                : 'bg-primary/10 text-primary-text'
            }`}
          >
            {activeCodesCount}
          </span>
        </Link>

        <Link
          href="/admin/promotions?tab=offres"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            tab === 'offres'
              ? 'bg-primary text-text-on-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark hover:bg-bg-page/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Offres cuvées &amp; Packs</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
              tab === 'offres'
                ? 'bg-text-on-primary/15 text-text-on-primary'
                : 'bg-primary/10 text-primary-text'
            }`}
          >
            {activePromosCount}
          </span>
        </Link>
      </div>

      {/* Contenu de l'onglet actif */}
      {tab === 'codes' ? (
        <DiscountCodesClient codes={dbDiscountCodes} canEdit={can.manageCatalogue(user.role)} />
      ) : (
        <PromotionsClient
          promotions={promotions}
          products={products}
          categories={categories}
          canEdit={can.manageCatalogue(user.role)}
        />
      )}
    </div>
  )
}
