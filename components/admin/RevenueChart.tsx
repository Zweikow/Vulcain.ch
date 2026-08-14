'use client'

import { useState } from 'react'
import { formatCHF } from '@/lib/money'
import type { ChartBucket } from '@/lib/dashboard'

/**
 * Barres empilées privé (vert) / pro (mauve). Au survol, la barre se surligne,
 * les autres s'estompent et le détail chiffré s'affiche (DESIGN.md §3).
 *
 * Écrit en CSS plutôt qu'avec une bibliothèque : le graphique suit ainsi les
 * jetons de couleur du projet et le thème sombre sans configuration parallèle.
 */
export function RevenueChart({ buckets }: { buckets: ChartBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const totals = buckets.map((b) => b.privateCents + b.proCents)
  const max = Math.max(...totals, 1)
  const grandTotal = totals.reduce((n, t) => n + t, 0)

  if (grandTotal === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-sm text-text-tertiary dark:text-text-tertiary-dark">
        Aucune commande expédiée sur la période. Le graphique se remplira dès la première
        expédition.
      </div>
    )
  }

  return (
    <div>
      <div className="relative h-64" onMouseLeave={() => setHovered(null)}>
        {/* Lignes de repère */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <div
            key={r}
            className="absolute left-0 w-full border-t border-dashed border-border dark:border-border-dark"
            style={{ bottom: `${r * 100}%` }}
          />
        ))}

        <div className="relative flex h-full items-end gap-1.5">
          {buckets.map((bucket, i) => {
            const total = bucket.privateCents + bucket.proCents
            const dimmed = hovered !== null && hovered !== i
            return (
              <div
                key={`${bucket.label}-${i}`}
                className="group relative flex h-full flex-1 flex-col justify-end"
                onMouseEnter={() => setHovered(i)}
              >
                {/* Détail chiffré au survol */}
                {hovered === i && total > 0 && (
                  <div className="absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md border border-border bg-bg-card px-3 py-2 text-xs shadow-lg dark:border-border-dark dark:bg-bg-card-dark">
                    <div className="tabular font-semibold text-text-primary dark:text-text-primary-dark">
                      {formatCHF(total)}
                    </div>
                    <div className="tabular mt-1 flex items-center gap-1.5 text-text-secondary dark:text-text-secondary-dark">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                      Privé {formatCHF(bucket.privateCents)}
                    </div>
                    <div className="tabular flex items-center gap-1.5 text-text-secondary dark:text-text-secondary-dark">
                      <span className="inline-block h-2 w-2 rounded-full bg-accent-mauve-dark" />
                      Pro {formatCHF(bucket.proCents)}
                    </div>
                  </div>
                )}

                <div
                  className={`flex w-full flex-col justify-end transition-opacity ${
                    dimmed ? 'opacity-30' : 'opacity-100'
                  }`}
                  style={{ height: `${(total / max) * 100}%` }}
                >
                  {bucket.proCents > 0 && (
                    <div
                      className="w-full rounded-t-sm bg-accent-mauve-dark"
                      style={{ height: `${(bucket.proCents / Math.max(total, 1)) * 100}%` }}
                    />
                  )}
                  {bucket.privateCents > 0 && (
                    <div
                      className={`w-full bg-primary ${bucket.proCents === 0 ? 'rounded-t-sm' : ''}`}
                      style={{ height: `${(bucket.privateCents / Math.max(total, 1)) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Libellés */}
      <div className="mt-2 flex gap-1.5 border-t border-border pt-2 dark:border-border-dark">
        {buckets.map((b, i) => (
          <div
            key={`label-${b.label}-${i}`}
            className={`flex-1 text-center text-[11px] transition-colors ${
              hovered === i
                ? 'font-semibold text-text-primary dark:text-text-primary-dark'
                : 'text-text-tertiary dark:text-text-tertiary-dark'
            }`}
          >
            {b.label}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <span className="flex items-center gap-2 text-text-secondary dark:text-text-secondary-dark">
          <span className="h-3 w-3 rounded-full bg-primary" />
          Privé (boutique)
        </span>
        <span className="flex items-center gap-2 text-text-secondary dark:text-text-secondary-dark">
          <span className="h-3 w-3 rounded-full bg-accent-mauve-dark" />
          Pro (restaurants)
        </span>
      </div>
    </div>
  )
}
