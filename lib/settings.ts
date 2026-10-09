import type { Setting } from '@prisma/client'
import { prisma, hasDatabaseUrl, isBuildWithoutDatabase } from '@/lib/prisma'

/** Valeurs par defaut du schema - utilisees si la base est absente ou injoignable. */
export const DEFAULT_SETTINGS: Setting = {
  id: 1,
  proRatePercent: 20,
  shippingCents: 1000,
  francoCents: 12000,
  prepDays: 3,
  companyName: 'Drinkcider',
  companyAddress: 'Ch. des Moilles 16',
  contactEmail: 'info@drinkcider.ch',
  contactPhone: '',
  vatSubject: false,
  vatNumber: '',
  vatRatePermille: 81,
  iban: 'CH57 0900 0000 1703 3189 6',
  contactName: 'Bertrand Baeriswyl',
  companyTagline: 'Drinkcider',
  companyZipCity: '1619 Les Paccots',
  invoicePlace: 'Les Paccots',
  bankName: 'PostFinance AG',
  paymentTermsDays: 30,
  maintenanceMode: false,
}

/** Reglages globaux - cree la ligne par defaut au premier acces. */
export async function getSettings(): Promise<Setting> {
  if (isBuildWithoutDatabase()) {
    return DEFAULT_SETTINGS
  }
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL est absente : impossible de charger les réglages à l'exécution.")
  }
  const existing = await prisma.setting.findUnique({ where: { id: 1 } })
  if (existing) return existing
  return prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
}

/** Valeurs par defaut du schema pour la boutique. */
export const DEFAULT_PUBLIC_SETTINGS = {
  shippingCents: 1000,
  francoCents: 12000,
  prepDays: 3,
  vatRatePermille: 81,
}

export type PublicSettings = typeof DEFAULT_PUBLIC_SETTINGS

/** Sous-ensemble exposable a la boutique (jamais l'IBAN ni le taux pro). */
export async function getPublicSettings(): Promise<PublicSettings> {
  if (isBuildWithoutDatabase()) {
    return DEFAULT_PUBLIC_SETTINGS
  }
  try {
    const s = await getSettings()
    return {
      shippingCents: s.shippingCents,
      francoCents: s.francoCents,
      prepDays: s.prepDays,
      vatRatePermille: s.vatRatePermille,
    }
  } catch (err) {
    if (!hasDatabaseUrl()) {
      throw err
    }
    return DEFAULT_PUBLIC_SETTINGS
  }
}

/**
 * Boutique fermee pour maintenance. Si la base est absente ou injoignable, on considere la
 * boutique ouverte : le formulaire echouera de lui-meme, sans bloquer la vitrine.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  if (isBuildWithoutDatabase()) {
    return false
  }
  try {
    return (await getSettings()).maintenanceMode
  } catch (err) {
    if (!hasDatabaseUrl()) {
      throw err
    }
    return false
  }
}
