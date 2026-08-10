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
  // Estimation en centimes — le montant qui fait foi est recalculé par le serveur.
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  )
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
        </>
      )}

      <div className="text-xs text-text-tertiary dark:text-text-tertiary-dark italic text-center">
        Livraison en Suisse uniquement
      </div>
    </div>
  )
}
