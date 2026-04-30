# Cidrerie du Vulcain — Site de commande en ligne

Site de commande en ligne pour la [Cidrerie du Vulcain](https://cidrerie-vulcain.ch) (Aubonne, Suisse).  
Développé par **Hugo Baeriswyl** (Zweikow).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| Authentification | NextAuth.js v5 (beta) — JWT 30 min |
| Base de données | PostgreSQL via Prisma v6 |
| Anti-bots | Cloudflare Turnstile (invisible) + honeypot + rate limiting |
| Rate limiting | Upstash Redis |
| Validation | Zod v4 |
| Emails | EmailJS |
| Hébergement | Non décidé (Vercel / Infomaniak) |

---

## Fonctionnalités

### Site client
- Catalogue de produits (cidres, eaux-de-vie, liqueurs, cuisine)
- Panier avec calcul automatique des totaux
- Formulaire de commande avec validation
- Protection anti-bots : Turnstile invisible + honeypot + rate limiter (5 cmd / 10 min / IP)

### Panel d'administration (`/admin`)
- Authentification sécurisée (email + mot de passe bcrypt, JWT httpOnly)
- Avertissement d'expiration de session 2 min avant timeout
- Dashboard, gestion des commandes, catalogue, paramètres *(en cours)*

---

## Installation locale

### Prérequis

- Node.js ≥ 20.9
- PostgreSQL (Railway ou Infomaniak)
- Compte Cloudflare Turnstile
- Compte Upstash Redis

### 1. Cloner et installer

```bash
git clone https://github.com/Zweikow/Vulcain.ch.git
cd Vulcain.ch
git checkout develop
npm install
```

### 2. Variables d'environnement

Copier et remplir `.env.local` :

```bash
cp .env.local.example .env.local  # ou créer manuellement
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL (`postgresql://...`) |
| `NEXTAUTH_SECRET` | Secret JWT (min. 32 caractères) |
| `NEXTAUTH_URL` | URL de base (`http://localhost:3000`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clé publique Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Clé secrète Cloudflare Turnstile |
| `UPSTASH_REDIS_REST_URL` | URL REST Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash Redis |
| `SEED_ADMIN_EMAIL` | Email du compte admin initial |
| `SEED_ADMIN_PASSWORD` | Mot de passe admin initial |
| `SEED_ADMIN_NAME` | Nom affiché de l'admin |

### 3. Base de données

```bash
npm run db:migrate   # Appliquer les migrations
npm run db:seed      # Créer l'admin + catégories + paramètres
```

### 4. Démarrer

```bash
npm run dev
```

→ `http://localhost:3000` — site client  
→ `http://localhost:3000/admin` — panel admin (redirige vers `/admin/login`)

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | Vérification ESLint |
| `npm run db:migrate` | Appliquer les migrations Prisma |
| `npm run db:seed` | Peupler la DB (admin + données initiales) |
| `npm run db:studio` | Interface Prisma Studio |

---

## Structure du projet

```
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # Layout admin (SessionProvider)
│   │   ├── login/page.tsx      # Page de connexion
│   │   └── page.tsx            # Dashboard admin
│   ├── api/
│   │   ├── auth/[...nextauth]/ # Handler NextAuth
│   │   └── commandes/          # API soumission commande
│   └── page.tsx                # Page catalogue
├── components/
│   ├── admin/
│   │   └── SessionWatcher.tsx  # Modale expiration session
│   ├── OrderForm.tsx           # Formulaire de commande
│   └── TurnstileWidget.tsx     # Widget CAPTCHA invisible
├── lib/
│   ├── auth.ts                 # Config NextAuth (Credentials + bcrypt)
│   ├── prisma.ts               # Singleton Prisma client
│   ├── ratelimit.ts            # Rate limiter Upstash
│   ├── turnstile.ts            # Vérification token Turnstile
│   └── validations.ts          # Schémas Zod
├── prisma/
│   ├── schema.prisma           # Schéma DB (User, Product, Order, ...)
│   └── seed.ts                 # Seed initial
├── auth.config.ts              # Config NextAuth edge-compatible
└── middleware.ts               # Protection routes /admin/*
```

---

## Workflow Git

```
develop  →  (MR)  →  sandbox  →  (MR)  →  main
```

| Branche | Rôle | Push direct |
|---|---|---|
| `main` | Production | ❌ MR uniquement |
| `sandbox` | Démo client | ❌ MR depuis develop |
| `develop` | Développement | ✅ |

**Conventions :** messages de commit en français.

---

## Domaines

| Domaine | Usage | Hébergeur actuel |
|---|---|---|
| `cidrerie-vulcain.ch` | Site principal | Infomaniak |
| `vulcain.ch` | Alias / redirect | GitHub Pages |

---

## Licence

Développé pour la Cidrerie du Vulcain. Tous droits réservés.
