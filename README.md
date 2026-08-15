# Cidrerie du Vulcain — Site de commande en ligne

Site de commande en ligne pour la [Cidrerie du Vulcain](https://cidrerie-vulcain.ch) (Aubonne, Suisse).  
Développé par **Hugo Baeriswyl** (Zweikow).

---

## Stack technique

| Couche           | Technologie                                                 |
| ---------------- | ----------------------------------------------------------- |
| Frontend         | Next.js 15 (App Router) + TypeScript + Tailwind CSS         |
| Authentification | NextAuth.js v5 (beta) — JWT 30 min                          |
| Base de données  | PostgreSQL via Prisma v6                                    |
| Anti-bots        | Cloudflare Turnstile (invisible) + honeypot + rate limiting |
| Rate limiting    | Upstash Redis                                               |
| Validation       | Zod v4                                                      |
| Emails           | Amazon SES                                                  |
| Hébergement      | AWS (OpenNext + SST) _(en projet)_                          |
| Dépôt Code       | ForgeJo (Homelab) privé                                     |

---

## Fonctionnalités

### Site client

- Catalogue de produits dynamiques (cidres, eaux-de-vie, liqueurs, cuisine)
- Gestion des stocks en temps réel
- Panier avec calcul automatique des totaux
- Formulaire de commande avec validation
- Protection anti-bots : Turnstile invisible + honeypot + rate limiter (5 cmd / 10 min / IP)
- Pages légales (CGV, Mentions légales, Confidentialité)

### Panel d'administration (`/admin`)

- Authentification sécurisée (email + mot de passe bcrypt, JWT httpOnly)
- 3 niveaux d'accès : **Administrateur** (tout), **Gestionnaire** (catalogue/commandes), **Préparateur** (préparation, pick-list)
- Dashboard avec KPIs de ventes et calcul de marges brutes (prix d'achat vs prix de vente)
- Export CSV mensuel pour la comptabilité (décompte d'achats)
- Gestion des commandes (statuts, annulations, retours en stock)
- Édition complète du catalogue produits (prix, stock, alertes de stock bas, marges)
- Génération de factures A4 imprimables avec référence ISO 11649

---

## Installation locale

### Prérequis

- Node.js ≥ 20.9
- PostgreSQL (AWS RDS ou local)
- Compte Cloudflare Turnstile
- Compte Upstash Redis
- AWS CLI configuré pour SES

### 1. Cloner et installer

```bash
git clone http://100.78.17.97:3001/zweikow/cidrerie-vulcain.git
cd cidrerie-vulcain
git checkout develop
npm install
```

### 2. Variables d'environnement

Copier et remplir `.env.local` :

```bash
cp .env.local.example .env.local
```

| Variable                         | Description                           |
| -------------------------------- | ------------------------------------- |
| `DATABASE_URL`                   | URL PostgreSQL (`postgresql://...`)   |
| `NEXTAUTH_SECRET`                | Secret JWT (min. 32 caractères)       |
| `NEXTAUTH_URL`                   | URL de base (`http://localhost:3000`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clé publique Cloudflare Turnstile     |
| `TURNSTILE_SECRET_KEY`           | Clé secrète Cloudflare Turnstile      |
| `UPSTASH_REDIS_REST_URL`         | URL REST Upstash Redis                |
| `UPSTASH_REDIS_REST_TOKEN`       | Token Upstash Redis                   |
| `SEED_ADMIN_EMAIL`               | Email du compte admin initial         |
| `SEED_ADMIN_PASSWORD`            | Mot de passe admin initial            |
| `SEED_ADMIN_NAME`                | Nom affiché de l'admin                |

### 3. Base de données

```bash
npm run db:migrate   # Appliquer les migrations
npm run db:seed      # Créer l'admin + catégories + paramètres par défaut
```

### 4. Démarrer

```bash
npm run dev
```

→ `http://localhost:3000` — site client  
→ `http://localhost:3000/admin` — panel admin (redirige vers `/admin/login`)

---

## Scripts disponibles

| Commande             | Description                               |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Serveur de développement                  |
| `npm run build`      | Build de production                       |
| `npm run lint`       | Vérification ESLint                       |
| `npm run db:migrate` | Appliquer les migrations Prisma           |
| `npm run db:seed`    | Peupler la DB (admin + données initiales) |
| `npm run db:studio`  | Interface Prisma Studio                   |

---

## Structure du projet

```
├── app/
│   ├── admin/                # Back-office (layout, login, dashboard, commandes, produits, etc.)
│   ├── api/
│   │   ├── auth/[...nextauth]/ # Handler NextAuth
│   │   ├── commandes/          # API soumission commande
│   │   └── admin/export-achats/# Export CSV
│   └── page.tsx              # Page catalogue client
├── components/
│   ├── admin/                # Composants spécifiques à l'admin (sidebar, modales, etc.)
│   ├── OrderForm.tsx         # Formulaire de commande client
│   └── TurnstileWidget.tsx   # Widget CAPTCHA invisible
├── lib/
│   ├── auth.ts               # Config NextAuth (Credentials + bcrypt)
│   ├── prisma.ts             # Singleton Prisma client
│   ├── permissions.ts        # Gestion des accès selon le rôle (RBAC)
│   ├── guards.ts             # Fonctions de vérification des droits
│   └── validations.ts        # Schémas Zod
├── prisma/
│   ├── schema.prisma         # Schéma DB complet
│   └── seed.ts               # Données de base
├── auth.config.ts            # Config NextAuth
└── middleware.ts             # Protection routes /admin/*
```

---

## Workflow Git

```
develop  →  (MR)  →  sandbox  →  (MR)  →  main
```

| Branche   | Rôle          | Push direct          |
| --------- | ------------- | -------------------- |
| `main`    | Production    | ❌ MR uniquement     |
| `sandbox` | Démo client   | ❌ MR depuis develop |
| `develop` | Développement | ✅                   |

**Conventions :** messages de commit en français.

---

## Licence

Développé pour la Cidrerie du Vulcain. Tous droits réservés.
