import { describe, expect, it } from 'vitest'
import {
  createNpaIndex,
  lookupNpa,
  normalizeLocalite,
  sameLocalite,
  searchLocalites,
  type NpaEntry,
} from '@/lib/npa-search'
import data from '@/lib/npa-localites.json'
import source from '@/lib/npa-localites.source.json'

const entries = data as unknown as NpaEntry[]
const index = createNpaIndex(entries)
const label = (l: { npa: string; localite: string }) => `${l.npa} ${l.localite}`

describe('normalizeLocalite', () => {
  it('ignore la casse, les accents et la ponctuation', () => {
    expect(normalizeLocalite('Neuchâtel')).toBe('neuchatel')
    expect(normalizeLocalite('  GRANGES-PACCOT ')).toBe('granges paccot')
    expect(normalizeLocalite("Crête-à-l'Oeil (Les Agettes)")).toBe('crete a l oeil les agettes')
    expect(normalizeLocalite('Biel/Bienne')).toBe('biel bienne')
  })

  it('rend « St », « St. », « Sankt » et « Saint » équivalents', () => {
    expect(normalizeLocalite('St-Aubin FR')).toBe('saint aubin fr')
    expect(normalizeLocalite('Saint-Aubin FR')).toBe('saint aubin fr')
    expect(normalizeLocalite('St. Gallen')).toBe(normalizeLocalite('Sankt Gallen'))
    expect(normalizeLocalite('Ste-Croix')).toBe(normalizeLocalite('Sainte Croix'))
    // « Stein » n'est pas un saint.
    expect(normalizeLocalite('Stein AG')).toBe('stein ag')
  })

  it('compare deux noms sans tenir compte des accents', () => {
    expect(sameLocalite('neuchatel', 'Neuchâtel')).toBe(true)
    expect(sameLocalite('Fribourg', 'Freiburg')).toBe(false)
  })
})

describe('lookupNpa', () => {
  it('1700 donne Fribourg, canton FR', () => {
    expect(lookupNpa(index, '1700')).toEqual([{ npa: '1700', localite: 'Fribourg', canton: 'FR' }])
  })

  it("un NPA à plusieurs localités les rend toutes, la principale d'abord", () => {
    const list = lookupNpa(index, '1724').map((l) => l.localite)
    expect(list[0]).toBe('Le Mouret')
    expect(list).toEqual(expect.arrayContaining(['Essert FR', 'Ferpicloz', 'Montévraz']))
    expect(list.length).toBeGreaterThan(5)
  })

  it('ne répond rien à un NPA incomplet ou inconnu', () => {
    expect(lookupNpa(index, '170')).toEqual([])
    expect(lookupNpa(index, '0000')).toEqual([])
    expect(lookupNpa(index, 'abcd')).toEqual([])
  })

  it('ignore les espaces autour du NPA', () => {
    expect(lookupNpa(index, ' 1630 ')[0]?.localite).toBe('Bulle')
  })
})

describe('searchLocalites', () => {
  it('« bulle » propose 1630 Bulle en premier', () => {
    expect(label(searchLocalites(index, 'bulle')[0])).toBe('1630 Bulle')
  })

  it('« neuchatel » trouve Neuchâtel', () => {
    const results = searchLocalites(index, 'neuchatel')
    expect(results[0].localite).toBe('Neuchâtel')
    expect(results[0].canton).toBe('NE')
  })

  it('« Saint-Imier » et « st imier » trouvent St-Imier', () => {
    expect(searchLocalites(index, 'Saint-Imier')[0].localite).toBe('St-Imier')
    expect(searchLocalites(index, 'st imier')[0].localite).toBe('St-Imier')
    expect(searchLocalites(index, 'sankt gallen')[0].localite).toBe('St. Gallen')
  })

  it('un « st » en cours de frappe propose aussi les noms en « St... »', () => {
    const names = searchLocalites(index, 'st', { limit: 200 }).map((l) => l.localite)
    expect(names).toContain('St-Imier')
    expect(names).toContain('Steffisburg')
  })

  it('les débuts de mot passent avant le reste', () => {
    // « mouret » commence un mot de « Le Mouret » ; aucun nom ne commence par « mouret ».
    expect(searchLocalites(index, 'mouret')[0].localite).toBe('Le Mouret')
    // « ulle » n'est qu'au milieu d'un mot : la correspondance reste proposée.
    expect(searchLocalites(index, 'ulle', { limit: 50 }).map(label)).toContain('1630 Bulle')
    // « gall » : St. Gallen (début de mot) avant tout nom qui contient « gall » ailleurs.
    const gall = searchLocalites(index, 'gall', { limit: 50 })
    const firstInside = gall.findIndex(
      (l) => !` ${normalizeLocalite(l.localite)}`.includes(' gall')
    )
    const lastWordStart = gall
      .map((l) => ` ${normalizeLocalite(l.localite)}`.includes(' gall'))
      .lastIndexOf(true)
    expect(firstInside === -1 || lastWordStart < firstInside).toBe(true)
  })

  it('rend huit suggestions au plus par défaut', () => {
    expect(searchLocalites(index, 'a')).toHaveLength(8)
    expect(searchLocalites(index, 'a', { limit: 3 })).toHaveLength(3)
  })

  it('cherche un début de NPA quand la saisie est numérique', () => {
    const results = searchLocalites(index, '170')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((l) => l.npa.startsWith('170'))).toBe(true)
    expect(label(results[0])).toBe('1700 Fribourg')
  })

  it('combine NPA et nom : « 1724 ess » donne Essert FR', () => {
    expect(searchLocalites(index, '1724 ess').map(label)).toEqual(['1724 Essert FR'])
  })

  it('fait passer les localités du NPA déjà saisi devant', () => {
    expect(label(searchLocalites(index, 'lausanne')[0])).toBe('1003 Lausanne')
    const results = searchLocalites(index, 'lausanne', { preferNpa: '1007' })
    expect(label(results[0])).toBe('1007 Lausanne')
  })

  it('ne propose rien pour une saisie vide ou introuvable', () => {
    expect(searchLocalites(index, '')).toEqual([])
    expect(searchLocalites(index, '   ')).toEqual([])
    expect(searchLocalites(index, 'zzzzqx')).toEqual([])
  })
})

describe('données npa-localites.json', () => {
  it('contient des NPA suisses à quatre chiffres, sans doublon', () => {
    const keys = new Set<string>()
    for (const [npa, localite, canton] of entries) {
      expect(npa).toBeGreaterThanOrEqual(1000)
      expect(npa).toBeLessThanOrEqual(9999)
      expect(localite.trim()).toBe(localite)
      expect(canton).toMatch(/^[A-Z]{2}$/)
      const key = `${npa}|${localite}`
      expect(keys.has(key)).toBe(false)
      keys.add(key)
    }
    expect(entries.length).toBe(source.entrees)
  })

  it('exclut le Liechtenstein (livraison en Suisse uniquement)', () => {
    expect(lookupNpa(index, '9490')).toEqual([])
  })

  it('documente la source, la licence et la date', () => {
    expect(source.mentionSource).toBe('Office fédéral de topographie swisstopo')
    expect(source.licenceUrl).toBe('https://www.swisstopo.admin.ch/ogd-conditions')
    expect(source.dateDonnees).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
