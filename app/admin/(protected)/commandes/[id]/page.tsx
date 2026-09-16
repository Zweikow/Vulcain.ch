import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import { StatusSelect } from '@/components/admin/StatusSelect'
import { PrintButton } from '@/components/admin/PrintButton'
import { PlanzerExportButton } from '@/components/admin/PlanzerExportButton'
import { OrderCancel } from '@/components/admin/OrderCancel'
import { AssignSelect } from '@/components/admin/AssignSelect'
import OrderEmailActions from '@/components/admin/OrderEmailActions'
import { OrderPaymentPanel } from '@/components/admin/OrderPaymentPanel'
import { OrderProToggle } from '@/components/admin/OrderProToggle'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [order, users, settings, user] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, customerNumber: true, isPro: true, proRatePercent: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
        emailLogs: {
          orderBy: { sentAt: 'desc' },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getSettings(),
    currentUser(),
  ])

  const canManage = user ? can.manageCustomers(user.role) || can.seeFinancials(user.role) : false

  if (!order) notFound()

  return (
    <div className="max-w-3xl">
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
        <div className="flex items-center gap-2">
          {!order.isPickup && (
            <PlanzerExportButton
              orderId={order.id}
              orderNumero={order.numero}
              isPickup={order.isPickup}
            />
          )}
          <Link href={`/admin/commandes/${order.id}/facture`} className="btn-primary text-sm">
            Voir la facture
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Statut & Assignation — masqués sur une commande annulée, qui ne progresse plus */}
      {order.status !== 'ANNULEE' && (
        <div className="card p-5 mb-4 grid grid-cols-2 gap-4">
          <StatusSelect orderId={order.id} currentStatus={order.status} />
          <AssignSelect orderId={order.id} currentAssigneeId={order.assignedToId} users={users} />
        </div>
      )}

      {/* Suivi du paiement & Facture */}
      <OrderPaymentPanel
        orderId={order.id}
        orderNumero={order.numero}
        invoiceNumber={order.invoiceNumber}
        totalCents={order.totalCents}
        clientName={order.clientName}
        clientEmail={order.clientEmail}
        paidAt={order.paidAt}
        paymentMethod={order.paymentMethod}
        invoicedAt={order.invoicedAt}
        createdAt={order.createdAt}
        reminderCount={order.reminderCount}
        lastReminderAt={order.lastReminderAt}
        paymentTermsDays={settings.paymentTermsDays}
      />

      {/* Infos client */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-text-primary dark:text-text-primary-dark">Client</h2>
          {order.customerId && (
            <Link
              href={`/admin/clients/${order.customerId}`}
              className="text-xs text-primary hover:underline font-medium"
            >
              Voir la fiche client →
            </Link>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {order.customer?.customerNumber && (
            <>
              <dt className="text-text-secondary dark:text-text-secondary-dark">Numéro client</dt>
              <dd className="text-text-primary dark:text-text-primary-dark font-mono font-semibold">
                N° {order.customer.customerNumber}
              </dd>
            </>
          )}

          <dt className="text-text-secondary dark:text-text-secondary-dark">Nom</dt>
          <dd className="text-text-primary dark:text-text-primary-dark">
            {order.customerId ? (
              <Link
                href={`/admin/clients/${order.customerId}`}
                className="hover:text-primary hover:underline font-medium"
              >
                {order.clientName}
              </Link>
            ) : (
              order.clientName
            )}
          </dd>

          <dt className="text-text-secondary dark:text-text-secondary-dark">Statut tarifaire</dt>
          <dd className="text-text-primary dark:text-text-primary-dark">
            <OrderProToggle
              orderId={order.id}
              clientType={order.clientType}
              isCustomerPro={Boolean(order.customer?.isPro)}
              proRatePercent={order.customer?.proRatePercent ?? settings.proRatePercent}
              canManage={canManage}
            />
          </dd>

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
            {/* La ligne de TVA n'a de sens que si la cidrerie la perçoit */}
            {order.vatCents > 0 && (
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
            )}
          </tfoot>
        </table>
      </div>

      <div className="mb-6">
        <OrderEmailActions
          orderId={order.id}
          orderNumber={order.numero}
          clientEmail={order.clientEmail}
          trackingNumber={order.trackingNumber}
          carrier={order.carrier}
          isPickup={order.isPickup}
          emailLogs={order.emailLogs}
        />
      </div>

      <OrderCancel
        orderId={order.id}
        numero={order.numero}
        status={order.status}
        invoiceNumber={order.invoiceNumber}
        cancelledAt={order.cancelledAt}
        cancelReason={order.cancelReason}
      />
    </div>
  )
}
