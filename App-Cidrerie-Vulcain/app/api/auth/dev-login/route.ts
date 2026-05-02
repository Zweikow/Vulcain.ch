import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'admin_jwt'

// ⚠️ SUPPRIMER CE FICHIER EN PRODUCTION
export async function POST() {
  // Set un cookie de dev (bypass Strapi)
  const cookieStore = await cookies()
  cookieStore.set(JWT_COOKIE_NAME, 'dev-token-cidrerie-vulcain', {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 1 jour
    path: '/',
  })

  return NextResponse.json({
    success: true,
    user: {
      id: 'dev',
      email: 'dev@test.local',
      username: 'Développeur',
    },
  })
}
