# Mise en route — Base PostgreSQL sur AWS (étape 1)

Objectif : remplacer Supabase par une base PostgreSQL dans la région
**eu-central-2 (Zurich)**, utilisée dès le développement local. Durée réaliste :
une petite soirée, compte AWS compris.

## 1. Compte AWS (à faire toi-même, ~20 min)

1. Créer le compte sur aws.amazon.com (email + carte bancaire).
2. **Activer la MFA sur le compte root** immédiatement.
3. Créer ton utilisateur admin via **IAM Identity Center** (pas d'utilisateur
   IAM classique : Identity Center = identifiants temporaires, pas de clés
   statiques, et c'est le modèle utilisé en entreprise) :
   - Console → IAM Identity Center → **Enable** (l'Organization créée au
     passage est normale) ; région de l'annuaire : Zurich si proposée.
   - **Users → Add user** (`hugo` + ton email) → invitation par email →
     mot de passe + **MFA**.
   - **Permission sets → Create** → prédéfini **AdministratorAccess**.
   - **AWS accounts** → ton compte → **Assign users** → `hugo` +
     AdministratorAccess.
   - Mettre en favori l'**URL du portail d'accès** (`d-xxxx.awsapps.com/start`) :
     c'est ta connexion quotidienne. Root ne ressert que pour la facturation.
   - CLI plus tard : `aws configure sso` (connexion par navigateur, zéro clé).
4. **AWS Budgets** : créer un budget mensuel (p. ex. 20 USD) avec alerte email à
   50% et 80%. À faire avant toute ressource — c'est le filet de sécurité.
5. Vérifier les crédits offerts (nouveau free tier = crédits valables ~6 mois).

Note : la base RDS (§2–4) ne dépend pas d'Identity Center — Prisma s'y connecte
par `DATABASE_URL` (utilisateur/mot de passe PostgreSQL), pas par IAM.

## 2. Créer la base (console, ~15 min)

Console → **RDS** → région **Europe (Zurich) eu-central-2** → Create database :

| Réglage                          | Valeur                                                |
| -------------------------------- | ----------------------------------------------------- |
| Creation method                  | Standard create                                       |
| Engine                           | PostgreSQL (version 16 ou 17)                         |
| Template                         | **Dev/Test** (ou Free tier si proposé)                |
| Instance                         | **db.t4g.micro**                                      |
| Storage                          | gp3, 20 Go, autoscaling désactivé                     |
| Multi-AZ                         | Non (dev)                                             |
| Public access                    | **Yes** (dev uniquement — voir §4)                    |
| VPC security group               | Créer `vulcain-db-dev`                                |
| Master username                  | `vulcain`                                             |
| Master password                  | Généré, stocké dans ton gestionnaire de mots de passe |
| Database name (options avancées) | `vulcain`                                             |
| Backups                          | 7 jours                                               |
| Deletion protection              | Oui                                                   |

Alternative moins chère si la base ne sert que quelques heures par semaine :
**Aurora Serverless v2** min 0 ACU (pause automatique, réveil ~15 s). Le wizard
est un peu plus touffu ; RDS classique est le chemin le plus simple pour un
premier contact, et le plus représentatif de ce qu'on croise en entreprise.

## 3. Ouvrir l'accès depuis ta machine

Security group `vulcain-db-dev` → Inbound rules → Edit :

- Type : PostgreSQL (5432) · Source : **My IP**

Ton IP change parfois (DHCP opérateur) : si la connexion échoue un matin,
c'est en général ça — remettre à jour la règle. (Plus tard, exercice utile :
remplacer l'accès public par un tunnel SSM.)

## 4. Brancher le projet

Dans `C:\dev\Vulcain.ch\.env` (jamais commité) :

```
DATABASE_URL="postgresql://vulcain:MOT_DE_PASSE@ENDPOINT_RDS:5432/vulcain?sslmode=require"
```

L'endpoint est affiché sur la page de l'instance RDS (onglet Connectivity).

Puis :

```bash
npx prisma migrate dev --name v2-centimes
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Boutique sur http://localhost:3000, admin sur http://localhost:3000/admin
(identifiants du seed : `admin@cidrerie-vulcain.ch` / `changeme123` — à changer).

## 5. Vérifications de fin d'étape

- [ ] Une commande passée depuis la boutique locale apparaît dans l'admin
- [ ] Le stock du produit commandé a diminué (et un `StockMovement` existe)
- [ ] Le numéro suit le format `CMD-2026-0001`, `0002`, …
- [ ] Le total enregistré = sous-total + port (10 CHF sous 120 CHF d'achat)
- [ ] L'alerte AWS Budgets est bien en place

## Étapes suivantes (rappel de la feuille de route)

1. ✅ Base AWS Zurich ← tu es ici
2. Dev local : catalogue branché sur la base, écrans Stitch, édition produit
3. S3 photos produits (avec l'édition produit) · SES (avec les emails)
4. Déploiement SST/OpenNext (URL de démo pour la branche sandbox)
5. Route 53 + bascule de `cidrerie-vulcain.ch`
