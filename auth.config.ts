import type { NextAuthConfig } from 'next-auth'

/**
 * Le secret de signature n'a pas de valeur de repli : une valeur écrite dans le
 * code serait publique (le dépôt l'est), et permettrait de forger une session
 * d'administration. Mieux vaut refuser de démarrer que signer avec un secret connu.
 */
function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET manquant : refus de démarrer avec un secret de repli.')
  }
  console.warn('AUTH_SECRET manquant — secret de développement utilisé, sessions non sûres.')
  return 'developpement-uniquement-non-sur'
}

export const authConfig: NextAuthConfig = {
  secret: authSecret(),
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 1800, // 30 minutes
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === '/admin/login'

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL('/admin', nextUrl))
        return true
      }

      return isLoggedIn
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      // Le rôle voyage dans le jeton : les écrans réservés à l'administrateur
      // s'y fient, et un préparateur ne peut pas se l'attribuer côté client.
      if (token.role) session.user.role = token.role
      return session
    },
  },
  providers: [],
}
