import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Verifie si la variable d'environnement DATABASE_URL est definie et non vide.
 * Permet d'isoler le build statique Next.js dans les environnements CI depourvus
 * d'acces base de donnees (ex: job validate de GitLab CI sans environnement).
 */
export function hasDatabaseUrl(): boolean {
  const url = process.env.DATABASE_URL
  return typeof url === 'string' && url.trim().length > 0
}
