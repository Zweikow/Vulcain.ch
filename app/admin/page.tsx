'use client'

import { useState } from 'react'
import { Product } from '@/types'
import { PRODUCTS } from '@/lib/data'
import AdminProductModal from '@/components/AdminProductModal'
import Link from 'next/link'

type BadgeVariant = 'success' | 'warning' | 'info'

function Badge({ children, variant }: { children: React.ReactNode; variant: BadgeVariant }) {
  const styles: Record<BadgeVariant, string> = {
    success:
      'bg-[#E8F5E9] dark:bg-[#1e3326] text-text-success dark:text-[#81C784]',
    warning:
      'bg-[#FFF8E1] dark:bg-[#3d2a0a] text-text-warning dark:text-[#FF9800]',
    info: 'bg-[#E3F2FD] dark:bg-[#1a2a3d] text-[#1565C0] dark:text-[#64B5F6]',
  }
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-pill ${styles[variant]}`}
    >
      {children}
    </span>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-pill transition-colors ${
        checked ? 'bg-primary' : 'bg-border dark:bg-border-dark'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS)
  const [editProduct, setEditProduct] = useState<Product | null | 'new'>(null)

  const toggleActive = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    )
  }

  const deleteProduct = (id: string) => {
    if (confirm('Supprimer ce produit ?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const saveProduct = (data: Omit<Product, 'id'> & { id?: string }) => {
    if (data.id) {
      setProducts((prev) =>
        prev.map((p) => (p.id === data.id ? { ...p, ...data, id: p.id } : p))
      )
    } else {
      const newProduct: Product = {
        ...data,
        id: String(Date.now()),
      }
      setProducts((prev) => [...prev, newProduct])
    }
    setEditProduct(null)
  }

  return (
    <div className="min-h-screen flex bg-bg-page dark:bg-bg-page-dark">
      {/* Sidebar */}
      <aside className="w-56 bg-bg-sidebar dark:bg-bg-sidebar-dark text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="font-display font-semibold text-sm leading-tight">
            Cidrerie de Vulcain
          </div>
          <div className="text-xs opacity-60 mt-0.5">Administration</div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <span>📊</span>
            <span>Tableau de bord</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm bg-white/15 font-medium"
          >
            <span>🍎</span>
            <span>Produits</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <span>📦</span>
            <span>Commandes</span>
          </Link>
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <span>🚪</span>
            <span>Déconnexion</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary-dark">
              Produits
            </h1>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
              Gérez le catalogue de vos produits
            </p>
          </div>
          <button
            onClick={() => setEditProduct('new')}
            className="btn-primary flex items-center gap-2"
          >
            <span>+</span>
            Ajouter un produit
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark">
                <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Nom
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Catégorie
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Prix
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Stock
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Statut
                </th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={product.id}
                  className={`border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50 transition-colors`}
                >
                  <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark">
                    CHF {product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {product.stock === 0 ? (
                      <Badge variant="warning">{product.stock}</Badge>
                    ) : product.stock < 10 ? (
                      <Badge variant="info">{product.stock}</Badge>
                    ) : (
                      <span className="text-text-primary dark:text-text-primary-dark">
                        {product.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {product.active ? (
                      <Badge variant="success">Actif</Badge>
                    ) : (
                      <Badge variant="warning">Inactif</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditProduct(product)}
                        className="text-text-tertiary dark:text-text-tertiary-dark hover:text-text-primary dark:hover:text-text-primary-dark p-1 transition-colors"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="text-text-tertiary dark:text-text-tertiary-dark hover:text-text-error dark:hover:text-[#EF5350] p-1 transition-colors"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                      <Toggle
                        checked={product.active}
                        onChange={() => toggleActive(product.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {editProduct !== null && (
        <AdminProductModal
          product={editProduct === 'new' ? undefined : editProduct}
          onSave={saveProduct}
          onClose={() => setEditProduct(null)}
        />
      )}
    </div>
  )
}
