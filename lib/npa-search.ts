/**
 * Recherche dans la liste des NPA et localités suisses (lib/npa-localites.json,
 * produite par scripts/generate-npa-localites.ts). Fonctions pures : aucune
 * donnée n'est chargée ici, le formulaire passe l'index qu'il a chargé à la
 * demande (lib/npa-data.ts).
 *
 * La liste aide à la saisie, elle ne valide rien : une adresse absente de la
 * liste reste acceptée, et la validation serveur ne la consulte pas.
 */

/** Une entrée du JSON : [NPA, localité, canton]. */
export type NpaEntry = [npa: number, localite: string, canton: string]

export interface Localite {
  /** Quatre chiffres, en texte : c'est ce que reçoit le champ NPA. */
  npa: string
  localite: string
  canton: string
}

interface IndexedLocalite extends Localite {
  /** Nom normalisé : minuscules, sans accents ni ponctuation, « saint » en toutes lettres. */
  key: string
  /** Position dans le fichier source : la localité principale d'un NPA vient d'abord. */
  rank: number
}

export interface NpaIndex {
  byNpa: Map<string, Localite[]>
  items: IndexedLocalite[]
}

export const DEFAULT_SUGGESTION_LIMIT = 8

// « St-Aubin », « St. Gallen », « Sankt Gallen » et « Saint-Aubin » se valent ;
// « Ste-Croix » et « Sainte-Croix » aussi.
const SAINT_FORMS: Record<string, string> = {
  st: 'saint',
  saint: 'saint',
  sankt: 'saint',
  ste: 'sainte',
  sainte: 'sainte',
}

function foldAccents(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function words(text: string): string[] {
  return foldAccents(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

/**
 * Forme de comparaison d'un nom de localité ou d'une saisie :
 * « St-Légier-La Chiésaz » -> « saint legier la chiesaz ».
 */
export function normalizeLocalite(text: string): string {
  return words(text)
    .map((w) => SAINT_FORMS[w] ?? w)
    .join(' ')
}

export function createNpaIndex(entries: readonly NpaEntry[]): NpaIndex {
  const byNpa = new Map<string, Localite[]>()
  const items: IndexedLocalite[] = entries.map(([npa, localite, canton], rank) => {
    const loc: Localite = { npa: String(npa).padStart(4, '0'), localite, canton }
    const list = byNpa.get(loc.npa)
    if (list) list.push(loc)
    else byNpa.set(loc.npa, [loc])
    return { ...loc, key: normalizeLocalite(localite), rank }
  })
  return { byNpa, items }
}

/** Localités d'un NPA à quatre chiffres, localité principale en tête ; vide sinon. */
export function lookupNpa(index: NpaIndex, npa: string): Localite[] {
  const digits = npa.trim()
  if (!/^\d{4}$/.test(digits)) return []
  return index.byNpa.get(digits) ?? []
}

/**
 * Qualité d'une correspondance, du meilleur au moins bon :
 * 0 nom identique, 1 début du nom, 2 début d'un mot, 3 ailleurs dans un mot.
 */
function matchScore(key: string, query: string): number | null {
  if (key === query) return 0
  if (key.startsWith(query)) return 1
  if (` ${key}`.includes(` ${query}`)) return 2
  if (key.includes(query)) return 3
  return null
}

/**
 * Variantes de la saisie à essayer. Un « st » encore en cours de frappe
 * (dernier mot, sans espace après) peut annoncer « Saint » comme « Steffisburg » :
 * on cherche les deux.
 */
function queryVariants(text: string): string[] {
  const normalized = normalizeLocalite(text)
  if (!normalized) return []
  const raw = words(text)
  const last = raw[raw.length - 1]
  const typing = !/[^\p{L}\p{N}]$/u.test(text)
  if (typing && (last === 'st' || last === 'ste')) {
    const literal = [...raw.slice(0, -1).map((w) => SAINT_FORMS[w] ?? w), last].join(' ')
    return [normalized, literal]
  }
  return [normalized]
}

export interface SearchOptions {
  limit?: number
  /** NPA déjà saisi : ses localités passent devant à qualité égale. */
  preferNpa?: string
}

/**
 * Suggestions « NPA Localité » pour une saisie libre :
 * - des chiffres seuls cherchent un début de NPA (« 170 » -> 1700, 1701...) ;
 * - un texte cherche dans les noms, sans casse ni accents (« neuchatel » trouve
 *   Neuchâtel), les débuts de nom et de mot d'abord ;
 * - « 1630 bu » combine les deux.
 */
export function searchLocalites(
  index: NpaIndex,
  query: string,
  { limit = DEFAULT_SUGGESTION_LIMIT, preferNpa }: SearchOptions = {}
): Localite[] {
  const match = /^\s*(\d{1,4})?\s*([\s\S]*)$/.exec(query)
  const npaPrefix = match?.[1] ?? ''
  const text = match?.[2] ?? ''
  const variants = queryVariants(text)
  if (!npaPrefix && variants.length === 0) return []

  const found: { loc: IndexedLocalite; score: number }[] = []
  for (const loc of index.items) {
    if (npaPrefix && !loc.npa.startsWith(npaPrefix)) continue
    let score: number | null = variants.length === 0 ? 0 : null
    for (const v of variants) {
      const s = matchScore(loc.key, v)
      if (s !== null && (score === null || s < score)) score = s
    }
    if (score !== null) found.push({ loc, score })
  }

  found.sort(
    (a, b) =>
      a.score - b.score ||
      Number(b.loc.npa === preferNpa) - Number(a.loc.npa === preferNpa) ||
      // Sans texte, l'ordre du fichier : par NPA, localité principale d'abord.
      (variants.length === 0 ? 0 : a.loc.key.length - b.loc.key.length) ||
      a.loc.rank - b.loc.rank
  )

  return found.slice(0, limit).map(({ loc }) => ({
    npa: loc.npa,
    localite: loc.localite,
    canton: loc.canton,
  }))
}

/** Le nom saisi désigne-t-il cette localité, aux accents et à la casse près ? */
export function sameLocalite(a: string, b: string): boolean {
  return normalizeLocalite(a) === normalizeLocalite(b)
}
