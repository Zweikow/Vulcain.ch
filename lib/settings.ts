import { prisma } from '@/lib/prisma'

/** Réglages globaux — crée la ligne par défaut au premier accès. */
export async function getSettings() {
  const existing = await prisma.setting.findUnique({ where: { id: 1 } })
  if (existing) return existing
  return prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
}

/** Valeurs par défaut du schéma — utilisées si la base est injoignable. */
export const DEFAULT_PUBLIC_SETTINGS = {
  shippingCents: 1000,
  francoCents: 12000,
  prepDays: 3,
  vatRatePermille: 81,
}

export type PublicSettings = typeof DEFAULT_PUBLIC_SETTINGS

/** Sous-ensemble exposable à la boutique (jamais l'IBAN ni le taux pro). */
export async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const s = await getSettings()
    return {
      shippingCents: s.shippingCents,
      francoCents: s.francoCents,
      prepDays: s.prepDays,
      vatRatePermille: s.vatRatePermille,
    }
  } catch {
    return DEFAULT_PUBLIC_SETTINGS
  }
}
