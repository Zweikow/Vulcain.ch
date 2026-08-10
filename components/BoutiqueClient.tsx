'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import DeliveryWarning from '@/components/DeliveryWarning'
import ProductCard from '@/components/ProductCard'
import Cart from '@/components/Cart'
import OrderForm from '@/components/OrderForm'
import ConfirmationModal from '@/components/ConfirmationModal'
import { CartItem, CustomerInfo, Product } from '@/types'
import { PublicSettings } from '@/lib/settings'

interface BoutiqueClientProps {
  products: Product[]
  settings: PublicSettings
}

export default function BoutiqueClient({ products, settings }: BoutiqueClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [confirmation, setConfirmation] = useState<{
    orderId: string
    totalCents: number
  } | null>(null)

  const getQuantity = (productId: string) =>
    cart.find((i) => i.product.id === productId)?.quantity ?? 0

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const product = products.find((p) => p.id === productId)!
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

  const handleOrder = (customer: CustomerInfo, orderId: string, totalCents: number) => {
    setConfirmation({ orderId, totalCents })
    setCart([])
  }

  const cidreProducts = products.filter((p) => p.category === 'Cidre')
  const otherProducts = products.filter((p) =>
    ['Eau-de-vie', 'Liqueur', 'Cuisine'].includes(p.category)
  )

  return (
    <div className="min-h-screen">
      <Header />
      <DeliveryWarning />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Bandeau d'accueil (DESIGN.md §4) */}
        <section className="card p-8 mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-text-tertiary dark:text-text-tertiary-dark">
            Récolte 2026
          </p>
          <h1 className="mt-2 max-w-2xl font-display font-semibold text-4xl md:text-[46px] leading-tight text-text-primary dark:text-text-primary-dark">
            L&apos;expression pure du terroir.
          </h1>
          <p className="mt-4 max-w-lg text-text-secondary dark:text-text-secondary-dark">
            Cidres et poirés artisanaux, fermentés lentement sur levures indigènes.{' '}
            {products.length} références disponibles à la cave.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#catalogue" className="btn-primary">
              Découvrir la cave
            </a>
            <a href="#commande" className="btn-secondary">
              Passer la commande
            </a>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left: products + form */}
          <div id="catalogue" className="flex flex-col gap-8">
            {/* Cidres category */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary">🍎</span>
                <h2 className="font-display font-semibold text-[22px] text-text-primary dark:text-text-primary-dark">
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
                  <h2 className="font-display font-semibold text-[22px] text-text-primary dark:text-text-primary-dark">
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
            <div id="commande">
              <OrderForm items={cart} settings={settings} onSubmit={handleOrder} />
            </div>
          </div>

          {/* Right: cart (sticky on desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <Cart items={cart} settings={settings} onCheckout={() => {}} />
            </div>
          </div>
        </div>

        {/* Mobile cart summary */}
        <div className="lg:hidden mt-6">
          <Cart items={cart} settings={settings} onCheckout={() => {}} />
        </div>
      </div>

      {/* Pied de page sombre avec mention légale (DESIGN.md §4) */}
      <footer className="mt-8 bg-bg-header dark:bg-bg-header-dark px-4 py-8 text-sm text-white/80">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display font-semibold text-base text-white">Cidrerie du Vulcain</p>
            <p className="mt-1 text-xs">© 2026 Cidrerie du Vulcain — Aubonne, Suisse</p>
          </div>
          <p className="rounded-md bg-[#FDF2F2] px-4 py-2 text-xs font-medium text-[#C62828]">
            La vente d&apos;alcool est interdite aux mineurs.
          </p>
        </div>
      </footer>

      {confirmation && (
        <ConfirmationModal
          orderId={confirmation.orderId}
          totalCents={confirmation.totalCents}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  )
}
