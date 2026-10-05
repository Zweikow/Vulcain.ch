import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })

  for (let i = 0; i < categories.length; i++) {
    await prisma.category.update({
      where: { id: categories[i].id },
      data: { position: i },
    })
  }
  console.log('Categories reindexed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
