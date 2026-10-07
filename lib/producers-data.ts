/**
 * Données éditoriales des producteurs Drinkcider
 * Enrichit les fiches producteurs avec le storytelling, photos et caractéristiques de terroir.
 */

export interface ProducerProfile {
  slug: string
  name: string
  estateName: string
  tagline: string
  region: string
  cantonOrDept: string
  country: 'CH' | 'FR'
  sinceYear: number
  portraitImage: string
  quote: string
  shortBio: string
  storyParagraphs: string[]
  philosophies: {
    title: string
    description: string
  }[]
  badges: string[]
  externalLinks?: {
    label: string
    url: string
  }[]
}

export const PRODUCERS_PROFILES: Record<string, ProducerProfile> = {
  'jacques-perritaz': {
    slug: 'jacques-perritaz',
    name: 'Jacques Perritaz',
    estateName: 'Cidrerie du Vulcain',
    tagline: 'Cidriculteur artisan — Fondateur de la Cidrerie du Vulcain',
    region: 'Le Mouret, Fribourg',
    cantonOrDept: 'Fribourg',
    country: 'CH',
    sinceYear: 2006,
    portraitImage: '/images/histoire/jacques-perritaz.jpg',
    quote:
      '« Le cidre n’est pas un sous-produit de la pomme : c’est l’expression noble, pure et vivante d’arbres centenaires enracinés dans un terroir préservé. »',
    shortBio:
      'Pionnier du cidre naturel en Suisse, Jacques Perritaz élabore au Mouret (Fribourg) à la Cidrerie du Vulcain des cidres et poirés de gastronomie issus d’arbres hautes-tiges centenaires non traités, vinifiés en fermentation spontanée.',
    storyParagraphs: [
      'Biologiste de formation, Jacques Perritaz fonde son domaine, la Cidrerie du Vulcain, en 2006 avec une vision exigeante : redonner au cidre ses lettres de noblesse en l’élevant au rang des plus grands vins de terroir. Installé au Mouret, au cœur des Préalpes fribourgeoises sous le symbole du papillon Vulcain, il s’attache depuis près de vingt ans à révéler la singularité des fruits de plein vent de sa région.',
      'Son trésor réside dans les vergers traditionnels de plein vent (arbres hautes-tiges). Jacques parcourt inlassablement la région fribourgeoise et la Suisse romande pour récolter à la main des variétés anciennes et oubliées : pommes acidulées sauvages, Bohnapfel, Boskoop, Engishofer, poires à poiré rustiques et la fameuse poire à Botsi AOP. Ces arbres centenaires aux racines profondes puisent dans le sol fribourgeois une minéralité et une intensité aromatique incomparables, sans le moindre traitement phytosanitaire.',
      'En cave, le cidriculteur fribourgeois applique une vinification minimaliste et ultra-précise inspirée des grands vignerons : pressurage lent et respectueux du fruit, débourbage à froid, et surtout fermentations spontanées lentes conduites exclusivement par les levures indigènes naturellement présentes sur la peau des fruits. Sans collage, sans filtration violente et sans ajout de sulfites pendant la fermentation.',
      'Les prises de mousse s’effectuent en bouteille selon la méthode traditionnelle ou ancestrale. Le résultat : des cuvées de garde d’une finesse époustouflante, d’une fraîcheur cristalline et d’une complexité qui séduisent aujourd’hui les plus grandes tables gastronomiques et amateurs de vins naturels à travers le monde.',
    ],
    philosophies: [
      {
        title: 'Arbres hautes-tiges centenaires',
        description:
          'Récolte manuelle exclusive sur de vieux vergers traditionnels non traités, garants de la biodiversité paysagère fribourgeoise.',
      },
      {
        title: 'Levures indigènes & fermentation spontanée',
        description:
          'Aucune levure sélectionnée ni intrant œnologique. Chaque millésime reflète l’équilibre vivant et unique de sa saison.',
      },
      {
        title: '100% Pur jus & prise de mousse naturelle',
        description:
          'Zéro concentré ni dilution. Les bulles fines sont obtenues naturellement par la fermentation en bouteille.',
      },
      {
        title: 'Cidres gastronomiques de garde',
        description:
          'Des cuvées sèches, demi-sec ou liquoreuses pensées pour les accords mets-vins les plus raffinés, capables d’évoluer plusieurs années en cave.',
      },
    ],
    badges: [
      'Cidriculteur artisan',
      'Pionnier du cidre naturel',
      'Cidrerie du Vulcain',
      'Terroir Fribourgeois 🇨🇭',
      'Arbres hautes-tiges',
      'Levures indigènes',
    ],
  },
}

/**
 * Retrouve le profil d'un producteur par son nom (insensible à la casse) ou son slug.
 */
export function getProducerProfile(nameOrSlug: string): ProducerProfile | null {
  const normalized = nameOrSlug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  for (const [key, profile] of Object.entries(PRODUCERS_PROFILES)) {
    if (key === normalized || profile.slug === normalized) return profile
    const profileNameNorm = profile.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    if (profileNameNorm === normalized || profileNameNorm.includes(normalized)) {
      return profile
    }
  }

  return null
}
