'use client'

import { CartItem } from '@/types'
import { formatCHF } from '@/lib/money'
import { PublicSettings } from '@/lib/settings'
import { InfoIcon } from '@/components/Icons'

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
    <div className="heroui-card p-5 flex flex-col gap-4 relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-divider">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <h2 className="font-semibold text-base text-text-primary dark:text-text-primary-dark">
            Votre commande
          </h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-default-100 text-default-600 border border-divider">
          {items.reduce((s, i) => s + i.quantity, 0)}{' '}
          {items.reduce((s, i) => s + i.quantity, 0) > 1 ? 'articles' : 'article'}
        </span>
      </div>

      {!hasItems ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-default-100 flex items-center justify-center text-default-400">
            <InfoIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-default-500">Votre panier est actuellement vide</p>
          <p className="text-xs text-default-400 max-w-[200px]">
            Sélectionnez des bouteilles ou cartons pour commencer.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const isCarton = (item.product.bottlesPerUnit ?? 1) > 1
              return (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center text-sm gap-2 p-2 rounded-xl bg-default-50/70 border border-divider/60"
                >
                  <div className="flex flex-col">
                    <span className="text-text-primary dark:text-text-primary-dark font-medium leading-tight">
                      {item.product.name}
                    </span>
                    <span className="text-[11px] text-default-500 font-mono mt-0.5">
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

            <div className="border-t border-divider pt-3 flex flex-col gap-2">
              {promoDiscounts.map((d, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-semibold"
                >
                  <span>{d.name}</span>
                  <span className="tabular">−{formatCHF(d.discountCents)}</span>
                </div>
              ))}

              <div className="flex justify-between text-sm text-default-600 dark:text-default-400 font-medium">
                <span>Sous-total</span>
                <span className="tabular text-text-primary dark:text-text-primary-dark">
                  {formatCHF(subtotalCents)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-default-600 dark:text-default-400">
                <span>Frais de port</span>
                <span className="tabular font-medium text-text-primary dark:text-text-primary-dark">
                  {shippingCents === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Offerts
                    </span>
                  ) : (
                    formatCHF(shippingCents)
                  )}
                </span>
              </div>

              {/* Barre de progression livraison offerte */}
              {settings.francoCents > 0 && (
                <div className="mt-1 p-2.5 rounded-xl bg-default-100/70 border border-divider flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-default-600">
                      {missingForFranco <= 0
                        ? '🎉 Livraison offerte atteinte !'
                        : `Plus que ${formatCHF(missingForFranco)} pour la livraison offerte`}
                    </span>
                    <span className="font-semibold text-default-700">
                      {Math.min(100, Math.round((subtotalCents / settings.francoCents) * 100))}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-default-200 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((subtotalCents / settings.francoCents) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between font-bold text-text-primary dark:text-text-primary-dark text-lg pt-2 border-t border-divider">
                <span>Total</span>
                <span className="tabular text-primary dark:text-primary-hover">
                  {formatCHF(totalCents)}
                </span>
              </div>
            </div>
          </div>

          <a
            href="#commande"
            className="heroui-btn-primary w-full text-center py-3 text-sm rounded-xl"
          >
            Terminer ma commande
          </a>
        </>
      )}

      <div className="text-[11px] text-default-400 italic text-center">
        Expédition soignée en Suisse uniquement · CHF
      </div>
    </div>
  )
}
