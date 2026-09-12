'use client'

import Image from 'next/image'
import { Product } from '@/types'
import { formatCHF } from '@/lib/money'
import { OriginBadge } from '@/components/OriginBadge'
import { PackBadgeIcon } from '@/components/admin/AdminIcons'

interface ProductCardProps {
  product: Product
  quantity: number
  onAdd: () => void
  onRemove: () => void
  onSetQuantity: (quantity: number) => void
  onOpenDetails: () => void
}

export default function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
  onSetQuantity: _onSetQuantity,
  onOpenDetails,
}: ProductCardProps) {
  const isOutOfStock = product.stock === 0
  const bottlesCount = product.bottlesPerUnit || 1
  const isCarton = bottlesCount > 1
  const bottleSizeLabel = product.bottleSize === '27.5cl' ? '27.5 cl' : '75 cl'
  const packagingLabel = isCarton
    ? `Carton ${bottlesCount}x${bottleSizeLabel}`
    : `Bouteille ${bottleSizeLabel}`

  const promo = product.activePromotion

  // Ruban promotionnel
  let ribbonText: string | null = null
  if (promo?.badgeText) {
    ribbonText = promo.badgeText
  } else if (promo?.type === 'PERCENTAGE' && promo.discountPercent) {
    ribbonText = `-${promo.discountPercent}%`
  } else if (promo?.type === 'BUY_X_GET_Y_FREE' && promo.buyQuantity && promo.getFreeQuantity) {
    ribbonText = `${promo.buyQuantity}+${promo.getFreeQuantity} OFFERT`
  } else if (promo?.type === 'FIXED_DISCOUNT' && promo.discountCents) {
    ribbonText = `-${formatCHF(promo.discountCents)}`
  } else if (product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents) {
    const pct = Math.round((1 - product.priceCents / product.compareAtPriceCents) * 100)
    ribbonText = `-${pct}%`
  }

  // Calculs des prix avec promotion (% ou montant fixe) ou prix barré
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

  const unitBottlePriceCents = isCarton
    ? Math.round(effectivePriceCents / bottlesCount)
    : effectivePriceCents

  const origBottlePriceCents = effectiveOrigPriceCents
    ? isCarton
      ? Math.round(effectiveOrigPriceCents / bottlesCount)
      : effectiveOrigPriceCents
    : null

  return (
    <div className="card p-3 flex flex-col gap-2 relative overflow-hidden">
      {/* Ruban promotionnel découpé en haut à gauche */}
      {ribbonText && (
        <div
          className="absolute left-0 top-3 z-10 bg-[#B8837E] dark:bg-[#977390] text-white font-bold text-[11px] py-1 pl-2.5 pr-4 shadow-md tracking-wider select-none uppercase"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)',
          }}
        >
          {ribbonText}
        </div>
      )}

      {/* Zone cliquable pour ouvrir la fiche détaillée */}
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex flex-col gap-2 text-left w-full focus:outline-none group"
      >
        {/* Photo produit */}
        <div className="relative w-full aspect-square rounded-md overflow-hidden bg-bg-page dark:bg-bg-page-dark border border-transparent group-hover:border-border dark:group-hover:border-border-dark transition-colors">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 200px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-mono text-[11px] text-text-tertiary dark:text-text-tertiary-dark"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(122,149,165,.12) 0 12px, transparent 12px 24px)',
              }}
            >
              photo bouteille 1:1
            </div>
          )}

          {/* Badge « Nouveau » ou « Derniers exemplaires » en haut à droite si pas de ruban */}
          {product.isNew && !ribbonText && (
            <span className="absolute left-2 top-2 rounded-pill bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-text-on-primary">
              Nouveau
            </span>
          )}
          {product.isLastUnits && (
            <span className="absolute right-2 top-2 rounded-pill bg-[#FFF8E1] px-2.5 py-0.5 text-[11px] font-semibold text-text-warning">
              Derniers exemplaires
            </span>
          )}
        </div>

        {/* Informations produit */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-semibold text-sm text-text-primary dark:text-text-primary-dark leading-tight group-hover:underline">
              {product.name}
            </h3>
            <OriginBadge origin={product.origin} className="w-4 h-4 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary dark:text-text-tertiary-dark font-medium">
            <span>{product.producerName || 'Cidrerie du Vulcain'}</span>
            {product.year && <span>· {product.year}</span>}
          </div>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark line-clamp-2 mt-0.5">
            {product.description}
          </p>
        </div>
      </button>

      {/* Mention du conditionnement */}
      <div className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark pt-1 border-t border-border/50 dark:border-border-dark/50">
        {packagingLabel}
      </div>

      {/* Section Prix & Sélecteur Panier (Inspiré maquette) */}
      <div className="flex items-end justify-between gap-2 mt-auto pt-1">
        {/* Prix */}
        <div className="flex flex-col">
          {/* Prix par bouteille */}
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-base text-primary dark:text-primary-hover tabular">
              {formatCHF(unitBottlePriceCents)}
            </span>
            <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-normal">
              / bouteille
            </span>
          </div>

          {/* Ancien prix barré si rabais */}
          {origBottlePriceCents && (
            <div className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark tabular leading-tight">
              au lieu de <span className="line-through">{formatCHF(origBottlePriceCents)}</span>
            </div>
          )}

          {/* Prix total du carton si carton */}
          {isCarton && (
            <div className="text-[11px] font-semibold text-text-primary dark:text-text-primary-dark mt-0.5 tabular leading-tight">
              <span>{formatCHF(effectivePriceCents)}</span>
              <span className="font-normal text-text-secondary dark:text-text-secondary-dark">
                {' '}
                / carton
              </span>
            </div>
          )}
        </div>

        {/* Pictogramme pack + Stepper quantité */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isCarton && (
            <PackBadgeIcon
              count={bottlesCount}
              className="text-secondary dark:text-text-secondary-dark mb-0.5"
            />
          )}

          {isOutOfStock ? (
            <span className="text-xs px-2 py-1 rounded-pill bg-gray-100 dark:bg-gray-800 text-text-tertiary dark:text-text-tertiary-dark">
              Épuisé
            </span>
          ) : (
            <div className="flex items-center border border-border dark:border-border-dark rounded-md overflow-hidden bg-bg-card dark:bg-bg-card-dark h-8 shadow-xs">
              <button
                type="button"
                onClick={onRemove}
                disabled={quantity === 0}
                className="w-7 h-full flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark disabled:opacity-30 transition-colors font-bold text-sm"
                aria-label="Diminuer"
              >
                −
              </button>
              <span className="px-1.5 text-xs font-semibold text-text-primary dark:text-text-primary-dark tabular select-none min-w-[44px] text-center">
                {quantity} {isCarton ? 'Cart.' : 'Btl.'}
              </span>
              <button
                type="button"
                onClick={onAdd}
                disabled={quantity >= product.stock}
                className="w-7 h-full bg-primary text-text-on-primary flex items-center justify-center hover:bg-primary-hover disabled:opacity-30 transition-colors font-bold text-sm"
                aria-label="Ajouter"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages promotionnels dynamiques selon quantité dans le panier */}
      {promo && quantity > 0 && (
        <div className="mt-1 pt-1.5 border-t border-border/50 dark:border-border-dark/50 text-[11px]">
          {promo.type === 'BUY_X_GET_Y_FREE' && promo.buyQuantity && promo.getFreeQuantity && (
            <>
              {quantity >= promo.buyQuantity ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  🎉 {Math.floor(quantity / promo.buyQuantity) * promo.getFreeQuantity}{' '}
                  {isCarton ? 'carton(s)' : 'bouteille(s)'} offert(s) !
                </span>
              ) : (
                quantity === promo.buyQuantity - 1 && (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    🎁 +1 {isCarton ? 'carton' : 'bouteille'} = le suivant est offert !
                  </span>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* Alerte stock max */}
      {quantity > 0 && quantity >= product.stock && (
        <span className="text-[10px] text-text-warning font-medium mt-0.5">
          Stock maximum atteint
        </span>
      )}
    </div>
  )
}
