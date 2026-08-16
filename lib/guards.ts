import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { can, homePathFor } from '@/lib/permissions'

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

/** Redirige vers la page d'accueil du rôle si la capacité manque. Pour les pages. */
export async function requireCapability(capability: (role: Role) => boolean) {
  const user = await currentUser()
  if (!user) redirect('/admin/login')
  if (!capability(user.role)) redirect(homePathFor(user.role))
  return user
}

export async function requireAdmin() {
  return requireCapability(can.manageSettings)
}

/** Renvoie une erreur exploitable plutôt qu'une redirection. Pour les actions. */
export async function assertCapability(
  capability: (role: Role) => boolean
): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof currentUser>>> }
  | { ok: false; error: string }
> {
  const user = await currentUser()
  if (!user) return { ok: false, error: 'Non autorisé' }
  if (!capability(user.role)) {
    return { ok: false, error: 'Votre rôle ne permet pas cette action' }
  }
  return { ok: true, user }
}

export async function assertAdmin() {
  return assertCapability(can.manageUsers)
}
