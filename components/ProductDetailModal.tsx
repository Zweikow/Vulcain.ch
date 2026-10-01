'use client'

import Image from 'next/image'
import { Product } from '@/types'
import { formatCHF } from '@/lib/money'
import { OriginBadge } from '@/components/OriginBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Leaf, Sprout, Gift, ShoppingBag, Plus, Minus } from 'lucide-react'

interface ProductDetailModalProps {
  product: Product
  quantity: number
  onAdd: () => void
  onRemove: () => void
  onSetQuantity?: (quantity: number) => void
  onClose: () => void
}

export default function ProductDetailModal({
  product,
  quantity,
  onAdd,
  onRemove,
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

  const isCarton = product.bottlesPerUnit > 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton Fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-background/80 hover:bg-muted border border-border/60 flex items-center justify-center text-foreground transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Partie Gauche : Image sans cadre visible */}
        <div className="w-full md:w-1/2 bg-card flex items-center justify-center p-8 shrink-0 relative min-h-[300px]">
          {product.image ? (
            <div className="relative w-full max-w-[280px] aspect-[1/2]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain mix-blend-multiply dark:mix-blend-normal"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-full min-h-[280px] flex items-center justify-center font-serif italic text-sm text-muted-foreground">
              Cuvée artisanale Vulcain
            </div>
          )}
        </div>

        {/* Partie Droite : Contenu & Détails */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
              Réf. {product.articleNumber.toString().padStart(5, '0')}
            </span>
            <OriginBadge origin={product.origin} showLabel className="w-4 h-4" />
          </div>

          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground leading-tight mb-3">
            {product.name}
          </h2>

          {/* Badges / Labels */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {product.year && (
              <Badge variant="secondary" className="font-mono">
                {product.year}
              </Badge>
            )}
            {product.isBio && (
              <Badge variant="success" className="flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-600" />
                <span>Bio</span>
              </Badge>
            )}
            {product.isVegan && (
              <Badge variant="success" className="flex items-center gap-1">
                <Sprout className="w-3 h-3 text-emerald-600" />
                <span>Vegan</span>
              </Badge>
            )}
            <Badge variant="outline">{product.bottleSize === '27.5cl' ? '27.5 cl' : '75 cl'}</Badge>
          </div>

          {/* Producteur et conditionnement */}
          <div className="text-sm text-muted-foreground mb-6 flex flex-col gap-1">
            <span className="font-semibold text-foreground">
              {product.producerName || 'Jacques Perritaz'} · {product.category}
            </span>
            {isCarton && (
              <span className="text-xs">
                Conditionnement : Carton renforcé de {product.bottlesPerUnit} bouteilles
              </span>
            )}
          </div>

          {/* Prix & Promotion */}
          <div className="mb-6 p-4 rounded-xl bg-secondary/40 border border-border/60 flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-3xl text-foreground font-mono tabular">
                {formatCHF(
                  isCarton
                    ? Math.round(effectivePriceCents / product.bottlesPerUnit)
                    : effectivePriceCents
                )}
              </span>
              <span className="text-sm text-muted-foreground">/ bouteille</span>
            </div>

            {effectiveOrigPriceCents && (
              <div className="text-xs text-muted-foreground tabular line-through">
                au lieu de{' '}
                {formatCHF(
                  isCarton
                    ? Math.round(effectiveOrigPriceCents / product.bottlesPerUnit)
                    : effectiveOrigPriceCents
                )}
              </div>
            )}

            {isCarton && (
              <div className="text-xs font-semibold text-foreground pt-1 border-t border-border/50 tabular">
                Total : {formatCHF(effectivePriceCents)} / carton de {product.bottlesPerUnit}{' '}
                bouteilles
              </div>
            )}

            {promo && (
              <div className="mt-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-bold">{promo.name}</span>
                  {promo.description && (
                    <p className="text-[11px] text-muted-foreground">{promo.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bouton Ajouter au panier */}
          <div className="mt-auto pt-4 border-t border-border/60">
            {isOutOfStock ? (
              <Badge variant="subtle" className="w-full py-3 justify-center text-sm font-medium">
                Cuvée épuisée
              </Badge>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden h-11 shrink-0">
                    <button
                      type="button"
                      onClick={onRemove}
                      disabled={quantity === 0}
                      className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm font-bold text-foreground font-mono tabular min-w-[60px] text-center select-none">
                      {quantity} {isCarton ? 'Cart.' : 'Btl.'}
                    </span>
                    <button
                      type="button"
                      onClick={onAdd}
                      disabled={quantity >= product.stock}
                      className="w-10 h-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    onClick={() => {
                      if (quantity === 0) onAdd()
                      onClose()
                    }}
                    className="flex-1 h-11 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Ajouter à la commande</span>
                  </Button>
                </div>

                {quantity > 0 && quantity >= product.stock && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center">
                    Stock maximal disponible atteint pour cette cuvée.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Description œnologique */}
          {product.description && (
            <div className="mt-6 pt-4 border-t border-border/40">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Notes de dégustation &amp; terroir
              </h3>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
