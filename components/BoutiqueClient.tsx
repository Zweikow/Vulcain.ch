'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import DeliveryWarning from '@/components/DeliveryWarning'
import ProductCard from '@/components/ProductCard'
import Cart from '@/components/Cart'
import OrderForm from '@/components/OrderForm'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProductDetailModal from '@/components/ProductDetailModal'
import { CartItem, CustomerInfo, Product } from '@/types'
import { PublicSettings } from '@/lib/settings'
import { Spotlight } from '@/components/ui/spotlight'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wine, Sparkles, ArrowDown } from 'lucide-react'

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
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

  const handleOrder = (_customer: CustomerInfo, orderId: string, totalCents: number) => {
    setConfirmation({ orderId, totalCents })
    setCart([])
  }

  // Catégories ordonnées
  const rawCategories =
    propCategories && propCategories.length > 0
      ? Array.from(new Set([...propCategories, ...products.map((p) => p.category)]))
      : Array.from(new Set(products.map((p) => p.category)))

  const categories = ['all', ...rawCategories]

  const filteredProducts =
    selectedCategory === 'all' ? products : products.filter((p) => p.category === selectedCategory)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <DeliveryWarning />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* HERO SECTION AVEC ACETERNITY SPOTLIGHT */}
        <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-8 sm:p-12 mb-12 shadow-sm">
          {/* Spotlight Aceternity discret vert doux */}
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="rgba(128, 237, 153, 0.15)"
          />

          <div className="relative z-10 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge
                variant="default"
                className="flex items-center gap-1.5 py-1 px-3 bg-primary text-text-on-primary font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cuvées &amp; Millésimes 100% Terroir Suisse</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                Jacques Perritaz · Le Mouret (FR)
              </Badge>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-5xl md:text-6xl text-foreground leading-[1.1] tracking-tight">
              Cidres &amp; poirés d&apos;auteurs suisses.
            </h1>

            <p className="mt-4 font-display italic text-xl sm:text-2xl text-primary font-medium">
              L&apos;expression pure et vivante du fruit sauvage.
            </p>

            <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
              Fruits issus d&apos;arbres haute-tige séculaires du terroir fribourgeois. Fermentation
              naturelle intégrale en levures indigènes, sans concentré ni levurage artificiel.{' '}
              {products.length} références d&apos;exception disponibles à la cave.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="default"
                size="lg"
                className="rounded-xl font-semibold gap-2 shadow-sm"
              >
                <a href="#catalogue">
                  <Wine className="w-4 h-4" />
                  <span>Explorer les cuvées</span>
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl font-semibold gap-2"
              >
                <a href="#commande">
                  <ArrowDown className="w-4 h-4" />
                  <span>Passer commande</span>
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* BARRE DE FILTRES PAR CATÉGORIE SHADCN */}
        <div id="catalogue" className="mb-8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
                La Cave du Vulcain
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bouteilles et cartons expédiés directement depuis notre domaine
              </p>
            </div>

            {/* Pill Tabs de sélection */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-secondary/60 border border-border/50">
              {categories.map((cat) => {
                const label = cat === 'all' ? 'Toutes les cuvées' : cat
                const isSelected = selectedCategory === cat
                const count =
                  cat === 'all'
                    ? products.length
                    : products.filter((p) => p.category === cat).length

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-card text-foreground shadow-xs border border-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-muted-foreground/70'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* LAYOUT PRINCIPAL : GRILLE DE PRODUITS + PANIER INTERACTIF */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Grille des produits & Formulaire de commande */}
          <div className="flex flex-col gap-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
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

            {/* Formulaire de commande */}
            <div id="commande" className="pt-8 border-t border-border/60">
              <OrderForm items={cart} settings={settings} onSubmit={handleOrder} />
            </div>
          </div>

          {/* Panier latéral collant sur Desktop (Sticky) */}
          <div className="hidden lg:block sticky top-24">
            <Cart
              items={cart}
              settings={settings}
              onCheckout={() => {}}
              onUpdateQuantity={setProductQuantity}
              onRemoveItem={removeFromCart}
            />
          </div>
        </div>

        {/* Panier résumé sur Mobile (en bas de catalogue) */}
        <div className="lg:hidden mt-12">
          <Cart
            items={cart}
            settings={settings}
            onCheckout={() => {}}
            onUpdateQuantity={setProductQuantity}
            onRemoveItem={removeFromCart}
          />
        </div>
      </main>

      {/* MODALE DÉTAIL PRODUIT SHADCN */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          quantity={getQuantity(selectedProduct.id)}
          onAdd={() => addToCart(selectedProduct.id)}
          onRemove={() => removeFromCart(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* MODALE DE CONFIRMATION */}
      {confirmation && (
        <ConfirmationModal
          orderId={confirmation.orderId}
          totalCents={confirmation.totalCents}
          onClose={() => setConfirmation(null)}
        />
      )}

      {/* FOOTER NOCTURNE ARTISANAL & ÉDITORIAL */}
      <footer className="mt-20 border-t border-border bg-card/50 text-muted-foreground text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-border/50">
            {/* Col 1 & 2 : Présentation & Terroir Fribourg */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/logo-drinkcider.svg"
                  alt="Cidrerie du Vulcain"
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover border border-border/80 shadow-xs"
                />
                <span className="font-display font-bold text-base text-foreground">
                  Cidrerie du Vulcain
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Production et distribution artisanale de cidres, poirés et cormés d&apos;auteurs par
                Jacques Perritaz au Mouret (Canton de Fribourg, Suisse). Fruits sauvages non traités
                issus de vergers traditionnels à haute-tige.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground/80 mt-1">
                <span>
                  Partenaire actif :{' '}
                  <a
                    href="https://www.terroir-fribourg.ch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors underline font-medium"
                  >
                    Terroir Fribourg ↗
                  </a>
                </span>
                <span>·</span>
                <span>
                  Instagram :{' '}
                  <a
                    href="https://www.instagram.com/drinkcider.ch/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors underline font-medium"
                  >
                    @drinkcider.ch ↗
                  </a>
                </span>
              </div>
            </div>

            {/* Col 3 : Navigation */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider text-foreground mb-3">
                La Cave
              </p>
              <ul className="space-y-2">
                <li>
                  <Link href="/#catalogue" className="hover:text-foreground transition-colors">
                    Catalogue des millésimes
                  </Link>
                </li>
                <li>
                  <Link href="/histoire" className="hover:text-foreground transition-colors">
                    Notre histoire &amp; méthode
                  </Link>
                </li>
                <li>
                  <a href="#commande" className="hover:text-foreground transition-colors">
                    Commander en ligne
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4 : Informations Légales */}
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider text-foreground mb-3">
                Informations &amp; Vente
              </p>
              <ul className="space-y-2">
                <li>
                  <Link href="/cgv" className="hover:text-foreground transition-colors">
                    Conditions Générales de Vente
                  </Link>
                </li>
                <li>
                  <Link
                    href="/mentions-legales"
                    className="hover:text-foreground transition-colors"
                  >
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link href="/confidentialite" className="hover:text-foreground transition-colors">
                    Protection des données
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-muted-foreground/70 text-[11px]">
            <span>
              &copy; {new Date().getFullYear()} Cidrerie du Vulcain · Tous droits réservés.
            </span>
            <span>
              Expédition réservée aux personnes majeures en Suisse · Facture avec QR-code suisse
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
