'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadNpaIndex } from '@/lib/npa-data'
import {
  lookupNpa,
  sameLocalite,
  searchLocalites,
  type Localite,
  type NpaIndex,
} from '@/lib/npa-search'

interface Options {
  npa: string
  localite: string
  onNpaChange: (npa: string) => void
  onLocaliteChange: (localite: string) => void
}

/**
 * Logique commune aux champs NPA et localité (boutique et saisie manuelle de
 * l'admin) ; chaque formulaire garde ses libellés, ses erreurs et son style, et
 * passe ce qui est rendu ici à deux <Combobox>.
 *
 * - Un NPA de quatre chiffres qui n'a qu'une localité la remplit, si le champ
 *   localité est vide ou avait été rempli par ce mécanisme. Une localité tapée
 *   à la main n'est jamais remplacée.
 * - Un NPA à plusieurs localités ouvre la liste sous le champ NPA.
 * - Choisir une suggestion, dans l'un ou l'autre champ, remplit les deux.
 * - La liste n'est qu'une aide : toute saisie reste possible et envoyable.
 */
export function useNpaAutocomplete({ npa, localite, onNpaChange, onLocaliteChange }: Options) {
  const [index, setIndex] = useState<NpaIndex | null>(null)

  /** Charge la liste au premier focus ; un échec laisse les champs libres. */
  const ensureLoaded = useCallback(() => {
    if (!index) loadNpaIndex().then(setIndex, () => {})
  }, [index])

  // Dernière localité écrite par l'autocomplétion : tant que le champ la
  // contient, on peut la remplacer ; dès que la personne la modifie, plus jamais.
  const autoFilled = useRef<string | null>(null)
  const localiteRef = useRef(localite)
  localiteRef.current = localite
  const setLocalite = useRef(onLocaliteChange)
  setLocalite.current = onLocaliteChange

  useEffect(() => {
    if (!index) return
    const list = lookupNpa(index, npa)
    const current = localiteRef.current
    const ours = current !== '' && current === autoFilled.current

    if (list.length === 1) {
      const name = list[0].localite
      if (current === '' || ours) {
        autoFilled.current = name
        if (current !== name) setLocalite.current(name)
      }
      return
    }
    // NPA modifié : une localité remplie automatiquement qui ne lui correspond
    // plus s'efface, pour ne pas laisser « 1630 Fribourg ».
    if (ours && !list.some((l) => l.localite === current)) {
      autoFilled.current = null
      setLocalite.current('')
    }
  }, [index, npa])

  const npaOptions = useMemo<Localite[]>(() => {
    if (!index) return []
    const digits = npa.trim()
    if (/^\d{4}$/.test(digits)) {
      const list = lookupNpa(index, digits)
      if (list.length > 1) return list
      // Localité unique déjà en place : rien à proposer. Différente (tapée à la
      // main) : on montre le nom officiel, sans l'imposer.
      if (list.length === 1 && localite.trim() && !sameLocalite(localite, list[0].localite)) {
        return list
      }
      return []
    }
    if (/^\d{2,3}$/.test(digits)) return searchLocalites(index, digits)
    return []
  }, [index, npa, localite])

  const localiteOptions = useMemo<Localite[]>(() => {
    if (!index) return []
    const digits = npa.trim()
    if (!localite.trim()) {
      const list = lookupNpa(index, digits)
      return list.length > 1 ? list : []
    }
    const results = searchLocalites(index, localite, { preferNpa: digits })
    // La saisie est déjà exactement la seule suggestion : la liste n'apporte rien.
    if (results.length === 1 && results[0].localite === localite && results[0].npa === digits) {
      return []
    }
    return results
  }, [index, npa, localite])

  const select = useCallback(
    (option: Localite) => {
      autoFilled.current = option.localite
      onNpaChange(option.npa)
      onLocaliteChange(option.localite)
    },
    [onNpaChange, onLocaliteChange]
  )

  /**
   * À appeler quand le formulaire remplit lui-même les champs (client existant
   * choisi dans l'admin) : la localité reçue compte comme saisie à la main.
   */
  const forget = useCallback(() => {
    autoFilled.current = null
  }, [])

  return { ensureLoaded, npaOptions, localiteOptions, select, forget }
}

export const localiteKey = (l: Localite) => `${l.npa}|${l.localite}`

/** Une ligne de suggestion : « 1700 Fribourg FR ». */
export function renderLocalite(l: Localite) {
  return (
    <>
      <span className="font-semibold tabular-nums">{l.npa}</span>
      <span className="min-w-0 flex-1 truncate">{l.localite}</span>
      <span className="text-xs text-muted-foreground">{l.canton}</span>
    </>
  )
}
