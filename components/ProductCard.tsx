'use client'

import Image from 'next/image'
import { Product } from '@/types'
import { formatCHF } from '@/lib/money'
import { OriginBadge } from '@/components/OriginBadge'
import { PackBadgeIcon } from '@/components/admin/AdminIcons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Sparkles, Gift } from 'lucide-react'

interface ProductCardProps {
  product: Product
  quantity: number
  onAdd: () => void
  onRemove: () => void
  onSetQuantity?: (quantity: number) => void
  onOpenDetails: () => void
}

export default function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
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
    <div className="card h-full flex flex-col justify-between overflow-hidden group p-0 bg-card border border-border dark:border-border-dark rounded-xl shadow-xs hover:shadow-md transition-shadow relative">
      {/* Ruban promotionnel */}
      {ribbonText && (
        <div className="absolute left-2.5 top-2.5 z-20">
          <Badge
            variant="default"
            className="bg-primary text-primary-foreground font-bold text-[11px] shadow-sm tracking-wide uppercase px-2.5 py-0.5"
          >
            {ribbonText}
          </Badge>
        </div>
      )}

      {/* Zone cliquable vers la fiche détaillée */}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenDetails()
          }
        }}
        className="p-3.5 flex flex-col gap-2.5 text-left w-full focus:outline-none cursor-pointer flex-1"
      >
        {/* Photo produit */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-bg-page dark:bg-bg-page-dark border border-border/50">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 300px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-serif italic text-xs text-muted-foreground">
              Cuvée artisanale
            </div>
          )}

          {/* Badges de statut */}
          <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 items-end">
            {product.isNew && !ribbonText && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-text-on-primary shadow-xs">
                Nouveau
              </span>
            )}
            {product.isLastUnits && (
              <Badge variant="destructive" className="text-[10px] py-0 px-2 shadow-xs">
                Dernières bouteilles
              </Badge>
            )}
          </div>
        </div>

        {/* Informations produit */}
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-display font-semibold text-base text-foreground leading-snug group-hover:underline transition-colors">
              {product.name}
            </h3>
            <OriginBadge origin={product.origin} className="w-4 h-4 shrink-0 mt-0.5" />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span>{product.producerName || 'Drinkcider'}</span>
            {product.year && <span>· {product.year}</span>}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>

      {/* Bas de carte : Prix et sélecteur de quantité */}
      <div className="p-3.5 pt-0 mt-auto flex flex-col gap-2">
        <div className="text-[11px] font-medium text-muted-foreground border-t border-border/40 pt-2 flex items-center justify-between">
          <span>{packagingLabel}</span>
          {isCarton && (
            <span className="inline-flex items-center gap-1 text-secondary dark:text-muted-foreground">
              <PackBadgeIcon count={bottlesCount} className="w-4 h-4" />
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          {/* Bloc Prix */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-lg text-foreground font-mono tabular">
                {formatCHF(unitBottlePriceCents)}
              </span>
              <span className="text-[11px] text-muted-foreground">/ bout.</span>
            </div>

            {origBottlePriceCents && (
              <div className="text-[11px] text-muted-foreground/80 line-through tabular">
                {formatCHF(origBottlePriceCents)}
              </div>
            )}

            {isCarton && (
              <div className="text-[11px] font-medium text-muted-foreground tabular mt-0.5">
                <span>{formatCHF(effectivePriceCents)}</span>
                <span className="text-[10px]"> / carton</span>
              </div>
            )}
          </div>

          {/* Stepper ou Épuisé */}
          <div className="shrink-0">
            {isOutOfStock ? (
              <Badge variant="subtle" className="text-xs py-1 px-2.5">
                Épuisé
              </Badge>
            ) : quantity === 0 ? (
              <Button
                type="button"
                size="sm"
                onClick={onAdd}
                className="h-8 px-3 rounded-md bg-primary hover:bg-primary-hover text-text-on-primary font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </Button>
            ) : (
              <div className="flex items-center border border-border dark:border-border-dark rounded-md bg-card overflow-hidden h-8 shadow-xs">
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-7 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Diminuer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-bold text-foreground font-mono tabular min-w-[28px] text-center select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={quantity >= product.stock}
                  className="w-7 h-full bg-primary text-text-on-primary flex items-center justify-center hover:bg-primary-hover disabled:opacity-40 transition-colors"
                  aria-label="Ajouter"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Message d'avantage promotionnel en direct */}
        {promo && quantity > 0 && (
          <div className="text-[11px] pt-1 border-t border-border/40">
            {promo.type === 'BUY_X_GET_Y_FREE' && promo.buyQuantity && promo.getFreeQuantity && (
              <>
                {quantity >= promo.buyQuantity ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {Math.floor(quantity / promo.buyQuantity) * promo.getFreeQuantity}{' '}
                      {isCarton ? 'carton(s)' : 'bouteille(s)'} offert(s) !
                    </span>
                  </span>
                ) : (
                  quantity === promo.buyQuantity - 1 && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 shrink-0" />
                      <span>+1 {isCarton ? 'carton' : 'bouteille'} = le suivant offert !</span>
                    </span>
                  )
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
