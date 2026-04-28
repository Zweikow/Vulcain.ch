import { Product, Category } from '@/types'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338'
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || ''

// Types Strapi
interface StrapiResponse<T> {
  data: T
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } }
}

interface StrapiProduct {
  id: number
  documentId: string
  name: string
  description: string
  price: number
  stock: number
  year?: string
  active: boolean
  image?: { url: string }
  category?: StrapiCategory | { id: number; documentId: string; name: string }
}

interface StrapiCategory {
  id: number
  documentId: string
  name: string
  slug: string
  order: number
  products?: StrapiProduct[]
}

// ============== FETCH HELPERS ==============

export async function fetchStrapi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${STRAPI_URL}/api${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
      ...options?.headers,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function fetchStrapiAuth<T>(
  endpoint: string,
  jwt: string,
  options?: RequestInit
): Promise<T> {
  const url = `${STRAPI_URL}/api${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      ...options?.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Strapi auth request failed: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// ============== PRODUCTS ==============

export async function getProducts(): Promise<Product[]> {
  const res = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    '/products?populate=*&filters[active][$eq]=true&sort=category.order:asc,name:asc'
  )
  return res.data.map(normalizeProduct)
}

export async function getAllProducts(): Promise<Product[]> {
  const res = await fetchStrapi<StrapiResponse<StrapiProduct[]>>(
    '/products?populate=*&sort=category.order:asc,name:asc'
  )
  return res.data.map(normalizeProduct)
}

export async function getProduct(documentId: string): Promise<Product> {
  const res = await fetchStrapi<StrapiResponse<StrapiProduct>>(
    `/products/${documentId}?populate=*`
  )
  return normalizeProduct(res.data)
}

export async function createProduct(
  data: Partial<Omit<StrapiProduct, 'id' | 'documentId' | 'image' | 'category'>> & { categoryId?: string },
  jwt: string
): Promise<Product> {
  const strapiData: Record<string, unknown> = { ...data }
  if (data.categoryId) {
    strapiData.category = data.categoryId
    delete strapiData.categoryId
  }
  
  const res = await fetchStrapiAuth<StrapiResponse<StrapiProduct>>(
    '/products',
    jwt,
    {
      method: 'POST',
      body: JSON.stringify({ data: strapiData }),
    }
  )
  return normalizeProduct(res.data)
}

export async function updateProduct(
  documentId: string,
  data: Partial<Omit<StrapiProduct, 'id' | 'documentId' | 'image' | 'category'>> & { categoryId?: string },
  jwt: string
): Promise<Product> {
  const strapiData: Record<string, unknown> = { ...data }
  if (data.categoryId !== undefined) {
    strapiData.category = data.categoryId || null
    delete strapiData.categoryId
  }
  
  const res = await fetchStrapiAuth<StrapiResponse<StrapiProduct>>(
    `/products/${documentId}`,
    jwt,
    {
      method: 'PUT',
      body: JSON.stringify({ data: strapiData }),
    }
  )
  return normalizeProduct(res.data)
}

export async function deleteProduct(documentId: string, jwt: string): Promise<void> {
  await fetchStrapiAuth(`/products/${documentId}`, jwt, { method: 'DELETE' })
}

// ============== CATEGORIES ==============

export async function getCategories(): Promise<Category[]> {
  const res = await fetchStrapi<StrapiResponse<StrapiCategory[]>>(
    '/categories?populate=products&sort=order:asc'
  )
  return res.data.map(normalizeCategory)
}

export async function getAllCategories(): Promise<Category[]> {
  const res = await fetchStrapi<StrapiResponse<StrapiCategory[]>>(
    '/categories?populate=*&sort=order:asc'
  )
  return res.data.map(normalizeCategory)
}

export async function createCategory(
  data: { name: string; order?: number },
  jwt: string
): Promise<Category> {
  const res = await fetchStrapiAuth<StrapiResponse<StrapiCategory>>(
    '/categories',
    jwt,
    {
      method: 'POST',
      body: JSON.stringify({ data }),
    }
  )
  return normalizeCategory(res.data)
}

export async function updateCategory(
  documentId: string,
  data: Partial<{ name: string; order: number }>,
  jwt: string
): Promise<Category> {
  const res = await fetchStrapiAuth<StrapiResponse<StrapiCategory>>(
    `/categories/${documentId}`,
    jwt,
    {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }
  )
  return normalizeCategory(res.data)
}

export async function deleteCategory(documentId: string, jwt: string): Promise<void> {
  await fetchStrapiAuth(`/categories/${documentId}`, jwt, { method: 'DELETE' })
}

// ============== ORDERS ==============

export async function createOrder(orderData: {
  total: number
  items: Array<{ productId: string; name: string; quantity: number; price: number }>
  firstName: string
  lastName: string
  email: string
  address: string
  npa: string
  lieu: string
  deliveryDate: string
  message?: string
  acceptsMarketing: boolean
}) {
  const res = await fetchStrapi<StrapiResponse<{ id: number; documentId: string }>>(
    '/orders',
    {
      method: 'POST',
      body: JSON.stringify({ data: orderData }),
    }
  )
  return res.data
}

export async function getOrders(jwt: string) {
  const res = await fetchStrapiAuth<StrapiResponse<unknown[]>>(
    '/orders?sort=createdAt:desc',
    jwt
  )
  return res.data
}

// ============== NORMALIZERS ==============

function normalizeProduct(p: StrapiProduct): Product {
  const categoryName = typeof p.category === 'object' && p.category 
    ? p.category.name 
    : 'Non catégorisé'
  const categoryId = typeof p.category === 'object' && p.category 
    ? p.category.documentId 
    : undefined

  return {
    id: p.documentId,
    name: p.name,
    category: categoryName,
    categoryId,
    year: p.year,
    price: p.price,
    stock: p.stock,
    description: p.description || '',
    image: p.image?.url
      ? `${STRAPI_URL}${p.image.url}`
      : undefined,
    active: p.active,
  }
}

function normalizeCategory(c: StrapiCategory): Category {
  return {
    id: c.documentId,
    name: c.name,
    slug: c.slug,
    order: c.order,
    products: c.products?.map(normalizeProduct),
  }
}

// Aliases pour compatibilité
export const getProduits = getProducts
export const getCategorie = getCategories
