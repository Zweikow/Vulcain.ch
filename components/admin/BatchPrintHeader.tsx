'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { formatCHF } from '@/lib/money'
import { PrinterIcon, SparklesIcon } from '@/components/admin/AdminIcons'

interface BatchPrintHeaderProps {
  count: number
  totalAmountCents: number
}

export function BatchPrintHeader({ count, totalAmountCents }: BatchPrintHeaderProps) {
  return (
    <div className="print:hidden sticky top-0 z-30 bg-secondary-header text-white dark:bg-bg-card-dark dark:border-b dark:border-secondary/40 shadow-md px-6 py-4 mb-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/factures"
              className="text-xs font-semibold text-white/80 hover:text-white dark:text-text-secondary-dark dark:hover:text-white underline"
            >
              <ArrowLeft className="inline-block h-[1em] w-[1em] align-[-0.125em]" /> Retour aux
              factures
            </Link>
            <span className="text-white/40">|</span>
            <span className="text-xs bg-white/20 dark:bg-secondary/30 px-2 py-0.5 rounded font-mono">
              {count} facture{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''} • Total :{' '}
              {formatCHF(totalAmountCents)}
            </span>
          </div>
          <h1 className="text-lg font-bold font-display text-white dark:text-text-primary-dark">
            Export & Impression Groupée A4
          </h1>
          <p className="text-xs text-white/70 dark:text-text-secondary-dark flex items-center gap-1.5 mt-0.5">
            <SparklesIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span>
              Astuce : Dans la fenêtre d&apos;impression, choisissez la destination{' '}
              <strong className="text-white font-semibold underline">
                « Enregistrer au format PDF »
              </strong>{' '}
              pour télécharger un fichier unique regroupant toutes les factures.
            </span>
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="btn-secondary py-2.5 px-5 text-sm font-bold bg-white text-primary-text hover:bg-slate-100 dark:bg-secondary dark:text-primary dark:hover:brightness-110 rounded-lg shadow shrink-0 flex items-center gap-2"
        >
          <PrinterIcon className="w-4 h-4 text-primary-text" />
          <span>Imprimer / Télécharger en un seul PDF</span>
        </button>
      </div>
    </div>
  )
}
