/**
 * Chargement à la demande de la liste des NPA : le JSON (environ 100 Ko,
 * 30 Ko compressé) part dans un fichier JavaScript séparé que le navigateur ne
 * télécharge qu'au premier focus d'un champ NPA ou localité. Il ne pèse donc
 * pas sur le premier affichage de la boutique, et aucune saisie ne quitte le
 * site : la recherche se fait dans le navigateur.
 */
import { createNpaIndex, type NpaEntry, type NpaIndex } from '@/lib/npa-search'

let pending: Promise<NpaIndex> | null = null

export function loadNpaIndex(): Promise<NpaIndex> {
  if (!pending) {
    pending = import('@/lib/npa-localites.json')
      .then((mod) => createNpaIndex(mod.default as unknown as NpaEntry[]))
      .catch((err) => {
        // Réseau coupé : on réessaiera au prochain focus. Le formulaire reste utilisable.
        pending = null
        throw err
      })
  }
  return pending
}
