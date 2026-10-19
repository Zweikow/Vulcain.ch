import { Prisma, PrismaClient } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { formatCHF } from '@/lib/money'

export const DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const

export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType]

export interface ValidatedDiscount {
  valid: true
  discountCode: {
    id: string
    code: string
    description: string | null
    type: DiscountType
    percentage: number | null
    amountCents: number | null
    minSubtotalCents: number | null
    maxUses: number | null
    usedCount: number
    active: boolean
    startDate: Date | null
    endDate: Date | null
  }
  discountCents: number
}

export interface InvalidDiscount {
  valid: false
  error: string
}

export type DiscountValidationResult = ValidatedDiscount | InvalidDiscount

/**
 * Normalise un code promo : majuscules, sans espaces superflus, sans dièse initial.
 */
export function normalizePromoCode(rawCode: string): string {
  return rawCode.trim().replace(/^#/, '').toUpperCase()
}

/**
 * Calcule le montant de la réduction en centimes entiers.
 * Garanti entre 0 et le sous-total.
 */
export function calculateDiscount(
  type: DiscountType,
  subtotalCents: number,
  percentage?: number | null,
  amountCents?: number | null
): number {
  if (subtotalCents <= 0) return 0

  let discount = 0
  if (type === 'PERCENTAGE' && percentage && percentage > 0) {
    discount = Math.round(subtotalCents * (percentage / 100))
  } else if (type === 'FIXED_AMOUNT' && amountCents && amountCents > 0) {
    discount = Math.min(subtotalCents, amountCents)
  }

  return Math.max(0, Math.min(discount, subtotalCents))
}

/**
 * Valide les règles d'éligibilité d'un enregistrement DiscountCode sur un sous-total donné.
 */
export function validateDiscountCodeRules(
  codeRecord: {
    id: string
    code: string
    description: string | null
    type: DiscountType
    percentage: number | null
    amountCents: number | null
    minSubtotalCents: number | null
    maxUses: number | null
    usedCount: number
    active: boolean
    startDate: Date | null
    endDate: Date | null
  },
  subtotalCents: number,
  now = new Date()
): { valid: true; discountCents: number } | { valid: false; error: string } {
  if (!codeRecord.active) {
    return { valid: false, error: 'Ce code promo est actuellement désactivé.' }
  }

  if (codeRecord.startDate && now < codeRecord.startDate) {
    return { valid: false, error: "Ce code promo n'est pas encore actif." }
  }

  if (codeRecord.endDate && now > codeRecord.endDate) {
    return { valid: false, error: 'Ce code promo a expiré.' }
  }

  if (codeRecord.maxUses !== null && codeRecord.usedCount >= codeRecord.maxUses) {
    return {
      valid: false,
      error: "Ce code promo a atteint son nombre maximal d'utilisations.",
    }
  }

  if (codeRecord.minSubtotalCents && subtotalCents < codeRecord.minSubtotalCents) {
    return {
      valid: false,
      error: `Ce code nécessite un panier minimum de ${formatCHF(codeRecord.minSubtotalCents)}.`,
    }
  }

  const discountCents = calculateDiscount(
    codeRecord.type,
    subtotalCents,
    codeRecord.percentage,
    codeRecord.amountCents
  )

  if (discountCents <= 0) {
    return { valid: false, error: 'La réduction ne peut pas être appliquée à ce panier.' }
  }

  return { valid: true, discountCents }
}

/**
 * Recherche et valide un code promo en base de données.
 */
export async function findAndValidateDiscountCode(
  rawCode: string,
  subtotalCents: number,
  client?: PrismaClient | Prisma.TransactionClient,
  now = new Date()
): Promise<DiscountValidationResult> {
  const code = normalizePromoCode(rawCode)
  if (!code) {
    return { valid: false, error: 'Veuillez saisir un code promo.' }
  }

  const db = client || defaultPrisma
  const discountCode = await db.discountCode.findUnique({
    where: { code },
  })

  if (!discountCode) {
    return { valid: false, error: 'Code promo invalide.' }
  }

  const validation = validateDiscountCodeRules(discountCode, subtotalCents, now)
  if (!validation.valid) {
    return { valid: false, error: validation.error }
  }

  return {
    valid: true,
    discountCode,
    discountCents: validation.discountCents,
  }
}
