'use client'

import { PrinterIcon } from './AdminIcons'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary text-sm print:hidden inline-flex items-center gap-1.5"
    >
      <PrinterIcon className="w-4 h-4 text-current" />
      <span>Imprimer</span>
    </button>
  )
}
