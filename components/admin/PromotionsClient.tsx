'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AdminPromoModal, {
  AdminPromotion,
  PromoProductItem,
} from '@/components/admin/AdminPromoModal'
import { togglePromotionActive, deletePromotion } from '@/app/admin/(protected)/promotions/actions'
import { formatCHF } from '@/lib/money'
import {
  PromoIcon,
  GiftIcon,
  CoinsIcon,
  AlertCircleIcon,
  CloseIcon,
} from '@/components/admin/AdminIcons'

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

  const [deleteTarget, setDeleteTarget] = useState<PromotionRow | null>(null)
  const [archiveAssociatedProduct, setArchiveAssociatedProduct] = useState(false)

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      await togglePromotionActive(id, !currentActive)
      router.refresh()
    })
  }

  const confirmDeletePromotion = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      await deletePromotion(deleteTarget.id, { archiveProduct: archiveAssociatedProduct })
      setDeleteTarget(null)
      setArchiveAssociatedProduct(false)
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
                      <span className="text-[11px] text-text-tertiary">-</span>
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
                          onClick={() => {
                            setDeleteTarget(promo)
                            setArchiveAssociatedProduct(false)
                          }}
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

      {/* Modale de confirmation de suppression sécurisée */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-bg-card dark:bg-bg-card-dark rounded-xl border border-border dark:border-border-dark shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircleIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
                  Supprimer l&apos;offre « {deleteTarget.name} » ?
                </h3>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
                  Vérifiez les conséquences ci-dessous avant de confirmer la suppression.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setArchiveAssociatedProduct(false)
                }}
                className="text-text-tertiary hover:text-text-primary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Récapitulatif du produit lié */}
            <div className="p-3.5 rounded-lg bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark space-y-1.5 text-xs">
              <div className="font-semibold text-text-primary dark:text-text-primary-dark">
                Article concerné : {deleteTarget.productName}
              </div>
              <div className="text-text-secondary dark:text-text-secondary-dark flex flex-wrap gap-x-3 gap-y-1">
                <span>
                  Catégorie : <strong>{deleteTarget.categoryName || 'Aucune'}</strong>
                </span>
                <span>
                  Prix : <strong>{formatCHF(deleteTarget.productPriceCents)}</strong>
                </span>
                <span>
                  Contenance : <strong>{deleteTarget.productBottleSize}</strong>
                </span>
              </div>
              <div className="text-[11px] text-text-tertiary pt-1 border-t border-border/60 dark:border-border-dark/60">
                Règle actuelle :{' '}
                {deleteTarget.type === 'BUY_X_GET_Y_FREE'
                  ? `${deleteTarget.buyQuantity} achetés = ${deleteTarget.getFreeQuantity} offert`
                  : deleteTarget.type === 'PERCENTAGE'
                    ? `-${deleteTarget.discountPercent}%`
                    : `-${formatCHF(deleteTarget.discountCents ?? 0)}`}
                {deleteTarget.badgeText ? ` · Ruban : « ${deleteTarget.badgeText} »` : ''}
              </div>
            </div>

            {/* Avertissement clair */}
            <div className="text-xs text-text-secondary dark:text-text-secondary-dark space-y-2">
              <p>
                <strong>Conséquences de la suppression :</strong> La réduction et le ruban boutique
                seront supprimés. Par défaut, l&apos;article{' '}
                <strong>{deleteTarget.productName}</strong> restera dans le catalogue au tarif
                normal dans sa catégorie ({deleteTarget.categoryName || 'actuelle'}).
              </p>
            </div>

            {/* Option d'archivage du produit lié */}
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer">
              <input
                type="checkbox"
                checked={archiveAssociatedProduct}
                onChange={(e) => setArchiveAssociatedProduct(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary"
              />
              <div className="text-xs">
                <span className="font-semibold text-text-primary dark:text-text-primary-dark block">
                  Archiver également le produit « {deleteTarget.productName} »
                </span>
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  Cochez cette case s&apos;il s&apos;agissait d&apos;un pack promotionnel éphémère
                  ou d&apos;un test que vous souhaitez retirer de la boutique.
                </span>
              </div>
            </label>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setArchiveAssociatedProduct(false)
                }}
                disabled={pending}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeletePromotion}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                {pending
                  ? 'Suppression...'
                  : archiveAssociatedProduct
                    ? "Supprimer l'offre et archiver le produit"
                    : "Supprimer l'offre uniquement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
