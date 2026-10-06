import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { ProducteursClient } from '@/components/admin/ProducteursClient'

export const dynamic = 'force-dynamic'

export default async function ProducteursPage() {
  const user = await currentUser()
  const canEdit = user ? can.manageCatalogue(user.role) : false

  const producers = await prisma.producer.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })

  return <ProducteursClient producers={producers} canEdit={canEdit} />
}
