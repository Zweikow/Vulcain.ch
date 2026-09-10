/**
 * Configuration centrale SEO et domaines pour Cidrerie du Vulcain / Vulcano Distribution
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
  legalName: 'Vulcano Distribution',
  distributorDescription:
    'Raison individuelle Vulcano Distribution, distribution officielle des cidres et poirés artisanaux de la Cidrerie du Vulcain (Jacques Perritaz).',
  title: 'Cidrerie du Vulcain — Cidres & Poirés Artisanaux du Terroir Fribourgeois',
  description:
    'Découvrez et commandez en ligne les cidres et poirés d’exception de la Cidrerie du Vulcain (Jacques Perritaz), distribués par Vulcano Distribution. Fermentation lente 100% levures indigènes, pur jus de fruits sauvages et variétés anciennes de Suisse.',
  keywords: [
    'Cidrerie du Vulcain',
    'Jacques Perritaz',
    'Vulcano Distribution',
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
  ],
  producer: 'Jacques Perritaz',
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
