# Architecture cible — Cidrerie du Vulcain

## 1. Choix de la base de données

### Critères (issus de DESIGN.md et du métier)

1. Transactions ACID — décrément de stock et création de commande atomiques.
2. Compteurs sûrs en concurrence pour la numérotation `CMD-AAAA-NNNN`.
3. Modèle relationnel net : commandes ↔ lignes ↔ produits ↔ clients, agrégations
   pour les statistiques (CA par période, meilleures ventes, picking).
4. Support Prisma de premier ordre.
5. **Données clients hébergées en Suisse** (nLPD) pour la production.
6. Coût faible : boutique artisanale, quelques commandes par jour.

→ **PostgreSQL**, sans ambiguïté. La question n'est pas « quelle base » mais
« hébergée où ».

### Base sur AWS — les deux options

| Option | Service                                                 | Ordre de grandeur (Zurich)                       | Pour                                                                              |
| ------ | ------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| A      | **RDS PostgreSQL** `db.t4g.micro`, gp3 20 Go, Single-AZ | ~25–30 USD/mois, allumée en continu              | Le classique demandé en entreprise ; sauvegardes automatiques, patching géré      |
| B      | **Aurora Serverless v2** min 0 ACU (pause auto)         | quelques USD/mois pour un usage dev intermittent | Facturation à l'usage : la base se met en pause quand tu ne travailles pas dessus |

Les deux vivent dans la région **`eu-central-2` (Zurich)** → nLPD respectée.
Zurich coûte ~10–15% de plus que Francfort ; c'est le prix de la souveraineté.

**Parcours recommandé** : commencer directement sur AWS puisque l'objectif est la
montée en compétences — Aurora Serverless v2 (option B) comme base de dev pour
limiter la facture, puis RDS classique (option A) au moment de la mise en
production, quand la base doit répondre à toute heure. La migration B→A est un
`pg_dump`/`pg_restore`, et c'est en soi un bon exercice.

Points d'apprentissage réels au passage : la base vit dans un **VPC** — pour s'y
connecter depuis la machine de dev, soit l'exposer publiquement avec un
**security group restreint à ton IP** (acceptable en dev), soit passer par un
tunnel **SSM/bastion** (le réflexe pro). Prisma s'en moque : seule l'URL change.

Note budget : depuis mi-2025, le « free tier » AWS des nouveaux comptes est un
système de **crédits (~100–200 USD valables 6 mois)** et non plus 12 mois de
services gratuits — à vérifier à la création du compte et à surveiller avec un
**AWS Budget + alerte** dès le premier jour.

Alternatives hors AWS conservées pour mémoire : Neon/Supabase (dev, gratuit),
PostgreSQL managé Infomaniak (prod suisse, moins chère, zéro apprentissage AWS).

## 2. « Le site dans un S3 » — mise au point

