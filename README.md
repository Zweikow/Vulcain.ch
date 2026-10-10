# Drinkcider - Boutique en ligne et gestion commerciale

Application web de vente en ligne et interface d'administration pour [Drinkcider](https://drinkcider.ch) (Les Paccots, Suisse).  
Developpe par Hugo Baeriswyl (Zweikow).

Toute la documentation operationnelle et technique est centralisee sur le **Wiki GitLab** du projet :  
`http://192.168.1.36:8929/homelab/cidrerie-vulcain/-/wikis/home`

---

## Stack technique

| Composant                       | Technologie                                                                                    |
| :------------------------------ | :--------------------------------------------------------------------------------------------- |
| **Framework Web**               | Next.js 15 (App Router) + React 19 + TypeScript                                                |
| **Styles**                      | Tailwind CSS + Lucide Icons                                                                    |
| **Authentification**            | Auth.js / NextAuth v5 (session JWT httpOnly, identification par nom d'utilisateur)             |
| **Base de donnees**             | PostgreSQL 16 (AWS RDS Zurich `eu-central-2`), ORM Prisma v6                                   |
| **Deploiement Cloud**           | AWS Serverless via OpenNext et SST v4 (Lambda, CloudFront, S3)                                 |
| **Securite & Anti-robots**      | Cloudflare Turnstile (invisible) + honeypot + rate limiter Upstash Redis                       |
| **Messagerie**                  | Amazon SES (e-mails transactionnels et notifications)                                          |
| **Facturation & Rapprochement** | QR-facture suisse (norme ISO 20022, reference ISO 11649) + import bancaire CAMT.054 / CAMT.053 |
| **Logistique**                  | Generation de bordereaux Planzer et suivi transporteur DPD                                     |
| **Depot & CI/CD**               | GitLab auto-heberge (Homelab) + GitLab CI                                                      |

---

## Fonctionnalites principales

### Boutique en ligne (Vitrine client)

- Catalogue de cuvees et cidres d'auteur suisses avec gestion de stock en temps reel.
- Pages detaillees pour le referencement naturel (produits, categories, producteurs partenaires).
- Panier d'achat avec calcul automatique du franco de port et frais de livraison.
- Formulaire de commande securise avec validation Zod et protection Turnstile.
- Mode maintenance activable a distance depuis l'administration.
- Pages d'information et mentions legales (CGV, confidentialite, mentions legales).

### Interface d'administration (`/admin`)

- **Tableau de bord** : indicateurs de chiffre d'affaires, marges brutes, suivi des encaissements et graphiques de vente.
- **Gestion des commandes** : cycle de vie complet (`A traiter` -> `En preparation` -> `Expediee` ou `Annulee`), assignation d'un preparateur, impression de fiches de prelevement et etiquettes colis.
- **Facturation** : generation de factures A4 avec QR-facture suisse officielle, suivi des delais de paiement, relances par e-mail et enregistrement des reglements.
- **Rapprochement bancaire** : lecture et analyse des fichiers de releves bancaires PostFinance (CAMT.054 et CAMT.053).
- **Catalogue produits** : gestion des fiches, prix public TTC, prix d'achat, seuils d'alerte de stock bas et mise en avant promotionnelle.
- **Categories & Producteurs** : structuration des rayons de la boutique et profils des artisans cidriers.
- **Repertoire clients** : fiches clients, historique des achats et attribution de remises professionnelles personnalisees.
- **Outils marketing** : generateur de visuels JPEG optimises pour les publications Instagram (format 4:5).
- **Journal d'audit** : tracabilite complete de toutes les actions sensibles (changements de statut, annulations, suppressions, emission de factures, modifications tarifaires).

---

## Roles et permissions

L'application integre un controle d'acces base sur trois roles (`lib/permissions.ts`) :

1. **ADMIN** (Administrateur) :
   - Acces total a l'application.
   - Gestion des comptes utilisateurs et attribution des roles.
   - Configuration des reglages generaux (coordonnees, IBAN, frais de port, franco, TVA, mode maintenance).
   - Consultation du journal d'audit d'activite.
2. **GESTIONNAIRE** :
   - Pilotage des commandes, de la facturation et du suivi client.
   - Gestion complete du catalogue (produits, categories, producteurs, promotions).
   - Bascule du statut tarifaire des commandes (particulier / professionnel).
   - Annulation et suppression des commandes non facturees.
   - Pas d'acces aux parametres generaux, aux comptes utilisateurs ni au journal d'audit.
3. **PREPARATEUR** :
   - Preparation logistique des colis en cave.
   - Progression du statut des commandes et assignation.
   - Consultation et impression des factures.
   - Enregistrement des paiements (especes, TWINT, virement) et envoi des rappels.
   - Pas d'acces au tableau de bord, a la modification du catalogue ni a l'annulation de commandes.

---

## Installation et developpement local

### Prerequis

- Node.js >= 20.9
- PostgreSQL (instance locale ou instance AWS RDS de developpement)
- Cles API Cloudflare Turnstile, Upstash Redis et identifiants AWS SES

### 1. Cloner le depot

```bash
git clone http://192.168.1.36:8929/homelab/cidrerie-vulcain.git
cd cidrerie-vulcain
git checkout develop
npm ci
```

### 2. Configuration des variables d'environnement

Creer un fichier `.env` a la racine du projet (se referer a `.env.example`) :

```env
DATABASE_URL="postgresql://utilisateur:mot_de_passe@localhost:5432/drinkcider?schema=public"
NEXTAUTH_SECRET="votre_cle_secrete_jwt_32_caracteres"
NEXTAUTH_URL="http://localhost:3000"

NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAA..."
TURNSTILE_SECRET_KEY="0x4AAAAAA..."

UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

AWS_REGION="eu-central-2"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

### 3. Base de donnees Prisma

```bash
# Generer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev

# Peupler la base avec les donnees initiales (admin, categories, reglages)
npm run db:seed
```

### 4. Lancement de l'application

```bash
npm run dev
```

- Boutique client : `http://localhost:3000`
- Espace d'administration : `http://localhost:3000/admin`

---

## Scripts utiles

| Commande             | Role                                        |
| :------------------- | :------------------------------------------ |
| `npm run dev`        | Demarre le serveur de developpement Next.js |
| `npm run build`      | Compile l'application pour la production    |
| `npm run lint`       | Lance la validation ESLint                  |
| `npx tsc --noEmit`   | Verifie l'integrite du typage TypeScript    |
| `npm run db:migrate` | Applique les migrations de base de donnees  |
| `npm run db:seed`    | Reinitialise les donnees de base            |
| `npm run db:studio`  | Ouvre l'explorateur visuel Prisma Studio    |

---

## Cycle de deploiement (GitLab CI)

Le projet suit le workflow Git :

```
develop (Dev automatique)  ->  sandbox (Demo client)  ->  main (Production manuelle)
```

- **`develop`** : Deploiement automatique sur `https://dev.drinkcider.ch`.
- **`sandbox`** : Deploiement sur `https://sandbox.drinkcider.ch` pour validation fonctionnelle.
- **`main`** : Deploiement manuel declenche par l'administrateur sur `https://drinkcider.ch`.

Les pipelines GitLab CI comprennent :

1. `validate` : verification TypeScript, Prisma et build Next.js.
2. `deploy_*` : deploiement de l'infrastructure serverless via SST.
3. `verify_*` : tests de sante automatises post-deploiement (`/api/version`, `/api/health`).
4. `finops` : arret et redemarrage planifies des instances RDS de test.

---

## Licence et propriete

Projet concu et developpe pour Drinkcider (Cidrerie du Vulcain). Tous droits reserves.
