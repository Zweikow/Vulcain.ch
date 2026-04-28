# Admin Foundation — PostgreSQL + Prisma + NextAuth.js v5 + Anti-bots

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations du panel admin : base de données PostgreSQL connectée via Prisma, authentification sécurisée multi-comptes NextAuth.js v5 (JWT 30 min, avertissement 2 min), et protection anti-bots sur le formulaire de commande (Turnstile + honeypot + rate limiting).

**Architecture:** Next.js App Router sur Vercel interroge PostgreSQL (Railway) via Prisma ORM. L'authentification utilise NextAuth.js v5 avec un Credentials provider et JWT httpOnly. Le middleware edge protège toutes les routes `/admin/*`. Le formulaire de commande public est protégé par Cloudflare Turnstile (invisible), un champ honeypot, et un rate limiter Upstash Redis.

**Tech Stack:** Next.js 15, TypeScript, Prisma 6, PostgreSQL (Railway), NextAuth.js v5 (beta), bcryptjs, Zod, Cloudflare Turnstile, @upstash/ratelimit + @upstash/redis

---

## Fichiers créés / modifiés

| Fichier | Action | Responsabilité |
|---|---|---|
| `prisma/schema.prisma` | Créer | Schéma DB complet |
| `prisma/seed.ts` | Créer | Admin initial + catégories |
| `auth.config.ts` | Créer | Config edge (middleware) |
| `lib/auth.ts` | Créer | Config complète NextAuth + Prisma |
| `lib/prisma.ts` | Créer | Singleton Prisma client |
| `lib/validations.ts` | Créer | Schémas Zod |
| `lib/turnstile.ts` | Créer | Vérification token Turnstile |
| `lib/ratelimit.ts` | Créer | Rate limiter Upstash |
| `middleware.ts` | Créer | Protection routes /admin/* |
| `app/api/auth/[...nextauth]/route.ts` | Créer | Handler NextAuth |
| `app/api/commandes/route.ts` | Créer | Soumission commande protégée |
| `app/admin/login/page.tsx` | Créer | Page de connexion |
| `app/admin/layout.tsx` | Créer | Layout admin + SessionProvider |
| `components/admin/SessionWatcher.tsx` | Créer | Modale expiration session |
| `components/TurnstileWidget.tsx` | Créer | Widget CAPTCHA invisible |
| `components/OrderForm.tsx` | Modifier | Ajout honeypot + Turnstile |
| `package.json` | Modifier | Nouvelles dépendances + script seed |
| `.env.local` | Créer | Variables d'environnement locales |

---

## Task 1 : Installation des dépendances

**Files:**
- Modify: `package.json`
- Create: `.env.local`

- [ ] **Étape 1 : Installer les packages**

```bash
npm install prisma @prisma/client next-auth@beta bcryptjs zod @upstash/ratelimit @upstash/redis
npm install -D @types/bcryptjs
```

Résultat attendu : pas d'erreur, `node_modules` mis à jour.

- [ ] **Étape 2 : Initialiser Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Résultat attendu : création de `prisma/schema.prisma` et ajout de `DATABASE_URL` dans `.env`.

- [ ] **Étape 3 : Créer `.env.local` avec toutes les variables**

```bash
# .env.local
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
NEXTAUTH_SECRET="remplacer-par-32-chars-aleatoires-minimum"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="votre-site-key-cloudflare"
TURNSTILE_SECRET_KEY="votre-secret-key-cloudflare"
UPSTASH_REDIS_REST_URL="votre-upstash-url"
UPSTASH_REDIS_REST_TOKEN="votre-upstash-token"
SEED_ADMIN_EMAIL="admin@cidrerie-vulcain.ch"
SEED_ADMIN_PASSWORD="motdepasse-fort-a-changer"
SEED_ADMIN_NAME="Administrateur"
```

> Pour l'instant, laisser les valeurs placeholder. Renseigner les vraies valeurs Railway/Cloudflare/Upstash avant de lancer les étapes suivantes.

- [ ] **Étape 4 : Ajouter `.env.local` au `.gitignore`**

Vérifier que `.gitignore` contient déjà `.env.local`. Si non, ajouter :

```
.env.local
.env
```

- [ ] **Étape 5 : Ajouter le script seed à `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:seed": "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts",
    "db:migrate": "npx prisma migrate dev",
    "db:studio": "npx prisma studio"
  }
}
```

- [ ] **Étape 6 : Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: Installation dépendances fondation admin (Prisma, NextAuth, Zod, Turnstile)"
```

---

## Task 2 : Schéma Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Étape 1 : Remplacer le contenu de `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())
}

model Category {
  id       String    @id @default(cuid())
  name     String    @unique
  products Product[]
}

model Product {
  id          String      @id @default(cuid())
  name        String
  description String?
  price       Float
  stock       Int         @default(0)
  stockSeuil  Int         @default(5)
  active      Boolean     @default(true)
  imageUrl    String?
  year        Int?
  category    Category    @relation(fields: [categoryId], references: [id])
  categoryId  String
  orderItems  OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Order {
  id          String      @id @default(cuid())
  numero      String      @unique
  status      OrderStatus @default(A_TRAITER)
  clientName  String
  clientEmail String
  clientPhone String?
  address     String
  npa         String
  city        String
  total       Float
  shippedAt   DateTime?
  items       OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model OrderItem {
  id        String  @id @default(cuid())
  order     Order   @relation(fields: [orderId], references: [id])
  orderId   String
  product   Product @relation(fields: [productId], references: [id])
  productId String
  quantity  Int
  unitPrice Float
}

model Setting {
  key   String @id
  value String
}

enum OrderStatus {
  A_TRAITER
  EN_PREPARATION
  EXPEDIEE
}
```

- [ ] **Étape 2 : Générer le client Prisma**

```bash
npx prisma generate
```

Résultat attendu : `Generated Prisma Client`

- [ ] **Étape 3 : Lancer la migration initiale**

> Prérequis : `DATABASE_URL` dans `.env.local` pointe vers une vraie DB PostgreSQL Railway.

```bash
npx prisma migrate dev --name init
```

Résultat attendu : `Your database is now in sync with your schema.`

- [ ] **Étape 4 : Commit**

```bash
git add prisma/
git commit -m "feat: Schéma Prisma initial — users, products, orders, categories, settings"
```

---

## Task 3 : Singleton Prisma client

**Files:**
- Create: `lib/prisma.ts`

- [ ] **Étape 1 : Créer `lib/prisma.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Étape 2 : Vérifier que le client s'importe sans erreur**

```bash
npx tsc --noEmit
```

Résultat attendu : pas d'erreur TypeScript sur `lib/prisma.ts`.

- [ ] **Étape 3 : Commit**

```bash
git add lib/prisma.ts
git commit -m "feat: Singleton Prisma client"
```

---

## Task 4 : Validations Zod

**Files:**
- Create: `lib/validations.ts`

- [ ] **Étape 1 : Créer `lib/validations.ts`**

```ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
})

export const orderSchema = z.object({
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  address: z.string().min(1, 'Requis'),
  npa: z.string().length(4, 'NPA invalide'),
  city: z.string().min(1, 'Requis'),
  total: z.number().positive(),
  items: z.array(orderItemSchema).min(1, 'Panier vide'),
  turnstileToken: z.string().min(1, 'Vérification requise'),
  website: z.string().max(0).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type OrderInput = z.infer<typeof orderSchema>
```

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : pas d'erreur.

- [ ] **Étape 3 : Commit**

```bash
git add lib/validations.ts
git commit -m "feat: Schémas Zod — login, commande, articles"
```

---

## Task 5 : Configuration NextAuth.js v5

**Files:**
- Create: `auth.config.ts`
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Étape 1 : Créer `auth.config.ts` (edge-compatible, sans Prisma)**

```ts
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
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
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  providers: [],
}
```

- [ ] **Étape 2 : Créer `lib/auth.ts` (config complète avec Prisma + bcrypt)**

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
})
```

- [ ] **Étape 3 : Créer `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Étape 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : pas d'erreur.

- [ ] **Étape 5 : Commit**

```bash
git add auth.config.ts lib/auth.ts app/api/auth/
git commit -m "feat: Configuration NextAuth.js v5 — Credentials provider, JWT 30min"
```

---

## Task 6 : Middleware de protection des routes

**Files:**
- Create: `middleware.ts`

- [ ] **Étape 1 : Créer `middleware.ts`**

```ts
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Étape 2 : Démarrer le serveur et tester la protection**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/admin` dans un navigateur non authentifié.
Résultat attendu : redirection vers `http://localhost:3000/admin/login`.

- [ ] **Étape 3 : Commit**

```bash
git add middleware.ts
git commit -m "feat: Middleware protection routes /admin/*"
```

---

## Task 7 : Page de connexion

**Files:**
- Create: `app/admin/login/page.tsx`

- [ ] **Étape 1 : Créer `app/admin/login/page.tsx`**

```tsx
import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  async function login(formData: FormData) {
    'use server'
    try {
      await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo: '/admin',
      })
    } catch (error) {
      if (error instanceof AuthError) {
        redirect('/admin/login?error=credentials')
      }
      throw error
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Cidrerie du Vulcain
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Espace administration
          </p>
        </div>

        {searchParams.error === 'credentials' && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              Email ou mot de passe incorrect.
            </p>
          </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mot de passe
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            type="submit"
            className="bg-green-700 hover:bg-green-800 text-white rounded-lg py-2 text-sm font-medium transition-colors mt-2"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Étape 2 : Tester la page de connexion**

Aller sur `http://localhost:3000/admin/login`.
Résultat attendu : formulaire de connexion visible.

Tester avec des identifiants incorrects.
Résultat attendu : message "Email ou mot de passe incorrect." affiché.

> Note : le login fonctionnel nécessite que la DB soit seedée (Task 10).

- [ ] **Étape 3 : Commit**

```bash
git add app/admin/login/
git commit -m "feat: Page de connexion admin"
```

---

## Task 8 : SessionWatcher + Layout admin

**Files:**
- Create: `components/admin/SessionWatcher.tsx`
- Create: `app/admin/layout.tsx`

- [ ] **Étape 1 : Créer `components/admin/SessionWatcher.tsx`**

```tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'

const WARNING_BEFORE_MS = 2 * 60 * 1000 // 2 minutes

export function SessionWatcher() {
  const { data: session, update } = useSession()
  const [showModal, setShowModal] = useState(false)
  const [countdown, setCountdown] = useState(120)

  useEffect(() => {
    if (!session?.expires) return

    const check = () => {
      const remaining = new Date(session.expires).getTime() - Date.now()
      if (remaining > 0 && remaining <= WARNING_BEFORE_MS) {
        setShowModal(true)
        setCountdown(Math.floor(remaining / 1000))
      }
    }

    check()
    const interval = setInterval(check, 10_000)
    return () => clearInterval(interval)
  }, [session?.expires])

  useEffect(() => {
    if (!showModal) return
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          signOut({ callbackUrl: '/admin/login' })
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [showModal])

  const handleExtend = useCallback(async () => {
    await update()
    setShowModal(false)
  }, [update])

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Session bientôt expirée
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          Votre session expire dans{' '}
          <span className="font-bold text-orange-500">{countdown}s</span>.
          Souhaitez-vous la prolonger ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExtend}
            className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Prolonger la session
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Étape 2 : Créer `app/admin/layout.tsx`**

```tsx
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { SessionWatcher } from '@/components/admin/SessionWatcher'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <SessionProvider session={session}>
      <SessionWatcher />
      {children}
    </SessionProvider>
  )
}
```

- [ ] **Étape 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : pas d'erreur.

- [ ] **Étape 4 : Commit**

```bash
git add components/admin/ app/admin/layout.tsx
git commit -m "feat: SessionWatcher — modale expiration session 2min avant timeout"
```

---

## Task 9 : Turnstile anti-bot

**Files:**
- Create: `lib/turnstile.ts`
- Create: `components/TurnstileWidget.tsx`

- [ ] **Étape 1 : Créer `lib/turnstile.ts`**

```ts
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!token) return false

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  )

  if (!response.ok) return false
  const data = await response.json()
  return data.success === true
}
```

- [ ] **Étape 2 : Créer `components/TurnstileWidget.tsx`**

```tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile: {
      render: (el: HTMLElement, opts: object) => string
      remove: (id: string) => void
      reset: (id: string) => void
    }
    onTurnstileLoad: () => void
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      callback: onToken,
      size: 'invisible',
    })
  }, [onToken])

  useEffect(() => {
    if (window.turnstile) {
      renderWidget()
      return
    }

    window.onTurnstileLoad = renderWidget
    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    document.head.appendChild(script)

    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
    }
  }, [renderWidget])

  return <div ref={containerRef} />
}
```

- [ ] **Étape 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : pas d'erreur.

- [ ] **Étape 4 : Commit**

```bash
git add lib/turnstile.ts components/TurnstileWidget.tsx
git commit -m "feat: Turnstile anti-bot — helper vérification + widget invisible"
```

---

## Task 10 : Rate limiter Upstash

**Files:**
- Create: `lib/ratelimit.ts`

- [ ] **Étape 1 : Créer `lib/ratelimit.ts`**

```ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const orderRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'ratelimit:order',
  analytics: false,
})
```

> Prérequis : `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` renseignés dans `.env.local`. Créer une DB Redis gratuite sur [upstash.com](https://upstash.com) et copier les credentials.

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : pas d'erreur.

- [ ] **Étape 3 : Commit**

```bash
git add lib/ratelimit.ts
git commit -m "feat: Rate limiter Upstash — 5 commandes max par IP / 10 minutes"
```

---

## Task 11 : API route commandes + protection complète

**Files:**
- Create: `app/api/commandes/route.ts`

- [ ] **Étape 1 : Créer `app/api/commandes/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { orderRatelimit } from '@/lib/ratelimit'
import { orderSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  // 1. Rate limiting par IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
  const { success: withinLimit } = await orderRatelimit.limit(ip)
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 10 minutes.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  // 2. Honeypot — rejet silencieux
  if (
    typeof body === 'object' &&
    body !== null &&
    'website' in body &&
    (body as Record<string, unknown>).website
  ) {
    return NextResponse.json({ orderId: 'bot-rejected' }, { status: 201 })
  }

  // 3. Validation Zod
  const result = orderSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: result.error.flatten() },
      { status: 422 }
    )
  }

  // 4. Vérification Turnstile
  const tokenValid = await verifyTurnstileToken(result.data.turnstileToken)
  if (!tokenValid) {
    return NextResponse.json(
      { error: 'Vérification de sécurité échouée' },
      { status: 403 }
    )
  }

  // 5. Génération numéro de commande
  const count = await prisma.order.count()
  const numero = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  // 6. Création commande en DB
  const order = await prisma.order.create({
    data: {
      numero,
      clientName: `${result.data.firstName} ${result.data.lastName}`,
      clientEmail: result.data.email,
      clientPhone: result.data.phone ?? null,
      address: result.data.address,
      npa: result.data.npa,
      city: result.data.city,
      total: result.data.total,
      items: {
        create: result.data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    select: { numero: true },
  })

  return NextResponse.json({ orderId: order.numero }, { status: 201 })
}
```

- [ ] **Étape 2 : Modifier `components/OrderForm.tsx` — ajouter honeypot + Turnstile**

Ajouter les imports en haut du fichier :

```tsx
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { useCallback, useRef } from 'react'
```

Ajouter l'état du token Turnstile dans le composant :

```tsx
const turnstileToken = useRef<string>('')

const handleTurnstileToken = useCallback((token: string) => {
  turnstileToken.current = token
}, [])
```

Modifier `handleSubmit` pour envoyer vers l'API au lieu de simuler :

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!validate()) return
  if (items.length === 0) {
    alert('Votre panier est vide')
    return
  }

  const payload = {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    address: form.address,
    npa: form.npa,
    city: form.lieu,
    total,
    items: items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      unitPrice: i.product.price,
    })),
    turnstileToken: turnstileToken.current,
    website: '',  // honeypot vide
  }

  const res = await fetch('/api/commandes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    alert('Une erreur est survenue. Veuillez réessayer.')
    return
  }

  const { orderId } = await res.json()
  onSubmit(form, orderId, total)
}
```

Ajouter dans le JSX du formulaire avant le bouton submit :

```tsx
{/* Honeypot — invisible pour les humains */}
<input
  type="text"
  name="website"
  style={{ display: 'none' }}
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
/>

