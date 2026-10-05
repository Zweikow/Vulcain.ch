const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const prods = await prisma.product.findMany({
    select: { id: true, articleNumber: true, name: true, imageUrl: true },
    orderBy: { articleNumber: 'asc' },
  })
  console.log(`Found ${prods.length} products:`)
  for (const p of prods) {
    console.log(`#${p.articleNumber} | ${p.name} | imageUrl: ${p.imageUrl}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
