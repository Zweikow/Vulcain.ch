export interface GalleryImage {
  url: string
  label: string
}

// Packshots fond blanc générés par scripts/packshot.py depuis les photos brutes
// (public/photo-bouteilles-raw, hors git). Trois images au plus, dans cet ordre :
// duo, étiquette, contre-étiquette.
export const CUVEE_GALLERY_MAP: Record<string, GalleryImage[]> = {
  'poire-la-premoudiere-2022': [
    {
      url: '/packshots/poire-la-premoudiere-2022-face.jpg',
      label: 'Deux bouteilles (face et dos)',
    },
    { url: '/packshots/poire-la-premoudiere-2022-face-gauche-etiquette.jpg', label: 'Étiquette' },
    {
      url: '/packshots/poire-la-premoudiere-2022-face-droite-etiquette.jpg',
      label: 'Contre-étiquette',
    },
  ],
  'a-propos-dailes-2021': [
    { url: '/packshots/a-propos-dailes-2021-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/a-propos-dailes-2021-face.jpg', label: 'Étiquette' },
    { url: '/packshots/a-propos-dailes-2021-dos.jpg', label: 'Contre-étiquette' },
  ],
  'botsi-de-glace-2017': [
    { url: '/packshots/botsi-de-glace-2017-extra.jpg', label: 'Bouteille' },
    { url: '/packshots/botsi-de-glace-2017-face.jpg', label: 'Étiquette panoramique' },
  ],
  'cidre-glace-2012': [
    { url: '/packshots/cidre-glace-2012-extra.jpg', label: 'Bouteille' },
    { url: '/packshots/cidre-glace-2012-face.jpg', label: 'Étiquette panoramique' },
  ],
  'lande-foy-2022': [
    { url: '/packshots/lande-foy-2022-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/lande-foy-2022-face.jpg', label: 'Étiquette' },
    { url: '/packshots/lande-foy-2022-dos.jpg', label: 'Contre-étiquette' },
  ],
  'trois-pepins-2023': [
    { url: '/packshots/trois-pepins-2023-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/trois-pepins-2023-face.jpg', label: 'Étiquette' },
    { url: '/packshots/trois-pepins-2023-dos.jpg', label: 'Contre-étiquette' },
  ],
  'la-fribourgeoise-2021': [
    { url: '/packshots/la-fribourgeoise-2021-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/la-fribourgeoise-2021-face.jpg', label: 'Étiquette' },
    { url: '/packshots/la-fribourgeoise-2021-dos.jpg', label: 'Contre-étiquette' },
  ],
  'trois-pepins-2010': [
    { url: '/packshots/trois-pepins-2010-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/trois-pepins-2010-face.jpg', label: 'Étiquette' },
    { url: '/packshots/trois-pepins-2010-dos.jpg', label: 'Contre-étiquette' },
  ],
  'premiers-emois-2021': [
    { url: '/packshots/premiers-emois-2021-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/premiers-emois-2021-face.jpg', label: 'Étiquette' },
    { url: '/packshots/premiers-emois-2021-dos-etiquette.jpg', label: 'Contre-étiquette' },
  ],
  'cidre-de-fer-2020': [
    { url: '/packshots/cidre-de-fer-2020-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/cidre-de-fer-2020-face.jpg', label: 'Étiquette' },
    { url: '/packshots/cidre-de-fer-2020-dos.jpg', label: 'Contre-étiquette' },
  ],
  'brute-de-rue-2021': [
    { url: '/packshots/brute-de-rue-2021-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/brute-de-rue-2021-face.jpg', label: 'Étiquette' },
    { url: '/packshots/brute-de-rue-2021-dos.jpg', label: 'Contre-étiquette' },
  ],
  'belle-brutale-2017': [
    { url: '/packshots/belle-brutale-2017-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/belle-brutale-2017-face.jpg', label: 'Étiquette' },
    { url: '/packshots/belle-brutale-2017-dos.jpg', label: 'Contre-étiquette' },
  ],
  'quatre-pepins-2022': [
    { url: '/packshots/quatre-pepins-2022-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/quatre-pepins-2022-face.jpg', label: 'Étiquette' },
    { url: '/packshots/quatre-pepins-2022-dos.jpg', label: 'Contre-étiquette' },
  ],
  'quatre-pepins-2023': [
    { url: '/packshots/quatre-pepins-2023-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/quatre-pepins-2023-face.jpg', label: 'Étiquette' },
  ],
  'turgowy-2023': [
    { url: '/packshots/turgowy-2023-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/turgowy-2023-face.jpg', label: 'Étiquette' },
    { url: '/packshots/turgowy-2023-dos.jpg', label: 'Contre-étiquette' },
  ],
  'turgowy-2020': [
    { url: '/packshots/turgowy-2020-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/turgowy-2020-face.jpg', label: 'Étiquette' },
    { url: '/packshots/turgowy-2020-dos.jpg', label: 'Contre-étiquette' },
  ],
  'turgowy-2019': [
    { url: '/packshots/turgowy-2019-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/turgowy-2019-face.jpg', label: 'Étiquette' },
    { url: '/packshots/turgowy-2019-dos.jpg', label: 'Contre-étiquette' },
  ],
  'baie-de-rue-2023': [
    { url: '/packshots/baie-de-rue-2023-duo.jpg', label: 'Deux bouteilles (face et dos)' },
    { url: '/packshots/baie-de-rue-2023-face.jpg', label: 'Étiquette' },
    { url: '/packshots/baie-de-rue-2023-dos.jpg', label: 'Contre-étiquette' },
  ],
}

