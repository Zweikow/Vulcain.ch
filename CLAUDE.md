# Cidrerie du Vulcain — Contexte Projet

## Présentation

Site de commande en ligne pour la **Cidrerie du Vulcain** (vulcain.ch / cidrerie-vulcain.ch).
Développé par **Hugo Baeriswyl** (Zweikow) — développeur solo sur ce projet.

Le client (la cidrerie) doit pouvoir gérer ses articles et prix de manière autonome,
sans passer par le développeur. C'est la raison principale du passage à NextJS + Strapi.

## État actuel du projet

### Site statique (production actuelle — à remplacer)
- Hébergé sur **Infomaniak** (`cidrerie-vulcain.ch`) + GitHub Pages (`vulcain.ch`)
- Commandes reçues par email via **EmailJS** → `commandes@cidrerie-vulcain.ch`

### App NextJS (branche `develop` — en développement)
- Code à la racine du repo sur `develop`
- Généré depuis des maquettes Pencil
- Contient : page catalogue, panier, formulaire commande, page admin (`/admin`)
- Backend prévu : **Strapi v5 + PostgreSQL**
- Hébergement : **pas encore décidé**

## Stack technique cible

| Couche | Technologie |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| CMS / Backend | Strapi v5 |
| Base de données | PostgreSQL |
| Emails | EmailJS |
| Hébergement | Non décidé |
| Domaine | `cidrerie-vulcain.ch` / `vulcain.ch` |

## Panel d'administration (en cours de conception)

Interface admin Next.js connectée à Strapi. User Stories complètes dans :
`docs/user-stories/2026-04-28-admin-panel-user-stories.md`

### Épopées et priorités
- **Dashboard** : commandes du mois (US-01), graphique CA (US-02), top produits (US-03)
- **Commandes** : vue ticket (US-04), liste filtrée (US-05), recherche client (US-06)
- **Catalogue** : alerte stock bas (US-07), ajout/édition produit (US-08), catégories (US-09)
- **UX** : confirmation suppression (US-10), responsive mobile (US-11)
- **Sécurité** : auth Strapi JWT httpOnly (US-12), paramétrage cidrerie (US-13)

### Priorités hautes (à faire en premier)
US-12 (auth) → US-01 (dashboard) → US-04/05 (commandes) → US-07 (stock)

## Workflow Git (en place)

### Branches
| Branche | Rôle | Push direct |
|---|---|---|
| `main` | Production — protégée | ❌ MR uniquement |
| `sandbox` | Démo client + expérimentation — protégée | ❌ MR depuis develop |
| `develop` | Intégration — seule branche où on code | ✅ |

### Flow
```
[local] → push → develop → MR → sandbox → MR → main
```

### Règles GitHub (configurées)
- `main` : branch protection, require pull request
- `sandbox` : branch protection, require pull request
- `develop` : push direct autorisé pour Zweikow

## Domaines et hébergement

| Domaine | Usage | Hébergeur |
|---|---|---|
| `cidrerie-vulcain.ch` | Site principal | Infomaniak |
| `vulcain.ch` | Alias / redirect | GitHub Pages (CNAME) |

## Conventions

- Messages de commit en **français**
- Pas de push direct sur `main`
- Les MR passent toujours par : `develop → sandbox → main`
- Un seul développeur actif (Zweikow)

## Documents clés

| Document | Chemin |
|---|---|
| Spec workflow Git | `docs/superpowers/specs/2026-04-28-git-workflow-nextjs-migration-design.md` |
| Plan migration | `docs/superpowers/plans/2026-04-28-git-workflow-nextjs-migration.md` |
| User Stories admin | `docs/user-stories/2026-04-28-admin-panel-user-stories.md` |
