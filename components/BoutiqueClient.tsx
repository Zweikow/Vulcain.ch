'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import DeliveryWarning from '@/components/DeliveryWarning'
import ProductCard from '@/components/ProductCard'
import Cart from '@/components/Cart'
import OrderForm from '@/components/OrderForm'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProductDetailModal from '@/components/ProductDetailModal'
import { CartItem, CustomerInfo, Product } from '@/types'
import { PublicSettings } from '@/lib/settings'

interface BoutiqueClientProps {
  products: Product[]
  settings: PublicSettings
}

export default function BoutiqueClient({ products, settings }: BoutiqueClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
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

  const setProductQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      const product = products.find((p) => p.id === productId)!
      const validQty = Math.max(0, Math.min(quantity, product.stock))

      const existing = prev.find((i) => i.product.id === productId)
      if (validQty === 0) {
        return prev.filter((i) => i.product.id !== productId)
      }

      if (existing) {
        return prev.map((i) => (i.product.id === productId ? { ...i, quantity: validQty } : i))
      }
      return [...prev, { product, quantity: validQty }]
    })
  }

  const handleOrder = (customer: CustomerInfo, orderId: string, totalCents: number) => {
    setConfirmation({ orderId, totalCents })
    setCart([])
  }

  const categories = Array.from(new Set(products.map((p) => p.category)))

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
            {categories.map((category) => {
              const categoryProducts = products.filter((p) => p.category === category)
              if (categoryProducts.length === 0) return null

              return (
                <section key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-primary">
                      {category.toLowerCase().includes('cidre') ? '🍎' : '🍶'}
                    </span>
                    <h2 className="font-display font-semibold text-[22px] text-text-primary dark:text-text-primary-dark">
                      {category}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={getQuantity(product.id)}
                        onAdd={() => addToCart(product.id)}
                        onRemove={() => removeFromCart(product.id)}
                        onSetQuantity={(qty) => setProductQuantity(product.id, qty)}
                        onOpenDetails={() => setSelectedProduct(product)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}

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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="font-display font-semibold text-base text-white">Cidrerie du Vulcain</p>
            <p className="mt-1 text-xs">© 2026 Cidrerie du Vulcain</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <a
                href="/cgv"
                className="hover:text-white underline underline-offset-4 decoration-white/30 transition-colors"
              >
                Conditions de vente
              </a>
              <a
                href="/mentions-legales"
                className="hover:text-white underline underline-offset-4 decoration-white/30 transition-colors"
              >
                Mentions légales
              </a>
              <a
                href="/confidentialite"
                className="hover:text-white underline underline-offset-4 decoration-white/30 transition-colors"
              >
                Protection des données
              </a>
            </div>
          </div>
          <p className="rounded-md bg-[#FDF2F2] px-4 py-2 text-xs font-medium text-[#C62828] self-start md:self-center">
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

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          quantity={getQuantity(selectedProduct.id)}
          onAdd={() => addToCart(selectedProduct.id)}
          onRemove={() => removeFromCart(selectedProduct.id)}
          onSetQuantity={(qty) => setProductQuantity(selectedProduct.id, qty)}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
