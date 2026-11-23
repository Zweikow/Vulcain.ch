import { OrderStatus } from '@prisma/client'

/**
 * Bon de livraison : la liste de ce qui est dans le carton. Il remplace le
 * « projet de facture » qu'on glissait dans le colis alors que la facture part
 * par courriel à l'expédition.
 *
 * Aucun prix ni montant : le carton peut être un cadeau, et le préparateur, qui
 * ne voit aucun montant (lib/permissions), doit pouvoir l'imprimer. Le bon est
 * construit ici champ par champ, à partir d'une liste blanche : un prix présent
 * dans la commande ne peut pas s'y glisser par mégarde.
 *
 * Pas de série de numéros propre : la référence est le numéro de commande.
 */

/** Le bon appartient à la préparation ; on le réimprime après l'expédition. */
export const DELIVERY_NOTE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.EN_PREPARATION,
  OrderStatus.EXPEDIEE,
]

export function canPrintDeliveryNote(status: OrderStatus): boolean {
  return DELIVERY_NOTE_STATUSES.includes(status)
}

/** Ce que le bon lit d'une commande. Les montants n'y figurent pas. */
export type DeliveryNoteOrderInput = {
  numero: string
  status: OrderStatus
  clientName: string
  clientCompany?: string | null
  clientEmail?: string | null
  address: string
  npa: string
  city: string
  isPickup?: boolean
  message?: string | null
  customer?: { customerNumber?: number | null } | null
  items: Array<{
    id: string
    productName: string
    quantity: number
    bottlesPerUnit?: number | null
    product?: {
      articleNumber?: number | null
      year?: number | null
      bottleSize?: string | null
    } | null
  }>
}

export type DeliveryNoteLine = {
  id: string
  articleNumber: number | null
  name: string
  year: number | null
  /** Contenance d'une bouteille, « 75 cl ». */
  format: string | null
  quantity: number
  bottlesPerUnit: number
  bottles: number
}

export type DeliveryNote = {
  numero: string
  customerNumber: number | null
  recipient: {
    company: string | null
    name: string
    address: string
    npa: string
    city: string
  }
  isPickup: boolean
  lines: DeliveryNoteLine[]
  totalBottles: number
  /** Une colonne « Bouteilles » n'a de sens que si un article en contient plusieurs. */
  hasMultiBottleItems: boolean
  message: string | null
  /** La facture part par courriel à l'adresse de la commande (sendInvoiceEmail). */
  invoiceSentByEmail: boolean
}

/** « 75cl » devient « 75 cl », « 27.5cl » devient « 27.5 cl ». */
export function formatBottleSize(size?: string | null): string | null {
  const s = size?.trim()
  if (!s) return null
  return s.replace(/^(\d+(?:[.,]\d+)?)\s*cl$/i, '$1 cl')
}

/** La facture est envoyée à `order.clientEmail` : sans adresse, rien ne part. */
export function hasInvoiceEmail(email?: string | null): boolean {
  const s = email?.trim() ?? ''
  return /^[^\s@]+@[^\s@]+$/.test(s)
}

function textOrNull(value?: string | null): string | null {
  const s = value?.trim()
  return s ? s : null
}

export function buildDeliveryNote(order: DeliveryNoteOrderInput): DeliveryNote {
  const lines: DeliveryNoteLine[] = order.items.map((item) => {
    const bottlesPerUnit = item.bottlesPerUnit && item.bottlesPerUnit > 0 ? item.bottlesPerUnit : 1
    return {
      id: item.id,
      articleNumber: item.product?.articleNumber ?? null,
      name: item.productName,
      year: item.product?.year ?? null,
      format: formatBottleSize(item.product?.bottleSize),
      quantity: item.quantity,
      bottlesPerUnit,
      bottles: item.quantity * bottlesPerUnit,
    }
  })

  return {
    numero: order.numero,
    customerNumber: order.customer?.customerNumber ?? null,
    recipient: {
      company: textOrNull(order.clientCompany),
      name: order.clientName,
      address: order.address,
      npa: order.npa,
      city: order.city,
    },
    isPickup: Boolean(order.isPickup),
    lines,
    totalBottles: lines.reduce((n, line) => n + line.bottles, 0),
    hasMultiBottleItems: lines.some((line) => line.bottlesPerUnit > 1),
    message: textOrNull(order.message),
    invoiceSentByEmail: hasInvoiceEmail(order.clientEmail),
  }
}

/** Les champs de `getSettings()` utiles à l'en-tête : ni IBAN, ni taux, ni TVA. */
export type DeliveryNoteSender = {
  companyName: string
  companyTagline: string
  contactName: string
  companyAddress: string
  companyZipCity: string
  contactEmail: string
  contactPhone: string
}

export function deliveryNoteSender(settings: DeliveryNoteSender): DeliveryNoteSender {
  return {
    companyName: settings.companyName,
    companyTagline: settings.companyTagline,
    contactName: settings.contactName,
    companyAddress: settings.companyAddress,
    companyZipCity: settings.companyZipCity,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
  }
}

/** Ce que la base doit charger pour un bon : aucun champ de prix. */
export const deliveryNoteOrderSelect = {
  id: true,
  numero: true,
  status: true,
  clientName: true,
  clientCompany: true,
  clientEmail: true,
  address: true,
  npa: true,
  city: true,
  isPickup: true,
  message: true,
  customer: { select: { customerNumber: true } },
  items: {
    select: {
      id: true,
      productName: true,
      quantity: true,
      bottlesPerUnit: true,
      product: { select: { articleNumber: true, year: true, bottleSize: true } },
    },
  },
} as const
