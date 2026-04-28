import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getDevProducts, createDevProduct } from '@/lib/dev-store'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338'
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'admin_jwt'
const DEV_TOKEN = 'dev-token-cidrerie-vulcain'

// Normalize Strapi product to frontend format
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
  category?: { id: number; documentId: string; name: string }
}

function normalizeProduct(p: StrapiProduct) {
  return {
    id: p.documentId,
    name: p.name,
    description: p.description || '',
    price: p.price,
    stock: p.stock,
    year: p.year,
    active: p.active,
    category: p.category?.name || 'Non catégorisé',
    categoryId: p.category?.documentId,
    image: p.image?.url ? `${STRAPI_URL}${p.image.url}` : undefined,
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Dev mode: return data from store
  if (jwt === DEV_TOKEN) {
    return NextResponse.json(getDevProducts())
  }

  try {
    const res = await fetch(`${STRAPI_URL}/api/products?populate=*&sort=category.order:asc,name:asc`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
    })

    const data = await res.json()
    const products = (data.data || []).map(normalizeProduct)
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Dev mode: create in store
    if (jwt === DEV_TOKEN) {
      const newProd = createDevProduct(body)
      return NextResponse.json(newProd)
    }
    
    // Data conversion
    const strapiData: Record<string, unknown> = {
      name: body.name,
      description: body.description,
      price: body.price,
      stock: body.stock,
      active: body.active,
    }
    
    if (body.year) strapiData.year = body.year
    if (body.categoryId) strapiData.category = body.categoryId
    
    const res = await fetch(`${STRAPI_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: strapiData }),
    })

    const data = await res.json()
    
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Creation error' }, { status: res.status })
    }

    return NextResponse.json(normalizeProduct(data.data))
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
