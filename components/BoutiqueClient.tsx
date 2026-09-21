'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import DeliveryWarning from '@/components/DeliveryWarning'
import ProductCard from '@/components/ProductCard'
import Cart from '@/components/Cart'
import OrderForm from '@/components/OrderForm'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProductDetailModal from '@/components/ProductDetailModal'
import { ProduitsIcon, BottleIcon } from '@/components/Icons'
import { CartItem, CustomerInfo, Product } from '@/types'
import { PublicSettings } from '@/lib/settings'

interface BoutiqueClientProps {
  products: Product[]
  settings: PublicSettings
  categories?: string[]
}

export default function BoutiqueClient({
  products,
  settings,
  categories: propCategories,
}: BoutiqueClientProps) {
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
        const nextQty = Math.min(existing.quantity + 1, product.stock)
        return prev.map((i) => (i.product.id === productId ? { ...i, quantity: nextQty } : i))
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      return prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    })
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

  // Catégories ordonnées selon la position définie dans l'admin (Category.position)
  const categories =
    propCategories && propCategories.length > 0
      ? Array.from(new Set([...propCategories, ...products.map((p) => p.category)]))
      : Array.from(new Set(products.map((p) => p.category)))

  return (
    <div className="min-h-screen">
      <Header />
      <DeliveryWarning />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Bandeau d'accueil HeroUI (Signature Glow + Floating Chip) */}
        <section className="relative overflow-hidden rounded-3xl p-8 sm:p-12 mb-10 border border-divider bg-gradient-to-b from-content1 via-content1 to-default-100/60 shadow-heroui-md transition-all">
          {/* Lueur ambiante HeroUI Glow */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/20 dark:bg-primary/15 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Cidrerie artisanale suisse · Cuvées &amp; Millésimes</span>
            </div>

            <h1 className="mt-1 font-display font-bold text-3xl sm:text-5xl md:text-[48px] leading-[1.15] tracking-tight bg-gradient-to-b from-text-primary via-text-primary to-text-secondary dark:from-white dark:via-white dark:to-white/70 bg-clip-text text-transparent">
              Cidres &amp; poirés d&apos;auteurs suisses
            </h1>

            <p className="mt-2 text-lg sm:text-xl font-display italic text-primary dark:text-[#80ED99]">
              L&apos;expression pure du terroir.
            </p>

            <p className="mt-4 text-sm sm:text-base text-default-500 dark:text-default-400 leading-relaxed max-w-xl">
              Pur jus de fruits anciens suisses et fermentation 100% levures indigènes par Jacques
              Perritaz. {products.length} références d&apos;exception disponibles à la cave.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#catalogue" className="heroui-btn-primary">
                <span>Découvrir la cave</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </a>
              <a href="#commande" className="heroui-btn-secondary">
                <span>Passer la commande</span>
              </a>
            </div>
          </div>
        </section>

        {/* HeroUI Tabs — Barre de Catégories Segmentée */}
        <div id="catalogue" className="mb-8 overflow-x-auto pb-2 scrollbar-none">
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-default-100/80 backdrop-blur-md border border-divider gap-1 shadow-heroui-sm">
            {categories.map((category) => {
              const count = products.filter((p) => p.category === category).length
              if (count === 0) return null
              return (
                <a
                  key={category}
                  href={`#categorie-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-default-600 hover:text-foreground hover:bg-content1 transition-all duration-200 inline-flex items-center gap-2 whitespace-nowrap active:scale-95"
                >
                  <span>{category}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-default-200 text-default-600">
                    {count}
                  </span>
                </a>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Left: products + form */}
          <div className="flex flex-col gap-10">
            {categories.map((category) => {
              const categoryProducts = products.filter((p) => p.category === category)
              if (categoryProducts.length === 0) return null

              return (
                <section
                  key={category}
                  id={`categorie-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="scroll-mt-24"
                >
                  <div className="flex items-center gap-2.5 mb-5">
                    <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                      {category.toLowerCase().includes('cidre') ? (
                        <ProduitsIcon className="w-5 h-5" />
                      ) : (
                        <BottleIcon className="w-5 h-5" />
                      )}
                    </span>
                    <div>
                      <h2 className="font-display font-bold text-2xl text-foreground">
                        {category}
                      </h2>
                      <p className="text-xs text-default-500">
                        {categoryProducts.length} référence{categoryProducts.length > 1 ? 's' : ''}{' '}
                        disponible{categoryProducts.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
            <div id="commande" className="scroll-mt-24">
              <OrderForm items={cart} settings={settings} onSubmit={handleOrder} />
            </div>
          </div>

          {/* Right: cart (sticky on desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Cart items={cart} settings={settings} onCheckout={() => {}} />
            </div>
          </div>
        </div>

        {/* Mobile cart summary */}
        <div className="lg:hidden mt-8">
          <Cart items={cart} settings={settings} onCheckout={() => {}} />
        </div>
      </div>

      {/* Pied de page sombre avec maillage interne, lien externe et mention légale (DESIGN.md §4) */}
      <footer className="mt-12 bg-bg-header dark:bg-bg-header-dark px-4 py-12 text-sm text-white/80">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/10">
            {/* Col 1 & 2 : Présentation & lien externe */}
            <div className="md:col-span-2">
              <p className="font-display font-semibold text-lg text-white">Drinkcider</p>
              <p className="mt-2 text-xs leading-relaxed text-white/70 max-w-md">
                Sélection et distribution artisanale de cidres et poirés d&apos;exception par
                Jacques Perritaz à partir de fruits sauvages et variétés anciennes de Suisse.
                Fermentation 100% levures indigènes, pur jus sans concentré.
              </p>
              <p className="mt-3 text-xs text-white/60">
                Membre et partenaire du patrimoine fruitier et gustatif suisse.{' '}
                <a
                  href="https://www.terroir-fribourg.ch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>Terroir Fribourg</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </p>
            </div>

            {/* Col 3 : La Cave & Navigation interne */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider text-white">La Cave</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Link href="/#catalogue" className="hover:text-white transition-colors">
                    Catalogue des cuvées
                  </Link>
                </li>
                <li>
                  <Link href="/histoire" className="hover:text-white transition-colors">
                    Notre Histoire & Terroir
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat}>
                    <a
                      href={`#categorie-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      className="hover:text-white transition-colors"
                    >
                      {cat}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4 : Informations & Contact */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider text-white">
                Informations
              </p>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Link href="/cgv" className="hover:text-white transition-colors">
                    Conditions de vente
                  </Link>
                </li>
                <li>
                  <Link href="/mentions-legales" className="hover:text-white transition-colors">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link href="/confidentialite" className="hover:text-white transition-colors">
                    Protection des données
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:info@drinkcider.ch"
                    className="hover:text-white transition-colors"
                  >
                    Nous contacter
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-white/60">
            <div>
              <p>© 2026 Drinkcider.ch · Tous droits réservés</p>
              {process.env.NEXT_PUBLIC_COMMIT_SHA && (
                <p className="mt-0.5 font-mono text-[11px] text-white/40">
                  version: {process.env.NEXT_PUBLIC_COMMIT_SHA}{' '}
                  {process.env.NEXT_PUBLIC_STAGE ? `(${process.env.NEXT_PUBLIC_STAGE})` : ''}
                </p>
              )}
            </div>
            <p className="rounded-md bg-[#FDF2F2] px-3.5 py-1.5 text-xs font-medium text-[#C62828] self-start md:self-center">
              La vente d&apos;alcool est interdite aux mineurs.
            </p>
          </div>
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
