'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/types'

interface StockEntry {
  id: string
  name: string
  category: string
  currentStock: number
  newStock: number
  changed: boolean
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/produits')
      const data: Product[] = await res.json()
      if (Array.isArray(data)) {
        setStocks(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            currentStock: p.stock,
            newStock: p.stock,
            changed: false,
          }))
        )
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStock = (id: string, value: number) => {
    setStocks((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, newStock: value, changed: value !== s.currentStock }
          : s
      )
    )
  }

  const saveStock = async (entry: StockEntry) => {
    setSaving(entry.id)
    try {
      const res = await fetch(`/api/admin/produits/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: entry.newStock }),
      })

      if (res.ok) {
        setStocks((prev) =>
          prev.map((s) =>
            s.id === entry.id
              ? { ...s, currentStock: entry.newStock, changed: false }
              : s
          )
        )
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
    } finally {
      setSaving(null)
    }
  }

  const saveAllStocks = async () => {
    const changedStocks = stocks.filter((s) => s.changed)
    if (changedStocks.length === 0) return

    setSavingAll(true)
    try {
      await Promise.all(
        changedStocks.map((entry) =>
          fetch(`/api/admin/produits/${entry.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: entry.newStock }),
          })
        )
      )

      setStocks((prev) =>
        prev.map((s) =>
          s.changed ? { ...s, currentStock: s.newStock, changed: false } : s
        )
      )
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
    } finally {
      setSavingAll(false)
    }
  }

  const hasChanges = stocks.some((s) => s.changed)

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
          <h1 className="text-2xl font-semibold text-gray-800">
            Gestion des stocks
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Modifiez rapidement les quantités en stock
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={saveAllStocks}
            disabled={savingAll}
            className="px-4 py-2 bg-[#4a7c59] text-white rounded-lg hover:bg-[#3d6a4b] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {savingAll ? 'Enregistrement...' : 'Tout enregistrer'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Produit
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Catégorie
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Stock actuel
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Nouvelle valeur
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((entry) => (
              <tr
                key={entry.id}
                className={`border-b border-gray-200 last:border-0 ${
                  entry.currentStock === 0
                    ? 'bg-red-50'
                    : entry.currentStock < 10
                    ? 'bg-orange-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 font-medium text-gray-800">
                  {entry.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{entry.category}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      entry.currentStock === 0
                        ? 'bg-red-100 text-red-700'
                        : entry.currentStock < 10
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {entry.currentStock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    value={entry.newStock}
                    onChange={(e) =>
                      updateStock(entry.id, parseInt(e.target.value) || 0)
                    }
                    className={`w-24 px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59] ${
                      entry.changed
                        ? 'border-[#4a7c59] bg-green-50'
                        : 'border-gray-300'
                    }`}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => saveStock(entry)}
                    disabled={!entry.changed || saving === entry.id}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      entry.changed
                        ? 'bg-[#4a7c59] text-white hover:bg-[#3d6a4b]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {saving === entry.id ? '...' : 'Enregistrer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
          <span>Rupture de stock</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
          <span>Stock faible (&lt;10)</span>
        </div>
      </div>
    </div>
  )
}
