import 'server-only'

/**
 * Configuration PostFinance Checkout, lue dans l'environnement à l'exécution
 * (jamais au build : la CI compile sans aucune variable PFC_).
 *
 *   PFC_ENABLED   "true" pour proposer le paiement en ligne (désactivé sinon)
 *   PFC_SPACE_ID  identifiant du space PostFinance
 *   PFC_USER_ID   identifiant de l'utilisateur d'application (API)
 *   PFC_AUTH_KEY  clé d'authentification de cet utilisateur (secret)
 *
 * Les trois identifiants suffisent à vérifier les webhooks et à relire une
 * transaction ; le drapeau ne commande que l'ouverture du paiement aux clients.
 */

export type PostFinanceConfig = {
  spaceId: number
  userId: number
  authKey: string
}

function positiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null
  const n = Number(value.trim())
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

export function readPostFinanceConfig(
  env: NodeJS.ProcessEnv = process.env
): PostFinanceConfig | null {
  const spaceId = positiveInteger(env.PFC_SPACE_ID)
  const userId = positiveInteger(env.PFC_USER_ID)
  const authKey = env.PFC_AUTH_KEY?.trim()
  if (!spaceId || !userId || !authKey) return null
  return { spaceId, userId, authKey }
}

let warnedIncompleteConfig = false

/**
 * Paiement en ligne proposé aux clients. Drapeau actif ET configuration
 * complète : un drapeau allumé sans identifiants laisse la boutique sur la
 * commande sur facture plutôt que de créer des commandes impayables.
 */
export function isOnlinePaymentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PFC_ENABLED?.trim() !== 'true') return false
  if (readPostFinanceConfig(env)) return true
  if (!warnedIncompleteConfig) {
    warnedIncompleteConfig = true
    console.error(
      'PFC_ENABLED vaut true mais PFC_SPACE_ID, PFC_USER_ID ou PFC_AUTH_KEY manque : paiement en ligne désactivé.'
    )
  }
  return false
}
