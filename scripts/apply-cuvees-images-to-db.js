const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const CUVEES_RAW_MAPPING = [
  { art: 13, slug: 'poire-la-premoudiere-2022', file: 'PXL_20261001_083129993.RAW-01.jpg' },
  { art: 14, slug: 'trois-pepins-2023', file: 'PXL_20261001_084225959.RAW-01.jpg' },
  { art: 15, slug: 'lande-foy-2022', file: 'PXL_20261001_084109501.RAW-01.jpg' },
  { art: 16, slug: 'belle-brutale-2017', file: 'PXL_20261001_093814943.RAW-01.jpg' },
  { art: 18, slug: 'turgowy-2019', file: 'PXL_20261001_094633146.RAW-01.jpg' },
  { art: 19, slug: 'turgowy-2020', file: 'PXL_20261001_094524600.RAW-01.jpg' },
  { art: 21, slug: 'cidre-de-fer-2020', file: 'PXL_20261001_093525290.RAW-01.jpg' },
  { art: 22, slug: 'la-fribourgeoise-2021', file: 'PXL_20261001_084353184.RAW-01.jpg' },
  { art: 23, slug: 'premiers-emois-2021', file: 'PXL_20261001_093739190.RAW-01.jpg' },
  { art: 24, slug: 'brute-de-rue-2021', file: 'PXL_20261001_093652810.RAW-01.jpg' },
  { art: 25, slug: 'a-propos-dailes-2021', file: 'PXL_20261001_083736991.RAW-01.jpg' },
  { art: 26, slug: 'quatre-pepins-2022', file: 'PXL_20261001_094206445.RAW-01.jpg' },
  { art: 28, slug: 'turgowy-2023', file: 'PXL_20261001_094422248.RAW-01.jpg' },
  { art: 29, slug: 'baie-de-rue-2023', file: 'PXL_20261001_094735590.RAW-01.jpg' },
  { art: 30, slug: 'quatre-pepins-2023', file: 'PXL_20261001_094326839.RAW-01.jpg' },
  { art: 31, slug: 'trois-pepins-2010', file: 'PXL_20261001_084723380.RAW-01.jpg' },
  { art: 32, slug: 'cidre-glace-2012', file: 'PXL_20261001_084022954.RAW-01.jpg' },
  { art: 33, slug: 'botsi-de-glace-2017', file: 'PXL_20261001_083943812.RAW-01.jpg' },
]

async function main() {
  console.log('=== Mise à jour des photos des cuvées avec les photos RAW authentiques ===')
  let updated = 0

  for (const c of CUVEES_RAW_MAPPING) {
    const imgUrl = `/photo-bouteilles-raw/${c.file}`
    const fullPath = path.join(__dirname, '..', 'public', 'photo-bouteilles-raw', c.file)

    if (!fs.existsSync(fullPath)) {
      console.warn(`[ATTENTION] Fichier raw manquant : ${fullPath}`)
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
    `\n=== ${updated}/${CUVEES_RAW_MAPPING.length} produits mis à jour vers les photos RAW ! ===`
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
