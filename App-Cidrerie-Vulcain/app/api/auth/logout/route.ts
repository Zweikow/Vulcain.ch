import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'admin_jwt'

export async function POST() {
  const cookieStore = await cookies()
  
  // Supprime le cookie JWT
  cookieStore.delete(JWT_COOKIE_NAME)

  return NextResponse.json({ success: true })
}
