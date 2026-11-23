import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { buildDeliveryNote, deliveryNoteOrderSelect, deliveryNoteSender } from '@/lib/delivery-note'
import {
  BonLivraisonDocument,
  BonLivraisonPrintStyles,
} from '@/components/admin/BonLivraisonDocument'
import { PrintButton } from '@/components/admin/PrintButton'

export const dynamic = 'force-dynamic'

/** Impression groupée : un bon par commande En préparation, une page chacun. */
export default async function BonsDeLivraisonPage() {
  await requireCapability(can.printDeliveryNotes)

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { status: OrderStatus.EN_PREPARATION },
      select: deliveryNoteOrderSelect,
      // Même ordre que l'écran de préparation.
      orderBy: { createdAt: 'asc' },
    }),
    getSettings(),
  ])

  const sender = deliveryNoteSender(settings)
  const printedAt = new Date()
  const notes = orders.map(buildDeliveryNote)
  const totalBottles = notes.reduce((n, note) => n + note.totalBottles, 0)

  const backLink = (
    <Link
      href="/admin/preparation"
      className="text-sm text-text-secondary hover:underline dark:text-text-secondary-dark"
    >
      <ArrowLeft className="inline-block h-[1em] w-[1em] align-[-0.125em]" /> Préparation
    </Link>
  )

  if (notes.length === 0) {
    return (
      <div className="card mx-auto flex max-w-xl flex-col items-start gap-3 p-6">
        {backLink}
        <h1 className="font-display text-xl font-semibold text-text-primary dark:text-text-primary-dark">
          Aucun bon à imprimer
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
          Aucune commande n&apos;est en préparation. Passez une commande en préparation pour
          imprimer son bon de livraison.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          {backLink}
          <h1 className="font-display text-[22px] font-semibold text-text-primary dark:text-text-primary-dark">
            Bons de livraison
          </h1>
          <p className="tabular-nums text-sm text-text-secondary dark:text-text-secondary-dark">
            {notes.length} commande{notes.length > 1 ? 's' : ''} en préparation · {totalBottles}{' '}
            bouteille{totalBottles > 1 ? 's' : ''} · une page par bon
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="flex flex-col gap-10 print:gap-0">
        {notes.map((note) => (
          <div key={note.numero} className="bon-livraison-shell mx-auto">
            <BonLivraisonDocument note={note} sender={sender} printedAt={printedAt} />
          </div>
        ))}
      </div>
      <BonLivraisonPrintStyles />
    </div>
  )
}
