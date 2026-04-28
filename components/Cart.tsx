'use client'

import { CartItem } from '@/types'

interface CartProps {
  items: CartItem[]
  onCheckout: () => void
}

export default function Cart({ items, onCheckout }: CartProps) {
  const hasItems = items.length > 0
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shipping = hasItems ? 10.0 : 0
  const total = subtotal + shipping

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
                  CHF {(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}

            <div className="border-t border-border dark:border-border-dark pt-2 flex flex-col gap-1">
              <div className="flex justify-between text-sm text-text-secondary dark:text-text-secondary-dark">
                <span>Frais de port</span>
                <span>CHF {shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-text-primary dark:text-text-primary-dark">
                <span>Total</span>
                <span>CHF {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark italic text-center">
        Livraison en Suisse uniquement
      </div>
    </div>
  )
}
