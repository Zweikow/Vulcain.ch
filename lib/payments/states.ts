// États d'une transaction PostFinance Checkout et leur lecture pour une commande.
// Source : https://checkout.postfinance.ch/en-us/doc/payment/transaction-process
//
// PENDING → CONFIRMED → PROCESSING → AUTHORIZED → COMPLETED → FULFILL
//                                 ↘ FAILED          ↘ VOIDED   ↘ DECLINE
//
// Seul FULFILL autorise l'expédition : la doc précise que COMPLETED « ne signifie
// pas » que la marchandise peut être livrée. FAILED, VOIDED, FULFILL et DECLINE
// sont finaux.

export type PaymentStatus = 'EN_COURS' | 'PAYE' | 'ECHOUE' | 'REFUSE'

const FINAL_STATES = ['FULFILL', 'FAILED', 'VOIDED', 'DECLINE'] as const

export const FINAL_TRANSACTION_STATES: readonly string[] = FINAL_STATES

/** Lecture d'un état PostFinance du point de vue de la commande. */
export function paymentStatusOf(state: string | null | undefined): PaymentStatus {
  switch (state) {
    case 'FULFILL':
      return 'PAYE'
    case 'FAILED':
    case 'VOIDED':
      return 'ECHOUE'
    case 'DECLINE':
      // Encaissé mais à ne pas livrer : remboursement à vérifier chez PostFinance
      return 'REFUSE'
    default:
      // CREATE, PENDING, CONFIRMED, PROCESSING, AUTHORIZED, COMPLETED, ou un état
      // inconnu : prudence, la commande attend.
      return 'EN_COURS'
  }
}

export function isFinalTransactionState(state: string): boolean {
  return FINAL_TRANSACTION_STATES.includes(state)
}

/**
 * Le client n'a pas encore payé : sa page de paiement peut être rouverte
 * plutôt que de créer une nouvelle transaction.
 */
export function isReusableTransactionState(state: string): boolean {
  return (
    state === 'CREATE' || state === 'PENDING' || state === 'CONFIRMED' || state === 'PROCESSING'
  )
}

/** Paiement accepté, encaissement en cours : aucune nouvelle tentative possible. */
export function isSettlingTransactionState(state: string): boolean {
  return state === 'AUTHORIZED' || state === 'COMPLETED' || state === 'FULFILL'
}

export const TRANSACTION_STATE_LABELS: Record<string, string> = {
  CREATE: 'Créée',
  PENDING: 'En attente du client',
  CONFIRMED: 'Confirmée',
  PROCESSING: 'Paiement en cours',
  AUTHORIZED: 'Autorisée',
  COMPLETED: 'Encaissée, en vérification',
  FULFILL: 'Payée',
  FAILED: 'Échouée ou abandonnée',
  VOIDED: 'Annulée',
  DECLINE: 'Refusée par PostFinance',
}

export function transactionStateLabel(state: string): string {
  return TRANSACTION_STATE_LABELS[state] ?? state
}
