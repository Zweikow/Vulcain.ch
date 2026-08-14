import { OrderStatus } from '@prisma/client'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { advanceStatus } from './actions'

const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  A_TRAITER: 'Passer en préparation',
  EN_PREPARATION: 'Marquer expédiée',
}

export default async function PreparationPage() {
  // Le préparateur travaille sur des quantités, pas sur des montants.
  const user = await currentUser()
  const showMoney = user ? can.seeFinancials(user.role) : false

  // Une commande expédiée quitte l'écran et sort de la liste de picking.
  const orders = await prisma.order.findMany({
    where: { status: { in: [OrderStatus.A_TRAITER, OrderStatus.EN_PREPARATION] } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })

  // Liste de picking : total à sortir de la cave, agrégé toutes commandes
  // ouvertes, trié par quantité décroissante. Une liste de cave, pas de commandes.
  const picking = new Map<string, number>()
  for (const order of orders) {
    for (const item of order.items) {
      picking.set(item.productName, (picking.get(item.productName) ?? 0) + item.quantity)
    }
  }
  const pickingList = [...picking.entries()].sort((a, b) => b[1] - a[1])
  const totalBottles = pickingList.reduce((n, [, q]) => n + q, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-semibold text-[26px] text-text-primary dark:text-text-primary-dark">
          Préparation
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
          {orders.length} commande{orders.length > 1 ? 's' : ''} ouverte
          {orders.length > 1 ? 's' : ''} · {totalBottles} bouteille
          {totalBottles > 1 ? 's' : ''} à sortir
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-secondary dark:text-text-secondary-dark">
          Plus rien à préparer. Les nouvelles commandes apparaîtront ici.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4 items-start">
          {/* Liste de picking */}
          <section className="card p-5">
            <h2 className="font-semibold text-[15px] text-text-primary dark:text-text-primary-dark">
              Liste de picking
            </h2>
            <p className="text-xs text-text-tertiary dark:text-text-tertiary-dark mt-0.5 mb-3">
              Total à sortir de la cave
            </p>
            <ul className="tabular flex flex-col text-sm">
              {pickingList.map(([name, qty]) => (
                <li
                  key={name}
                  className="flex justify-between rounded-md px-2 py-1.5 odd:bg-bg-page dark:odd:bg-bg-page-dark"
                >
                  <span className="text-text-secondary dark:text-text-secondary-dark">{name}</span>
                  <span className="font-bold text-text-primary dark:text-text-primary-dark">
                    {qty}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Cartes de commandes */}
          <section className="flex flex-col gap-4">
            {orders.map((order) => (
              <article key={order.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/commandes/${order.id}`}
                      className="font-mono text-sm font-semibold text-text-primary dark:text-text-primary-dark hover:underline"
                    >
                      {order.numero}
                    </Link>
                    <StatusBadge status={order.status} />
                    {order.clientType === 'PRO' && (
                      <span className="rounded-pill bg-accent-mauve-dark px-2.5 py-0.5 text-xs font-semibold text-white">
                        Pro
                      </span>
                    )}
                  </div>
                  {showMoney && (
                    <span className="tabular text-sm font-bold text-text-primary dark:text-text-primary-dark">
                      {formatCHF(order.totalCents)}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                  {order.clientName} · {order.npa} {order.city}
                  {order.deliveryDate && (
                    <>
                      {' '}
                      · livraison souhaitée le{' '}
                      {new Date(order.deliveryDate).toLocaleDateString('fr-CH')}
                    </>
                  )}
                </p>

                {/* Articles en pastilles lisibles à distance */}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-pill bg-bg-page dark:bg-bg-page-dark px-3 py-1.5 text-sm font-medium text-text-primary dark:text-text-primary-dark"
                    >
                      {item.quantity} × {item.productName}
                    </li>
                  ))}
                </ul>

                {order.message && (
                  <p className="mt-3 rounded-md bg-[#FFF8E1] dark:bg-[#3d2a0a] px-3 py-2 text-sm text-text-warning dark:text-[#FF9800]">
                    {order.message}
                  </p>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <Link
                    href={
                      showMoney
                        ? `/admin/commandes/${order.id}/facture`
                        : `/admin/commandes/${order.id}`
                    }
                    className="btn-secondary text-sm"
                  >
                    {showMoney ? 'Voir la facture' : 'Voir le détail'}
                  </Link>
                  <form action={advanceStatus.bind(null, order.id)}>
                    <button className="btn-primary text-sm">{NEXT_ACTION[order.status]}</button>
                  </form>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}
