'use client'

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-secondary text-sm print:hidden">
      🖨️ Imprimer
    </button>
  )
}
