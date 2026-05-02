'use client'

import { useState, useEffect } from 'react'
import { Product, Category } from '@/types'

type BadgeVariant = 'success' | 'warning' | 'info'

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode
  variant: BadgeVariant
}) {
  const styles: Record<BadgeVariant, string> = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    info: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[variant]}`}>
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
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-[#4a7c59]' : 'bg-gray-300'
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

interface ProductFormData {
  name: string
  description: string
  price: number
  year: string
  stock: number
  active: boolean
  categoryId: string
}

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<Product | 'new' | null>(null)
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    year: '',
    stock: 0,
    active: true,
    categoryId: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/produits'),
        fetch('/api/admin/categories'),
      ])
      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()

      if (Array.isArray(productsData)) setProducts(productsData)
      if (Array.isArray(categoriesData)) setCategories(categoriesData)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (product: Product | 'new') => {
    if (product === 'new') {
      setFormData({
        name: '',
        description: '',
        price: 0,
        year: '',
        stock: 0,
        active: true,
        categoryId: categories[0]?.id || '',
      })
    } else {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        year: product.year || '',
        stock: product.stock,
        active: product.active,
        categoryId: product.categoryId || '',
      })
    }
    setEditProduct(product)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    setSaving(true)

    try {
      const isNew = editProduct === 'new'
      const url = isNew
        ? '/api/admin/produits'
        : `/api/admin/produits/${(editProduct as Product).id}`

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchData()
        setEditProduct(null)
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (product: Product) => {
    try {
      await fetch(`/api/admin/produits/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      })
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, active: !product.active } : p
        )
      )
    } catch (error) {
      console.error('Erreur toggle:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/produits/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
    setDeleteConfirm(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Produits</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez le catalogue de vos produits
          </p>
        </div>
        <button
          onClick={() => openModal('new')}
          className="px-4 py-2 bg-[#4a7c59] text-white rounded-lg hover:bg-[#3d6a4b] transition-colors flex items-center gap-2"
        >
          <span>+</span>
          Ajouter un produit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Nom
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Catégorie
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Millésime
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Prix CHF
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Stock
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Actif
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Aucun produit. Créez-en un pour commencer.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-200 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {product.year || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {product.stock === 0 ? (
                      <Badge variant="warning">{product.stock}</Badge>
                    ) : product.stock < 10 ? (
                      <Badge variant="info">{product.stock}</Badge>
                    ) : (
                      <span className="text-gray-800">{product.stock}</span>
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
                        onClick={() => openModal(product)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(product.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                      <Toggle
                        checked={product.active}
                        onChange={() => toggleActive(product)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal édition */}
      {editProduct !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editProduct === 'new' ? 'Nouveau produit' : 'Modifier le produit'}
            </h2>

            <div className="flex flex-col gap-4 max-h-[60vh] overflow-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                  placeholder="Nom du produit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix (CHF) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Millésime
                  </label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        year: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                    placeholder="2024"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock *
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      stock: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59]"
                  placeholder="Description du produit"
                />
              </div>

              <div className="flex items-center gap-3">
                <Toggle
                  checked={formData.active}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, active: v }))
                  }
                />
                <label className="text-sm text-gray-700">
                  Produit actif (visible sur le site)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setEditProduct(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="px-4 py-2 bg-[#4a7c59] text-white rounded-lg hover:bg-[#3d6a4b] transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Supprimer le produit ?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Cette action est irréversible.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
