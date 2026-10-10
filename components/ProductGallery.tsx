'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

export interface GalleryItem {
  url: string
  label?: string
}

interface ProductGalleryProps {
  gallery: GalleryItem[]
  productName: string
  altText: string
  isOutOfStock?: boolean
  fallbackImageUrl?: string | null
}

export default function ProductGallery({
  gallery,
  productName,
  altText,
  isOutOfStock = false,
  fallbackImageUrl = null,
}: ProductGalleryProps) {
  const images =
    gallery.length > 0
      ? gallery
      : fallbackImageUrl
        ? [{ url: fallbackImageUrl, label: 'Bouteille' }]
        : []

  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const activeImage = images[activeIndex] || null

  const handleNext = () => {
    if (images.length <= 1) return
    setActiveIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrev = () => {
    if (images.length <= 1) return
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  // Navigation clavier pour le plein écran
  useEffect(() => {
    if (!isZoomOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomOpen(false)
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isZoomOpen, images.length])

  return (
    <div className="flex flex-col gap-4">
      {/* Conteneur principal (image affichée en grand) */}
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-bg-page dark:bg-bg-page-dark border border-border/70 shadow-sm flex items-center justify-center group">
        {activeImage ? (
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            className="w-full h-full relative cursor-zoom-in flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl"
            title="Cliquer pour agrandir l'image"
          >
            <Image
              key={activeImage.url}
              src={activeImage.url}
              alt={`${altText}${activeImage.label ? ` - ${activeImage.label}` : ''}`}
              fill
              priority
              unoptimized
              className="object-contain p-4 sm:p-8 transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center select-none">
            <span className="text-4xl mb-2">🍾</span>
            <span className="text-sm font-medium">Cuvée artisanale</span>
          </div>
        )}

        {/* Badge Épuisé */}
        {isOutOfStock && (
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <Badge variant="subtle" className="text-xs px-3 py-1 font-semibold">
              Épuisé
            </Badge>
          </div>
        )}

        {/* Étiquette du visuel actuel (ex: Face avant, Étiquette dos, Duo) */}
        {activeImage?.label && images.length > 1 && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <span className="text-[11px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full bg-background/85 backdrop-blur-xs border border-border/60 text-muted-foreground shadow-2xs">
              {activeImage.label}
            </span>
          </div>
        )}

        {/* Bouton pour agrandir en plein écran */}
        {activeImage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsZoomOpen(true)
            }}
            className="absolute bottom-4 right-4 z-10 w-9 h-9 rounded-full bg-background/85 hover:bg-background border border-border/80 text-foreground flex items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Agrandir en plein écran"
            aria-label="Agrandir l'image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Flèches de navigation carrousel */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/85 hover:bg-background border border-border/80 text-foreground flex items-center justify-center shadow-md transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105 cursor-pointer"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/85 hover:bg-background border border-border/80 text-foreground flex items-center justify-center shadow-md transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105 cursor-pointer"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Vignettes miniatures cliquables pour afficher en grand */}
      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, idx) => {
            const isSelected = idx === activeIndex
            return (
              <button
                key={img.url}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative aspect-square rounded-xl overflow-hidden bg-bg-page dark:bg-bg-page-dark border transition-all cursor-pointer p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/40 shadow-xs scale-[1.02] opacity-100'
                    : 'border-border/60 opacity-60 hover:opacity-100 hover:border-foreground/30'
                }`}
                aria-label={`Afficher ${img.label || `visuel ${idx + 1}`} en grand`}
                aria-pressed={isSelected}
              >
                <Image
                  src={img.url}
                  alt={`${productName} - ${img.label || `visuel ${idx + 1}`}`}
                  fill
                  unoptimized
                  className="object-contain p-1 select-none"
                  sizes="(max-width: 768px) 30vw, 150px"
                />
                {img.label && (
                  <span className="absolute bottom-1 inset-x-1 text-[9px] font-medium tracking-tight text-center truncate px-1 py-0.5 rounded-sm bg-background/85 text-muted-foreground backdrop-blur-2xs border border-border/40 pointer-events-none">
                    {img.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Modale plein écran (Lightbox) */}
      {isZoomOpen && activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
            aria-label="Fermer le plein écran"
          >
            <X className="w-5 h-5" />
          </button>

          {/* En-tête produit en haut */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2 text-white/90">
            <span className="text-sm font-serif italic">{productName}</span>
            {activeImage.label && (
              <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/70">
                {activeImage.label}
              </span>
            )}
          </div>

          {/* Image en grand */}
          <div
            className="relative w-full max-w-4xl h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage.url}
              alt={`${altText}${activeImage.label ? ` - ${activeImage.label}` : ''}`}
              fill
              unoptimized
              className="object-contain select-none p-2"
              sizes="90vw"
            />

            {/* Flèches plein écran */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePrev()
                  }}
                  className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border border-white/20 transition-all shadow-lg hover:scale-105 cursor-pointer"
                  aria-label="Image précédente"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNext()
                  }}
                  className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border border-white/20 transition-all shadow-lg hover:scale-105 cursor-pointer"
                  aria-label="Image suivante"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Miniatures en bas du plein écran */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 inset-x-0 flex justify-center gap-2 z-50 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                    idx === activeIndex
                      ? 'border-white ring-2 ring-white/50 scale-105 bg-white/20'
                      : 'border-white/30 opacity-60 hover:opacity-100 bg-white/5'
                  }`}
                  aria-label={`Afficher ${img.label || `visuel ${idx + 1}`}`}
                >
                  <Image
                    src={img.url}
                    alt={img.label || ''}
                    fill
                    unoptimized
                    className="object-contain p-1"
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
