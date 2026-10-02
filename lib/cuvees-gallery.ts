export interface GalleryImage {
  url: string
  label: string
}

export const CUVEE_GALLERY_MAP: Record<string, GalleryImage[]> = {
  'poire-la-premoudiere-2022': [
    { url: '/images/cuvees/poire-la-premoudiere-2022-transparent.png', label: 'Packshot Studio' },
    { url: '/images/cuvees/poire-la-premoudiere-2022-duo.jpg', label: 'Duo Studio' },
    { url: '/images/cuvees/poire-la-premoudiere-2022-raw-duo.jpg', label: 'Photo Authentique' },
  ],
  'a-propos-dailes-2021': [
    { url: '/images/cuvees/a-propos-dailes-2021-transparent.png', label: 'Packshot Studio' },
    { url: '/images/cuvees/a-propos-dailes-2021-duo.jpg', label: 'Duo Studio' },
    { url: '/images/cuvees/a-propos-dailes-2021-raw-duo.jpg', label: 'Photo Authentique' },
  ],
  'botsi-de-glace-2017': [
    { url: '/images/cuvees/botsi-de-glace-2017-transparent.png', label: 'Packshot Studio' },
    { url: '/images/cuvees/botsi-de-glace-2017-raw.jpg', label: 'Photo Authentique' },
  ],
  'cidre-glace-2012': [
    { url: '/images/cuvees/cidre-glace-2012-transparent.png', label: 'Packshot Studio' },
    { url: '/images/cuvees/cidre-glace-2012-raw.jpg', label: 'Photo Authentique' },
  ],
  'trois-pepins-2023': [
    { url: '/images/cuvees/trois-pepins-2023.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'lande-foy-2022': [
    { url: '/images/cuvees/lande-foy-2022.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'belle-brutale-2017': [
    { url: '/images/cuvees/belle-brutale-2017.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'turgowy-2019': [{ url: '/images/cuvees/turgowy-2019.jpg', label: 'Bouteilles Duo face & dos' }],
  'turgowy-2020': [{ url: '/images/cuvees/turgowy-2020.jpg', label: 'Bouteilles Duo face & dos' }],
  'cidre-de-fer-2020': [
    { url: '/images/cuvees/cidre-de-fer-2020.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'la-fribourgeoise-2021': [
    { url: '/images/cuvees/la-fribourgeoise-2021.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'premiers-emois-2021': [
    { url: '/images/cuvees/premiers-emois-2021.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'brute-de-rue-2021': [
    { url: '/images/cuvees/brute-de-rue-2021.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'quatre-pepins-2022': [
    { url: '/images/cuvees/quatre-pepins-2022.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'turgowy-2023': [{ url: '/images/cuvees/turgowy-2023.jpg', label: 'Bouteilles Duo face & dos' }],
  'baie-de-rue-2023': [
    { url: '/images/cuvees/baie-de-rue-2023.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'quatre-pepins-2023': [
    { url: '/images/cuvees/quatre-pepins-2023.jpg', label: 'Bouteilles Duo face & dos' },
  ],
  'trois-pepins-2010': [
    { url: '/images/cuvees/trois-pepins-2010.jpg', label: 'Bouteilles Duo face & dos' },
  ],
}

/**
 * Retourne la liste des images de la galerie pour un produit donné.
 * Si le produit a un slug connu dans CUVEE_GALLERY_MAP, retourne la galerie complète (bouteille solo + duo).
 * Sinon, retourne l'image principale seule.
 */
export function getCuveeGallery(imageUrl?: string | null): GalleryImage[] {
  if (!imageUrl) return []

  for (const [slug, gallery] of Object.entries(CUVEE_GALLERY_MAP)) {
    if (imageUrl.includes(slug)) {
      return gallery
    }
  }

  return [{ url: imageUrl, label: 'Bouteille' }]
}
