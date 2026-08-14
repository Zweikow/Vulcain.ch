import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import { auth } from '@/lib/auth'

/**
 * Gardes de rôle. Le contrôle se fait côté serveur à chaque écran et à chaque
 * action : masquer un lien dans la barre latérale ne protège rien, l'adresse
 * reste devinable.
 */

export async function currentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return { id: session.user.id, role: session.user.role, name: session.user.name ?? '' }
}

/** Redirige un préparateur vers le tableau de bord. Pour les pages. */
export async function requireAdmin() {
  const user = await currentUser()
  if (!user) redirect('/admin/login')
  if (user.role !== Role.ADMIN) redirect('/admin')
  return user
}

/** Renvoie une erreur exploitable plutôt qu'une redirection. Pour les actions. */
export async function assertAdmin(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof currentUser>>> }
  | { ok: false; error: string }
> {
  const user = await currentUser()
  if (!user) return { ok: false, error: 'Non autorisé' }
  if (user.role !== Role.ADMIN) {
    return { ok: false, error: 'Cette action est réservée à l’administrateur' }
  }
  return { ok: true, user }
}
