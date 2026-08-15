import Image from 'next/image'
import { Product } from '@/types'
import { formatCHF } from '@/lib/money'

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
  onSetQuantity,
  onClose,
}: ProductDetailModalProps) {
  const isOutOfStock = product.stock === 0

  return (
    <div
      className="fixed inset-0 bg-black/40 flex flex-col items-center justify-center z-50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-bg-page dark:bg-bg-page-dark rounded-[24px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors text-text-primary dark:text-text-primary-dark backdrop-blur-sm"
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* Left side: Image */}
        <div className="w-full md:w-1/2 bg-[#f8f8f8] dark:bg-[#1a1a1a] flex items-center justify-center p-8 shrink-0 relative min-h-[300px]">
          {product.image ? (
            <div className="relative w-full max-w-[300px] aspect-[1/2]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain drop-shadow-2xl"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            </div>
          ) : (
            <div
              className="w-full h-full min-h-[300px] flex items-center justify-center font-mono text-sm text-text-tertiary dark:text-text-tertiary-dark"
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
          <div className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark font-mono uppercase tracking-wider mb-2">
            Article-Nr. {product.articleNumber.toString().padStart(5, '0')}
          </div>

          <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary dark:text-text-primary-dark leading-tight uppercase mb-4">
            {product.name}
          </h2>

          {/* Badges / Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {product.year && (
              <span className="px-3 py-1 bg-border-light dark:bg-border-dark rounded-full text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
                {product.year}
              </span>
            )}
            {product.isBio && (
              <span className="px-3 py-1 bg-[#E8F5E9] dark:bg-[#1B5E20]/30 text-text-success rounded-full text-xs font-semibold flex items-center gap-1 border border-[#CDE8D4] dark:border-[#2E7D32]/50">
                <span>🌱</span> Bio
              </span>
            )}
            {product.isVegan && (
              <span className="px-3 py-1 bg-[#E8F5E9] dark:bg-[#1B5E20]/30 text-text-success rounded-full text-xs font-semibold flex items-center gap-1 border border-[#CDE8D4] dark:border-[#2E7D32]/50">
                <span>🌿</span> Vegan
              </span>
            )}
          </div>

          <div className="text-sm text-text-secondary dark:text-text-secondary-dark mb-6 leading-relaxed flex flex-col gap-1">
            <span className="font-semibold text-text-primary dark:text-text-primary-dark">
              Cidrerie du Vulcain
            </span>
            <span>Suisse</span>
            <span>{product.category}</span>
          </div>

          <div className="font-semibold text-2xl text-primary mb-6">
            {formatCHF(product.priceCents)}
          </div>

          {/* Add to cart / Quantity */}
          <div className="mt-auto pt-6 border-t border-border dark:border-border-dark">
            {isOutOfStock ? (
              <div className="w-full py-3 rounded-[12px] bg-gray-100 dark:bg-gray-800 text-center text-text-tertiary dark:text-text-tertiary-dark font-medium">
                Épuisé
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border dark:border-border-dark rounded-[12px] overflow-hidden bg-bg-page dark:bg-bg-page-dark h-11 shrink-0">
                    <button
                      onClick={onRemove}
                      disabled={quantity === 0}
                      className="w-11 h-full flex items-center justify-center text-text-primary dark:text-text-primary-dark hover:bg-border-light dark:hover:bg-border-dark disabled:opacity-30 transition-colors text-lg font-medium"
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
                      className="w-12 h-full text-center text-base font-semibold text-text-primary dark:text-text-primary-dark bg-transparent border-none p-0 focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none tabular-nums"
                    />
                    <button
                      onClick={onAdd}
                      disabled={quantity >= product.stock}
                      className="w-11 h-full flex items-center justify-center text-text-primary dark:text-text-primary-dark hover:bg-border-light dark:hover:bg-border-dark disabled:opacity-30 transition-colors text-lg font-medium"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (quantity === 0) onAdd()
                      onClose()
                    }}
                    className="flex-1 btn-primary h-11 text-sm flex justify-center items-center gap-2 rounded-[12px]"
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
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
                Description
              </h3>
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
