import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { CategoriesClient } from '@/components/admin/CategoriesClient'

export default async function CategoriesPage() {
  const user = await currentUser()
  const canEdit = user ? can.manageCatalogue(user.role) : false

  const categories = await prisma.category.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  })

  return <CategoriesClient categories={categories} canEdit={canEdit} />
}
