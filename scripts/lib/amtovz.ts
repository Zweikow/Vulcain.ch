/**
 * Lecture du répertoire officiel des localités de swisstopo (« AMTOVZ »,
 * fichier CSV) et réduction aux seuls couples NPA - localité utiles à une
 * adresse de livraison. Fonctions pures, testées dans
 * lib/__tests__/npa-amtovz.test.ts ; le téléchargement et l'écriture des
 * fichiers sont dans scripts/generate-npa-localites.ts.
 *
 * Une ligne du CSV est un morceau de localité dans une commune : la même
 * localité revient donc une fois par commune qu'elle touche (1700 Fribourg
 * s'étend sur Fribourg, Tafers et Düdingen). On garde une seule entrée par
 * NPA et nom, et le canton qui porte la plus grande part des adresses.
 */

import type { NpaEntry } from '../../lib/npa-search'

export const AMTOVZ_COLUMNS = [
  'Ortschaftsname',
  'PLZ4',
  'Zusatzziffer',
  'ZIP_ID',
  'Gemeindename',
  'BFS-Nr',
  'Kantonskürzel',
  'Adressenanteil',
  'E',
  'N',
  'Sprache',
  'Validity',
] as const

export const SWISS_CANTONS = new Set([
  'AG',
  'AI',
  'AR',
  'BE',
  'BL',
  'BS',
  'FR',
  'GE',
  'GL',
  'GR',
  'JU',
  'LU',
  'NE',
  'NW',
  'OW',
  'SG',
  'SH',
  'SO',
  'SZ',
  'TG',
  'TI',
  'UR',
  'VD',
  'VS',
  'ZG',
  'ZH',
])

export interface AmtovzResult {
  entries: NpaEntry[]
  sourceRows: number
  /** Lignes du Liechtenstein écartées : la cidrerie ne livre qu'en Suisse. */
  skippedLiechtenstein: number
}

/** « 95.353 % » -> 95.353 ; une valeur illisible compte pour zéro. */
function parseShare(raw: string): number {
  const n = Number.parseFloat(raw.replace('%', '').trim())
  return Number.isFinite(n) ? n : 0
}

/**
 * Transforme le texte du CSV en entrées triées par NPA.
 * Lève une erreur si le format change (colonnes, NPA ou canton inattendus) :
 * mieux vaut un script qui s'arrête qu'un JSON faux livré au formulaire.
 */
export function buildNpaEntries(csvText: string): AmtovzResult {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')

  const header = lines[0]?.split(';') ?? []
  if (header.join(';') !== AMTOVZ_COLUMNS.join(';')) {
    throw new Error(`En-tête inattendu : ${header.join(';')}`)
  }

  // Par NPA et nom : chiffre complémentaire et part d'adresses cumulée par canton.
  const byKey = new Map<
    string,
    { npa: number; name: string; extra: number; shares: Map<string, number> }
  >()
  let skippedLiechtenstein = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';')
    if (cols.length !== AMTOVZ_COLUMNS.length) {
      throw new Error(
        `Ligne ${i + 1} : ${cols.length} colonnes au lieu de ${AMTOVZ_COLUMNS.length}`
      )
    }
    const name = cols[0].trim()
    const plz = cols[1].trim()
    const extra = Number.parseInt(cols[2], 10)
    const canton = cols[6].trim()

    if (!/^\d{4}$/.test(plz)) throw new Error(`Ligne ${i + 1} : NPA illisible « ${plz} »`)
    if (!name) throw new Error(`Ligne ${i + 1} : localité vide`)

    // Le répertoire couvre aussi le Liechtenstein, sans canton (NPA 9485 à 9498).
    if (canton === '') {
      skippedLiechtenstein++
      continue
    }
    if (!SWISS_CANTONS.has(canton)) {
      throw new Error(`Ligne ${i + 1} : canton inconnu « ${canton} »`)
    }

    const key = `${plz}|${name}`
    let item = byKey.get(key)
    if (!item) {
      item = {
        npa: Number(plz),
        name,
        extra: Number.isFinite(extra) ? extra : 99,
        shares: new Map(),
      }
      byKey.set(key, item)
    }
    if (Number.isFinite(extra)) item.extra = Math.min(item.extra, extra)
    item.shares.set(canton, (item.shares.get(canton) ?? 0) + parseShare(cols[7]))
  }

  const items = [...byKey.values()]
  // Par NPA, puis dans l'ordre des chiffres complémentaires de la Poste : la
  // localité principale (00) d'abord, 1724 Le Mouret avant 1724 Essert FR.
  items.sort((a, b) => a.npa - b.npa || a.extra - b.extra || a.name.localeCompare(b.name, 'fr'))

  const entries: NpaEntry[] = items.map(({ npa, name, shares }) => {
    // Canton majoritaire ; à égalité, l'ordre alphabétique tranche.
    const [canton] = [...shares.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0]
    return [npa, name, canton]
  })

  return { entries, sourceRows: lines.length - 1, skippedLiechtenstein }
}
