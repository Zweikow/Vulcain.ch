import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { StatusSelect } from '@/components/admin/StatusSelect'
import { PrintButton } from '@/components/admin/PrintButton'

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  })

  if (!order) notFound()

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
        <Link href="/admin/commandes" className="hover:text-primary">
          Commandes
        </Link>
        <span>/</span>
        <span className="font-mono">{order.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-text-primary-dark font-mono">
            {order.numero}
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Passée le{' '}
            {new Date(order.createdAt).toLocaleDateString('fr-CH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {order.shippedAt && (
              <>
                {' '}
                · Expédiée le{' '}
                {new Date(order.shippedAt).toLocaleDateString('fr-CH', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </>
            )}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Statut */}
      <div className="card p-5 mb-4">
        <StatusSelect orderId={order.id} currentStatus={order.status} />
      </div>

      {/* Infos client */}
      <div className="card p-5 mb-4">
        <h2 className="font-medium text-text-primary dark:text-text-primary-dark mb-3">Client</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-secondary dark:text-text-secondary-dark">Nom</dt>
          <dd className="text-text-primary dark:text-text-primary-dark">{order.clientName}</dd>

          <dt className="text-text-secondary dark:text-text-secondary-dark">Email</dt>
          <dd className="text-text-primary dark:text-text-primary-dark">{order.clientEmail}</dd>

          {order.clientPhone && (
            <>
              <dt className="text-text-secondary dark:text-text-secondary-dark">Téléphone</dt>
              <dd className="text-text-primary dark:text-text-primary-dark">{order.clientPhone}</dd>
            </>
          )}

          <dt className="text-text-secondary dark:text-text-secondary-dark">Adresse</dt>
          <dd className="text-text-primary dark:text-text-primary-dark">
            {order.address}, {order.npa} {order.city}
          </dd>

          {order.deliveryDate && (
            <>
              <dt className="text-text-secondary dark:text-text-secondary-dark">
                Livraison souhaitée
              </dt>
              <dd className="text-text-primary dark:text-text-primary-dark">
                {new Date(order.deliveryDate).toLocaleDateString('fr-CH', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </>
          )}

          {order.message && (
            <>
              <dt className="text-text-secondary dark:text-text-secondary-dark">Message</dt>
              <dd className="text-text-primary dark:text-text-primary-dark">{order.message}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Articles */}
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-border dark:border-border-dark">
          <h2 className="font-medium text-text-primary dark:text-text-primary-dark">
            Articles commandés
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border dark:border-border-dark bg-bg-page dark:bg-bg-page-dark">
              <th className="text-left px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Produit
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Qté
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Prix unit.
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary dark:text-text-secondary-dark">
                Sous-total
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border dark:border-border-dark last:border-0"
              >
                <td className="px-4 py-3 text-text-primary dark:text-text-primary-dark">
                  {item.product.name}
                </td>
                <td className="px-4 py-3 text-right text-text-primary dark:text-text-primary-dark">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary dark:text-text-secondary-dark">
                  {formatCHF(item.unitPriceCents)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-text-primary dark:text-text-primary-dark">
                  {formatCHF(item.quantity * item.unitPriceCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border dark:border-border-dark">
              <td
                colSpan={3}
                className="px-4 py-2 text-right text-text-secondary dark:text-text-secondary-dark"
              >
                Sous-total
              </td>
              <td className="px-4 py-2 text-right text-text-primary dark:text-text-primary-dark">
                {formatCHF(order.subtotalCents)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={3}
                className="px-4 py-2 text-right text-text-secondary dark:text-text-secondary-dark"
              >
                Frais de port
              </td>
              <td className="px-4 py-2 text-right text-text-primary dark:text-text-primary-dark">
                {order.shippingCents === 0 ? 'Offerts' : formatCHF(order.shippingCents)}
              </td>
            </tr>
            <tr className="border-t border-border dark:border-border-dark">
              <td
                colSpan={3}
                className="px-4 py-3 text-right font-semibold text-text-primary dark:text-text-primary-dark"
              >
                Total
              </td>
              <td className="px-4 py-3 text-right font-bold text-text-primary dark:text-text-primary-dark">
                {formatCHF(order.totalCents)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={3}
                className="px-4 pb-3 text-right text-xs text-text-tertiary dark:text-text-tertiary-dark"
              >
                dont TVA
              </td>
              <td className="px-4 pb-3 text-right text-xs text-text-tertiary dark:text-text-tertiary-dark">
                {formatCHF(order.vatCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
