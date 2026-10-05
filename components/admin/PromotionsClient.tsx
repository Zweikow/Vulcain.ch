'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AdminPromoModal, {
  AdminPromotion,
  PromoProductItem,
} from '@/components/admin/AdminPromoModal'
import { togglePromotionActive, deletePromotion } from '@/app/admin/(protected)/promotions/actions'
import { formatCHF } from '@/lib/money'
import { PromoIcon, GiftIcon, CoinsIcon } from '@/components/admin/AdminIcons'

export type PromotionRow = AdminPromotion & {
  productName: string
  productBottleSize: string
  productBottlesPerUnit: number
  productPriceCents: number
  categoryName?: string
}

interface PromotionsClientProps {
  promotions: PromotionRow[]
  products: PromoProductItem[]
  canEdit: boolean
}

export function PromotionsClient({ promotions, products, canEdit }: PromotionsClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<'closed' | 'new' | PromotionRow>('closed')
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')

  const filtered = promotions.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.productName.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = promotions.filter((p) => p.active).length

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      await togglePromotionActive(id, !currentActive)
      router.refresh()
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement l'offre "${name}" ?`)) return
    startTransition(async () => {
      await deletePromotion(id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary dark:text-text-primary-dark">
              Offres & Promotions
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary-text dark:bg-primary/20">
              {activeCount} active{activeCount > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Pilotez les réductions, rubans et offres promotionnelles (ex: 3 achetés = 1 offert)
            affichés sur la boutique.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setModal('new')}
            className="btn-primary text-xs sm:text-sm flex items-center justify-center gap-2 py-2 px-4 shrink-0"
          >
            <PromoIcon className="w-4 h-4" />
            <span>+ Nouvelle offre</span>
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher une promotion ou un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-sm text-xs sm:text-sm"
        />
      </div>

      {/* Tableau des promotions */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
              <th className="text-left px-4 py-3">Offre</th>
              <th className="text-left px-4 py-3">Produit concerné</th>
              <th className="text-left px-4 py-3">Type & Règle</th>
              <th className="text-center px-4 py-3">Ruban boutique</th>
              <th className="text-center px-4 py-3">Statut</th>
              {canEdit && <th className="text-right px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border-dark">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-text-tertiary dark:text-text-tertiary-dark text-xs sm:text-sm"
                >
                  {search
                    ? 'Aucune promotion ne correspond à la recherche.'
                    : 'Aucune offre promotionnelle configurée. Cliquez sur "+ Nouvelle offre" pour en créer une.'}
                </td>
              </tr>
            ) : (
              filtered.map((promo) => (
                <tr
                  key={promo.id}
                  className="hover:bg-bg-page/40 dark:hover:bg-bg-page-dark/40 transition-colors"
                >
                  {/* Nom */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text-primary dark:text-text-primary-dark">
                      {promo.name}
                    </div>
                    {promo.description && (
                      <div className="text-[11px] text-text-secondary dark:text-text-secondary-dark line-clamp-1">
                        {promo.description}
                      </div>
                    )}
                  </td>

                  {/* Produit */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary dark:text-text-primary-dark">
                      {promo.productName}
                    </div>
                    <div className="text-[11px] text-text-tertiary flex items-center gap-1.5 font-mono">
                      <span>{promo.productBottleSize}</span>
                      <span>·</span>
                      <span>
                        {promo.productBottlesPerUnit > 1
                          ? `Carton ${promo.productBottlesPerUnit} bout.`
                          : '1 bout.'}
                      </span>
                      <span>·</span>
                      <span>{formatCHF(promo.productPriceCents)}</span>
                    </div>
                  </td>

                  {/* Règle */}
                  <td className="px-4 py-3">
                    {promo.type === 'BUY_X_GET_Y_FREE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-primary/15 text-text-primary dark:text-text-primary-dark">
                        <GiftIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {promo.buyQuantity} achetés = {promo.getFreeQuantity} offert
                        </span>
                      </span>
                    )}
                    {promo.type === 'PERCENTAGE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-accent-rose/30 dark:bg-accent-rose-dark/30 text-accent-rose-dark dark:text-accent-rose">
                        <PromoIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>−{promo.discountPercent}%</span>
                      </span>
                    )}
                    {promo.type === 'FIXED_DISCOUNT' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-secondary/15 text-secondary dark:text-text-secondary-dark">
                        <CoinsIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>−{formatCHF(promo.discountCents ?? 0)}</span>
                      </span>
                    )}
                  </td>

                  {/* Ruban boutique */}
                  <td className="px-4 py-3 text-center">
                    {promo.badgeText ? (
                      <div className="inline-flex items-center justify-center">
                        <span
                          className="bg-[#B8837E] dark:bg-[#977390] text-white font-bold text-[11px] px-2.5 py-0.5 shadow-xs"
                          style={{
                            clipPath:
                              'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)',
                          }}
                        >
                          {promo.badgeText}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-tertiary">—</span>
                    )}
                  </td>

                  {/* Statut Toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => canEdit && handleToggle(promo.id, promo.active)}
                      disabled={!canEdit || pending}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        promo.active
                          ? 'bg-text-success/15 text-text-success hover:bg-text-success/25'
                          : 'bg-border-light dark:bg-border-dark text-text-tertiary hover:bg-border'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                      {promo.active ? 'Active' : 'Désactivée'}
                    </button>
                  </td>

                  {/* Actions */}
                  {canEdit && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal(promo)}
                          className="text-xs font-medium text-text-secondary hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
                        >
                          Modifier
                        </button>
                        <span className="text-border">·</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(promo.id, promo.name)}
                          className="text-xs font-medium text-text-error hover:underline transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Création / Édition */}
      {modal !== 'closed' && (
        <AdminPromoModal
          promotion={modal === 'new' ? undefined : modal}
          products={products}
          onClose={() => setModal('closed')}
        />
      )}
    </div>
  )
}
