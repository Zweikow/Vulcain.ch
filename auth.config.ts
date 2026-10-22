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
        if (isLoggedIn) return Response.redirect(new URL('/admin', nextUrl.origin))

        // Si un client arrive avec un callbackUrl vers une facture sans être connecté,
        // on le redirige directement vers la consultation publique sans lui demander de compte.
        const callbackUrl = nextUrl.searchParams.get('callbackUrl')
        if (callbackUrl) {
          try {
            const cb = new URL(callbackUrl, nextUrl.origin)
            const cbInvoiceMatch = cb.pathname.match(/^\/admin\/commandes\/([^/]+)\/facture$/)
            if (cbInvoiceMatch) {
              const orderId = cbInvoiceMatch[1]
              return Response.redirect(new URL(`/facture/${orderId}`, nextUrl.origin))
            }
          } catch {
            // URL non valide, ignorer
          }
        }

        return true
      }

      // Redirection transparente des anciens liens de facture client envoyés par email :
      // si l'utilisateur n'est pas un administrateur connecté, on le bascule directement
      // vers la vue de facture publique /facture/:id sans passer par le formulaire de login.
      const invoiceMatch = nextUrl.pathname.match(/^\/admin\/commandes\/([^/]+)\/facture$/)
      if (invoiceMatch) {
        if (!isLoggedIn) {
          const orderId = invoiceMatch[1]
          return Response.redirect(new URL(`/facture/${orderId}`, nextUrl.origin))
        }
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
