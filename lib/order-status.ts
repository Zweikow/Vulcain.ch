import { OrderStatus, type Prisma } from '@prisma/client'

/**
 * Commandes qui ne comptent pas : annulées, ou en attente d'un paiement en
 * ligne pas encore reçu. Elles sortent du chiffre d'affaires, des fiches
 * clients, des impayés et des rapprochements bancaires.
 */
export const UNCOUNTED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ANNULEE,
  OrderStatus.EN_ATTENTE_PAIEMENT,
  OrderStatus.A_VERIFIER,
]

export const countedOrderWhere = {
  status: { notIn: UNCOUNTED_ORDER_STATUSES },
} satisfies Prisma.OrderWhereInput

export function isCountedOrder(status: OrderStatus): boolean {
  return !UNCOUNTED_ORDER_STATUSES.includes(status)
}