**S3 ne sert que des fichiers statiques.** Or l'app Next.js a des routes API
(`/api/commandes`, `/api/admin/*`), de l'auth NextAuth, du rendu serveur et
Prisma : il lui faut un runtime Node. Un bucket S3 seul ne peut donc pas
héberger la nouvelle app — c'était possible pour **l'ancien site statique**
(l'actuel GitHub Pages / Infomaniak), pas pour celle-ci.

En revanche, S3 a bien sa place — trois usages distincts à ne pas confondre :

1. **Assets statiques de l'app** (JS, CSS, images buildées) : servis depuis S3
   derrière CloudFront — c'est exactement ce que font Amplify et OpenNext sous
   le capot (voir ci-dessous).
2. **Photos produits** uploadées depuis le back-office : bucket S3 dédié +
   CloudFront. C'est l'usage « stockage » pur.
3. **L'ancien site statique** pourrait être migré tel quel sur S3 + CloudFront
   en attendant la bascule — bon premier contact avec S3, IAM et CloudFront,
   sans risque.

### Héberger l'app Next.js sur AWS — trois voies

| Voie                        | Services                                                                                        | S3 dedans ?       | Effort / apprentissage                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Amplify Hosting**         | S3 + CloudFront + Lambda, gérés pour toi                                                        | Oui, invisible    | Faible / moyen — CI/CD GitHub intégré, tu ne touches pas l'infra                                                      |
| **OpenNext + SST (ou CDK)** | S3 (statique) + CloudFront (CDN) + Lambda (SSR/API), **que tu déclares toi-même en TypeScript** | Oui, explicite    | Moyen / maximal — c'est l'architecture « le site dans S3 » faite correctement, et la ligne la plus parlante sur un CV |
| **Conteneur**               | App Runner ou ECS Fargate + ALB                                                                 | Non (sauf assets) | Moyen / élevé — Docker, ECR, VPC, la voie « serveur classique »                                                       |

**Recommandé ici : OpenNext + SST.** Coût quasi nul à ce trafic (S3 en centimes,
CloudFront et Lambda largement dans le gratuit permanent), et c'est le chemin qui
enseigne le plus : IAM, CloudFront, Lambda, S3, certificats ACM, Route 53 — en
TypeScript, le langage du projet. Amplify reste la sortie de secours si SST
frustre.

Contrainte nLPD à garder en tête : CloudFront est un CDN mondial — il ne met en
cache que du statique sans donnée personnelle. Le calcul (Lambda) se place en
`eu-central-2` et la base n'en sort pas.

## 3. Cible complète (ordre de mise en place)

1. **Aurora Serverless v2 / RDS PostgreSQL, `eu-central-2`** — la base (§1).
2. **OpenNext + SST** — l'app (boutique + admin) : S3 + CloudFront + Lambda.
3. **S3 + CloudFront** — bucket dédié photos produits, upload depuis l'admin.
4. **SES** — emails transactionnels (confirmation, notification, expédition) en
   remplacement d'EmailJS. Sortie du sandbox à demander tôt.
5. **Route 53 + ACM** — `cidrerie-vulcain.ch` et le certificat TLS.
6. **CloudWatch + AWS Budgets** — alarmes de base (erreurs 5xx, CPU base) et
   alerte de facturation, dès le premier déploiement.
7. Plus tard, si envie : Cognito pour l'auth admin (NextAuth credentials fait
   le travail d'ici là).

## 4. QR-facture suisse (prochaine étape sur la facture)

La facture réserve déjà un carré de 104 px en bas à droite. Passer à la vraie
**QR-facture** (norme SIX, obligatoire depuis octobre 2022 pour remplacer les
bulletins rouges et oranges) demande trois choses :

1. **Le payload Swiss QR Code** — un texte structuré à ~31 lignes : en-tête
   `SPC/0200/1`, IBAN sans espaces, créancier (adresse structurée ou combinée),
   montant et devise, débiteur, type de référence (`NON` sans référence, `QRR`
   avec QR-IBAN et référence structurée), message, `EPD`.
2. **Le rendu** — QR code version 25, correction d'erreur M, avec la **croix
   suisse de 7 mm** obligatoire au centre. Une bibliothèque comme `swissqrbill`
   fait le payload et le dessin en une fois (SVG ou PDF).
3. **La section paiement** — bloc de 210 × 105 mm en bas de page avec récépissé
   de 62 mm, polices et tailles imposées. C'est une mise en page à part entière,
   pas une simple image ajoutée.

Point à trancher avant : l'IBAN actuel (`CH57 0900 …`, PostFinance) est un IBAN
classique → référence `NON`, le client paie sans numéro de référence. Pour un
rapprochement automatique des paiements avec le numéro de commande, il faut
demander un **QR-IBAN** à PostFinance et utiliser une référence `QRR` — c'est ce
qui permettrait de pointer `CMD-2026-0002` avec le virement reçu.

## 5. Décisions notables (rappel)

- **Montants en `Int` centimes partout** — `lib/money.ts` est l'unique endroit
  qui calcule.
- **Numérotation par table `OrderCounter`** (`INSERT … ON CONFLICT … RETURNING`)
  dans la transaction Prisma : garantie de concurrence + remise à zéro annuelle.
- **Statut pro lu en base uniquement** (`Customer.isPro`) : infalsifiable depuis
  le navigateur.
- **Snapshots sur `OrderItem`** : une facture passée ne change jamais.
