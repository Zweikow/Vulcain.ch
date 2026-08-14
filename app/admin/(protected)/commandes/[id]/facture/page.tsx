import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { FactureDocument } from '@/components/admin/FactureDocument'
import { FactureControls } from '@/components/admin/FactureControls'
import { FactureOrderSelect } from '@/components/admin/FactureOrderSelect'
import { FactureIssue } from '@/components/admin/FactureIssue'
import { StatusSelect } from '@/components/admin/StatusSelect'
import { PrintButton } from '@/components/admin/PrintButton'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'

const stamp = new Intl.DateTimeFormat('fr-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export default async function FacturePage({ params }: { params: Promise<{ id: string }> }) {
  // Une facture est un document financier.
  await requireCapability(can.seeFinancials)

  const { id } = await params

  const [order, settings, orders] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    getSettings(),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, numero: true, invoiceNumber: true, clientName: true },
    }),
  ])

  if (!order) notFound()

  return (
    <div className="flex flex-col-reverse items-start gap-6 2xl:flex-row">
      {/* Le document — seul élément conservé à l'impression */}
      <div className="facture-shell mx-auto">
        <FactureDocument order={order} settings={settings} />
      </div>

      {/* Colonne de pilotage — jamais imprimée */}
      <aside className="card flex w-full shrink-0 flex-col gap-5 p-5 print:hidden 2xl:w-72">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/admin/commandes/${order.id}`}
            className="text-sm text-text-secondary hover:underline dark:text-text-secondary-dark"
          >
            ← Détail
          </Link>
          <PrintButton />
        </div>

        <FactureOrderSelect currentId={order.id} orders={orders} />

        <FactureIssue
          orderId={order.id}
          invoiceNumber={order.invoiceNumber}
          invoicedAt={order.invoicedAt}
        />

        <StatusSelect orderId={order.id} currentStatus={order.status} />

        <FactureControls
          orderId={order.id}
          clientType={order.clientType}
          proRatePercent={settings.proRatePercent}
        />

        <dl className="flex flex-col gap-1 border-t border-border pt-4 text-xs text-text-tertiary dark:border-border-dark dark:text-text-tertiary-dark">
          <div className="flex justify-between gap-2">
            <dt>Commande</dt>
            <dd className="tabular">{stamp.format(order.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Mise à jour</dt>
            <dd className="tabular">{stamp.format(order.updatedAt)}</dd>
          </div>
          {order.shippedAt && (
            <div className="flex justify-between gap-2">
              <dt>Expédiée</dt>
              <dd className="tabular">{stamp.format(order.shippedAt)}</dd>
            </div>
          )}
        </dl>
      </aside>
    </div>
  )
}
