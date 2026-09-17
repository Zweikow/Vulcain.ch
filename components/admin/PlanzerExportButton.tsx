'use client'

import { useState } from 'react'
import { TruckIcon } from './AdminIcons'

interface PlanzerExportButtonProps {
  orderId: string
  orderNumero: string
  isPickup?: boolean
}

export function PlanzerExportButton({
  orderId,
  orderNumero,
  isPickup = false,
}: PlanzerExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPickup) {
    return (
      <span
        title="Cette commande est un retrait à la cave (non expédiable par Planzer)"
        className="text-xs text-text-tertiary px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800"
      >
        Retrait cave
      </span>
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/export-planzer?orderId=${encodeURIComponent(orderId)}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'export Planzer.")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const contentDisposition = res.headers.get('Content-Disposition')
      let filename = `planzer_${orderNumero}.csv`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) filename = match[1]
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="btn-secondary text-sm print:hidden inline-flex items-center gap-1.5"
        title="Exporter cette commande au format CSV officiel Planzer Colis"
      >
        <TruckIcon className="w-4 h-4 text-primary dark:text-primary-dark" />
        <span>{isExporting ? 'Export…' : 'Export Planzer (.csv)'}</span>
      </button>
      {error && <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{error}</span>}
    </div>
  )
}
