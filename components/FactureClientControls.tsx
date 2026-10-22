'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Printer, Copy, Check, ArrowLeft } from 'lucide-react'

interface FactureClientControlsProps {
  numero: string
  invoiceNumber: string | null
  isPaid: boolean
}

export function FactureClientControls({
  numero,
  invoiceNumber,
  isPaid,
}: FactureClientControlsProps) {
  const [copied, setCopied] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback si l'accès presse-papier échoue
    }
  }

  return (
    <div className="print:hidden mb-6 flex flex-col gap-3">
      {/* Barre de navigation et actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-[#E5E2D8] dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Boutique</span>
          </Link>

          <span className="text-[#E5E2D8] dark:text-slate-700">|</span>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-[#153243] dark:text-white font-mono">
              {invoiceNumber ? `Facture ${invoiceNumber}` : `Commande ${numero}`}
            </span>
            {isPaid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                <Check className="w-3 h-3" /> Acquittée
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Paiement à 30 jours
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/60 text-xs font-medium text-text-secondary dark:text-slate-200 transition-colors"
            title="Copier le lien direct vers cette facture"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Copié !
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le lien</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#153243] hover:bg-[#1e445b] text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            title="Imprimer ou enregistrer en PDF via la boîte d'impression du navigateur"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>

      {/* Bandeau d'aide pour le client */}
      <div className="text-xs text-text-tertiary dark:text-slate-400 px-2 flex items-center justify-between">
        <p>
          💡 <strong>Astuce :</strong> pour enregistrer la facture en fichier PDF, cliquez sur{' '}
          <strong>« Imprimer / PDF »</strong> puis sélectionnez{' '}
          <em>« Enregistrer au format PDF »</em> comme destination.
        </p>
      </div>
    </div>
  )
}
