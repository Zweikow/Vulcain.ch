/**
 * Configuration centrale SEO et domaines pour Drinkcider
 */

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  if (process.env.NEXT_PUBLIC_STAGE === 'sandbox') {
    return 'https://sandbox.drinkcider.ch'
  }
  if (process.env.NEXT_PUBLIC_STAGE === 'dev') {
    return 'https://dev.drinkcider.ch'
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://drinkcider.ch'
  }
  return 'http://localhost:3000'
}

export const SITE_CONFIG = {
  name: 'Drinkcider',
  legalName: 'Drinkcider',
  distributorDescription:
    'Raison individuelle Drinkcider, boutique en ligne de cidres et poirés artisanaux de producteurs indépendants.',
  title: 'Drinkcider | Cidres artisanaux et poirés pur jus en Suisse',
  description:
    'Drinkcider, boutique en ligne de cidres et poirés artisanaux : une sélection de producteurs indépendants, pur jus, livrée partout en Suisse.',
  keywords: [
    // Français
    'Drinkcider',
    'Drinkcider.ch',
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
  distributor: 'Bertrand Baeriswyl',
  address: {
    street: 'Chemin des Moilles 16',
    postalCode: '1619',
    city: 'Les Paccots',
    country: 'CH',
    region: 'Fribourg',
  },
  contact: {
    email: 'info@drinkcider.ch',
  },
}
