'use client'

import { useState } from 'react'
import AdminProductModal, { AdminProduct } from '@/components/AdminProductModal'
import { toggleProductActive } from '@/app/admin/(protected)/produits/actions'
import { formatCHF, proUnitPriceCents } from '@/lib/money'
import { useRouter } from 'next/navigation'

type Row = AdminProduct & { categoryName: string }

interface ProduitsClientProps {
  produits: Row[]
  categories: { id: string; name: string }[]
  proRatePercent: number
  canEdit: boolean
  showMoney: boolean
}

export function ProduitsClient({
  produits,
  categories,
  proRatePercent,
  canEdit,
  showMoney,
}: ProduitsClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<'closed' | 'new' | Row>('closed')

  const stockBasCount = produits.filter((p) => p.active && p.stock <= p.stockSeuil).length

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark">
            Produits
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {produits.length} référence{produits.length > 1 ? 's' : ''}
            {showMoney && ` · prix pro dérivé du taux de ${proRatePercent}%`}
            {!canEdit && ' · consultation seule'}
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setModal('new')}>
            + Ajouter un produit
          </button>
        )}
      </div>

      {stockBasCount > 0 && (
        <div className="flex items-center gap-3 bg-[#FFF8E1] dark:bg-[#3d2a0a] border border-[#FFB300] dark:border-[#FF9800]/40 rounded-lg px-4 py-3 mb-6 text-sm text-text-warning dark:text-[#FF9800]">
          <span>⚠️</span>
          <span>
            <span className="font-semibold">
              {stockBasCount} produit{stockBasCount > 1 ? 's' : ''}
            </span>{' '}
            {stockBasCount > 1 ? 'ont' : 'a'} un stock en dessous du seuil d&apos;alerte.
          </span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark">
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Produit
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Catégorie
              </th>
              {showMoney && (
                <>
                  <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                    Prix public
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                    Prix pro
                  </th>
                </>
              )}
              <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Stock
              </th>
              <th className="text-center px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Boutique
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {produits.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  Aucun produit. Ajoutez votre première référence.
                </td>
              </tr>
            ) : (
              produits.map((p) => {
                const isLowStock = p.active && p.stock <= p.stockSeuil
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                      {p.name}
                      {p.year && (
                        <span className="ml-2 text-xs text-text-tertiary dark:text-text-tertiary-dark">
                          {p.year}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {p.categoryName}
                    </td>
                    {showMoney && (
                      <>
                        <td className="px-4 py-3 text-right text-text-primary dark:text-text-primary-dark">
                          {formatCHF(p.priceCents)}
                        </td>
                        <td className="px-4 py-3 text-right text-accent-mauve-dark dark:text-accent-mauve">
                          {formatCHF(proUnitPriceCents(p.priceCents, proRatePercent))}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                          p.stock === 0
                            ? 'bg-border-light dark:bg-border-dark text-text-tertiary dark:text-text-tertiary-dark'
                            : isLowStock
                              ? 'bg-[#FDF2F2] text-[#C62828]'
                              : 'bg-[#E8F5E9] text-text-success'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          if (!canEdit) return
                          void toggleProductActive(p.id).then(() => router.refresh())
                        }}
                        disabled={!canEdit}
                        className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                          p.active
                            ? 'bg-primary text-text-on-primary'
                            : 'bg-border-light dark:bg-border-dark text-text-tertiary dark:text-text-tertiary-dark'
                        } ${canEdit ? '' : 'cursor-default opacity-70'}`}
                      >
                        {p.active ? 'Visible' : 'Masqué'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <button
                          onClick={() => setModal(p)}
                          className="text-sm text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:underline"
                        >
                          Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modal !== 'closed' && (
        <AdminProductModal
          product={modal === 'new' ? undefined : modal}
          categories={categories}
          proRatePercent={proRatePercent}
          onClose={() => setModal('closed')}
        />
      )}
    </div>
  )
}
