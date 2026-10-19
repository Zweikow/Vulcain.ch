'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AdminDiscountCodeModal, {
  AdminDiscountCode,
} from '@/components/admin/AdminDiscountCodeModal'
import {
  toggleDiscountCodeActive,
  deleteDiscountCode,
} from '@/app/admin/(protected)/promotions/codes-actions'
import { formatCHF } from '@/lib/money'
import { Tag, Copy, Check, Trash2, Edit2, Calendar, AlertCircle } from 'lucide-react'

interface DiscountCodesClientProps {
  codes: AdminDiscountCode[]
  canEdit: boolean
}

export function DiscountCodesClient({ codes, canEdit }: DiscountCodesClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<'closed' | 'new' | AdminDiscountCode>('closed')
  const [deleteTarget, setDeleteTarget] = useState<AdminDiscountCode | null>(null)
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filtered = codes.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  const activeCount = codes.filter((c) => c.active).length

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleDiscountCodeActive(id, !currentActive)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteDiscountCode(deleteTarget.id)
      setDeleteTarget(null)
      router.refresh()
    })
  }

  const formatPeriod = (start: Date | string | null, end: Date | string | null) => {
    if (!start && !end) return 'Illimitée'
    const formatDate = (d: Date | string) =>
      new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (start && end) return `Du ${formatDate(start)} au ${formatDate(end)}`
    if (start) return `Dès le ${formatDate(start)}`
    if (end) return `Jusqu'au ${formatDate(end)}`
    return 'Illimitée'
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête des codes promo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary dark:text-text-primary-dark">
              Codes de réduction
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary-text dark:bg-primary/20">
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Gérez vos codes promotionnels à diffuser sur Instagram ou en boutique (ex: rabais
            d&apos;ouverture, campagnes partenaires).
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setModal('new')}
            className="btn-primary text-xs sm:text-sm flex items-center justify-center gap-2 py-2 px-4 shrink-0"
          >
            <Tag className="w-4 h-4" />
            <span>+ Nouveau code promo</span>
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher un code ou une description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-sm text-xs sm:text-sm"
        />
      </div>

      {/* Tableau des codes de réduction */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
              <th className="text-left px-4 py-3">Code promo</th>
              <th className="text-left px-4 py-3">Réduction</th>
              <th className="text-left px-4 py-3">Conditions & Utilisations</th>
              <th className="text-left px-4 py-3">Période de validité</th>
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
                    ? 'Aucun code promo ne correspond à la recherche.'
                    : 'Aucun code promo configuré. Cliquez sur "+ Nouveau code promo" pour lancer votre campagne Instagram.'}
                </td>
              </tr>
            ) : (
              filtered.map((code) => {
                const isExpired = code.endDate && new Date(code.endDate) < new Date()
                const isExhausted = code.maxUses !== null && code.usedCount >= code.maxUses

                return (
                  <tr
                    key={code.id}
                    className="hover:bg-bg-page/40 dark:hover:bg-bg-page-dark/40 transition-colors"
                  >
                    {/* Code & Description */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark">
                          {code.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(code.code)}
                          className="p-1 text-text-tertiary hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
                          title="Copier le code"
                        >
                          {copiedCode === code.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {code.description && (
                        <div className="text-[11px] text-text-secondary dark:text-text-secondary-dark mt-1 line-clamp-1">
                          {code.description}
                        </div>
                      )}
                    </td>

                    {/* Réduction */}
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                      {code.type === 'PERCENTAGE'
                        ? `−${code.percentage}%`
                        : `−${formatCHF(code.amountCents ?? 0)}`}
                    </td>

                    {/* Conditions */}
                    <td className="px-4 py-3 text-xs text-text-secondary dark:text-text-secondary-dark">
                      <div>
                        {code.minSubtotalCents && code.minSubtotalCents > 0
                          ? `Dès ${formatCHF(code.minSubtotalCents)} d'achat`
                          : "Sans minimum d'achat"}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-text-tertiary dark:text-text-tertiary-dark">
                        {code.maxUses
                          ? `${code.usedCount} / ${code.maxUses} utilisation${code.maxUses > 1 ? 's' : ''}`
                          : `${code.usedCount} utilisation${code.usedCount > 1 ? 's' : ''} (illimité)`}
                      </div>
                    </td>

                    {/* Période */}
                    <td className="px-4 py-3 text-xs text-text-secondary dark:text-text-secondary-dark">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                        <span>{formatPeriod(code.startDate, code.endDate)}</span>
                      </div>
                      {isExpired && (
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block mt-0.5">
                          Expiré
                        </span>
                      )}
                      {isExhausted && !isExpired && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                          Quota atteint
                        </span>
                      )}
                    </td>

                    {/* Statut Toggle */}
                    <td className="px-4 py-3 text-center">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleToggle(code.id, code.active)}
                          disabled={pending}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            code.active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {code.active ? 'Actif' : 'Inactif'}
                        </button>
                      ) : (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            code.active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {code.active ? 'Actif' : 'Inactif'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setModal(code)}
                            className="p-1.5 text-text-tertiary hover:text-text-primary dark:hover:text-text-primary-dark transition-colors rounded-lg hover:bg-bg-page dark:hover:bg-bg-page-dark"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(code)}
                            className="p-1.5 text-text-tertiary hover:text-destructive transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modale d'ajout ou modification */}
      {modal !== 'closed' && (
        <AdminDiscountCodeModal
          discountCode={modal === 'new' ? null : modal}
          onClose={() => setModal('closed')}
        />
      )}

      {/* Modale de confirmation de suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
                Supprimer le code promo ?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-text-secondary-dark mb-4 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le code promo{' '}
              <strong className="font-mono text-text-primary dark:text-text-primary-dark">
                {deleteTarget.code}
              </strong>{' '}
              ? Ce code ne pourra plus être appliqué dans le panier des clients.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={pending}
                className="btn-secondary text-xs sm:text-sm py-2 px-4"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs sm:text-sm transition-colors"
              >
                {pending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
