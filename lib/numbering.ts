import { Prisma } from '@prisma/client'

/** Séries de numérotation. AVOIR est réservé pour les notes de crédit à venir. */
export const SERIES = {
  COMMANDE: 'CMD',
  FACTURE: 'FAC',
  AVOIR: 'AV',
} as const

export type Series = (typeof SERIES)[keyof typeof SERIES]

/**
 * Incrémente atomiquement le compteur d'une série pour l'année et renvoie le
 * numéro formaté (CMD-2026-0001, FAC-2026-0001).
 *
 * L'incrément et la lecture se font en une seule instruction SQL : deux
 * commandes simultanées ne peuvent pas obtenir le même numéro. À appeler dans
 * la transaction qui crée le document, pour qu'un échec ne consomme pas de
 * numéro et ne laisse pas de trou dans la série.
 */
export async function nextNumber(
  tx: Prisma.TransactionClient,
  series: Series,
  year: number = new Date().getFullYear()
): Promise<string> {
  const [row] = await tx.$queryRaw<{ value: number }[]>(
    Prisma.sql`INSERT INTO "DocumentCounter" ("series", "year", "value") VALUES (${series}, ${year}, 1)
               ON CONFLICT ("series", "year") DO UPDATE SET "value" = "DocumentCounter"."value" + 1
               RETURNING "value"`
  )
  return `${series}-${year}-${String(row.value).padStart(4, '0')}`
}
