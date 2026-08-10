# Cidrerie du Vulcain — Contexte Projet

## Présentation

Site de commande en ligne pour la **Cidrerie du Vulcain** (vulcain.ch / cidrerie-vulcain.ch).
Développé par **Hugo Baeriswyl** (Zweikow) — développeur solo sur ce projet.

Le client (la cidrerie) doit pouvoir gérer ses articles, prix et commandes de
manière autonome, sans passer par le développeur. Cette autonomie est assurée par
le back-office Next.js sur mesure (catalogue, commandes, paramètres).

## État actuel du projet

### Site statique (production actuelle — à remplacer)

- Hébergé sur **Infomaniak** (`cidrerie-vulcain.ch`) + GitHub Pages (`vulcain.ch`)
- Commandes reçues par email via **EmailJS** → `commandes@cidrerie-vulcain.ch`

### App NextJS (branche `develop` — en développement)

- Code à la racine du repo sur `develop`
- Contient : page catalogue, panier, formulaire commande, back-office `/admin`
  avec auth NextAuth v5 (credentials + bcrypt), dashboard, liste des commandes,
  dark mode
- **Note** : le passage à Strapi v5 annoncé précédemment n'a pas eu lieu — le
  backend est Prisma + PostgreSQL en direct avec un admin sur mesure, ce qui
  couvre l'objectif d'autonomie du client. Les mentions Strapi dans
  `docs/user-stories/` sont à lire comme « l'API interne ».
- Refonte UI/UX en cours d'après les maquettes **Stitch** et `docs/DESIGN.md`

## Stack technique

| Couche             | Technologie                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Frontend + Backend | Next.js 15 (App Router) + TypeScript + Tailwind CSS                                           |
| ORM                | Prisma                                                                                        |
| Base de données    | PostgreSQL                                                                                    |
| Auth admin         | NextAuth v5 (credentials, JWT httpOnly)                                                       |
| Emails             | EmailJS (actuel) — SES envisagé avec l'hébergement AWS                                        |
| Hébergement        | À décider — proposition : AWS `eu-central-2` Zurich (nLPD), voir `docs/architecture-cible.md` |
| Domaine            | `cidrerie-vulcain.ch` / `vulcain.ch`                                                          |

## Règles métier (source : docs/DESIGN.md — s'appliquent à tout nouveau code)

- **Montants en centimes entiers** pour tout calcul. Le schéma actuel est en
  `Decimal(10,2)` ; aucun calcul flottant côté application, migration vers des
  centimes `Int` prévue.
- **Le total est recalculé côté serveur** : prix depuis la base, tarif pro depuis
  la fiche client, port depuis `Setting`. Jamais de montant en dur (les 10 CHF
  dans `Cart.tsx` / `OrderForm.tsx` sont un bug connu à résorber).
- **Le prix pro est dérivé** d'un taux unique dans `Setting`, jamais saisi ni
  stocké par produit. Le tarif pro appartient au client, pas à la commande.
- **Port offert** aux professionnels et dès le seuil de franco (paramétrable).
- **TVA 8.1% incluse** dans les prix affichés, détaillée pour information.
- **Stock** : borne les quantités côté boutique, décrémenté dans une transaction
  Prisma à la création de commande, tracé (`StockMovement` à ajouter au schéma).
- **Numérotation par séries distinctes**, concurrente-sûre via `DocumentCounter`
  (jamais `order.count()`), remise à zéro chaque année :
  - `CMD-AAAA-NNNN` — la commande, attribuée à la prise de commande ;
  - `FAC-AAAA-NNNN` — la facture, attribuée **seulement à son émission**, pour
    qu'une commande annulée ne laisse pas de trou dans la série comptable ;
  - `AV-AAAA-NNNN` — les avoirs, série réservée, pas encore implémentée.
    Un numéro émis est définitif. L'émission est idempotente et se déclenche
    automatiquement à l'expédition si l'exploitant ne l'a pas faite avant.
- **Référence de paiement ISO 11649** (« référence RF ») dérivée du numéro de
  facture, dans `lib/reference.ts` — validée contre l'exemple officiel de la
  norme. Elle fonctionne avec un IBAN classique ; ne pas la confondre avec la
  référence QRR, qui exige un QR-IBAN et 27 chiffres.
- **Un produit cité dans une commande ne se supprime pas** : archivage.
- **Vente d'alcool** : case « 18 ans révolus » bloquante, mention d'interdiction
  aux mineurs en pied de boutique et sur la facture.

## Design

Référence complète : `docs/DESIGN.md` (palette, typographie Fraunces / Plus
Jakarta Sans, rayons, statuts, écrans). Maquettes Stitch dans
`C:\Users\Hugo0\Downloads\stitch_plateforme_e_commerce_cidrerie_vulcain\`.
Points non négociables : texte `#153243` sur les boutons verts (jamais blanc),
deux fonds seulement (`#F7F6F0` pages, `#153243` sidebar/en-tête), montants en
`tabular-nums`, français au vouvoiement sans point d'exclamation.

## Panel d'administration

User Stories complètes : `docs/user-stories/2026-04-28-admin-panel-user-stories.md`

### Épopées et priorités

- **Dashboard** : commandes du mois (US-01), graphique CA (US-02), top produits (US-03)
- **Commandes** : vue ticket (US-04), liste filtrée (US-05), recherche client (US-06)
- **Catalogue** : alerte stock bas (US-07), ajout/édition produit (US-08), catégories (US-09)
- **UX** : confirmation suppression (US-10), responsive mobile (US-11)
- **Sécurité** : auth JWT httpOnly (US-12 — fait), paramétrage cidrerie (US-13)

### Priorités hautes (à faire en premier)

US-12 (auth — fait) → US-01 (dashboard) → US-04/05 (commandes) → US-07 (stock)

## Workflow Git (en place)

### Branches

| Branche   | Rôle                                     | Push direct          |
| --------- | ---------------------------------------- | -------------------- |
| `main`    | Production — protégée                    | ❌ MR uniquement     |
| `sandbox` | Démo client + expérimentation — protégée | ❌ MR depuis develop |
| `develop` | Intégration — seule branche où on code   | ✅                   |

### Flow

```
[local] → push → develop → MR → sandbox → MR → main
```

### Règles GitHub (configurées)

- `main` : branch protection, require pull request
- `sandbox` : branch protection, require pull request
- `develop` : push direct autorisé pour Zweikow

## Domaines et hébergement

| Domaine               | Usage            | Hébergeur            |
| --------------------- | ---------------- | -------------------- |
| `cidrerie-vulcain.ch` | Site principal   | Infomaniak           |
| `vulcain.ch`          | Alias / redirect | GitHub Pages (CNAME) |

## Conventions

- Messages de commit en **français**
- Pas de push direct sur `main`
- Les MR passent toujours par : `develop → sandbox → main`
- Un seul développeur actif (Zweikow)
- Hooks husky + lint-staged actifs (eslint --fix, prettier)

## Documents clés

| Document                          | Chemin                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| Référence design et règles métier | `docs/DESIGN.md`                                                            |
| Architecture cible (DB, AWS)      | `docs/architecture-cible.md`                                                |
| User Stories admin                | `docs/user-stories/2026-04-28-admin-panel-user-stories.md`                  |
| Spec workflow Git                 | `docs/superpowers/specs/2026-04-28-git-workflow-nextjs-migration-design.md` |
| Plan migration                    | `docs/superpowers/plans/2026-04-28-git-workflow-nextjs-migration.md`        |
