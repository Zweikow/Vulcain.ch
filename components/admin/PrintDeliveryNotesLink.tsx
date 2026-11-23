import Link from 'next/link'
import { PrinterIcon } from '@/components/admin/AdminIcons'

/** Action groupée de l'écran Préparation : un bon par commande En préparation. */
export function PrintDeliveryNotesLink({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <Link
      href="/admin/preparation/bons-de-livraison"
      className="btn-primary inline-flex items-center gap-2 text-sm"
    >
      <PrinterIcon className="h-4 w-4 text-current" />
      <span>
        Imprimer les bons de livraison <span className="tabular-nums">({count})</span>
      </span>
    </Link>
  )
}