export const ARTICLE_SLUG_MAP: Record<number, string> = {
  13: 'poire-la-premoudiere-2022',
  14: 'trois-pepins-2023',
  15: 'lande-foy-2022',
  16: 'belle-brutale-2017',
  18: 'turgowy-2019',
  19: 'turgowy-2020',
  21: 'cidre-de-fer-2020',
  22: 'la-fribourgeoise-2021',
  23: 'premiers-emois-2021',
  24: 'brute-de-rue-2021',
  25: 'a-propos-dailes-2021',
  26: 'quatre-pepins-2022',
  28: 'turgowy-2023',
  29: 'baie-de-rue-2023',
  30: 'quatre-pepins-2023',
  31: 'trois-pepins-2010',
  32: 'cidre-glace-2012',
  33: 'botsi-de-glace-2017',
}

export function getCuveeGallery(imageUrl?: string | null, articleNumber?: number): GalleryImage[] {
  let images: GalleryImage[] = []

  if (articleNumber && ARTICLE_SLUG_MAP[articleNumber]) {
    const slug = ARTICLE_SLUG_MAP[articleNumber]
    if (CUVEE_GALLERY_MAP[slug]) {
      images = [...CUVEE_GALLERY_MAP[slug]]
    }
  } else if (imageUrl) {
    for (const [slug, gallery] of Object.entries(CUVEE_GALLERY_MAP)) {
      if (imageUrl.includes(slug) || gallery.some((img) => img.url === imageUrl)) {
        images = [...gallery]
        break
      }
    }
  }

  // Si le produit a une image spécifique définie en base (upload ou sélection manuelle),
  // on s'assure qu'elle est toujours présente et en toute première position
  if (imageUrl && imageUrl.trim()) {
    const cleanUrl = imageUrl.trim()
    const existingIndex = images.findIndex((img) => img.url === cleanUrl)
    if (existingIndex > 0) {
      // Déplacer l'image sélectionnée en première position
      const [found] = images.splice(existingIndex, 1)
      images.unshift(found)
    } else if (existingIndex === -1) {
      // Image personnalisée ajoutée manuellement par l'utilisateur
      images.unshift({ url: cleanUrl, label: 'Visuel principal' })
    }
  }

  return images.length > 0 ? images : imageUrl ? [{ url: imageUrl, label: 'Bouteille' }] : []
}
