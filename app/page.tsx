'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import DeliveryWarning from '@/components/DeliveryWarning'
import ProductCard from '@/components/ProductCard'
import Cart from '@/components/Cart'
import OrderForm from '@/components/OrderForm'
import ConfirmationModal from '@/components/ConfirmationModal'
import { CartItem, CustomerInfo } from '@/types'
import { PRODUCTS } from '@/lib/data'

const CATEGORY_LABELS: Record<string, string> = {
  Cidre: 'Cidres',
  'Eau-de-vie': 'Eaux de vie / Liqueurs / Cidre de cuisine',
  Liqueur: 'Eaux de vie / Liqueurs / Cidre de cuisine',
  Cuisine: 'Eaux de vie / Liqueurs / Cidre de cuisine',
}

const CATEGORIES = [
  { key: 'Cidre', label: 'Cidres' },
  { key: 'other', label: 'Eaux de vie / Liqueurs / Cidre de cuisine' },
]

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [confirmation, setConfirmation] = useState<{
    orderId: string
    total: number
  } | null>(null)

  const getQuantity = (productId: string) =>
    cart.find((i) => i.product.id === productId)?.quantity ?? 0

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const product = PRODUCTS.find((p) => p.id === productId)!
      const existing = prev.find((i) => i.product.id === productId)
      if (existing) {
        return prev.map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const handleOrder = (customer: CustomerInfo, orderId: string, total: number) => {
    setConfirmation({ orderId, total })
    setCart([])
  }

  const cidreProducts = PRODUCTS.filter((p) => p.active && p.category === 'Cidre')
  const otherProducts = PRODUCTS.filter(
    (p) => p.active && ['Eau-de-vie', 'Liqueur', 'Cuisine'].includes(p.category)
  )

  return (
    <div className="min-h-screen">
      <Header />
      <DeliveryWarning />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left: products + form */}
          <div className="flex flex-col gap-8">
            {/* Cidres category */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary">🍎</span>
                <h2 className="font-display font-semibold text-text-primary dark:text-text-primary-dark">
                  Cidres
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cidreProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={getQuantity(product.id)}
                    onAdd={() => addToCart(product.id)}
                    onRemove={() => removeFromCart(product.id)}
                  />
                ))}
              </div>
            </section>

            {/* Other products category */}
            {otherProducts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-primary">🍶</span>
                  <h2 className="font-display font-semibold text-text-primary dark:text-text-primary-dark">
                    Eaux de vie / Liqueurs / Cidre de cuisine
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {otherProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      quantity={getQuantity(product.id)}
                      onAdd={() => addToCart(product.id)}
                      onRemove={() => removeFromCart(product.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Order form */}
            <OrderForm items={cart} onSubmit={handleOrder} />
          </div>

          {/* Right: cart (sticky on desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <Cart items={cart} onCheckout={() => {}} />
            </div>
          </div>
        </div>

        {/* Mobile cart summary */}
        <div className="lg:hidden mt-6">
          <Cart items={cart} onCheckout={() => {}} />
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-text-tertiary dark:text-text-tertiary-dark border-t border-border dark:border-border-dark mt-8">
        © 2026 Cidrerie de Vulcain — Aubonne, Suisse
      </footer>

      {confirmation && (
        <ConfirmationModal
          orderId={confirmation.orderId}
          total={confirmation.total}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  )
}
