'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function updatePassword(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Non autorisé' }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'Tous les champs sont requis' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas' }
  }

  if (newPassword.length < 8) {
    return { error: 'Le nouveau mot de passe doit faire au moins 8 caractères' }
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return { error: 'Utilisateur introuvable' }

  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) return { error: 'Mot de passe actuel incorrect' }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  return { success: 'Mot de passe mis à jour avec succès' }
}
