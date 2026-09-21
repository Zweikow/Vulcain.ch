import Image from 'next/image'
import { Product } from '@/types'
import { formatCHF } from '@/lib/money'
import { OriginBadge } from '@/components/OriginBadge'
import { CloseIcon, LeafIcon, SproutIcon, GiftIcon } from '@/components/Icons'

interface ProductDetailModalProps {
  product: Product
  quantity: number
  onAdd: () => void
  onRemove: () => void
  onSetQuantity: (quantity: number) => void
  onClose: () => void
}

export default function ProductDetailModal({
  product,
  quantity,
  onAdd,
  onRemove,
  onSetQuantity: _onSetQuantity,
  onClose,
}: ProductDetailModalProps) {
  const isOutOfStock = product.stock === 0
  const promo = product.activePromotion
  let effectivePriceCents = product.priceCents
  let effectiveOrigPriceCents: number | null = null

  if (promo?.type === 'PERCENTAGE' && promo.discountPercent) {
    effectivePriceCents = Math.round(product.priceCents * (1 - promo.discountPercent / 100))
    effectiveOrigPriceCents = product.compareAtPriceCents || product.priceCents
  } else if (promo?.type === 'FIXED_DISCOUNT' && promo.discountCents) {
    effectivePriceCents = Math.max(0, product.priceCents - promo.discountCents)
    effectiveOrigPriceCents = product.compareAtPriceCents || product.priceCents
  } else if (product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents) {
    effectivePriceCents = product.priceCents
    effectiveOrigPriceCents = product.compareAtPriceCents
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 sm:p-6 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-content1 text-content1-foreground border border-divider rounded-3xl shadow-heroui-lg overflow-hidden flex flex-col md:flex-row max-h-[90vh] transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-default-100/80 hover:bg-default-200 border border-divider transition-all text-default-600 hover:text-default-900 active:scale-90"
          aria-label="Fermer"
        >
          <CloseIcon className="w-4 h-4" />
        </button>

        {/* Left side: Image */}
        <div className="w-full md:w-1/2 bg-default-100/50 dark:bg-default-50/50 flex items-center justify-center p-8 shrink-0 relative min-h-[300px] border-b md:border-b-0 md:border-r border-divider">
          {product.image ? (
            <div className="relative w-full max-w-[300px] aspect-[1/2]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            </div>
          ) : (
            <div
              className="w-full h-full min-h-[300px] flex items-center justify-center font-mono text-sm text-default-400"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(122,149,165,.12) 0 12px, transparent 12px 24px)',
              }}
            >
              photo bouteille
            </div>
          )}
        </div>

        {/* Right side: Details */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col overflow-y-auto">
          <div className="text-[11px] text-default-400 font-mono uppercase tracking-wider mb-2">
            Article-Nr. {product.articleNumber.toString().padStart(5, '0')}
          </div>

          <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary dark:text-text-primary-dark leading-tight mb-4">
            {product.name}
          </h2>

          {/* Badges / Tags HeroUI Chip Style */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {product.year && (
              <span className="px-3 py-1 bg-default-100 dark:bg-default-100/60 border border-divider rounded-full text-xs font-semibold text-default-700">
                {product.year}
              </span>
            )}
            {product.isBio && (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/20">
                <LeafIcon className="w-3.5 h-3.5" /> Bio
              </span>
            )}
            {product.isVegan && (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/20">
                <SproutIcon className="w-3.5 h-3.5" /> Vegan
              </span>
            )}
          </div>

          <div className="text-sm text-default-600 dark:text-default-400 mb-6 leading-relaxed flex flex-col gap-1">
            <span className="font-semibold text-text-primary dark:text-text-primary-dark">
              {product.producerName || 'Jacques Perritaz'}
            </span>
            <div className="flex items-center gap-2">
              <OriginBadge origin={product.origin} showLabel className="w-4 h-4" />
              <span>·</span>
              <span>{product.bottleSize === '27.5cl' ? '27.5 cl' : '75 cl'}</span>
              {product.bottlesPerUnit > 1 && (
                <>
                  <span>·</span>
                  <span className="font-semibold text-text-primary dark:text-text-primary-dark">
                    Carton de {product.bottlesPerUnit} bouteilles
                  </span>
                </>
              )}
            </div>
            <span className="text-xs text-default-500">{product.category}</span>
          </div>

          {/* Prix & Promotion */}
          <div className="mb-6 flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-3xl text-primary tabular">
                {formatCHF(
                  product.bottlesPerUnit > 1
                    ? Math.round(effectivePriceCents / product.bottlesPerUnit)
                    : effectivePriceCents
                )}
              </span>
              <span className="text-sm text-default-500">/ bouteille</span>
            </div>

            {effectiveOrigPriceCents && (
              <div className="text-xs text-default-400 tabular">
                au lieu de{' '}
                <span className="line-through">
                  {formatCHF(
                    product.bottlesPerUnit > 1
                      ? Math.round(effectiveOrigPriceCents / product.bottlesPerUnit)
                      : effectiveOrigPriceCents
                  )}
                </span>{' '}
                {product.bottlesPerUnit > 1 && (
                  <span>(soit {formatCHF(effectiveOrigPriceCents)} le carton)</span>
                )}
              </div>
            )}

            {product.bottlesPerUnit > 1 && (
              <div className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mt-1 tabular">
                Total : {formatCHF(effectivePriceCents)} / carton de {product.bottlesPerUnit}{' '}
                bouteilles
              </div>
            )}

            {product.activePromotion && (
              <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-text-primary dark:text-text-primary-dark flex items-center gap-2.5">
                <GiftIcon className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-bold">{product.activePromotion.name}</span>
                  {product.activePromotion.description && (
                    <p className="text-[11px] text-default-600 dark:text-default-400">
                      {product.activePromotion.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Add to cart / Quantity */}
          <div className="mt-auto pt-6 border-t border-divider">
            {isOutOfStock ? (
              <div className="w-full py-3 rounded-2xl bg-default-100 text-center text-default-400 font-medium">
                Épuisé
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-divider rounded-2xl overflow-hidden bg-default-100/70 dark:bg-default-50 h-11 shrink-0 p-0.5">
                    <button
                      onClick={onRemove}
                      disabled={quantity === 0}
                      className="w-10 h-full flex items-center justify-center text-default-600 dark:text-default-400 hover:bg-content1 rounded-xl disabled:opacity-25 transition-all text-lg font-bold active:scale-90"
                    >
                      −
                    </button>
                    <span className="px-3 text-sm font-semibold text-text-primary dark:text-text-primary-dark tabular select-none min-w-[70px] text-center">
                      {quantity} {product.bottlesPerUnit > 1 ? 'carton(s)' : 'bouteille(s)'}
                    </span>
                    <button
                      onClick={onAdd}
                      disabled={quantity >= product.stock}
                      className="w-10 h-full flex items-center justify-center text-default-600 dark:text-default-400 hover:bg-content1 rounded-xl disabled:opacity-25 transition-all text-lg font-bold active:scale-90"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (quantity === 0) onAdd()
                      onClose()
                    }}
                    className="flex-1 heroui-btn-primary h-11 text-sm rounded-2xl"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    Ajouter au panier
                  </button>
                </div>

                {quantity > 0 && quantity >= product.stock && (
                  <span className="text-xs text-text-warning font-medium text-center">
                    Stock maximum atteint pour ce produit.
                  </span>
                )}
              </div>
            )}
          </div>

          {product.description && (
            <div className="mt-8 pt-6 border-t border-divider">
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                Description
              </h3>
              <p className="text-sm text-default-600 dark:text-default-400 whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
