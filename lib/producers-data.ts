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
  countries?: ('CH' | 'FR')[]
  terroirs?: {
    name: string
    country: 'CH' | 'FR'
  }[]
  sinceYear: number
  sinceText?: string
  sinceItems?: {
    text: string
    country?: 'CH' | 'FR'
  }[]
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
    tagline: 'Cidriculteur artisan - Fondateur de la Cidrerie du Vulcain',
    region: 'Le Verger de Rue, Fribourg – Suisse & La Ferme La Prémoudière, Normandie – France',
    terroirs: [
      { name: 'Le Verger de Rue, Fribourg – Suisse', country: 'CH' },
      { name: 'La Ferme La Prémoudière, Normandie – France', country: 'FR' },
    ],
    cantonOrDept: 'Fribourg & Normandie',
    country: 'CH',
    countries: ['CH', 'FR'],
    sinceYear: 2006,
    sinceText: 'CH Depuis 2006 · FR Depuis 2022',
    sinceItems: [
      { text: 'CH Depuis 2006', country: 'CH' },
      { text: 'FR Depuis 2022', country: 'FR' },
    ],
    portraitImage: '/images/histoire/jacques-perritaz.jpg',
    quote:
      '« Le cidre n’est pas un sous-produit de la pomme : c’est l’expression noble, pure et vivante d’arbres centenaires enracinés dans un terroir préservé. »',
    shortBio:
      'Pionnier du cidre naturel en Suisse, Jacques Perritaz élabore au Verger de Rue (Fribourg) et à la Ferme La Prémoudière (Normandie) à la Cidrerie du Vulcain des cidres et poirés de gastronomie issus d’arbres hautes-tiges centenaires non traités, vinifiés en fermentation spontanée.',
    storyParagraphs: [
      'Biologiste de formation, Jacques Perritaz fonde son domaine, la Cidrerie du Vulcain, en 2006 avec une vision exigeante : redonner au cidre ses lettres de noblesse en l’élevant au rang des plus grands vins de terroir. Installé au Verger de Rue (Fribourg) et à la Ferme La Prémoudière (Normandie) sous le symbole du papillon Vulcain, il s’attache depuis près de vingt ans à révéler la singularité des fruits de plein vent de ses terroirs.',
      'Son trésor réside dans les vergers traditionnels de plein vent (arbres hautes-tiges). Jacques parcourt inlassablement la région fribourgeoise, la Suisse romande et le bocage normand pour récolter à la main des variétés anciennes et oubliées : pommes acidulées sauvages, Bohnapfel, Boskoop, Engishofer, poires à poiré rustiques et la fameuse poire à Botsi AOP. Ces arbres centenaires aux racines profondes puisent dans le sol une minéralité et une intensité aromatique incomparables, sans le moindre traitement phytosanitaire.',
      'En cave, le cidriculteur applique une vinification minimaliste et ultra-précise inspirée des grands vignerons : pressurage lent et respectueux du fruit, débourbage à froid, et surtout fermentations spontanées lentes conduites exclusivement par les levures indigènes naturellement présentes sur la peau des fruits. Sans collage, sans filtration violente et sans ajout de sulfites pendant la fermentation.',
      'Les prises de mousse s’effectuent en bouteille selon la méthode traditionnelle ou ancestrale. Le résultat : des cuvées de garde d’une finesse époustouflante, d’une fraîcheur cristalline et d’une complexité qui séduisent aujourd’hui les plus grandes tables gastronomiques et amateurs de vins naturels à travers le monde.',
    ],
    philosophies: [
      {
        title: 'Arbres hautes-tiges centenaires',
        description:
          'Récolte manuelle exclusive sur de vieux vergers traditionnels non traités, garants de la biodiversité paysagère.',
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
      'Fribourg 🇨🇭 & Normandie 🇫🇷',
      'Arbres hautes-tiges',
      'Levures indigènes',
    ],
  },
}

/**
 * Producteur partenaire mis en avant sur /producteurs par un bloc court
 * (texte, packshots, liens), sans la fiche complète réservée au profil ci-dessus.
 */
export interface FeaturedProducer {
  /** Slug de la fiche `Producer` en base : le bloc ne s'affiche que si elle existe. */
  slug: string
  name: string
  place: string
  /** Terme de recherche qui filtre ses cuvées dans la boutique (`/?q=`). */
  shopQuery: string
  intro: string[]
  cuvees: {
    name: string
    origin: string
    image: string
  }[]
}

// Faits repris du site officiel heftigcidre.ch (accueil et fiches des cuvées, 15.11.2026).
// Le site ne nomme ni les cidriers ni l'année de création : rien n'est ajouté ici.
export const HEFTIG_FEATURE: FeaturedProducer = {
  slug: 'heftig',
  name: 'Cidrerie A. Heftig',
  place: 'Berne',
  shopQuery: 'Heftig',
  intro: [
    'À Berne, la Cidrerie A. Heftig élabore des cidres et des vins de fruits à partir de 100 % de fruits, fermentés avec leurs levures naturelles, sans additifs ni soufre.',
    'Les fruits viennent de vergers haute-tige de la région de Berne et, pour certaines cuvées, de Thurgovie, de Saint-Gall et de Lucerne. Chaque variété fermente séparément trois à quatre mois, puis elle est mise en bouteille seule ou en assemblage, en méthode ancestrale.',
  ],
  cuvees: [
    {
      name: 'Engishofer',
      origin: 'Stehrenberg (Thurgovie)',
      image: '/packshots/heftig/engishofer.jpg',
    },
    {
      name: 'Schöner von Boskoop',
      origin: 'Steinach (Saint-Gall)',
      image: '/packshots/heftig/schoner-von-boskoop.jpg',
    },
    {
      name: 'Cuvée Heftig',
      origin: 'Région de Berne',
      image: '/packshots/heftig/cuvee-heftig.jpg',
    },
    {
      name: 'Poiré',
      origin: 'Région de Berne et Richenthal (Lucerne)',
      image: '/packshots/heftig/poire.jpg',
    },
  ],
}

function normalizeName(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/**
 * Associe chaque cuvée mise en avant à la fiche produit en vente qui lui
 * correspond : d'abord le packshot choisi dans l'admin, sinon le nom.
 * Une cuvée sans produit en vente reste affichée, sans lien.
 */
export function matchFeaturedCuvees<P extends { name: string; imageUrl: string | null }>(
  cuvees: FeaturedProducer['cuvees'],
  products: P[]
): { cuvee: FeaturedProducer['cuvees'][number]; product: P | null }[] {
  const used = new Set<P>()
  const byImage = cuvees.map((c) => products.find((p) => p.imageUrl === c.image) ?? null)
  byImage.forEach((p) => p && used.add(p))

  return cuvees.map((cuvee, i) => {
    let product = byImage[i]
    if (!product) {
      const wanted = normalizeName(cuvee.name)
      product = products.find((p) => !used.has(p) && normalizeName(p.name).includes(wanted)) ?? null
      if (product) used.add(product)
    }
    return { cuvee, product }
  })
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
