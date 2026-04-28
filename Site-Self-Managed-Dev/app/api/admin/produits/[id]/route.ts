import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateDevProduct, deleteDevProduct } from '@/lib/dev-store'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338'
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'admin_jwt'
const DEV_TOKEN = 'dev-token-cidrerie-vulcain'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Dev mode: update in store
    if (jwt === DEV_TOKEN) {
      const updated = updateDevProduct(id, body)
      if (!updated) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      return NextResponse.json(updated)
    }
    
    // Data conversion
    const strapiData: Record<string, unknown> = {}
    
    if (body.name !== undefined) strapiData.name = body.name
    if (body.description !== undefined) strapiData.description = body.description
    if (body.price !== undefined) strapiData.price = body.price
    if (body.stock !== undefined) strapiData.stock = body.stock
    if (body.active !== undefined) strapiData.active = body.active
    if (body.year !== undefined) strapiData.year = body.year
    if (body.categoryId !== undefined) strapiData.category = body.categoryId || null
    
    const res = await fetch(`${STRAPI_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: strapiData }),
    })

    const data = await res.json()
    
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Update error' }, { status: res.status })
    }

    return NextResponse.json(data.data)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const jwt = cookieStore.get(JWT_COOKIE_NAME)?.value

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Dev mode: delete from store
    if (jwt === DEV_TOKEN) {
      deleteDevProduct(id)
      return NextResponse.json({ success: true })
    }
    
    const res = await fetch(`${STRAPI_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!res.ok) {
      const data = await res.json()
      return NextResponse.json({ error: data.error?.message || 'Delete error' }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
