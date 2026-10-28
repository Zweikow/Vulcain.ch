import 'server-only'
import {
  Configuration,
  EncryptionUtil,
  HttpBearerAuth,
  PostFinanceCheckoutSdkException,
  ResponseError,
  TransactionsService,
  WebhookEncryptionKeysService,
  type Transaction,
  type TransactionCreate,
} from 'postfinancecheckout'
import { readPostFinanceConfig, type PostFinanceConfig } from '@/lib/payments/config'
import { apiAmountToCents } from '@/lib/money'

/**
 * Accès à l'API PostFinance Checkout, côté serveur uniquement : les
 * identifiants ne doivent jamais atteindre le navigateur. Le SDK signe chaque
 * requête d'un jeton JWT (HS256) construit avec PFC_USER_ID et PFC_AUTH_KEY ;
 * le space est transmis à chaque appel.
 */

export class PostFinanceNotConfiguredError extends Error {
  constructor() {
    super('PostFinance Checkout non configuré : PFC_SPACE_ID, PFC_USER_ID ou PFC_AUTH_KEY manque')
    this.name = 'PostFinanceNotConfiguredError'
  }
}

type Clients = {
  config: PostFinanceConfig
  transactions: TransactionsService
  webhookKeys: WebhookEncryptionKeysService
}

let clients: Clients | null = null

function getClients(): Clients {
  if (clients) return clients
  const config = readPostFinanceConfig()
  if (!config) throw new PostFinanceNotConfiguredError()
  const configuration = new Configuration({
    httpBearerAuth: new HttpBearerAuth(config.userId, config.authKey),
    requestTimeout: 15, // secondes
  })
  clients = {
    config,
    transactions: new TransactionsService(configuration),
    webhookKeys: new WebhookEncryptionKeysService(configuration),
  }
  return clients
}

export function postFinanceSpaceId(): number {
  return getClients().config.spaceId
}

/**
 * Description d'une erreur de l'API sans rien de sensible : code HTTP et
 * message fonctionnel de PostFinance, jamais les en-têtes ni le jeton.
 */
