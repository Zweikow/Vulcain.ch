import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getDevCategories, createDevCategory } from '@/lib/dev-store'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338'
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'admin_jwt'
const DEV_TOKEN = 'dev-token-cidrerie-vulcain'

// Normalize Strapi category to frontend format
interface StrapiCategory {
  id: number
  documentId: string
  name: string
  slug: string
  order: number
}

function normalizeCategory(c: StrapiCategory) {
  return {
    id: c.documentId,
    name: c.name,
    slug: c.slug,
    order: c.order,
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
    return NextResponse.json(getDevCategories())
  }

  try {
    const res = await fetch(`${STRAPI_URL}/api/categories?populate=products&sort=order:asc`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
    })

    const data = await res.json()
    const categories = (data.data || []).map(normalizeCategory)
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
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
      const newCat = createDevCategory(body)
      return NextResponse.json(newCat)
    }
    
    const res = await fetch(`${STRAPI_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: body }),
    })

    const data = await res.json()
    
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Creation error' }, { status: res.status })
    }

    return NextResponse.json(normalizeCategory(data.data))
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
