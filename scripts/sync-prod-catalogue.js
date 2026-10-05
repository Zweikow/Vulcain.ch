const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Synchronisation du catalogue réel de production ---')

  // 1. S'assurer que le producteur existe
  const producer = await prisma.producer.upsert({
    where: { name: 'Jacques Perritaz' },
    update: {},
    create: { name: 'Jacques Perritaz' },
  })

  // 2. Créer ou mettre à jour les catégories de production
  const catOffre = await prisma.category.upsert({
    where: { name: 'Offre spéciale été' },
    update: { position: 0 },
    create: { name: 'Offre spéciale été', position: 0 },
  })

  const catCidres = await prisma.category.upsert({
    where: { name: 'Cidres' },
    update: { position: 1 },
    create: { name: 'Cidres', position: 1 },
  })

  const catSpiritueux = await prisma.category.upsert({
    where: { name: 'Eaux de vie / Liqueurs / Cidre de cuisine' },
    update: { position: 2 },
    create: { name: 'Eaux de vie / Liqueurs / Cidre de cuisine', position: 2 },
  })

  // 3. Supprimer toutes les anciennes promotions de test
  await prisma.promotion.deleteMany({})
  console.log('✓ Anciennes promotions de test supprimées')

  // 4. Liste exacte des 24 articles de production
  const prodProducts = [
    // --- Offre spéciale été ---
    {
      name: 'Cidre Effervescence 2022',
      description: 'Bouteille de 27.5cl, carton de 24 bouteilles, 3 cartons achetés 2 payés.',
      priceCents: 8640, // 24 bouteilles * 3.60 CHF = 86.40 CHF / carton
      bottleSize: '27.5cl',
      bottlesPerUnit: 24,
      year: 2022,
      origin: 'CH',
      categoryId: catOffre.id,
      isBio: false,
      isVegan: false,
    },

    // --- Cidres ---
    {
      name: 'NEW: Poiré Comment! 2022',
      description: 'Sec, poires cuites au four, velour en bouche',
      priceCents: 1800,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2022,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Poiré La Prémoudière 2022',
      description: 'Juteux, sec',
      priceCents: 2000,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2022,
      origin: 'FR',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: '3 Pépins 2023',
      description: 'Extra brut, vineux',
      priceCents: 1800,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2023,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Lande Foy 2022',
      description: 'Brut, fruité',
      priceCents: 1200,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2022,
      origin: 'FR',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Belle Brutale 2017',
      description: 'Sec, fruité, acidulée',
      priceCents: 1800,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2017,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Brute Bestiale 2017',
      description: 'Sec, épicé et amertume',
      priceCents: 1800,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2017,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Turgowy 2019',
      description: 'Sec, fruité et acidulé',
      priceCents: 1500,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2019,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Turgowy 2020',
      description: 'Sec plus rond – florale',
      priceCents: 1500,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2020,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Brute de Rue 2020',
      description: 'Sec, belles amertumes – épicée',
      priceCents: 1600,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2020,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Fer 2020',
      description: 'Acidulée, florale – fruité évoluée',
      priceCents: 1500,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2020,
      origin: 'FR',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Fribourgeoise 2021',
      description: 'Demi-sec, fruité et notes safranées',
      priceCents: 1500,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2021,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Premiers Emois 2021',
      description: 'Demi-sec, très fruité, long en bouche et dense',
      priceCents: 1600,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2021,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Brute de Rue 2021',
      description: 'Sec, dense, beaux amers',
      priceCents: 1600,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2021,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: "A propos d'Ailes 2021",
      description: 'Demi-sec, très fruité, notes épices - safran',
      priceCents: 1900,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2021,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: '4 Pépins 2022',
      description: 'Sec – belle rondeur sur le fruit – complexité grâce aux coings',
      priceCents: 2200,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2022,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Brute de Rue 2022',
      description: 'Sec, plus rond que 20 et 21, riche et belle matière, amer souple',
      priceCents: 1600,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2022,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Turgowy 2023',
      description: 'Très sec, désaltérant, acidité – florale – sapide',
      priceCents: 1500,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2023,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Baie de Rue 2023',
      description: 'Sec, moins de pommes amers, fraîche et florale',
      priceCents: 1600,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2023,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: '4 Pépins 2023',
      description: 'Sec, plus léger que 2022, notes de pinot noir plus marquées',
      priceCents: 2200,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2023,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: '3 Pépins 2010',
      description: 'Extra brut, évolué, fruits très murs, belle longueur (144 bouteilles)',
      priceCents: 3000,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2010,
      origin: 'CH',
      categoryId: catCidres.id,
      isBio: false,
      isVegan: false,
    },

    // --- Eaux de vie / Liqueurs / Cidre de cuisine ---
    {
      name: 'Cidre Glace 2012',
      description: "Liquoreux sur l'acidité, tourbé et notes de tabac",
      priceCents: 5000,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2012,
      origin: 'CH',
      categoryId: catSpiritueux.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Botsi de glace 2017',
      description:
        'Liquoreux de poires à Botsi, fumé et notes de beurre et noisettes, légère oxydation',
      priceCents: 2800,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2017,
      origin: 'CH',
      categoryId: catSpiritueux.id,
      isBio: false,
      isVegan: false,
    },
    {
      name: 'Poiré Fondue – non étiq.',
      description: 'Sec, 2018, pour la cuisine',
      priceCents: 1000,
      bottleSize: '75cl',
      bottlesPerUnit: 1,
      year: 2018,
      origin: 'CH',
      categoryId: catSpiritueux.id,
      isBio: false,
      isVegan: false,
    },
  ]

  // 5. Désactiver les anciens produits de test qui ne font pas partie du catalogue
  const existingProducts = await prisma.product.findMany()
  for (const ep of existingProducts) {
    const isMatch = prodProducts.some(
      (p) => p.name === ep.name || ep.name.includes(p.name.replace('NEW: ', ''))
    )
    if (!isMatch) {
      await prisma.product.update({
        where: { id: ep.id },
        data: { active: false, archived: true },
      })
      console.log(`- Produit archivé/désactivé : ${ep.name}`)
    }
  }

  // 6. Insérer ou mettre à jour les 24 produits avec stock = 120 et stockSeuil = 20
  let maxArtNum = 0
  const allProds = await prisma.product.findMany({ select: { articleNumber: true } })
  for (const ap of allProds) {
    if (ap.articleNumber > maxArtNum) maxArtNum = ap.articleNumber
  }

  let effervescenceProduct = null

  for (const p of prodProducts) {
    // Chercher par nom exact ou nom approchant (ex: "Vulcain - Poiré Comment!" -> "NEW: Poiré Comment! 2022")
    const cleanName = p.name.replace('NEW: ', '')
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ name: p.name }, { name: { contains: cleanName } }],
      },
    })

    let savedProduct
    if (existing) {
      savedProduct = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          bottleSize: p.bottleSize,
          bottlesPerUnit: p.bottlesPerUnit,
          year: p.year,
          origin: p.origin,
          stock: 120, // 120 bouteilles/unités en stock
          stockSeuil: 20, // Seuil d'alerte à 20
          active: true,
          archived: false,
          categoryId: p.categoryId,
          producerId: producer.id,
          compareAtPriceCents: null,
        },
      })
      console.log(`✓ Produit mis à jour : ${savedProduct.name} (Stock: 120, Seuil: 20)`)
    } else {
      maxArtNum++
      savedProduct = await prisma.product.create({
        data: {
          articleNumber: maxArtNum,
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          bottleSize: p.bottleSize,
          bottlesPerUnit: p.bottlesPerUnit,
          year: p.year,
          origin: p.origin,
          stock: 120,
          stockSeuil: 20,
          active: true,
          archived: false,
          categoryId: p.categoryId,
          producerId: producer.id,
          compareAtPriceCents: null,
        },
      })
      console.log(`+ Nouveau produit créé : ${savedProduct.name} (#${savedProduct.articleNumber})`)
    }

    if (p.name.includes('Effervescence')) {
      effervescenceProduct = savedProduct
    }
  }

  // 7. Créer la promotion estivale pour 2 cartons achetés 1 offert
  if (effervescenceProduct) {
    const promo = await prisma.promotion.create({
      data: {
        name: 'Offre spéciale été',
        badgeText: '2+1 OFFERT',
        description: '2 cartons achetés = 1 carton offert ! (3 cartons pour le prix de 2)',
        type: 'BUY_X_GET_Y_FREE',
        buyQuantity: 2,
        getFreeQuantity: 1,
        active: true,
        productId: effervescenceProduct.id,
      },
    })
    console.log(
      `🎉 Promotion créée : ${promo.name} (${promo.badgeText}) sur ${effervescenceProduct.name}`
    )
  }

  console.log('--- Synchronisation terminée avec succès ! ---')
}

main()
  .catch((err) => {
    console.error('Erreur:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
