import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import {
  buildDeliveryNote,
  canPrintDeliveryNote,
  deliveryNoteOrderSelect,
  deliveryNoteSender,
} from '@/lib/delivery-note'
import {
  BonLivraisonDocument,
  BonLivraisonPrintStyles,
} from '@/components/admin/BonLivraisonDocument'
import { PrintButton } from '@/components/admin/PrintButton'

export const dynamic = 'force-dynamic'

export default async function BonLivraisonPage({ params }: { params: Promise<{ id: string }> }) {
  // Aucun montant sur le bon : ouvert au préparateur, contrairement à la facture.
  await requireCapability(can.printDeliveryNotes)

  const { id } = await params
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { id }, select: deliveryNoteOrderSelect }),
    getSettings(),
  ])

  if (!order) notFound()

  const backLink = (
    <Link
      href={`/admin/commandes/${order.id}`}
      className="text-sm text-text-secondary hover:underline dark:text-text-secondary-dark"
    >
      <ArrowLeft className="inline-block h-[1em] w-[1em] align-[-0.125em]" /> Détail de la commande
    </Link>
  )

  if (!canPrintDeliveryNote(order.status)) {
    return (
      <div className="card mx-auto flex max-w-xl flex-col items-start gap-3 p-6">
        {backLink}
        <h1 className="font-display text-xl font-semibold text-text-primary dark:text-text-primary-dark">
          Pas encore de bon de livraison
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
          Le bon de livraison s&apos;imprime quand la commande{' '}
          <span className="font-mono">{order.numero}</span> est en préparation, puis reste
          disponible après l&apos;expédition.
        </p>
      </div>
    )
  }

  const note = buildDeliveryNote(order)

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-[210mm] items-center justify-between gap-3 print:hidden">
        {backLink}
        <PrintButton />
      </div>
      <div className="bon-livraison-shell mx-auto">
        <BonLivraisonDocument
          note={note}
          sender={deliveryNoteSender(settings)}
          printedAt={new Date()}
        />
      </div>
      <BonLivraisonPrintStyles />
    </div>
  )
}
