import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkBruteForce, recordFailedAttempt, recordSuccessfulLogin } from '@/lib/brute-force'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1338'
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'admin_jwt'

function getClientIp(headersList: Headers): string {
  // Check various headers for real IP (behind proxy/load balancer)
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return '127.0.0.1'
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const clientIp = getClientIp(headersList)
    
    const body = await request.json()
    const identifier = body.identifier || body.email
    const password = body.password

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    // Check brute force protection
    const bruteCheck = checkBruteForce(clientIp, identifier)
    if (!bruteCheck.allowed) {
      const blockedMinutes = bruteCheck.blockedUntil 
        ? Math.ceil((bruteCheck.blockedUntil.getTime() - Date.now()) / 60000)
        : 30
      
      return NextResponse.json(
        { 
          error: bruteCheck.reason,
          blockedUntil: bruteCheck.blockedUntil?.toISOString(),
          blockedMinutes,
        },
        { status: 429 }
      )
    }

    // Appel à l'authentification Strapi
    const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        password,
      }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      // Record failed attempt
      const result = recordFailedAttempt(clientIp, identifier)
      
      let errorMessage = 'Identifiants invalides'
      if (result.accountBlocked) {
        errorMessage = 'Compte bloqué suite à trop de tentatives. Réessayez dans 30 minutes.'
      } else if (result.remainingAttempts <= 3) {
        errorMessage = `Identifiants invalides. ${result.remainingAttempts} tentative(s) restante(s).`
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          remainingAttempts: result.remainingAttempts,
          blocked: result.accountBlocked,
        },
        { status: result.accountBlocked ? 429 : 401 }
      )
    }

    // Successful login - reset attempts
    recordSuccessfulLogin(clientIp, identifier)

    // Set httpOnly cookie avec le JWT
    const cookieStore = await cookies()
    cookieStore.set(JWT_COOKIE_NAME, data.jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    )
  }
}
