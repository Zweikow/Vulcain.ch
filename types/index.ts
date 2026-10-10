export interface ProductPromotion {
  id: string
  name: string
  badgeText?: string | null
  description?: string | null
  type: 'BUY_X_GET_Y_FREE' | 'PERCENTAGE' | 'FIXED_DISCOUNT'
  buyQuantity?: number | null
  getFreeQuantity?: number | null
  discountPercent?: number | null
  discountCents?: number | null
}

export interface Product {
  id: string
  name: string
  slug: string
  category: 'Cidre' | 'Eau-de-vie' | 'Liqueur' | 'Cuisine'
  year?: number
  priceCents: number // centimes entiers - jamais de flottant pour l'argent
  compareAtPriceCents?: number | null // prix d'origine barre
  stock: number
  bottlesPerUnit: number // nombre de bouteilles par unite (+1)
  description: string
  image?: string
  active: boolean
  isBio: boolean
  isVegan: boolean
  articleNumber: number
  bottleSize?: '75cl' | '27.5cl'
  origin?: 'CH' | 'FR'
  producerName?: string
  // Badges calcules cote serveur - « Nouveau » ou « Derniers exemplaires », jamais les deux
  isNew?: boolean
  isLastUnits?: boolean
  activePromotion?: ProductPromotion | null
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface CustomerInfo {
  firstName: string
  lastName: string
  address: string
  npa: string
  lieu: string
  deliveryDate: string
  email: string
  message?: string
  acceptsMarketing: boolean
}
