import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'admin_jwt'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ne protéger que les routes /admin/*
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Laisser passer la page de login
  if (pathname === '/admin/login') {
    // Si déjà connecté, rediriger vers le dashboard
    const jwt = request.cookies.get(JWT_COOKIE_NAME)
    if (jwt?.value) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  // Vérifier la présence du cookie JWT
  const jwt = request.cookies.get(JWT_COOKIE_NAME)
  
  if (!jwt?.value) {
    // Pas de JWT → redirection vers login
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // JWT présent → laisser passer
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
