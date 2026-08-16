'use server'

import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertAdmin } from '@/lib/guards'

const createSchema = z.object({
  username: z
    .string()
    .min(3, 'Trois caractères au minimum')
    .max(30)
    .regex(/^[a-z0-9._-]+$/, 'Lettres minuscules, chiffres, point, tiret ou souligné'),
  name: z.string().min(1, 'Requis').max(120),
  role: z.nativeEnum(Role),
  password: z.string().min(12, 'Douze caractères au minimum'),
})

export type UserInput = z.infer<typeof createSchema>

export async function createUser(input: UserInput): Promise<{ error?: string; message?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide' }

  const exists = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (exists) return { error: 'Ce nom d’utilisateur est déjà pris' }

  await prisma.user.create({
    data: {
      username: parsed.data.username,
      name: parsed.data.name,
      role: parsed.data.role,
      password: await bcrypt.hash(parsed.data.password, 12),
    },
  })
  revalidatePath('/admin/utilisateurs')
  return { message: `Compte « ${parsed.data.username} » créé.` }
}

export async function resetUserPassword(
  userId: string,
  password: string
): Promise<{ error?: string; message?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }
  if (password.length < 12) return { error: 'Douze caractères au minimum' }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (!user) return { error: 'Compte introuvable' }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(password, 12) },
  })
  return { message: `Mot de passe de « ${user.username} » réinitialisé.` }
}

export async function deleteUser(userId: string): Promise<{ error?: string; message?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }

  // On ne supprime pas son propre compte : se déconnecter définitivement par
  // inadvertance serait irrattrapable depuis l'interface.
  if (userId === guard.user.id) return { error: 'Vous ne pouvez pas supprimer votre propre compte' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, role: true },
  })
  if (!user) return { error: 'Compte introuvable' }

  // Il doit toujours rester un administrateur, sinon plus personne ne peut
  // gérer les comptes ni consulter le journal.
  if (user.role === Role.ADMIN) {
    const admins = await prisma.user.count({ where: { role: Role.ADMIN } })
    if (admins <= 1) return { error: 'Il doit rester au moins un administrateur' }
  }

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/admin/utilisateurs')
  return { message: `Compte « ${user.username} » supprimé. Ses actions restent au journal.` }
}
