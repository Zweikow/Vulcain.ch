'use client'

import Image from 'next/image'
import { Product } from '@/types'

interface ProductCardProps {
  product: Product
  quantity: number
  onAdd: () => void
  onRemove: () => void
}

export default function ProductCard({ product, quantity, onAdd, onRemove }: ProductCardProps) {
  const isOutOfStock = product.stock === 0

  return (
    <div className="card p-3 flex flex-col gap-2">
      {/* Product image */}
      <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-bg-page dark:bg-bg-page-dark">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary dark:text-text-tertiary-dark text-4xl">
            🍎
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5">
        <h3 className="font-semibold text-sm text-text-primary dark:text-text-primary-dark leading-tight">
          {product.name}
        </h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark line-clamp-2">
          {product.description}
        </p>
      </div>

      {/* Price + quantity */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="font-semibold text-sm text-primary">CHF {product.price.toFixed(2)}</span>

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
            <span className="w-6 text-center text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              {quantity}
            </span>
            <button
              onClick={onAdd}
              disabled={quantity >= product.stock}
              className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:opacity-30 transition-colors text-sm font-semibold"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
