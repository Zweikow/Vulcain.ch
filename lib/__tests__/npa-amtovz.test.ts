import { describe, expect, it } from 'vitest'
import { AMTOVZ_COLUMNS, buildNpaEntries } from '@/scripts/lib/amtovz'

// Extrait du format réel (répertoire officiel des localités, CSV LV95).
const HEADER = `﻿${AMTOVZ_COLUMNS.join(';')}`
const csv = (rows: string[]) => [HEADER, ...rows, ''].join('\r\n')

describe('buildNpaEntries', () => {
  it('fusionne les morceaux de localité répartis sur plusieurs communes', () => {
    const { entries, sourceRows } = buildNpaEntries(
      csv([
        'Fribourg;1700;00;916;Fribourg;2196;FR;95.353 %;2578371.000;1183816.000;fr;2008-07-01',
        'Fribourg;1700;00;916;Tafers;2306;FR;3.246 %;2580633.000;1183861.000;fr;2008-07-01',
        'Fribourg;1700;00;916;Düdingen;2293;FR;1.401 %;2580351.000;1184979.000;fr;2008-07-01',
      ])
    )
    expect(sourceRows).toBe(3)
    expect(entries).toEqual([[1700, 'Fribourg', 'FR']])
  })

  it("garde le canton qui porte la plus grande part d'adresses", () => {
    const { entries } = buildNpaEntries(
      csv([
        'Versoix;1290;00;1;Versoix;6644;GE;97.5 %;0;0;fr;2008-07-01',
        'Versoix;1290;00;1;Mies;5723;VD;2.5 %;0;0;fr;2008-07-01',
      ])
    )
    expect(entries).toEqual([[1290, 'Versoix', 'GE']])
  })

  it('range la localité principale (chiffre complémentaire 00) en tête de son NPA', () => {
    const { entries } = buildNpaEntries(
      csv([
        'Essert FR;1724;02;5808;Le Mouret;2220;FR;100 %;0;0;fr;2008-07-01',
        'Ferpicloz;1724;03;5810;Ferpicloz;2194;FR;100 %;0;0;fr;2008-07-01',
        'Le Mouret;1724;00;975;Le Mouret;2220;FR;100 %;0;0;fr;2008-07-01',
        'Bulle;1630;00;803;Bulle;2125;FR;100 %;0;0;fr;2008-07-01',
      ])
    )
    expect(entries.map((e) => `${e[0]} ${e[1]}`)).toEqual([
      '1630 Bulle',
      '1724 Le Mouret',
      '1724 Essert FR',
      '1724 Ferpicloz',
    ])
  })

  it('écarte le Liechtenstein, qui figure dans le répertoire sans canton', () => {
    const { entries, skippedLiechtenstein } = buildNpaEntries(
      csv([
        'Vaduz;9490;00;1;Vaduz;7001;;100 %;0;0;de;2008-07-01',
        'Buchs SG;9470;00;2;Buchs (SG);3273;SG;100 %;0;0;de;2008-07-01',
      ])
    )
    expect(skippedLiechtenstein).toBe(1)
    expect(entries).toEqual([[9470, 'Buchs SG', 'SG']])
  })

  it("s'arrête si le format du fichier change", () => {
    expect(() => buildNpaEntries('Nom;NPA\r\nBulle;1630')).toThrow(/En-tête/)
    expect(() => buildNpaEntries(csv(['Bulle;1630;00']))).toThrow(/colonnes/)
    expect(() =>
      buildNpaEntries(csv(['Bulle;163;00;803;Bulle;2125;FR;100 %;0;0;fr;2008-07-01']))
    ).toThrow(/NPA/)
    expect(() =>
      buildNpaEntries(csv(['Bulle;1630;00;803;Bulle;2125;XX;100 %;0;0;fr;2008-07-01']))
    ).toThrow(/canton/)
  })
})
