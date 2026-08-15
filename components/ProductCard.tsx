'use client'

import Image from 'next/image'
import { Product } from '@/types'
import { formatCHF } from '@/lib/money'

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
  onSetQuantity,
  onOpenDetails,
}: ProductCardProps) {
  const isOutOfStock = product.stock === 0

  return (
    <div className="card p-3 flex flex-col gap-2">
      {/* Clickable Area for Image and Info */}
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex flex-col gap-2 text-left w-full focus:outline-none group"
      >
        {/* Photo produit — carré 1:1, trame diagonale en attendant la vraie photo (DESIGN.md §1) */}
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
          {/* Badge « Nouveau » ou « Derniers exemplaires » — jamais les deux */}
          {product.isNew && (
            <span className="absolute left-2 top-2 rounded-pill bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-text-on-primary">
              Nouveau
            </span>
          )}
          {product.isLastUnits && (
            <span className="absolute left-2 top-2 rounded-pill bg-[#FFF8E1] px-2.5 py-0.5 text-[11px] font-semibold text-text-warning">
              Derniers exemplaires
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-sm text-text-primary dark:text-text-primary-dark leading-tight group-hover:underline">
            {product.name}
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark line-clamp-2">
            {product.description}
          </p>
        </div>
      </button>

      {/* Price + quantity */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="font-semibold text-sm text-primary">{formatCHF(product.priceCents)}</span>

        {isOutOfStock ? (
          <span className="text-xs px-2 py-1 rounded-pill bg-gray-100 dark:bg-gray-800 text-text-tertiary dark:text-text-tertiary-dark">
            Épuisé
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onRemove}
              disabled={quantity === 0}
              className="w-7 h-7 rounded-md border border-border dark:border-border-dark flex items-center justify-center text-text-primary dark:text-text-primary-dark hover:bg-bg-page dark:hover:bg-bg-page-dark disabled:opacity-30 transition-colors text-sm font-semibold"
            >
              −
            </button>
            <input
              type="number"
              min="0"
              max={product.stock}
              value={quantity === 0 ? '' : quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                onSetQuantity(Math.min(val, product.stock))
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="w-10 text-center text-sm font-semibold text-text-primary dark:text-text-primary-dark bg-transparent border-none p-0 focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none tabular-nums"
            />
            <button
              onClick={onAdd}
              disabled={quantity >= product.stock}
              className="w-7 h-7 rounded-md bg-primary text-text-on-primary flex items-center justify-center hover:bg-primary-hover disabled:opacity-30 transition-colors text-sm font-semibold"
            >
              +
            </button>
          </div>
        )}
      </div>
      {/* Alert max stock */}
      {quantity > 0 && quantity >= product.stock && (
        <span className="text-[10px] text-text-warning font-medium mt-1">
          Stock maximum atteint
        </span>
      )}
    </div>
  )
}
