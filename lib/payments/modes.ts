import 'server-only'
import { isOnlinePaymentEnabled } from '@/lib/payments/config'
import { PAYMENT_CHOICES, type PaymentChoiceValue } from '@/lib/payments/choices'

/**
 * Correspondance entre les modes du formulaire et les configurations de modes
 * de paiement du space PostFinance, lue dans l'environnement :
 *
 *   PFC_PAYMENT_MODES        JSON, par exemple {"CARTE":[123],"TWINT":[456],...}
 *                            (IDs propres à chaque space : jamais dans le code)
 *   PFC_MODE_CHOICE_ENABLED  "true" pour faire choisir le mode sur le formulaire
 *   PFC_INVOICE_ENABLED      "true" pour proposer la facture PowerPay
 *
 * Le serveur limite chaque transaction aux IDs du mode choisi : c'est ce
 * verrou, pas le formulaire, qui empêche de payer autrement.
 */

export type PaymentModesConfig = Partial<Record<PaymentChoiceValue, number[]>>

let warnedInvalidMapping = false

function warnOnce(message: string) {
  if (warnedInvalidMapping) return
  warnedInvalidMapping = true
  console.error(message)
}

/** Mapping valide, ou null : clé inconnue, ID non entier ou liste vide l'invalident en entier. */
export function readPaymentModes(env: NodeJS.ProcessEnv = process.env): PaymentModesConfig | null {
  const raw = env.PFC_PAYMENT_MODES?.trim()
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    warnOnce('PFC_PAYMENT_MODES n’est pas un JSON valide : choix du mode désactivé.')
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    warnOnce('PFC_PAYMENT_MODES doit être un objet : choix du mode désactivé.')
    return null
  }
  const config: PaymentModesConfig = {}
  for (const [key, ids] of Object.entries(parsed)) {
    const valid =
      (PAYMENT_CHOICES as readonly string[]).includes(key) &&
      Array.isArray(ids) &&
      ids.length > 0 &&
      ids.every((id) => Number.isSafeInteger(id) && id > 0)
    if (!valid) {
      warnOnce(`PFC_PAYMENT_MODES : entrée « ${key} » invalide, choix du mode désactivé.`)
      return null
    }
    config[key as PaymentChoiceValue] = [...new Set(ids as number[])]
  }
  return Object.keys(config).length > 0 ? config : null
}

/** Choix du mode sur le formulaire : drapeau actif, paiement en ligne actif, mapping valide. */
export function isModeChoiceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.PFC_MODE_CHOICE_ENABLED?.trim() === 'true' &&
    isOnlinePaymentEnabled(env) &&
    readPaymentModes(env) !== null
  )
}

/** Facture PowerPay proposée : choix du mode actif, drapeau facture actif, mode cartographié. */
export function isInvoiceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.PFC_INVOICE_ENABLED?.trim() === 'true' &&
    isModeChoiceEnabled(env) &&
    Boolean(readPaymentModes(env)?.FACTURE)
  )
}

/**
 * Modes proposables, dans l'ordre du formulaire. La facture disparaît si elle
 * est coupée, ou si elle a déjà échoué pour la commande (refus ou abandon :
 * PostFinance ne permet pas de les distinguer).
 */
export function availablePaymentChoices(
  options: { invoiceUnavailable?: boolean } = {},
  env: NodeJS.ProcessEnv = process.env
): PaymentChoiceValue[] {
  if (!isModeChoiceEnabled(env)) return []
  const config = readPaymentModes(env)!
  return PAYMENT_CHOICES.filter((choice) => {
    if (!config[choice]) return false
    if (choice === 'FACTURE') return !options.invoiceUnavailable && isInvoiceEnabled(env)
    return true
  })
}

export type ChoiceCheck = { ok: true } | { ok: false; reason: 'inconnu' | 'indisponible' }

/** Validation serveur du mode reçu du navigateur : jamais cru sur parole. */
export function checkPaymentChoice(
  choice: unknown,
  options: { invoiceUnavailable?: boolean } = {},
  env: NodeJS.ProcessEnv = process.env
): ChoiceCheck {
  if (typeof choice !== 'string' || !(PAYMENT_CHOICES as readonly string[]).includes(choice)) {
    return { ok: false, reason: 'inconnu' }
  }
  return availablePaymentChoices(options, env).includes(choice as PaymentChoiceValue)
    ? { ok: true }
    : { ok: false, reason: 'indisponible' }
}

/** IDs de configuration autorisés pour un mode (vide s'il n'est pas cartographié). */
export function configurationIdsFor(
  choice: PaymentChoiceValue,
  env: NodeJS.ProcessEnv = process.env
): number[] {
  return readPaymentModes(env)?.[choice] ?? []
}

/** Mode correspondant à une configuration réellement utilisée, relue chez PostFinance. */
export function choiceOfConfiguration(
  configurationId: number | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): PaymentChoiceValue | null {
  if (!configurationId) return null
  const config = readPaymentModes(env)
  if (!config) return null
  for (const choice of PAYMENT_CHOICES) {
    if (config[choice]?.includes(configurationId)) return choice
  }
  return null
}

/**
 * Sans choix de mode (parcours d'origine), la Payment Page propose tout le
 * space : on en retire la facture dès que le mapping la connaît, pour qu'elle
 * ne soit jamais payée sans son supplément. Liste vide : aucune restriction.
 */
export function configurationIdsWithoutInvoice(env: NodeJS.ProcessEnv = process.env): number[] {
  const config = readPaymentModes(env)
  if (!config?.FACTURE) return []
  return PAYMENT_CHOICES.filter((choice) => choice !== 'FACTURE').flatMap(
    (choice) => config[choice] ?? []
  )
}
