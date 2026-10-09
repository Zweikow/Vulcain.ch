/**
 * Script de mise à jour unique des noms et slugs des produits #6, #8, #12 et #13.
 * À exécuter manuellement : node scripts/apply-slug-fixes.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== APPLICATION DES CORRECTIONS DE NOMS ET SLUGS ===\n')

  await prisma.$transaction(async (tx) => {
    // 1. Libération des slugs sur les doublons archivés (#6 et #8)
    const p6Before = await tx.product.findUnique({ where: { articleNumber: 6 } })
    const p8Before = await tx.product.findUnique({ where: { articleNumber: 8 } })

    if (p6Before) {
      await tx.product.update({
        where: { articleNumber: 6 },
        data: { slug: 'poire-comment-2022-archive' },
      })
      console.log(`[#6 Archivé] Slug libéré : "${p6Before.slug}" -> "poire-comment-2022-archive"`)
    }

    if (p8Before) {
      await tx.product.update({
        where: { articleNumber: 8 },
        data: { slug: 'poire-la-premoudiere-2022-archive' },
      })
      console.log(
        `[#8 Archivé] Slug libéré : "${p8Before.slug}" -> "poire-la-premoudiere-2022-archive"`
      )
    }

    // 2. Mise à jour des produits actifs cibles (#12 et #13)
    const p12Before = await tx.product.findUnique({ where: { articleNumber: 12 } })
    const p13Before = await tx.product.findUnique({ where: { articleNumber: 13 } })

    if (p12Before) {
      await tx.product.update({
        where: { articleNumber: 12 },
        data: {
          name: 'Poiré Comment! 2022',
          slug: 'poire-comment-2022',
        },
      })
      console.log(`[#12 Actif] Nom : "${p12Before.name}" -> "Poiré Comment! 2022"`)
      console.log(`[#12 Actif] Slug : "${p12Before.slug}" -> "poire-comment-2022"`)
    }

    if (p13Before) {
      await tx.product.update({
        where: { articleNumber: 13 },
        data: {
          slug: 'poire-la-premoudiere-2022',
        },
      })
      console.log(`[#13 Actif] Slug : "${p13Before.slug}" -> "poire-la-premoudiere-2022"`)
    }
  })

  console.log('\n✅ Opération terminée avec succès. Slugs désormais figés.')
}

main()
  .catch((err) => {
    console.error('❌ Erreur lors de la mise à jour :', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
