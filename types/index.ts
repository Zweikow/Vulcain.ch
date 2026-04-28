export interface Product {
  id: string
  name: string
  category: 'Cidre' | 'Eau-de-vie' | 'Liqueur' | 'Cuisine'
  year?: number
  price: number
  stock: number
  description: string
  image?: string
  active: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  items: CartItem[]
  total: number
  customer: CustomerInfo
  createdAt: Date
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
