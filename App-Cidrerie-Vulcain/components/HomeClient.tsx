'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import DeliveryWarning from '@/components/DeliveryWarning'
import ProductCard from '@/components/ProductCard'
import Cart from '@/components/Cart'
import OrderForm from '@/components/OrderForm'
import ConfirmationModal from '@/components/ConfirmationModal'
import { CartItem, CustomerInfo, Product, Category } from '@/types'

interface HomeClientProps {
  initialProducts: Product[]
  initialCategories?: Category[]
}

// Icônes par défaut pour les catégories
const categoryIcons: Record<string, string> = {
  'cidres': '🍎',
  'cidre': '🍎',
  'eaux-de-vie': '🍶',
  'eau-de-vie': '🍶',
  'liqueurs': '🍾',
  'liqueur': '🍾',
  'cuisine': '🍳',
}

export default function HomeClient({ initialProducts, initialCategories = [] }: HomeClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [confirmation, setConfirmation] = useState<{
    orderId: string
    total: number
  } | null>(null)

  // Grouper les produits actifs par catégorie
  const productsByCategory = useMemo(() => {
    const activeProducts = initialProducts.filter((p) => p.active)
    
    // Si on a des catégories de Strapi, les utiliser
    if (initialCategories.length > 0) {
      return initialCategories
        .sort((a, b) => a.order - b.order)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: categoryIcons[cat.slug.toLowerCase()] || '📦',
          products: activeProducts.filter((p) => p.category === cat.name),
        }))
        .filter((cat) => cat.products.length > 0)
    }
    
    // Fallback: grouper par le champ category du produit
    const categories = new Map<string, Product[]>()
    activeProducts.forEach((p) => {
      const cat = p.category || 'Autres'
      if (!categories.has(cat)) {
        categories.set(cat, [])
      }
      categories.get(cat)!.push(p)
    })
    
    return Array.from(categories.entries()).map(([name, products]) => ({
      id: name,
      name,
      slug: name.toLowerCase(),
      icon: categoryIcons[name.toLowerCase()] || '📦',
      products,
    }))
  }, [initialProducts, initialCategories])

  const getQuantity = (productId: string) =>
    cart.find((i) => i.product.id === productId)?.quantity ?? 0

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const product = initialProducts.find((p) => p.id === productId)!
      // Vérifier le stock
      const currentQty = prev.find((i) => i.product.id === productId)?.quantity ?? 0
      if (currentQty >= product.stock) {
        return prev // Ne pas dépasser le stock
      }
      
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
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    )
  }

  const handleOrder = (_customer: CustomerInfo, orderId: string, total: number) => {
    setConfirmation({ orderId, total })
    setCart([])
  }

  return (
    <div className="min-h-screen">
      <Header />
      <DeliveryWarning />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Left: products + form */}
          <div className="flex flex-col gap-8">
            {productsByCategory.map((category) => (
              <section key={category.id}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-primary">{category.icon}</span>
                  <h2 className="font-display font-semibold text-text-primary dark:text-text-primary-dark">
                    {category.name}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {category.products.map((product) => (
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
            ))}

            {productsByCategory.length === 0 && (
              <div className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                <p>Aucun produit disponible pour le moment.</p>
                <p className="text-sm mt-2">Revenez bientôt !</p>
              </div>
            )}

            {/* Formulaire commande */}
            <OrderForm items={cart} onSubmit={handleOrder} />
          </div>

          {/* Panier desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <Cart items={cart} onCheckout={() => {}} />
            </div>
          </div>
        </div>

        {/* Panier mobile */}
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
