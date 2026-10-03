'use client'

import { useState } from 'react'
import AdminProductModal, { AdminProduct } from '@/components/AdminProductModal'
import {
  toggleProductActive,
  updateProductStockInline,
} from '@/app/admin/(protected)/produits/actions'
import { formatCHF, proUnitPriceCents } from '@/lib/money'
import { useRouter } from 'next/navigation'
import { OriginBadge } from '@/components/OriginBadge'
import { AlertCircleIcon, LeafIcon, SproutIcon } from '@/components/admin/AdminIcons'
import { Pencil, Camera, Search, Eye, EyeOff } from 'lucide-react'

type Row = AdminProduct & {
  categoryName: string
  articleNumber: number
  producerName?: string | null
}

interface ProduitsClientProps {
  produits: Row[]
  categories: { id: string; name: string }[]
  producers: { id: string; name: string }[]
  proRatePercent: number
  canEdit: boolean
  showMoney: boolean
}

export function ProduitsClient({
  produits,
  categories,
  producers,
  proRatePercent,
  canEdit,
  showMoney,
}: ProduitsClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<'closed' | 'new' | Row>('closed')
  const [search, setSearch] = useState('')

  const filteredProduits = produits.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      p.articleNumber.toString().includes(search)
  )

  const stockBasCount = filteredProduits.filter((p) => p.active && p.stock <= p.stockSeuil).length

  const exportCSV = () => {
    const headers = [
      'Article-Nr',
      'Produit',
      'Catégorie',
      'Millésime',
      'Prix Public (CHF)',
      'Stock',
      'Seuil',
      'Visible',
      'Bio',
      'Vegan',
    ]

    const rows = filteredProduits.map((p) => [
      p.articleNumber.toString().padStart(5, '0'),
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.categoryName.replace(/"/g, '""')}"`,
      p.year ?? '',
      (p.priceCents / 100).toFixed(2),
      p.stock,
      p.stockSeuil,
      p.active ? 'Oui' : 'Non',
      p.isBio ? 'Oui' : 'Non',
      p.isVegan ? 'Oui' : 'Non',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `inventaire_drinkcider_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      {/* En-tête responsive : s'adapte parfaitement sur mobile comme sur desktop */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl sm:text-[26px] text-text-primary dark:text-text-primary-dark">
            Produits
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {produits.length} référence{produits.length > 1 ? 's' : ''}
            {showMoney && ` · prix pro −${proRatePercent}%`}
            {!canEdit && ' · consultation seule'}
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              className="btn-secondary text-xs sm:text-sm flex-1 sm:flex-none min-h-[44px] sm:min-h-9 flex items-center justify-center font-medium"
              onClick={exportCSV}
            >
              Exporter CSV
            </button>
            {canEdit && (
              <button
                className="btn-primary text-xs sm:text-sm flex-1 sm:flex-none min-h-[44px] sm:min-h-9 flex items-center justify-center font-semibold"
                onClick={() => setModal('new')}
              >
                + Ajouter un produit
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher (nom, cat, réf)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full pl-9 text-sm min-h-[44px] sm:min-h-9"
            />
          </div>
        </div>
      </div>

      {stockBasCount > 0 && (
        <div className="flex items-center gap-3 bg-[#FFF8E1] dark:bg-[#3d2a0a] border border-[#FFB300] dark:border-[#FF9800]/40 rounded-lg px-4 py-3 mb-6 text-sm text-text-warning dark:text-[#FF9800]">
          <AlertCircleIcon className="w-5 h-5 shrink-0 text-[#FF9800]" />
          <span>
            <span className="font-semibold">
              {stockBasCount} produit{stockBasCount > 1 ? 's' : ''}
            </span>{' '}
            {stockBasCount > 1 ? 'ont' : 'a'} un stock en dessous du seuil d&apos;alerte.
          </span>
        </div>
      )}

      {/* VUE MOBILE (< 768px) : Cartes tactiles ultra-ergonomiques avec bouton Modifier et photo directement accessibles */}
      <div className="md:hidden flex flex-col gap-3">
        {filteredProduits.length === 0 ? (
          <div className="card p-8 text-center text-text-tertiary dark:text-text-tertiary-dark text-sm">
            {search
              ? 'Aucun produit ne correspond à votre recherche.'
              : 'Aucun produit. Ajoutez votre première référence.'}
          </div>
        ) : (
          filteredProduits.map((p) => {
            const isLowStock = p.active && p.stock <= p.stockSeuil
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (canEdit) setModal(p)
                }}
                className={`card p-4 transition-all duration-150 flex flex-col gap-3 border shadow-xs active:scale-[0.99] ${
                  canEdit ? 'cursor-pointer hover:border-primary/50' : ''
                }`}
              >
                {/* Ligne 1 : Vignette Photo + Nom + Millésime + Bouton Modifier */}
                <div className="flex items-start gap-3">
                  {/* Vignette Image cliquable */}
                  <div
                    className="relative w-16 h-16 rounded-xl bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group"
                    title={canEdit ? 'Cliquer pour modifier le produit et sa photo' : undefined}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground p-1 text-center">
                        <Camera className="w-5 h-5 text-primary opacity-70 mb-0.5" />
                        <span className="text-[8px] font-semibold text-primary leading-tight">
                          + Photo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Infos principales */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <OriginBadge origin={p.origin} className="w-3.5 h-3.5 shrink-0" />
                      <h3 className="font-semibold text-sm text-text-primary dark:text-text-primary-dark leading-snug">
                        {p.name}
                      </h3>
                      {p.year && (
                        <span className="text-xs font-mono text-text-tertiary dark:text-text-tertiary-dark font-medium">
                          {p.year}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-text-secondary dark:text-text-secondary-dark">
                      <span className="font-medium text-xs text-text-primary dark:text-text-primary-dark">
                        {p.bottleSize === '27.5cl' ? '27.5 cl' : '75 cl'}
                      </span>
                      <span>·</span>
                      <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
                        {p.categoryName}
                      </span>
                      {p.isBio && (
                        <span
                          className="inline-flex items-center text-emerald-600 gap-0.5"
                          title="Certifié Bio"
                        >
                          <LeafIcon className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Bio</span>
                        </span>
                      )}
                      {p.isVegan && (
                        <span
                          className="inline-flex items-center text-emerald-500 gap-0.5"
                          title="Certifié Vegan"
                        >
                          <SproutIcon className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Vegan</span>
                        </span>
                      )}
                      {p.bottlesPerUnit > 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-accent-navy/10 dark:bg-accent-navy/40 text-text-secondary border border-border">
                          Carton {p.bottlesPerUnit}b
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-text-tertiary dark:text-text-tertiary-dark font-mono mt-0.5">
                      Art. {p.articleNumber.toString().padStart(5, '0')}
                      {p.producerName && ` · ${p.producerName}`}
                    </div>
                  </div>

                  {/* Bouton Modifier bien visible sous le pouce (min 44px de hauteur tactile) */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setModal(p)
                      }}
                      className="shrink-0 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-primary/25 shadow-2xs min-h-[44px] active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5 shrink-0" />
                      <span>Modifier</span>
                    </button>
                  )}
                </div>

                {/* Ligne 2 : Prix, Stock & Visibilité Boutique */}
                <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-xs">
                  {/* Prix public & Prix pro */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm text-text-primary dark:text-text-primary-dark font-mono tabular">
                      {formatCHF(p.priceCents)}
                    </span>
                    {showMoney && (
                      <span
                        className="text-[11px] text-accent-mauve-dark dark:text-accent-mauve font-mono tabular"
                        title="Prix Pro"
                      >
                        Pro: {formatCHF(proUnitPriceCents(p.priceCents, proRatePercent))}
                      </span>
                    )}
                  </div>

                  {/* Stock & Boutique */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-mono font-medium ${
                        p.stock === 0
                          ? 'bg-border-light dark:bg-border-dark text-text-tertiary dark:text-text-tertiary-dark'
                          : isLowStock
                            ? 'bg-[#FDF2F2] text-[#C62828] border border-[#F3D5D5]'
                            : 'bg-[#E8F5E9] text-text-success border border-[#CDE8D4]'
                      }`}
                    >
                      Stock : {p.stock}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!canEdit) return
                        void toggleProductActive(p.id).then(() => router.refresh())
                      }}
                      disabled={!canEdit}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors flex items-center gap-1 min-h-[32px] ${
                        p.active
                          ? 'bg-primary text-text-on-primary'
                          : 'bg-muted text-muted-foreground'
                      } ${canEdit ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                    >
                      {p.active ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span>{p.active ? 'Visible' : 'Masqué'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* VUE TABLETTE & DESKTOP (>= 768px) : Table complète avec scroll horizontal fluide */}
      <div className="hidden md:block card overflow-x-auto">
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
              <th className="px-4 py-3 text-right font-medium text-text-secondary dark:text-text-secondary-dark">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProduits.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-text-tertiary dark:text-text-tertiary-dark"
                >
                  {search
                    ? 'Aucun produit ne correspond à votre recherche.'
                    : 'Aucun produit. Ajoutez votre première référence.'}
                </td>
              </tr>
            ) : (
              filteredProduits.map((p) => {
                const isLowStock = p.active && p.stock <= p.stockSeuil
                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      if (canEdit) setModal(p)
                    }}
                    className={`border-b border-border dark:border-border-dark last:border-0 hover:bg-bg-page/50 dark:hover:bg-bg-page-dark/50 ${
                      canEdit ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-text-primary-dark">
                      <div className="flex items-center gap-3">
                        {/* Vignette miniature */}
                        <div className="w-10 h-10 rounded-lg bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <Camera className="w-4 h-4 text-muted-foreground opacity-40" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <OriginBadge origin={p.origin} className="w-4 h-4" />
                            <span>{p.name}</span>
                            <span className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
                              {p.bottleSize === '27.5cl' ? '27.5 cl' : '75 cl'}
                            </span>
                            {p.year && (
                              <span className="ml-1.5 text-xs text-text-tertiary dark:text-text-tertiary-dark">
                                {p.year}
                              </span>
                            )}
                            {p.isBio && (
                              <span
                                className="ml-2 inline-flex items-center text-emerald-600"
                                title="Certifié Bio"
                              >
                                <LeafIcon className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {p.isVegan && (
                              <span
                                className="ml-1 inline-flex items-center text-emerald-500"
                                title="Certifié Vegan"
                              >
                                <SproutIcon className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {p.bottlesPerUnit > 1 && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-navy/10 dark:bg-accent-navy/40 text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark">
                                Carton {p.bottlesPerUnit} bout.
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-text-tertiary dark:text-text-tertiary-dark font-mono mt-0.5 opacity-75">
                            <span>Article-Nr. {p.articleNumber.toString().padStart(5, '0')}</span>
                            {p.producerName && <span>· {p.producerName}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-text-secondary-dark">
                      {p.categoryName}
                    </td>
                    {showMoney && (
                      <>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-text-primary dark:text-text-primary-dark font-medium">
                              {formatCHF(p.priceCents)}
                            </span>
                            {p.compareAtPriceCents && p.compareAtPriceCents > p.priceCents && (
                              <span className="text-[10px] line-through text-text-tertiary dark:text-text-tertiary-dark font-mono">
                                {formatCHF(p.compareAtPriceCents)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-accent-mauve-dark dark:text-accent-mauve">
                          {formatCHF(proUnitPriceCents(p.priceCents, proRatePercent))}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <input
                          type="number"
                          min="0"
                          defaultValue={p.stock}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val) && val !== p.stock) {
                              void updateProductStockInline(p.id, val).then(() => router.refresh())
                            }
                          }}
                          className={`w-16 text-right px-2 py-1 rounded-md text-sm border font-medium ${
                            p.stock === 0
                              ? 'bg-border-light dark:bg-border-dark text-text-tertiary dark:text-text-tertiary-dark border-transparent'
                              : isLowStock
                                ? 'bg-[#FDF2F2] text-[#C62828] border-[#F3D5D5]'
                                : 'bg-[#E8F5E9] text-text-success border-[#CDE8D4]'
                          }`}
                        />
                      ) : (
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
                      )}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setModal(p)
                          }}
                          className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Modifier</span>
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
          producers={producers}
          proRatePercent={proRatePercent}
          onClose={() => setModal('closed')}
        />
      )}
    </div>
  )
}
