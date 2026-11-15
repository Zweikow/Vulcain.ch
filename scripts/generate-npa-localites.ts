/**
 * Régénère la liste des NPA et localités suisses utilisée par l'autocomplétion
 * du formulaire de commande :
 *
 *   lib/npa-localites.json         [NPA, localité, canton], une entrée par ligne
 *   lib/npa-localites.source.json  source, licence, date des données
 *
 * Source : répertoire officiel des localités de swisstopo, publié chaque mois
 * en open data sur data.geo.admin.ch. Le fichier brut est téléchargé dans un
 * dossier temporaire du système, contrôlé avec la somme publiée par swisstopo,
 * puis effacé : il ne va jamais dans le dépôt.
 *
 *   npm run data:npa
 *   npm run data:npa -- --zip /chemin/ortschaftenverzeichnis_plz_2056.csv.zip --date 2026-11-01
 *
 * La seconde forme relit un fichier déjà téléchargé (sans réseau) ; la date est
 * alors celle de la publication swisstopo, à reprendre de la page officielle.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { buildNpaEntries } from './lib/amtovz'

const STAC_ITEM =
  'https://data.geo.admin.ch/api/stac/v0.9/collections/ch.swisstopo-vd.ortschaftenverzeichnis_plz/items/ortschaftenverzeichnis_plz'
const ASSET = 'ortschaftenverzeichnis_plz_2056.csv.zip'
const OUT_DIR = resolve(__dirname, '..', 'lib')

interface StacAsset {
  href: string
  'checksum:multihash'?: string
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

async function download(dir: string): Promise<{ zipPath: string; date: string; url: string }> {
  const res = await fetch(STAC_ITEM)
  if (!res.ok) throw new Error(`Catalogue swisstopo : HTTP ${res.status}`)
  const item = (await res.json()) as {
    properties: { datetime: string }
    assets: Record<string, StacAsset>
  }
  const asset = item.assets[ASSET]
  if (!asset) throw new Error(`Fichier ${ASSET} absent du catalogue swisstopo`)
  if (!asset.href.startsWith('https://data.geo.admin.ch/')) {
    throw new Error(`Adresse de téléchargement inattendue : ${asset.href}`)
  }

  const zipRes = await fetch(asset.href)
  if (!zipRes.ok) throw new Error(`Téléchargement : HTTP ${zipRes.status}`)
  const zip = Buffer.from(await zipRes.arrayBuffer())

  // Multihash SHA-256 : préfixe 1220 puis la somme en hexadécimal.
  const expected = asset['checksum:multihash']?.toLowerCase()
  if (expected && expected !== `1220${sha256(zip)}`) {
    throw new Error('Somme de contrôle différente de celle publiée par swisstopo')
  }

  const zipPath = join(dir, ASSET)
  writeFileSync(zipPath, zip)
  return { zipPath, date: item.properties.datetime.slice(0, 10), url: asset.href }
}

async function main() {
  const localZip = arg('--zip')
  const tempDir = mkdtempSync(join(tmpdir(), 'npa-swisstopo-'))

  try {
    let zipPath: string
    let date: string
    let url = `https://data.geo.admin.ch/ch.swisstopo-vd.ortschaftenverzeichnis_plz/ortschaftenverzeichnis_plz/${ASSET}`

    if (localZip) {
      const localDate = arg('--date')
      if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
        throw new Error('Avec --zip, indiquez --date AAAA-MM-JJ (date de publication swisstopo)')
      }
      zipPath = resolve(localZip)
      date = localDate
    } else {
      ;({ zipPath, date, url } = await download(tempDir))
    }

    const zip = readFileSync(zipPath)
    // `unzip -p` : le CSV sort sur la sortie standard, rien n'est écrit sur disque.
    const csv = execFileSync('unzip', ['-p', zipPath, '*.csv'], {
      maxBuffer: 50 * 1024 * 1024,
    }).toString('utf8')

    const { entries, sourceRows, skippedLiechtenstein } = buildNpaEntries(csv)

    // Une entrée par ligne : un changement mensuel se lit ligne à ligne dans git.
    const json = `[\n${entries.map((e) => JSON.stringify(e)).join(',\n')}\n]\n`
    writeFileSync(join(OUT_DIR, 'npa-localites.json'), json)

    const npaCount = new Set(entries.map((e) => e[0])).size
    const source = {
      source:
        'Répertoire officiel des localités (Amtliches Ortschaftenverzeichnis mit Postleitzahl und Perimeter)',
      producteur: 'Office fédéral de topographie swisstopo',
      mentionSource: 'Office fédéral de topographie swisstopo',
      licence:
        'Conditions d’utilisation des géodonnées gratuites de swisstopo (OGD) : utilisation libre, y compris commerciale, mention de la source obligatoire',
      licenceUrl: 'https://www.swisstopo.admin.ch/ogd-conditions',
      page: 'https://www.swisstopo.admin.ch/fr/repertoire-officiel-des-localites',
      fichier: url,
      sha256Fichier: sha256(zip),
      dateDonnees: date,
      dateGeneration: new Date().toISOString().slice(0, 10),
      lignesSource: sourceRows,
      entrees: entries.length,
      npa: npaCount,
      exclusions: `Liechtenstein (${skippedLiechtenstein} lignes) : livraison en Suisse uniquement`,
      generePar: 'scripts/generate-npa-localites.ts',
    }
    writeFileSync(
      join(OUT_DIR, 'npa-localites.source.json'),
      `${JSON.stringify(source, null, 2)}\n`
    )

    console.log(
      `${entries.length} localités, ${npaCount} NPA, données du ${date} (${sourceRows} lignes lues, ${skippedLiechtenstein} du Liechtenstein écartées).`
    )
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
