import { AuditAction, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/guards'

/**
 * Journal d'activité des commandes. Enregistrer ne doit jamais faire échouer
 * l'opération journalisée : une préparation qui se déroule bien ne peut pas
 * être annulée parce que la trace n'a pas pu s'écrire.
 *
 * L'auteur est recopié en clair (actorLabel) en plus de la clé étrangère :
 * la trace reste lisible même après la suppression du compte.
 */
export async function recordAudit(
  action: AuditAction,
  order: { id?: string | null; numero: string },
  detail?: string,
  client?: Prisma.TransactionClient
): Promise<void> {
  try {
    const user = await currentUser()
    await (client ?? prisma).auditLog.create({
      data: {
        action,
        orderNumero: order.numero,
        orderId: order.id ?? null,
        detail: detail ?? null,
        userId: user?.id ?? null,
        actorLabel: user?.name || 'Client (boutique)',
      },
    })
  } catch (error) {
    console.error('Écriture du journal impossible', { action, numero: order.numero, error })
  }
}

/** Enregistrement sans session : la commande passée par le client sur la boutique. */
export async function recordCustomerAudit(
  action: AuditAction,
  order: { id: string; numero: string },
  detail?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        orderNumero: order.numero,
        orderId: order.id,
        detail: detail ?? null,
        userId: null,
        actorLabel: 'Client (boutique)',
      },
    })
  } catch (error) {
    console.error('Écriture du journal impossible', { action, numero: order.numero, error })
  }
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  COMMANDE_CREEE: 'Commande passée',
  STATUT_MODIFIE: 'Statut modifié',
  FACTURE_EMISE: 'Facture émise',
  TARIF_BASCULE: 'Tarif basculé',
  COMMANDE_ANNULEE: 'Commande annulée',
  COMMANDE_SUPPRIMEE: 'Commande supprimée',
}
