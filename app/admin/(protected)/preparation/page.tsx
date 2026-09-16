import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { PreparationOrdersList } from '@/components/admin/PreparationOrdersList'

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
  const picking = new Map<string, { quantity: number; bottles: number; bottlesPerUnit: number }>()
  for (const order of orders) {
    for (const item of order.items) {
      const bpu = item.bottlesPerUnit || 1
      const totalItemBottles = item.quantity * bpu
      const prev = picking.get(item.productName) ?? { quantity: 0, bottles: 0, bottlesPerUnit: bpu }
      picking.set(item.productName, {
        quantity: prev.quantity + item.quantity,
        bottles: prev.bottles + totalItemBottles,
        bottlesPerUnit: bpu,
      })
    }
  }
  const pickingList = [...picking.entries()].sort((a, b) => b[1].bottles - a[1].bottles)
  const totalBottles = pickingList.reduce((n, [, data]) => n + data.bottles, 0)

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
              {pickingList.map(([name, data]) => (
                <li
                  key={name}
                  className="flex justify-between items-center rounded-md px-2 py-1.5 odd:bg-bg-page dark:odd:bg-bg-page-dark"
                >
                  <span className="text-text-secondary dark:text-text-secondary-dark pr-2">
                    {name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-text-primary dark:text-text-primary-dark">
                      {data.bottles} bout.
                    </span>
                    {data.bottlesPerUnit > 1 && (
                      <span className="text-[11px] text-text-tertiary block font-normal">
                        ({data.quantity} cart.)
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Liste interactive des commandes avec sélection et export Planzer */}
          <PreparationOrdersList
            orders={orders}
            showMoney={showMoney}
            nextActionLabels={NEXT_ACTION}
          />
        </div>
      )}
    </div>
  )
}