{/* Turnstile invisible */}
<TurnstileWidget onToken={handleTurnstileToken} />
```

- [ ] **Étape 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : pas d'erreur.

- [ ] **Étape 4 : Commit**

```bash
git add app/api/commandes/ components/OrderForm.tsx
git commit -m "feat: API commandes — Turnstile + honeypot + rate limiting + Zod + Prisma"
```

---

## Task 12 : Seed de la base de données

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Étape 1 : Créer `prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@cidrerie-vulcain.ch'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123'
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrateur'

  const hash = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: hash, name },
  })
  console.log(`✓ Admin créé : ${email}`)

  const categories = ['Cidre', 'Eau-de-vie', 'Liqueur', 'Cuisine']
  for (const catName of categories) {
    await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    })
  }
  console.log(`✓ ${categories.length} catégories créées`)

  const settings = [
    { key: 'adresse', value: 'Chemin du Vulcain, Aubonne, Suisse' },
    { key: 'email', value: 'commandes@cidrerie-vulcain.ch' },
    { key: 'telephone', value: '' },
    { key: 'texte_accueil', value: 'Bienvenue à la Cidrerie du Vulcain' },
  ]
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log(`✓ ${settings.length} paramètres initialisés`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Étape 2 : Lancer le seed**

```bash
npm run db:seed
```

Résultat attendu :
```
✓ Admin créé : admin@cidrerie-vulcain.ch
✓ 4 catégories créées
✓ 4 paramètres initialisés
```

- [ ] **Étape 3 : Tester la connexion complète**

1. Lancer `npm run dev`
2. Aller sur `http://localhost:3000/admin`
3. Vérifier la redirection vers `/admin/login`
4. Se connecter avec `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`
5. Vérifier la redirection vers `/admin`
6. Attendre 28 minutes (ou modifier `maxAge` temporairement à 180s pour tester)
7. Vérifier l'apparition de la modale `SessionWatcher` à T-2min
8. Cliquer "Prolonger" → vérifier que la session est réinitialisée

- [ ] **Étape 4 : Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: Seed DB — admin initial, catégories, paramètres"
```

---

## Task 13 : Push develop et vérification finale

- [ ] **Étape 1 : Vérifier qu'il n'y a pas d'erreurs TypeScript ou lint**

```bash
npx tsc --noEmit
npm run lint
```

Résultat attendu : aucune erreur.

- [ ] **Étape 2 : Vérifier le build de production**

```bash
npm run build
```

Résultat attendu : `✓ Compiled successfully`

- [ ] **Étape 3 : Pousser sur `develop`**

```bash
git push origin develop
```

- [ ] **Étape 4 : Vérification finale**

| Test | Résultat attendu |
|---|---|
| `GET /admin` sans session | Redirection → `/admin/login` |
| `GET /admin/login` connecté | Redirection → `/admin` |
| Login avec mauvais mdp | Message d'erreur visible |
| Login avec bon mdp | Redirection → `/admin`, session 30min |
| Session < 2min | Modale SessionWatcher visible |
| Clic "Prolonger" | Session réinitialisée, modale fermée |
| `POST /api/commandes` sans token Turnstile | HTTP 403 |
| `POST /api/commandes` avec champ honeypot rempli | HTTP 201 silencieux |
| `POST /api/commandes` > 5 fois / 10min même IP | HTTP 429 |
