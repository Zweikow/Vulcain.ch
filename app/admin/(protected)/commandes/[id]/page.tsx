import { ArrowRight } from 'lucide-react'
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
import { OrderOnlinePaymentPanel } from '@/components/admin/OrderOnlinePaymentPanel'
import { OrderProToggle } from '@/components/admin/OrderProToggle'
import { OrderDeliveryDateControl } from '@/components/admin/OrderDeliveryDateControl'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { getSiteUrl } from '@/lib/site'
import { transactionStateLabel } from '@/lib/payments/states'
import { PAYMENT_CHOICE_LABELS } from '@/lib/payments/choices'

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
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
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

  const onlinePayment = order.paymentMode === 'EN_LIGNE'
  const awaitingPayment = order.status === 'EN_ATTENTE_PAIEMENT'
  const toVerify = order.status === 'A_VERIFIER'
  // Ni préparation, ni facture, ni email avant un paiement confirmé
  const notConfirmed = awaitingPayment || toVerify
  const verification = toVerify
    ? await prisma.auditLog.findFirst({
        where: { targetId: order.id, action: 'PAIEMENT_A_VERIFIER' },
        orderBy: { createdAt: 'desc' },
        select: { detail: true },
      })
    : null

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
        <Link href="/admin/commandes" className="hover:text-primary-text">
          Commandes
        </Link>
        <span>/</span>
        <span className="font-mono">{order.numero}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
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
        <div className="flex flex-wrap items-center gap-2">
          {!order.isPickup && !notConfirmed && (
            <PlanzerExportButton
              orderId={order.id}
              orderNumero={order.numero}
              isPickup={order.isPickup}
            />
          )}
          {!notConfirmed && (
            <Link href={`/admin/commandes/${order.id}/facture`} className="btn-primary text-sm">
              Voir la facture
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      {/* Statut, Assignation & Date de livraison — masqués sur une commande annulée, qui ne progresse plus */}
      {order.status !== 'ANNULEE' && (
        <div className="card p-5 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notConfirmed ? (
            // Ni statut ni assignation avant la confirmation du paiement en ligne
            <p className="sm:col-span-2 text-sm text-text-secondary dark:text-text-secondary-dark">
              {toVerify
                ? 'À vérifier : la commande ne peut pas avancer tant que le paiement n’est pas accepté dans le panneau ci-dessous.'
                : 'En attente du paiement en ligne : la commande passera « À traiter » dès sa confirmation par PostFinance.'}
            </p>
          ) : (
            <>
              <StatusSelect orderId={order.id} currentStatus={order.status} />
              <AssignSelect
                orderId={order.id}
                currentAssigneeId={order.assignedToId}
                users={users}
              />
            </>
          )}
          <OrderDeliveryDateControl orderId={order.id} initialDeliveryDate={order.deliveryDate} />
        </div>
      )}

      {/* Suivi du paiement & Facture */}
      {onlinePayment ? (
        <OrderOnlinePaymentPanel
          orderId={order.id}
          totalCents={order.totalCents}
          paidAt={order.paidAt ? order.paidAt.toISOString() : null}
          paymentMethod={order.paymentMethod}
          invoiceNumber={order.invoiceNumber}
          awaitingPayment={awaitingPayment}
          choiceLabel={order.paymentChoice ? PAYMENT_CHOICE_LABELS[order.paymentChoice] : null}
          invoiceFeeCents={order.invoiceFeeCents}
          invoiceAcceptedAt={order.invoiceAcceptedAt ? order.invoiceAcceptedAt.toISOString() : null}
          toVerify={toVerify}
          verificationReason={verification?.detail ?? null}
          paymentLink={order.paymentToken ? `${getSiteUrl()}/paiement/${order.paymentToken}` : null}
          attempts={order.paymentTransactions.map((t) => ({
            transactionId: t.transactionId.toString(),
            state: t.state,
            stateLabel: transactionStateLabel(t.state),
            amountCents: t.amountCents,
            paymentMethod: t.paymentMethod,
            failureReason: t.failureReason,
            createdAt: t.createdAt.toISOString(),
            choiceLabel: t.paymentChoice ? PAYMENT_CHOICE_LABELS[t.paymentChoice] : null,
            superseded: t.supersededAt !== null,
          }))}
          canVerify={user ? can.manageOrders(user.role) : false}
        />
      ) : (
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
      )}

      {/* Infos client */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-text-primary dark:text-text-primary-dark">Client</h2>
          {order.customerId && (
            <Link
              href={`/admin/clients/${order.customerId}`}
              className="text-xs text-primary-text hover:underline font-medium"
            >
              Voir la fiche client{' '}
              <ArrowRight className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
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
                className="hover:text-primary-text hover:underline font-medium"
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
              proRatePercent={
                order.proRatePercent ?? order.customer?.proRatePercent ?? settings.proRatePercent
              }
              // Montant d'une commande en ligne figé par la transaction PostFinance
              canManage={canManage && !onlinePayment}
            />
          </dd>

          <dt className="text-text-secondary dark:text-text-secondary-dark">Email</dt>
          <dd className="text-text-primary dark:text-text-primary-dark break-all">
            {order.clientEmail}
          </dd>

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

          <dt className="text-text-secondary dark:text-text-secondary-dark">Date de livraison</dt>
          <dd className="text-text-primary dark:text-text-primary-dark">
            {order.deliveryDate ? (
              <span className="font-medium">
                {new Date(order.deliveryDate).toLocaleDateString('fr-CH', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            ) : (
              <span className="text-text-tertiary italic">Non définie</span>
            )}
          </dd>

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
            {order.discountCents > 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 font-medium"
                >
                  {order.promoCode
                    ? `Remise code promo (${order.promoCode})`
                    : 'Remise commerciale'}
                </td>
                <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 font-semibold tabular">
                  −{formatCHF(order.discountCents)}
                </td>
              </tr>
            )}
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
            {order.invoiceFeeCents > 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-2 text-right text-text-secondary dark:text-text-secondary-dark"
                >
                  Supplément facture
                </td>
                <td className="px-4 py-2 text-right text-text-primary dark:text-text-primary-dark">
                  {formatCHF(order.invoiceFeeCents)}
                </td>
              </tr>
            )}
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

      {!notConfirmed && (
        <div className="mb-6">
          <OrderEmailActions
            orderId={order.id}
            orderNumber={order.numero}
            clientEmail={order.clientEmail}
            trackingNumber={order.trackingNumber}
            carrier={order.carrier}
            isPickup={order.isPickup}
            deliveryDate={order.deliveryDate}
            emailLogs={order.emailLogs}
          />
        </div>
      )}

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
