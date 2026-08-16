import { Role } from '@prisma/client'

/**
 * Permissions exprimées en capacités plutôt qu'en comparaisons de rôle
 * éparpillées dans les écrans. Ajouter un rôle demain ne consistera qu'à
 * répondre à ces questions, sans relire toute l'application.
 *
 *   ADMIN        tout
 *   GESTIONNAIRE commandes, catalogue et catégories ; ni réglages, ni comptes,
 *                ni journal
 *   PREPARATEUR  commandes et préparation ; catalogue en lecture seule ;
 *                aucun montant, aucune facture
 */
export const can = {
  /** Montants, chiffre d'affaires. Le travail de cave n'en a pas besoin (sauf via l'impression des factures). */
  seeFinancials: (role: Role) => role !== Role.PREPARATEUR,

  /** Génération et impression des factures. */
  manageInvoices: () => true,

  /** Tableau de bord : indicateurs et statistiques de vente. */
  seeDashboard: (role: Role) => role !== Role.PREPARATEUR,

  /** Faire avancer une commande dans le flux de préparation. */
  advanceOrders: () => true,

  /** Annuler, supprimer, basculer le tarif : conséquences comptables. */
  manageOrders: (role: Role) => role !== Role.PREPARATEUR,

  /** Créer et modifier un produit, ses prix, son stock, sa visibilité. */
  manageCatalogue: (role: Role) => role !== Role.PREPARATEUR,

  /** Réglages de la cidrerie : tarifs, port, facturation, TVA. */
  manageSettings: (role: Role) => role === Role.ADMIN,

  /** Comptes utilisateurs. */
  manageUsers: (role: Role) => role === Role.ADMIN,

  /** Journal d'activité. */
  seeJournal: (role: Role) => role === Role.ADMIN,
} as const

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
  PREPARATEUR: 'Préparateur',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Accès complet, y compris les réglages, les comptes et le journal.',
  GESTIONNAIRE: 'Commandes, catalogue et catégories. Pas de réglages ni de journal.',
  PREPARATEUR: 'Commandes et préparation. Catalogue en lecture, sans aucun montant.',
}

/** Page d'accueil selon le rôle : un préparateur n'a pas de tableau de bord. */
export function homePathFor(role: Role): string {
  return can.seeDashboard(role) ? '/admin' : '/admin/preparation'
}
