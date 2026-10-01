'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Product } from '@/types'
import { formatCHF } from '@/lib/money'
import { OriginBadge } from '@/components/OriginBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  X,
  Leaf,
  Sprout,
  Gift,
  ShoppingBag,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getCuveeGallery } from '@/lib/cuvees-gallery'

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

  const gallery = useMemo(() => {
    return getCuveeGallery(product.image)
  }, [product.image])

  const [activeIndex, setActiveIndex] = useState(0)

  // Réinitialiser à la première photo au changement de produit
  useEffect(() => {
    setActiveIndex(0)
  }, [product.id])

  const nextImage = () => {
    if (gallery.length <= 1) return
    setActiveIndex((prev) => (prev + 1) % gallery.length)
  }

  const prevImage = () => {
    if (gallery.length <= 1) return
    setActiveIndex((prev) => (prev - 1 + gallery.length) % gallery.length)
  }

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gallery.length <= 1) return
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % gallery.length)
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + gallery.length) % gallery.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gallery.length])

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

        {/* Partie Gauche : Carrousel d'images sans cadre */}
        <div className="w-full md:w-1/2 bg-card flex flex-col items-center justify-between p-6 sm:p-8 shrink-0 relative min-h-[380px] md:min-h-[500px]">
          {gallery.length > 0 ? (
            <>
              {/* Entête indicateur du slide */}
              <div className="w-full flex items-center justify-between z-10 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  {gallery[activeIndex]?.label || 'Visuel'}
                </span>
                {gallery.length > 1 && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {activeIndex + 1} / {gallery.length}
                  </span>
                )}
              </div>

              {/* Image principale avec boutons Précédent / Suivant */}
              <div className="relative w-full flex-1 max-w-[280px] aspect-[1/2] max-h-[360px] flex items-center justify-center my-auto">
                <Image
                  key={gallery[activeIndex].url}
                  src={gallery[activeIndex].url}
                  alt={`${product.name} - ${gallery[activeIndex].label}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 400px"
                  priority
                />

                {/* Flèches de navigation carrousel */}
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        prevImage()
                      }}
                      className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 hover:bg-background border border-border/80 text-foreground flex items-center justify-center shadow-md hover:scale-105 transition-all"
                      aria-label="Image précédente"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        nextImage()
                      }}
                      className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 hover:bg-background border border-border/80 text-foreground flex items-center justify-center shadow-md hover:scale-105 transition-all"
                      aria-label="Image suivante"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Miniatures cliquables */}
              {gallery.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap z-10">
                  {gallery.map((img, idx) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveIndex(idx)
                      }}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border transition-all bg-background/50 ${
                        idx === activeIndex
                          ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-sm'
                          : 'border-border/60 opacity-60 hover:opacity-100 hover:border-border'
                      }`}
                      title={img.label}
                    >
                      <Image
                        src={img.url}
                        alt={img.label}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
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
