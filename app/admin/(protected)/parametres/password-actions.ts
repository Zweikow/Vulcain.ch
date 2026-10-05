'use server'

import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(12, 'Choisissez au moins 12 caractères'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les deux saisies ne correspondent pas',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Le nouveau mot de passe doit être différent de l’actuel',
  })

/**
 * Changement du mot de passe d'administration. Le mot de passe actuel est
 * exigé : une session laissée ouverte sur un poste ne doit pas suffire à
 * verrouiller le compte de son titulaire.
 */
export async function changePassword(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<{ error?: string; message?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Non autorisé' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide' }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  })
  if (!user) return { error: 'Compte introuvable' }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!valid) return { error: 'Mot de passe actuel incorrect' }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(parsed.data.newPassword, 12) },
  })

  return { message: 'Mot de passe modifié. Il sera demandé à la prochaine connexion.' }
}
