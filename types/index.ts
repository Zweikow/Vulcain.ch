export interface Product {
  id: string
  name: string
  category: 'Cidre' | 'Eau-de-vie' | 'Liqueur' | 'Cuisine'
  year?: number
  priceCents: number // centimes entiers — jamais de flottant pour l'argent
  stock: number
  description: string
  image?: string
  active: boolean
  isBio: boolean
  isVegan: boolean
  articleNumber: number
  // Badges calculés côté serveur — « Nouveau » ou « Derniers exemplaires », jamais les deux
  isNew?: boolean
  isLastUnits?: boolean
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
