# Design : Fondation — PostgreSQL + Prisma + Auth
**Date :** 2026-04-28
**Projet :** Cidrerie du Vulcain — Panel Admin (Sous-projet 1/5)
**Auteur :** Hugo Baeriswyl (Zweikow)
**US couvertes :** US-12 (Connexion sécurisée)

---

## Contexte

Le panel d'administration Next.js utilise actuellement des données hardcodées en mémoire (`lib/data.ts`). Ce sous-projet pose les fondations persistantes : connexion PostgreSQL via Prisma, schéma de données complet, et authentification sécurisée multi-comptes via NextAuth.js v5.

**Stack :**
- Next.js App Router (existant)
- Prisma ORM → PostgreSQL sur Railway
- NextAuth.js v5 (Credentials provider)
- Zod (validation)
- bcrypt (hash mots de passe)

---

## 1. Architecture globale

```
Vercel (Next.js App Router)
  ├── app/admin/*             ← pages protégées
  ├── app/api/auth/*          ← NextAuth.js handlers
  ├── app/api/*               ← Route Handlers (lectures client)
  ├── middleware.ts           ← bloque /admin/* sans session valide
  └── lib/
      ├── prisma.ts           ← client Prisma singleton
      ├── auth.ts             ← config NextAuth.js
      └── validations.ts      ← schémas Zod

Railway (PostgreSQL)
  └── Base de données
      ├── users
      ├── products
      ├── categories
      ├── orders
      ├── order_items
      └── settings
```

**Flux de données :**
```
Browser → middleware.ts → page /admin/* → Server Action → Prisma → PostgreSQL (Railway)
```

**Variables d'environnement :**
```
DATABASE_URL       ← fournie par Railway (format: postgresql://...)
NEXTAUTH_SECRET    ← clé aléatoire 32+ caractères
NEXTAUTH_URL       ← URL Vercel (ex: https://cidrerie-vulcain.vercel.app)
```

---

## 2. Schéma de base de données (Prisma)

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
  password  String   // bcrypt hash
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
  stockSeuil  Int         @default(5)  // seuil alerte stock bas (US-07)
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
  numero      String      @unique  // ex: CMD-2026-0042
  status      OrderStatus @default(A_TRAITER)
  clientName  String
  clientEmail String
  clientPhone String?
  address     String
  npa         String
  city        String
  total       Float
  shippedAt   DateTime?   // rempli automatiquement au passage en EXPEDIEE
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
  unitPrice Float   // snapshot prix au moment de la commande
}

model Setting {
  key   String @id   // ex: "adresse", "email", "telephone"
  value String
}

