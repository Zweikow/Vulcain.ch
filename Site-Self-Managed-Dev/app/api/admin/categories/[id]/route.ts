import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateDevCategory, deleteDevCategory } from '@/lib/dev-store'

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
      const updated = updateDevCategory(id, body)
      if (!updated) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      return NextResponse.json(updated)
    }
    
    const res = await fetch(`${STRAPI_URL}/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: body }),
    })

    const data = await res.json()
    
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Update error' }, { status: res.status })
    }

    return NextResponse.json(data.data)
  } catch (error) {
    console.error('Error updating category:', error)
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
      deleteDevCategory(id)
      return NextResponse.json({ success: true })
    }
    
    const res = await fetch(`${STRAPI_URL}/api/categories/${id}`, {
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
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
