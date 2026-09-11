'use client'

import { CartItem } from '@/types'
import { formatCHF } from '@/lib/money'
import { PublicSettings } from '@/lib/settings'

interface CartProps {
  items: CartItem[]
  settings: PublicSettings
  onCheckout: () => void
}

export default function Cart({ items, settings, onCheckout }: CartProps) {
  const hasItems = items.length > 0
  const grossSubtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )
  const promoDiscountCents = items.reduce((sum, item) => {
    const isSummer =
      item.product.bottleSize === '27.5cl' ||
      item.product.name.toLowerCase().includes('evervescence')
    if (isSummer && item.quantity >= 72) {
      const setsOfThree = Math.floor(item.quantity / 72)
      return sum + setsOfThree * 24 * item.product.priceCents
    }
    return sum
  }, 0)
  const subtotalCents = grossSubtotalCents - promoDiscountCents

  const shippingCents =
    hasItems && subtotalCents < settings.francoCents ? settings.shippingCents : 0
  const totalCents = subtotalCents + shippingCents
  const missingForFranco = settings.francoCents - subtotalCents

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          Votre commande
        </h2>
        <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">ℹ️</span>
      </div>

      {!hasItems ? (
        <p className="text-sm text-text-tertiary dark:text-text-tertiary-dark py-4 text-center">
          Votre panier est vide
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center text-sm">
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  {item.product.name} ×{item.quantity}
                </span>
                <span className="font-medium text-text-primary dark:text-text-primary-dark">
                  {formatCHF(item.product.priceCents * item.quantity)}
                </span>
              </div>
            ))}

            <div className="border-t border-border dark:border-border-dark pt-2 flex flex-col gap-1">
              {promoDiscountCents > 0 && (
                <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>Offre estivale (carton offert)</span>
                  <span>−{formatCHF(promoDiscountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-text-secondary dark:text-text-secondary-dark">
                <span>Frais de port</span>
                <span>{shippingCents === 0 ? 'Offerts' : formatCHF(shippingCents)}</span>
              </div>
              {missingForFranco > 0 && (
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  Ajoutez {formatCHF(missingForFranco)} d&apos;articles pour la livraison offerte.
                </p>
              )}
              <div className="flex justify-between font-semibold text-text-primary dark:text-text-primary-dark">
                <span>Total</span>
                <span>{formatCHF(totalCents)}</span>
              </div>
            </div>
          </div>
          <a href="#commande" className="btn-primary w-full text-center mt-2">
            Terminer ma commande
          </a>
        </>
      )}

      <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark italic text-center mt-2">
        Livraison en Suisse uniquement
      </div>
    </div>
  )
}
