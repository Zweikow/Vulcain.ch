import { prisma } from '@/lib/prisma'
import { nextNumber, SERIES } from '@/lib/numbering'
import { creditorReference } from '@/lib/reference'

/**
 * Émet la facture d'une commande : attribue le numéro de la série FAC et fige
 * la date d'émission. Idempotent — une facture déjà émise garde son numéro,
 * qui ne doit jamais changer une fois le document parti chez le client.
 *
 * Le numéro n'est attribué qu'ici, et non à la prise de commande : une commande
 * annulée avant expédition ne laisse ainsi aucun trou dans la série des factures.
 */
export async function issueInvoice(orderId: string): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { invoiceNumber: true },
    })
    if (!order) return null
    if (order.invoiceNumber) return order.invoiceNumber

    const invoiceNumber = await nextNumber(tx, SERIES.FACTURE)
    await tx.order.update({
      where: { id: orderId },
      data: { invoiceNumber, invoicedAt: new Date() },
    })
    return invoiceNumber
  })
}

/** Référence de paiement ISO 11649 d'une facture émise. */
export function paymentReference(invoiceNumber: string): string {
  return creditorReference(invoiceNumber)
}
