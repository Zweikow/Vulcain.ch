const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const CUVEES_MAPPING = [
  { art: 13, slug: 'poire-la-premoudiere-2022', name: 'Poiré La Prémoudière 2022' },
  { art: 14, slug: 'trois-pepins-2023', name: '3 Pépins 2023' },
  { art: 15, slug: 'lande-foy-2022', name: 'Lande Foy 2022' },
  { art: 16, slug: 'belle-brutale-2017', name: 'Belle Brutale 2017' },
  { art: 18, slug: 'turgowy-2019', name: 'Turgowy 2019' },
  { art: 19, slug: 'turgowy-2020', name: 'Turgowy 2020' },
  { art: 21, slug: 'cidre-de-fer-2020', name: 'Fer 2020' },
  { art: 22, slug: 'la-fribourgeoise-2021', name: 'Fribourgeoise 2021' },
  { art: 23, slug: 'premiers-emois-2021', name: 'Premiers Emois 2021' },
  { art: 24, slug: 'brute-de-rue-2021', name: 'Brute de Rue 2021' },
  { art: 25, slug: 'a-propos-dailes-2021', name: "A propos d'Ailes 2021" },
  { art: 26, slug: 'quatre-pepins-2022', name: '4 Pépins 2022' },
  { art: 28, slug: 'turgowy-2023', name: 'Turgowy 2023' },
  { art: 29, slug: 'baie-de-rue-2023', name: 'Baie de Rue 2023' },
  { art: 30, slug: 'quatre-pepins-2023', name: '4 Pépins 2023' },
  { art: 31, slug: 'trois-pepins-2010', name: '3 Pépins 2010' },
  { art: 32, slug: 'cidre-glace-2012', name: 'Cidre Glace 2012' },
  { art: 33, slug: 'botsi-de-glace-2017', name: 'Botsi de glace 2017' },
]

const VALIDATED_ARTS = [13, 25, 33]

async function main() {
  console.log('=== Mise à jour des photos des cuvées validées dans PostgreSQL ===')
  let updated = 0

  for (const c of CUVEES_MAPPING) {
    if (!VALIDATED_ARTS.includes(c.art)) {
      continue
    }
    const imgUrl = `/images/cuvees/${c.slug}.jpg`
    const fullPath = path.join(__dirname, '..', 'public', 'images', 'cuvees', `${c.slug}.jpg`)

    if (!fs.existsSync(fullPath)) {
      console.warn(`[ATTENTION] Fichier image manquant : ${fullPath}`)
      continue
    }

    const prod = await prisma.product.findUnique({
      where: { articleNumber: c.art },
    })

    if (prod) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { imageUrl: imgUrl },
      })
      console.log(`✓ Article #${c.art} (${prod.name}) -> ${imgUrl}`)
      updated++
    } else {
      console.warn(`[ATTENTION] Produit #${c.art} non trouvé en base`)
    }
  }

  console.log(`\n=== ${updated}/${CUVEES_MAPPING.length} produits mis à jour avec succès ! ===`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