export async function describePostFinanceError(error: unknown): Promise<string> {
  if (error instanceof ResponseError) {
    let message = ''
    try {
      const body = await error.response.clone().text()
      const parsed = JSON.parse(body) as { message?: unknown }
      if (typeof parsed.message === 'string') message = parsed.message
    } catch {
      // corps illisible : le code HTTP suffit
    }
    return `HTTP ${error.response.status}${message ? ` : ${message.slice(0, 300)}` : ''}`
  }
  if (error instanceof PostFinanceCheckoutSdkException) return `SDK ${error.code}`
  if (error instanceof Error) return `${error.name} : ${error.message.slice(0, 300)}`
  return 'Erreur inconnue'
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function createTransaction(
  transactionCreate: TransactionCreate
): Promise<{ id: number; state: string }> {
  const { config, transactions } = getClients()
  const transaction = await transactions.postPaymentTransactions({
    space: config.spaceId,
    transactionCreate,
  })
  if (!transaction.id) throw new Error('Transaction PostFinance créée sans identifiant')
  return { id: transaction.id, state: transaction.state ?? 'PENDING' }
}

/** Adresse de la Payment Page où le client choisit son moyen de paiement. */
export async function getPaymentPageUrl(transactionId: number): Promise<string> {
  const { config, transactions } = getClients()
  return transactions.getPaymentTransactionsIdPaymentPageUrl({
    id: transactionId,
    space: config.spaceId,
  })
}

export type TransactionSnapshot = {
  id: number
  state: string
  currency: string | null
  authorizationAmountCents: number | null
  /** Libellé du moyen de paiement (ex. TWINT), sans aucune donnée de carte. */
  paymentMethod: string | null
  /** Motif d'échec lisible, quand PostFinance en fournit un. */
  failureMessage: string | null
  authorizedOn: Date | null
  completedOn: Date | null
  failedOn: Date | null
  /** Date de la décision de livraison (FULFILL ou DECLINE). */
  decisionOn: Date | null
}

function localized(value: unknown): string | null {
  if (typeof value === 'string') return value || null
  if (value && typeof value === 'object') {
    const map = value as Record<string, string>
    return map['fr-CH'] ?? map['fr-FR'] ?? map['en-US'] ?? Object.values(map)[0] ?? null
  }
  return null
}

function paymentMethodLabel(transaction: Transaction): string | null {
  const connector = transaction.paymentConnectorConfiguration
  if (!connector || typeof connector !== 'object') return null
  const method = connector.paymentMethodConfiguration
  if (method && typeof method === 'object') {
    return localized(method.resolvedTitle) ?? method.name ?? connector.name ?? null
  }
  return connector.name ?? null
}

/** Relit l'état d'une transaction : seule source de vérité pour marquer une commande payée. */
export async function readTransaction(transactionId: number): Promise<TransactionSnapshot> {
  const { config, transactions } = getClients()
  const transaction = await transactions.getPaymentTransactionsId({
    id: transactionId,
    space: config.spaceId,
  })
  return {
    id: transaction.id ?? transactionId,
    state: transaction.state ?? 'PENDING',
    currency: transaction.currency ?? null,
    authorizationAmountCents:
      typeof transaction.authorizationAmount === 'number'
        ? apiAmountToCents(transaction.authorizationAmount)
        : null,
    paymentMethod: paymentMethodLabel(transaction),
    failureMessage:
      transaction.userFailureMessage ?? localized(transaction.failureReason?.description) ?? null,
    authorizedOn: transaction.authorizedOn ?? null,
    completedOn: transaction.completedOn ?? null,
    failedOn: transaction.failedOn ?? null,
    decisionOn: transaction.deliveryDecisionMadeOn ?? null,
  }
}

// ---------------------------------------------------------------------------
// Signature des webhooks
// ---------------------------------------------------------------------------

// En-tête x-signature : « algorithm=SHA256withECDSA, keyId=<uuid>, signature=<base64> »
const SIGNATURE_HEADER =
  /^\s*algorithm=([A-Za-z0-9]+),\s*keyId=([a-zA-Z0-9-]+),\s*signature=([a-zA-Z0-9+/=]+)\s*$/

const publicKeys = new Map<string, string>()

/**
 * Clé publique de signature, lue via l'API et gardée en mémoire. Null si
 * PostFinance ne connaît pas cette clé (charge forgée). Une panne de l'API ou
 * des identifiants refusés lèvent une erreur : le webhook répond alors 503 et
 * PostFinance réessaiera, au lieu de rejeter un message peut-être authentique.
 */
async function webhookPublicKey(keyId: string): Promise<string | null> {
  const cached = publicKeys.get(keyId)
  if (cached) return cached
  try {
    const key = await getClients().webhookKeys.getWebhooksEncryptionKeysId({ id: keyId })
    if (!key) return null
    publicKeys.set(keyId, key)
    return key
  } catch (error) {
    if (
      error instanceof ResponseError &&
      (error.response.status === 400 || error.response.status === 404)
    ) {
      return null
    }
    throw error
  }
}

/** Vérifie la signature ECDSA d'une charge reçue, telle quelle, octet pour octet. */
export async function verifyWebhookSignature(
  signatureHeader: string,
  rawBody: string
): Promise<boolean> {
  const match = SIGNATURE_HEADER.exec(signatureHeader)
  if (!match) return false
  const [, algorithm, keyId, signature] = match
  if (algorithm !== 'SHA256withECDSA') return false

  const publicKey = await webhookPublicKey(keyId)
  if (!publicKey) return false

  try {
    return EncryptionUtil.isContentValid(rawBody, signature, publicKey)
  } catch (error) {
    if (error instanceof PostFinanceCheckoutSdkException) return false
    throw error
  }
}
