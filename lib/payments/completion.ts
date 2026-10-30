import 'server-only'
import { AuditAction, AuditTargetType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import {
  completeTransactionOnline,
  describePostFinanceError,
  readTransaction,
} from '@/lib/payments/postfinance'
import { transactionStateLabel } from '@/lib/payments/states'
import { syncPaymentTransaction } from '@/lib/payments/sync'

export type InvoiceCompletion =
  { ok: true; detail: 'sans_objet' | 'encaissee' | 'en_cours' } | { ok: false; error: string }

const POLL_ATTEMPTS = 4

/**
 * Encaissement PowerPay, à appeler avant de passer une commande « Expédiée » :
 * c'est lui qui rend la facture exigible. En cas d'erreur, la commande ne doit
 * pas être marquée expédiée, et l'exploitant voit pourquoi.
 *
 * Sans effet sur les autres commandes. Idempotent : une transaction déjà
 * encaissée n'est pas encaissée une seconde fois.
 */
export async function completeInvoiceBeforeShipping(
  orderId: string,
  { pollDelayMs = 1500 }: { pollDelayMs?: number } = {}
): Promise<InvoiceCompletion> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      numero: true,
      invoiceAcceptedAt: true,
      paymentTransactions: {
        where: { supersededAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { transactionId: true },
      },
    },
  })
  if (!order?.invoiceAcceptedAt) return { ok: true, detail: 'sans_objet' }

  const active = order.paymentTransactions[0]
  if (!active) {
    return { ok: false, error: 'Aucune transaction PowerPay active : encaissement impossible.' }
  }
  const transactionId = Number(active.transactionId)

  try {
    let remote = await readTransaction(transactionId)
    if (remote.state === 'AUTHORIZED') {
      await completeTransactionOnline(transactionId)
      await recordAudit(
        AuditAction.FACTURE_ENCAISSEE,
        { type: AuditTargetType.COMMANDE, id: order.id, label: order.numero },
        `Encaissement à l'expédition - transaction ${transactionId}`
      )
      // PostFinance répond en quelques secondes : on attend son verdict, car
      // DECLINE interdit d'expédier.
      for (let i = 0; i < POLL_ATTEMPTS && remote.state !== 'FULFILL'; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, pollDelayMs))
        remote = await readTransaction(transactionId)
        if (['FAILED', 'VOIDED', 'DECLINE'].includes(remote.state)) break
      }
    }

    if (remote.state === 'DECLINE') {
      return {
        ok: false,
        error:
          'PostFinance déconseille la livraison : ne pas expédier. Vérifiez la transaction dans le back-office PostFinance.',
      }
    }
    if (!['AUTHORIZED', 'COMPLETED', 'FULFILL'].includes(remote.state)) {
      return {
        ok: false,
        error: `Transaction PowerPay à l'état « ${transactionStateLabel(remote.state)} » : encaissement impossible, commande non expédiée.`,
      }
    }

    // Aligne tout de suite la base, sans attendre le webhook : une commande
    // encaissée ne doit jamais apparaître parmi les impayés de la cidrerie.
    await syncPaymentTransaction(active.transactionId, 'admin').catch((error) =>
      console.error('Synchronisation après encaissement impossible', {
        commande: order.numero,
        erreur: error instanceof Error ? error.message : 'inconnue',
      })
    )
    return { ok: true, detail: remote.state === 'FULFILL' ? 'encaissee' : 'en_cours' }
  } catch (error) {
    return {
      ok: false,
      error: `PostFinance n'a pas accepté l'encaissement, commande non expédiée : ${await describePostFinanceError(error)}`,
    }
  }
}
