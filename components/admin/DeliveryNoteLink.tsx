import { ClipboardList } from 'lucide-react'
import Link from 'next/link'
import type { OrderStatus } from '@prisma/client'
import { canPrintDeliveryNote } from '@/lib/delivery-note'

/**
 * Bouton « Bon de livraison ». Rien en À traiter ni en Annulée : le bon se
 * prépare avec le carton (En préparation) et se réimprime une fois expédié.
 * Sans état ni hook : utilisable dans un composant serveur ou client.
 */
export function DeliveryNoteLink({
  orderId,
  status,
  className = 'btn-secondary text-sm',
}: {
  orderId: string
  status: OrderStatus
  className?: string
}) {
  if (!canPrintDeliveryNote(status)) return null
  return (
    <Link
      href={`/admin/commandes/${orderId}/bon-de-livraison`}
      className={`${className} inline-flex items-center gap-1.5`}
    >
      <ClipboardList className="h-4 w-4" aria-hidden="true" />
      <span>Bon de livraison</span>
    </Link>
  )
}
