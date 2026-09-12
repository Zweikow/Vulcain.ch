'use client'

import { CartItem } from '@/types'
import { formatCHF } from '@/lib/money'
import { PublicSettings } from '@/lib/settings'

interface CartProps {
  items: CartItem[]
  settings: PublicSettings
  onCheckout: () => void
}

export default function Cart({ items, settings }: CartProps) {
  const hasItems = items.length > 0
  const grossSubtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )

  // Calcul dynamique des remises promotionnelles selon activePromotion
  const promoDiscounts: { name: string; discountCents: number }[] = []

  for (const item of items) {
    const promo = item.product.activePromotion
    if (!promo) continue

    const isCarton = (item.product.bottlesPerUnit ?? 1) > 1

    if (promo.type === 'BUY_X_GET_Y_FREE' && promo.buyQuantity && promo.getFreeQuantity) {
      if (item.quantity >= promo.buyQuantity) {
        const sets = Math.floor(item.quantity / promo.buyQuantity)
        const freeUnits = sets * promo.getFreeQuantity
        const discount = freeUnits * item.product.priceCents
        promoDiscounts.push({
          name: `${promo.name} (${freeUnits} ${isCarton ? 'carton(s)' : 'bouteille(s)'} offert${freeUnits > 1 ? 's' : ''})`,
          discountCents: discount,
        })
      }
    } else if (promo.type === 'PERCENTAGE' && promo.discountPercent) {
      const discount = Math.round(
        item.quantity * item.product.priceCents * (promo.discountPercent / 100)
      )
      promoDiscounts.push({
        name: `${promo.name} (−${promo.discountPercent}%)`,
        discountCents: discount,
      })
    } else if (promo.type === 'FIXED_DISCOUNT' && promo.discountCents) {
      const discount = item.quantity * promo.discountCents
      promoDiscounts.push({
        name: promo.name,
        discountCents: discount,
      })
    }
  }

  const promoDiscountCents = promoDiscounts.reduce((sum, d) => sum + d.discountCents, 0)
  const subtotalCents = Math.max(0, grossSubtotalCents - promoDiscountCents)

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
          <div className="flex flex-col gap-2.5">
            {items.map((item) => {
              const isCarton = (item.product.bottlesPerUnit ?? 1) > 1
              return (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center text-sm gap-2"
                >
                  <div className="flex flex-col">
                    <span className="text-text-primary dark:text-text-primary-dark font-medium leading-tight">
                      {item.product.name}
                    </span>
                    <span className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark font-mono">
                      {isCarton
                        ? `${item.quantity} carton${item.quantity > 1 ? 's' : ''} (${item.quantity * item.product.bottlesPerUnit} bout.)`
                        : `${item.quantity} bouteille${item.quantity > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <span className="font-semibold text-text-primary dark:text-text-primary-dark tabular shrink-0">
                    {formatCHF(item.product.priceCents * item.quantity)}
                  </span>
                </div>
              )
            })}

            <div className="border-t border-border dark:border-border-dark pt-2.5 flex flex-col gap-1.5">
              {promoDiscounts.map((d, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-semibold"
                >
                  <span>{d.name}</span>
                  <span className="tabular">−{formatCHF(d.discountCents)}</span>
                </div>
              ))}

              <div className="flex justify-between text-sm text-text-primary dark:text-text-primary-dark font-medium pt-1 border-t border-border/40 dark:border-border-dark/40">
                <span>Sous-total</span>
                <span className="tabular">{formatCHF(subtotalCents)}</span>
              </div>

              <div className="flex justify-between text-sm text-text-secondary dark:text-text-secondary-dark">
                <span>Frais de port</span>
                <span className="tabular">
                  {shippingCents === 0 ? 'Offerts' : formatCHF(shippingCents)}
                </span>
              </div>

              {missingForFranco > 0 && (
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  Ajoutez {formatCHF(missingForFranco)} d&apos;articles pour la livraison offerte.
                </p>
              )}

              <div className="flex justify-between font-semibold text-text-primary dark:text-text-primary-dark text-base pt-1 border-t border-border/50 dark:border-border-dark/50">
                <span>Total</span>
                <span className="tabular">{formatCHF(totalCents)}</span>
              </div>
            </div>
          </div>

          <a href="#commande" className="btn-primary w-full text-center mt-2">
            Terminer ma commande
          </a>
        </>
      )}

      <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark italic text-center mt-1">
        Livraison en Suisse uniquement
      </div>
    </div>
  )
}