enum OrderStatus {
  A_TRAITER
  EN_PREPARATION
  EXPEDIEE
}
```

**Décisions de schéma :**
- `stockSeuil` configurable par produit (pas un seuil global) — requis par US-07
- `unitPrice` dans `OrderItem` : snapshot du prix au moment de la commande, invariant aux modifications futures du produit
- `shippedAt` : rempli automatiquement par la Server Action lors du passage au statut `EXPEDIEE`
- `numero` : identifiant lisible généré côté applicatif au format `CMD-YYYY-XXXX`
- `Setting` : clé/valeur flexible, évite les migrations pour chaque nouveau paramètre (US-13)

---

## 3. Authentification (NextAuth.js v5)

### Fichiers

```
lib/auth.ts                            ← config NextAuth
app/api/auth/[...nextauth]/route.ts    ← handler HTTP
app/admin/login/page.tsx               ← page de connexion (exclue du middleware)
middleware.ts                          ← protection /admin/*
prisma/seed.ts                         ← premier compte admin au déploiement
```

### Flux de connexion

```
1. Admin soumet email + mot de passe → /admin/login
2. NextAuth Credentials provider → Prisma → bcrypt.compare()
3. Si OK → JWT signé (NEXTAUTH_SECRET), 30 min
4. JWT stocké en cookie httpOnly + Secure + SameSite=lax
5. À 2 min avant expiration → modale côté client propose de prolonger ou déconnecter
6. Si prolongation → appel NextAuth update() → JWT réinitialisé à 30 min
7. Si refus ou timeout → expiration naturelle → redirection /admin/login
8. Chaque requête /admin/* → middleware vérifie JWT → redirige /admin/login si invalide
```

### Gestion expiration session (30 min + avertissement 2 min)

**Durée JWT :** 30 minutes (maxAge: 1800)

**Avertissement d'expiration :**
- Composant client `SessionWatcher` monté dans `app/admin/layout.tsx`
- Lit `session.expires` via `useSession()` de NextAuth
- Timer JavaScript recalculé à chaque renouvellement
- À T-2 min : affiche une modale avec countdown :
  - Bouton **"Prolonger la session"** → appelle `update()` de NextAuth → JWT réinitialisé à 30 min → modale fermée
  - Bouton **"Se déconnecter"** → `signOut()` → redirection `/admin/login`
  - Si aucune action dans les 2 min → expiration naturelle → redirection automatique

```
Fichier : components/admin/SessionWatcher.tsx (composant client)
```

### Sécurité incluse par NextAuth.js v5

- Cookie `httpOnly` + `Secure` + `SameSite=lax` — inaccessible depuis JavaScript
- Protection CSRF automatique sur toutes les routes auth
- Timing-safe password comparison (protection timing attacks)
- JWT signé avec `NEXTAUTH_SECRET` (HS256)

### Middleware de protection

```ts
// middleware.ts
export { auth as middleware } from '@/lib/auth'
export const config = {
  matcher: ['/admin/:path*']
  // /admin/login est géré par NextAuth et redirige si déjà connecté
}
```

### Seeding initial

`prisma/seed.ts` crée un compte admin par défaut au premier déploiement.
Les identifiants sont passés via variables d'environnement :
```
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
SEED_ADMIN_NAME
```

---

## 4. Structure des fichiers

```
app/
  admin/
    login/page.tsx              ← page publique de connexion
    layout.tsx                  ← layout commun (sidebar, header)
    page.tsx                    ← redirect vers /admin/dashboard
    dashboard/page.tsx          ← US-01, US-02, US-03 (sous-projet 4)
    produits/page.tsx           ← US-07, US-08, US-09 (sous-projet 2)
    commandes/
      page.tsx                  ← US-05, US-06 (sous-projet 3)
      [id]/page.tsx             ← US-04 ticket détail (sous-projet 3)
    parametres/page.tsx         ← US-13 (sous-projet 5)
  api/
    auth/[...nextauth]/route.ts
    produits/route.ts           ← GET liste, POST création
    produits/[id]/route.ts      ← PUT modification, DELETE suppression
    commandes/route.ts          ← GET liste
    commandes/[id]/route.ts     ← PUT mise à jour statut

lib/
  auth.ts                       ← config NextAuth (providers, callbacks, JWT options)
  prisma.ts                     ← singleton Prisma client
  validations.ts                ← schémas Zod partagés
  turnstile.ts                  ← helper vérification token Cloudflare

components/
  admin/
    SessionWatcher.tsx          ← watcher expiration session (modale 2 min)

prisma/
  schema.prisma                 ← schéma complet
  seed.ts                       ← compte admin initial
  migrations/                   ← générées par prisma migrate
```

### Conventions

- **Mutations** : Server Actions uniquement (pas de fetch client vers `/api/`)
- **Lectures temps réel** (dashboard) : Route Handlers `/api/*` pour les composants client
- **Validation** : Zod avant toute écriture en base, côté Server Action
- **Prisma client** : singleton exporté depuis `lib/prisma.ts`, jamais instancié directement

---

## 5. Protection anti-bots (boutique publique)

La boutique publique (formulaire de commande) est exposée aux faux ordres automatisés. Deux couches de protection sont mises en place.

### Cloudflare Turnstile (CAPTCHA invisible)

**Pourquoi Turnstile :** gratuit, sans friction utilisateur (invisible dans 90% des cas), respectueux de la vie privée (pas de tracking Google), intégration native Next.js.

**Flux :**
```
1. Client charge le widget Turnstile sur la page boutique (invisible)
2. Turnstile génère un token côté client
3. Le token est inclus dans le payload de soumission de commande
4. Server Action appelle l'API Cloudflare pour vérifier le token
5. Si token invalide → commande rejetée avec message d'erreur
6. Si token valide → commande traitée normalement
```

**Variables d'environnement à ajouter :**
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY   ← clé publique Cloudflare (côté client)
TURNSTILE_SECRET_KEY             ← clé secrète Cloudflare (côté serveur)
```

**Fichiers concernés :**
```
components/TurnstileWidget.tsx   ← widget côté client
app/api/commandes/route.ts       ← vérification token dans Server Action
lib/turnstile.ts                 ← helper de vérification API Cloudflare
```

### Honeypot (défense secondaire)

Champ caché dans le formulaire de commande, invisible pour les humains, rempli automatiquement par les bots. Si le champ est rempli à la soumission → commande rejetée silencieusement (pas d'erreur visible pour ne pas aider le bot).

```
<input type="text" name="website" style="display:none" tabIndex={-1} autoComplete="off" />
```

### Rate limiting

Maximum 5 tentatives de soumission de commande par IP sur 10 minutes, via middleware Next.js. Implémenté avec `@upstash/ratelimit` + Redis (Railway).

---

## 6. Ce qui n'est pas dans ce scope

- Interface UI des pages admin (sous-projets 2, 3, 4, 5)
- Upload d'images produits (sous-projet 2)
- Logique métier commandes (sous-projet 3)
- Dashboard statistiques (sous-projet 4)
- Déploiement Railway et Vercel (décision d'hébergement non finalisée)
