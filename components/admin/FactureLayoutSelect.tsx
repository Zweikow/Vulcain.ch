'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface FactureLayoutSelectProps {
  forcedLayout: 'auto' | 'single' | 'multipage'
  itemCount: number
}

export function FactureLayoutSelect({ forcedLayout, itemCount }: FactureLayoutSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isAutoTwoPages = itemCount >= 3
  const effectivePages =
    forcedLayout === 'multipage' ? 2 : forcedLayout === 'single' ? 1 : isAutoTwoPages ? 2 : 1

  const handleSelect = (mode: 'auto' | 'single' | 'multipage') => {
    const params = new URLSearchParams(searchParams.toString())
    if (mode === 'auto') {
      params.delete('layout')
    } else {
      params.set('layout', mode)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    router.replace(`${pathname}${query}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-bg-surface dark:border-border-dark dark:bg-bg-surface-dark print:hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark">
          Mise en page d&apos;impression
        </span>
        <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
          {effectivePages} page{effectivePages > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-md bg-bg-page dark:bg-bg-page-dark border border-border dark:border-border-dark text-xs">
        <button
          type="button"
          onClick={() => handleSelect('auto')}
          className={`py-1 px-2 rounded font-medium transition-colors ${
            forcedLayout === 'auto'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary dark:text-text-secondary-dark'
          }`}
        >
          Auto ({isAutoTwoPages ? '2p' : '1p'})
        </button>
        <button
          type="button"
          onClick={() => handleSelect('single')}
          className={`py-1 px-2 rounded font-medium transition-colors ${
            forcedLayout === 'single'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary dark:text-text-secondary-dark'
          }`}
        >
          1 page
        </button>
        <button
          type="button"
          onClick={() => handleSelect('multipage')}
          className={`py-1 px-2 rounded font-medium transition-colors ${
            forcedLayout === 'multipage'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary dark:text-text-secondary-dark'
          }`}
        >
          2 pages
        </button>
      </div>

      <p className="text-[11px] text-text-tertiary dark:text-text-tertiary-dark leading-snug">
        {effectivePages === 2 ? (
          <span>
            Le QR-code de paiement apparaît <strong>entièrement sur la page 2</strong>, évitant tout
            découpage à l&apos;impression.
          </span>
        ) : (
          <span>Format 1 page compact : le QR-code est intégré en bas de la facture.</span>
        )}
      </p>
    </div>
  )
}
