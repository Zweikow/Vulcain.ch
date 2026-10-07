/**
 * Script d'export en lot des visuels Instagram (1080x1350 JPEG)
 * et génération des légendes associées dans exports/instagram/captions.md
 *
 * Utilisation :
 *   npx tsx scripts/export-instagram.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { ARTICLE_SLUG_MAP, getMainImageUrl } from '../lib/cuvees-gallery'

// Chargement manuel de .env si non injecté par le shell
try {
  const fs = require('fs')
  if (fs.existsSync('.env')) {
    const envConfig = fs.readFileSync('.env', 'utf-8')
    for (const line of envConfig.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = (match[2] || '').trim()
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        process.env[key] = value
      }
    }
  }
} catch {
  // Ignorer
}

const prisma = new PrismaClient()

const BASE_URL = process.env.INSTAGRAM_BASE_URL || 'http://localhost:3000'
const SECRET = process.env.INSTAGRAM_RENDER_SECRET || ''

const EXPORT_DIR = path.join(process.cwd(), 'exports', 'instagram')

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function generateCaption(product: {
  name: string
  year: number | null
  description: string | null
  category: { name: string }
  producer: { name: string } | null
}) {
  const producerName = product.producer?.name ? ` - ${product.producer.name}` : ''
  const millesime = product.year ? ` (Millésime ${product.year})` : ''
  const note = product.description?.trim()
    ? `\n\nNotes de dégustation : ${product.description.trim()}`
    : ''

  return `🍎 ${product.name}${millesime}${producerName}

Un flacon de caractère signé par un artisan indépendant, élaboré dans le respect du fruit et du vivant.${note}

📦 Disponible sur drinkcider.ch
🇨🇭 Livraison rapide et soignée partout en Suisse.
🔞 Vente réservée aux personnes majeures (+18 ans).

#cidreartisanal #cidrenaturel #drinkcider #jacquesperritaz #cidrerieduvulcain #terroirsuisse #vinvivant #poireartisanal`
}

async function main() {
  if (!SECRET) {
    console.error('❌ Erreur : INSTAGRAM_RENDER_SECRET n’est pas configuré dans .env')
    process.exit(1)
  }

  mkdirSync(EXPORT_DIR, { recursive: true })

  console.log('🔍 Récupération des références catalogue...')
  const products = await prisma.product.findMany({
    where: { active: true, archived: false },
    include: {
      category: { select: { name: true } },
      producer: { select: { name: true } },
    },
    orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
  })

  console.log(`📋 ${products.length} produits actifs trouvés.\n`)

  let generatedCount = 0
  let skippedCount = 0
  let errorCount = 0

  const captionsEntries: string[] = [
    '# Légendes Instagram - Drinkcider Catalogue\n',
    `Généré le ${new Date().toLocaleDateString('fr-CH')} à ${new Date().toLocaleTimeString('fr-CH')}\n`,
    '---\n',
  ]

  for (const product of products) {
    const hasPackshot = Boolean(getMainImageUrl(product.imageUrl, product.articleNumber))
    const slug = ARTICLE_SLUG_MAP[product.articleNumber] ?? slugify(product.name)

    if (!hasPackshot) {
      console.log(`⏭️  [Ignoré - Pas de packshot] Réf. ${product.articleNumber} : ${product.name}`)
      skippedCount++
      continue
    }

    try {
      process.stdout.write(`⏳ Génération Réf. ${product.articleNumber} (${slug})... `)
      const res = await fetch(`${BASE_URL}/api/instagram/${product.articleNumber}`, {
        headers: {
          'x-render-secret': SECRET,
        },
      })

      if (!res.ok) {
        console.log(`❌ Échec (HTTP ${res.status})`)
        errorCount++
        continue
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      const outputPath = path.join(EXPORT_DIR, `${slug}.jpg`)
      writeFileSync(outputPath, buffer)

      const caption = generateCaption(product)
      captionsEntries.push(
        `## ${product.name} (Réf. ${product.articleNumber})\n`,
        `**Fichier :** \`${slug}.jpg\`\n\n`,
        '```text\n' + caption + '\n```\n\n',
        '---\n'
      )

      console.log(`✅ OK (${(buffer.length / 1024).toFixed(1)} Ko)`)
      generatedCount++
    } catch (err: any) {
      console.log(`❌ Erreur réseau : ${err.message}`)
      errorCount++
    }
  }

  const captionsFile = path.join(EXPORT_DIR, 'captions.md')
  writeFileSync(captionsFile, captionsEntries.join('\n'), 'utf-8')

  console.log('\n=========================================')
  console.log('📊 RÉCAPITULATIF DE L’EXPORT INSTAGRAM :')
  console.log(`   ✅ Visuels générés  : ${generatedCount}`)
  console.log(`   ⏭️  Ignorés (sans photo) : ${skippedCount}`)
  console.log(`   ❌ En erreur        : ${errorCount}`)
  console.log(`📁 Dossier d’export    : exports/instagram/`)
  console.log(`📝 Fichier de légendes : exports/instagram/captions.md`)
  console.log('=========================================\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
