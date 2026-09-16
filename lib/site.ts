/**
 * Configuration centrale SEO et domaines pour Cidrerie du Vulcain / Drinkcider
 */

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  if (process.env.NEXT_PUBLIC_STAGE === 'sandbox') {
    return 'https://sandbox.cidrerie-vulcain.ch'
  }
  if (process.env.NEXT_PUBLIC_STAGE === 'dev') {
    return 'https://dev.cidrerie-vulcain.ch'
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://cidrerie-vulcain.ch'
  }
  return 'http://localhost:3000'
}

export const SITE_CONFIG = {
  name: 'Cidrerie du Vulcain',
  legalName: 'Drinkcider',
  distributorDescription:
    'Raison individuelle Drinkcider, distribution officielle des cidres et poirés artisanaux de la Cidrerie du Vulcain (Jacques Perritaz).',
  title: 'Drinkcider avec passion',
  description:
    'Cidres et poirés artisanaux de la Cidrerie du Vulcain (Jacques Perritaz). Pur jus de fruits sauvages suisses et fermentation 100% levures indigènes.',
  keywords: [
    // Français
    'Cidrerie du Vulcain',
    'Jacques Perritaz',
    'Jacques Perritaz cidres',
    "cidre d'auteur",
    "cidres d'auteurs",
    'Drinkcider',
    'cidre artisanal suisse',
    'poiré artisanal',
    'terroir fribourgeois',
    'levures indigènes',
    'vin nature',
    'cidre bio',
    'fruits sauvages',
    'hautes tiges',
    'cidre brut',
    'Fribourg',
    'Suisse',

    // Allemand (Suisse alémanique)
    'Jacques Perritaz Cider',
    'Jacques Perritaz Apfelwein',
    'Autoren-Cider',
    'Autoren-Apfelwein',
    'Schweizer Cider',
    'handwerklicher Cider',
    'Schweizer Apfelwein',
    'Birnenwein',
    'Naturwein Schweiz',
    'Cider online bestellen Schweiz',

    // Anglais (International / Expats)
    'Jacques Perritaz cider',
    'auteur cider',
    'signature cider',
    'Swiss craft cider',
    'natural cider',
    'artisan perry',
    'organic cider Switzerland',
    'cider delivery Switzerland',
    'Drinkcider Switzerland',
  ],
  producer: 'Jacques Perritaz',
  distributor: 'Bertrand Baeriswyl',
  address: {
    street: 'Chemin des Moilles 16',
    postalCode: '1619',
    city: 'Les Paccots',
    country: 'CH',
    region: 'Fribourg',
  },
  contact: {
    email: 'info@vulcain.ch',
  },
}
