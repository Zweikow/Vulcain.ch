const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const CUVEES_CLEAN_MAPPING = [
  { art: 13, slug: 'poire-la-premoudiere-2022', file: 'poire-la-premoudiere-2022-duo.jpg' },
  { art: 14, slug: 'trois-pepins-2023', file: 'trois-pepins-2023-duo.jpg' },
  { art: 15, slug: 'lande-foy-2022', file: 'lande-foy-2022-duo.jpg' },
  { art: 16, slug: 'belle-brutale-2017', file: 'belle-brutale-2017-duo.jpg' },
  { art: 18, slug: 'turgowy-2019', file: 'turgowy-2019-duo.jpg' },
  { art: 19, slug: 'turgowy-2020', file: 'turgowy-2020-duo.jpg' },
  { art: 21, slug: 'cidre-de-fer-2020', file: 'cidre-de-fer-2020-duo.jpg' },
  { art: 22, slug: 'la-fribourgeoise-2021', file: 'la-fribourgeoise-2021-duo.jpg' },
  { art: 23, slug: 'premiers-emois-2021', file: 'premiers-emois-2021-duo.jpg' },
  { art: 24, slug: 'brute-de-rue-2021', file: 'brute-de-rue-2021-duo.jpg' },
  { art: 25, slug: 'a-propos-dailes-2021', file: 'a-propos-dailes-2021-transparent.png' },
  { art: 26, slug: 'quatre-pepins-2022', file: 'quatre-pepins-2022-duo.jpg' },
  { art: 28, slug: 'turgowy-2023', file: 'turgowy-2023-duo.jpg' },
  { art: 29, slug: 'baie-de-rue-2023', file: 'baie-de-rue-2023-duo.jpg' },
  { art: 30, slug: 'quatre-pepins-2023', file: 'quatre-pepins-2023-duo.jpg' },
  { art: 31, slug: 'trois-pepins-2010', file: 'trois-pepins-2010-duo.jpg' },
  { art: 32, slug: 'cidre-glace-2012', file: 'cidre-glace-2012-face.jpg' },
  { art: 33, slug: 'botsi-de-glace-2017', file: 'botsi-de-glace-2017-face.jpg' },
]

async function main() {
  console.log('=== Mise à jour des photos des cuvées avec les noms propres renommés ===')
  let updated = 0

  for (const c of CUVEES_CLEAN_MAPPING) {
    const imgUrl = `/photo-bouteilles-raw/${c.file}`
    const fullPath = path.join(__dirname, '..', 'public', 'photo-bouteilles-raw', c.file)

    if (!fs.existsSync(fullPath)) {
      console.warn(`[ATTENTION] Fichier photo manquant : ${fullPath}`)
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

  console.log(
    `\n=== ${updated}/${CUVEES_CLEAN_MAPPING.length} produits mis à jour vers les photos RAW renommées ! ===`
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
