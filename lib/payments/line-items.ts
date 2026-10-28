import type { LineItemCreate } from 'postfinancecheckout'
import { centsToApiAmount } from '@/lib/money'

/**
 * Lignes de la transaction PostFinance, construites depuis la commande telle
 * qu'enregistrée en base : jamais depuis le panier du navigateur. La somme des
 * lignes doit redonner exactement le total de la commande, au centime près ;
 * sinon rien n'est envoyé à PostFinance.
 *
 * Tout se calcule en centimes entiers. La conversion en décimal n'intervient
 * qu'à la toute fin, ligne par ligne, dans toSdkLineItems.
 */

export type PaymentLineType = 'PRODUCT' | 'DISCOUNT' | 'SHIPPING' | 'FEE'

export type PaymentLine = {
  uniqueId: string
  type: PaymentLineType
  name: string
  sku?: string
  quantity: number
  /** Montant total de la ligne en centimes, quantité comprise. Négatif pour une remise. */
  amountCents: number
  shippingRequired: boolean
}

export type PayableOrder = {
  totalCents: number
  shippingCents: number
  promoCode: string | null
  promoDiscountCents: number
  items: {
    id: string
    productName: string
    unitPriceCents: number
    quantity: number
    articleNumber?: number | null
  }[]
}

export class PaymentLinesMismatchError extends Error {
  constructor(
    readonly linesTotalCents: number,
    readonly orderTotalCents: number
  ) {
    super(
      `Lignes de paiement (${linesTotalCents} centimes) différentes du total de la commande (${orderTotalCents} centimes)`
    )
    this.name = 'PaymentLinesMismatchError'
  }
}

// Longueur maximale admise par l'API pour le nom d'une ligne
const MAX_NAME_LENGTH = 150

function lineName(name: string): string {
  const clean = name.replace(/\s+/g, ' ').trim()
  return clean.length > MAX_NAME_LENGTH ? `${clean.slice(0, MAX_NAME_LENGTH - 3)}...` : clean
}

/**
 * Construit les lignes PRODUCT, DISCOUNT (code promo) et SHIPPING d'une commande.
 *
 * Les prix des lignes de commande sont déjà les prix appliqués (tarif pro,
 * promotion produit, bouteilles offertes à 0) : la remise pro n'a donc pas de
 * ligne propre. `extraLines` accueille les lignes à venir, par exemple les frais
 * d'un paiement par facture (type FEE) : le total de la commande doit alors les
 * inclure, la vérification de somme reste la même.
 */
export function buildPaymentLines(
  order: PayableOrder,
  extraLines: PaymentLine[] = []
): PaymentLine[] {
  const lines: PaymentLine[] = order.items.map((item) => ({
    uniqueId: item.id,
    type: 'PRODUCT',
    name: lineName(item.productName),
    sku: item.articleNumber != null ? String(item.articleNumber) : undefined,
    quantity: item.quantity,
    amountCents: item.unitPriceCents * item.quantity,
    shippingRequired: true,
  }))

  if (order.promoDiscountCents > 0) {
    lines.push({
      uniqueId: 'code-promo',
      type: 'DISCOUNT',
      name: lineName(order.promoCode ? `Code promo ${order.promoCode}` : 'Code promo'),
      quantity: 1,
      amountCents: -order.promoDiscountCents,
      shippingRequired: false,
    })
  }

  if (order.shippingCents > 0) {
    lines.push({
      uniqueId: 'frais-de-port',
      type: 'SHIPPING',
      name: 'Frais de port',
      quantity: 1,
      amountCents: order.shippingCents,
      shippingRequired: false,
    })
  }

  lines.push(...extraLines)

  const linesTotalCents = lines.reduce((sum, line) => sum + line.amountCents, 0)
  if (linesTotalCents !== order.totalCents) {
    throw new PaymentLinesMismatchError(linesTotalCents, order.totalCents)
  }
  return lines
}

/**
 * Lignes au format du SDK : montants décimaux TTC. Aucune ligne de taxe tant
 * que la cidrerie n'est pas assujettie à la TVA (Setting.vatSubject) ; le jour
 * où elle le devient, ajouter ici le champ `taxes` de chaque ligne.
 */
export function toSdkLineItems(lines: PaymentLine[]): LineItemCreate[] {
  return lines.map((line) => ({
    uniqueId: line.uniqueId,
    type: line.type,
    name: line.name,
    ...(line.sku ? { sku: line.sku } : {}),
    quantity: line.quantity,
    amountIncludingTax: centsToApiAmount(line.amountCents),
    shippingRequired: line.shippingRequired,
  }))
}
