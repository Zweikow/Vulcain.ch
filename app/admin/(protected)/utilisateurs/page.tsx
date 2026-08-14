import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'
import { UsersClient } from '@/components/admin/UsersClient'

export default async function UtilisateursPage() {
  // Garde côté serveur : masquer le lien ne suffirait pas, l'adresse est devinable.
  const admin = await requireAdmin()

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  })

  return <UsersClient users={users} currentUserId={admin.id} />
}
