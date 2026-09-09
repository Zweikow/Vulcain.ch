# Spécifications & User Stories — Cidrerie du Vulcain

> **Projet :** Site vitrine, boutique en ligne et interface de gestion pour la [Cidrerie du Vulcain](https://cidrerie-vulcain.ch)  
> **Stack technique :** Next.js (App Router) · Prisma ORM · PostgreSQL · TailwindCSS · NextAuth.js · AWS (SST Ion, Lambda, S3, CloudFront) · GitLab CI/CD  
> **Dernière mise à jour :** Septembre 2026

---

## Sommaire

1. [Épopée 1 — Boutique Publique & Expérience Client](#1-épopée-1--boutique-publique--expérience-client)
2. [Épopée 2 — Prise de Commande & Paiement](#2-épopée-2--prise-de-commande--paiement)
3. [Épopée 3 — Informations Légales, Histoire & Identité](#3-épopée-3--informations-légales-histoire--identité)
4. [Épopée 4 — Administration : Gestion des Commandes](#4-épopée-4--administration--gestion-des-commandes)
5. [Épopée 5 — Administration : Facturation & Expédition (BL)](#5-épopée-5--administration--facturation--expédition-bl)
6. [Épopée 6 — Administration : Catalogue, Stocks & Catégories](#6-épopée-6--administration--catalogue-stocks--catégories)
7. [Épopée 7 — Administration : Clients & Tarifs Professionnels](#7-épopée-7--administration--clients--tarifs-professionnels)
8. [Épopée 8 — Administration : Dashboard, Journal & Rôles](#8-épopée-8--administration--dashboard-journal--rôles)
9. [Épopée 9 — Infrastructure, DevOps & Sécurité](#9-épopée-9--infrastructure-devops--sécurité)

---

## 1. Épopée 1 — Boutique Publique & Expérience Client

### US-PUB-01 — Consultation du catalogue et des cuvées

**En tant que** visiteur ou amateur de cidre,  
**je veux** consulter le catalogue des cidres, poirés et eaux-de-vie par catégorie avec leurs caractéristiques (millésime, bio, vegan, description, prix unitaire en CHF),  
**afin de** découvrir les créations artisanales de la cidrerie et choisir les bouteilles qui m'intéressent.

**Critères d'acceptation :**

- [x] Regroupement clair par catégorie ordonnée (Cidres, Poirés, Eaux-de-vie, etc.).
- [x] Fiche produit avec nom, millésime, description, volume d'alcool, prix TTC en CHF.
- [x] Badges distinctifs : « Nouveau », « Bio », « Vegan », et « Dernières bouteilles » si stock critique.
- [x] Masquage automatique des produits inactifs ou archivés.
- [x] Modale de détail produit avec grand visuel et notes de dégustation.

### US-PUB-02 — Gestion du panier d'achat en temps réel

**En tant que** client de la boutique,  
**je veux** ajouter, ajuster ou retirer des bouteilles de mon panier d'achat avec mise à jour immédiate des montants,  
**afin de** préparer ma commande simplement.

**Critères d'acceptation :**

- [x] Sélecteur de quantité rapide (+ / -) directement depuis la carte produit.
- [x] Impossibilité de sélectionner une quantité supérieure au stock disponible.
- [x] Panier persistant ou dynamique avec calcul du sous-total.
- [x] Affichage clair des frais de livraison et du palier franco de port (gratuité au-delà d'un seuil).

### US-PUB-03 — Mode Sombre (Dark Mode) et Responsive Design

**En tant qu'** utilisateur sur smartphone, tablette ou ordinateur,  
**je veux** basculer entre le mode clair et le mode sombre et profiter d'une mise en page adaptée à mon écran,  
**afin d'** avoir un confort de lecture optimal quel que soit mon appareil.

**Critères d'acceptation :**

- [x] Détection automatique de la préférence système (`prefers-color-scheme`).
- [x] Bouton de bascule fluide persistant dans le `localStorage`.
- [x] Navigation mobile avec menu hamburger escamotable.
- [x] Palette de couleurs respectant la charte graphique de la cidrerie en clair et en sombre.

---

## 2. Épopée 2 — Prise de Commande & Paiement

### US-PUB-04 — Formulaire de commande sécurisé

**En tant que** client prêt à commander,  
**je veux** saisir mes coordonnées de livraison (Nom, Prénom, Adresse, NPA, Ville, Email, Téléphone),  
**afin de** faire livrer ma commande chez moi en Suisse.

**Critères d'acceptation :**

- [x] Validation stricte des données (NPA à 4 chiffres suisses, email valide, champs obligatoires).
- [x] Confirmation obligatoire d'avoir 18 ans révolus (vente d'alcool interdite aux mineurs).
- [x] Champ optionnel pour date de livraison souhaitée et instructions de livraison.
- [x] Case à cocher d'abonnement aux communications de la cidrerie.
- [x] Protection invisible anti-bot par Cloudflare Turnstile et champ honeypot anti-spam.

### US-PUB-05 — Recalcul intégral et sécurisé côté serveur

**En tant qu'** exploitant de la cidrerie,  
**je veux** que tous les prix, remises, frais de port et stocks soient recalculés strictement sur le serveur lors de la soumission,  
**afin d'** éviter toute manipulation des prix ou commandes de produits hors stock par des robots.

**Critères d'acceptation :**

- [x] Aucun prix envoyé depuis le front-end n'est accepté comme référence monétaire.
- [x] Transaction atomique en base : décrémentation du stock verrouillée et horodatée.
- [x] Échec propre si une commande concurrente a épuisé le stock au même instant.
- [x] Attribution d'un numéro unique chronologique au format `CMD-AAAA-NNNN`.

### US-PUB-06 — Notification et confirmation par email

**En tant que** client venant de passer commande,  
**je veux** recevoir un email de confirmation récapitulant mes articles, mon adresse et les modalités de préparation,  
**afin d'** être rassuré sur la bonne prise en compte de ma demande.

**Critères d'acceptation :**

- [x] Envoi d'un email transactionnel au client avec le récapitulatif complet.
- [x] Envoi d'une notification d'alerte à la cidrerie pour préparation.
- [x] Tolérance aux pannes : l'échec de l'envoi d'email ne bloque jamais la commande en base.

---

## 3. Épopée 3 — Informations Légales, Histoire & Identité

### US-PUB-07 — Découverte de l'histoire et du terroir

**En tant que** passionné ou client curieux,  
**je veux** lire la genèse de la Cidrerie du Vulcain, l'approche naturelle et les variétés anciennes de pommes et poires d'Aubonne,  
**afin de** comprendre l'authenticité et la philosophie du domaine.

**Critères d'acceptation :**

- [x] Page dédiée `/histoire` accessible depuis le menu principal.
- [x] Présentation textuelle et photographique de la cave et des vergers.

### US-PUB-08 — Respect du cadre légal suisse (nLPD, CGV, Mentions)

**En tant que** consommateur ou autorité de régulation,  
**je veux** accéder facilement aux Conditions Générales de Vente, aux Mentions Légales et à la Politique de Confidentialité,  
**afin de** connaître mes droits et la conformité du site aux lois suisses.

**Critères d'acceptation :**

- [x] Pages `/cgv`, `/mentions-legales`, `/confidentialite` conformes à la nLPD suisse.
- [x] Mention légale visible de protection des mineurs sur l'alcool.
- [x] Bannière d'information sur les jours de préparation et délais de livraison en Suisse.

---

## 4. Épopée 4 — Administration : Gestion des Commandes

### US-ADM-01 — Suivi et filtrage des commandes

**En tant que** gestionnaire de la cidrerie,  
**je veux** visualiser toutes les commandes passées avec des filtres par statut et un moteur de recherche,  
**afin de** traiter les commandes sans retard et suivre les expéditions.

**Critères d'acceptation :**

- [x] Liste ordonnée chronologiquement avec pagination.
- [x] Filtres par statut avec compteurs : _Toutes, À traiter, En préparation, Expédiées, Annulées_.
- [x] Recherche textuelle rapide par numéro de commande, nom de client ou email.
- [x] Badges visuels de statut explicites et colorés.

### US-ADM-02 — Vue détaillée d'une commande (Ticket de préparation)

**En tant que** préparateur à la cave,  
**je veux** consulter le ticket complet d'une commande (produits, quantités, adresse, message client, statut),  
**afin de** préparer le carton avec exactitude.

**Critères d'acceptation :**

- [x] Détail des articles avec quantités et montants.
- [x] Coordonnées complètes du client et historique des dates clés (création, expédition).
- [x] Attribution de la commande à un membre de l'équipe (responsable préparation).
- [x] Changement rapide du statut de la commande (_À traiter ➔ En préparation ➔ Expédiée_).

### US-ADM-03 — Annulation de commande avec réintégration de stock

**En tant qu'** administrateur,  
**je veux** pouvoir annuler une commande avec saisie d'un motif,  
**afin de** réintégrer automatiquement les bouteilles dans le stock physique et notifier le client.

**Critères d'acceptation :**

- [x] Modale de confirmation demandant la raison de l'annulation.
- [x] Option pour notifier ou non le client par email.
- [x] Réintégration automatique des quantités en stock avec mouvement `StockMovementReason.ANNULATION`.
- [x] Inscription de l'action dans le journal d'audit.

### US-ADM-04 — Création manuelle d'une commande

**En tant que** gérant au caveau ou au téléphone,  
**je veux** créer une commande directement dans l'interface d'administration pour un client de passage ou un professionnel,  
**afin de** centraliser toutes les ventes au même endroit et tenir les stocks à jour.

**Critères d'acceptation :**

- [x] Formulaire de saisie `/admin/commandes/nouvelle`.
- [x] Sélection d'un client existant (autocomplétion) ou création d'une nouvelle fiche client.
- [x] Choix du profil : Particulier ou Professionnel (application automatique de la remise pro).
- [x] Ajout de lignes de produits avec quantité et visualisation du stock disponible en temps réel.
- [x] Ajustement libre du prix unitaire par ligne si besoin (échantillons, gestes commerciaux).
- [x] Choix du mode d'expédition (Retrait à la cave à 0 CHF, port standard calculé ou montant personnalisé).
- [x] Gestion des stocks négatifs / précommandes avec avertissement et case de confirmation explicite.
- [x] Option pour envoyer ou non un email de confirmation de commande au client.
- [x] Numérotation automatique `CMD-AAAA-NNNN` et décrémentation atomique des stocks.
- [x] Journalisation de l'opération dans l'Audit Log avec l'administrateur connecté.

---

## 5. Épopée 5 — Administration : Facturation & Expédition (BL)

### US-ADM-05 — Émission de factures conformes

**En tant qu'** administrateur,  
**je veux** générer une facture officielle avec son propre numéro chronologique et ses mentions fiscales,  
**afin de** fournir une pièce comptable irréprochable au client ou à son entreprise.

**Critères d'acceptation :**

- [x] Numérotation indépendante des factures (`FAC-AAAA-NNNN`) émise à la demande.
- [x] Calcul de la TVA suisse au taux légal en vigueur.
- [x] Mise en page A4 professionnelle imprimable (`@media print`).
- [x] Possibilité de basculer le type client (Privé / Pro) avant émission.

### US-ADM-28 — Génération dynamique de la QR-facture suisse (norme SIX)

**En tant qu'** administrateur et client de la cidrerie,  
**je veux** que chaque facture génère automatiquement la section de paiement QR suisse officielle au bas de la page A4,  
**afin de** permettre au client de payer en scannant le QR code avec son e-banking (montant, compte et facture pré-remplis) ou au guichet postal.

**Critères d'acceptation :**

- [x] Rendu vectoriel conforme SIX / PostFinance (210×105 mm) avec récépissé (62 mm), section de paiement (148 mm) et croix suisse centrale (7×7 mm).
- [x] Coordonnées créancier automatiques (IBAN PostFinance `CH57 0900...`, nom et adresse de Bertrand Baeriswyl).
- [x] Pré-remplissage dynamique du montant en CHF et des coordonnées du débiteur (client).
- [x] Mention du numéro de facture et de commande dans les informations de paiement.
- [x] Lignes de découpe avec icônes ciseaux conformes pour l'impression A4.

### US-ADM-06 — Bon de livraison / Préparation épuré (BL)

**En tant que** préparateur de commande à la cave,  
**je veux** imprimer un bon de préparation sans les données financières confidentielles,  
**afin de** pointer physiquement les bouteilles dans le carton et glisser le document dans le colis.

**Critères d'acceptation :**

- [ ] Vue imprimable dédiée au format A4.
- [ ] Coordonnées claires du destinataire et date souhaitée.
- [ ] Instructions de livraison du client en évidence.
- [ ] Tableau de pointage avec cases à cocher `[ ]` et total du nombre de bouteilles.
- [ ] Absence délibérée des prix et mentions fiscales.

---

## 6. Épopée 6 — Administration : Catalogue, Stocks & Catégories

### US-ADM-07 — Gestion des fiches produits et photographies

**En tant que** gérant,  
**je veux** ajouter, éditer ou désactiver des bouteilles avec leurs photos, prix et caractéristiques,  
**afin de** faire évoluer le catalogue au fil des millésimes et des saisons.

**Critères d'acceptation :**

- [x] Formulaire complet : nom, catégorie, millésime, prix unitaire TTC, prix d'achat, degré alcool, labels Bio/Vegan, description.
- [x] Téléversement direct des photos sur le stockage AWS S3 sécurisé.
- [x] Bascule de visibilité en un clic (actif / inactif sur la boutique).
- [x] Archivage sécurisé (un produit archivé ne peut plus être commandé mais conserve l'intégrité des anciennes factures).

### US-ADM-08 — Suivi d'inventaire et alertes de stock bas

**En tant qu'** exploitant,  
**je veux** être alerté dès qu'un produit atteint son seuil critique de stock et ajuster l'inventaire manuellement,  
**afin d'** éviter les ruptures imprévues et tracer les bouteilles cassées ou consommées au domaine.

**Critères d'acceptation :**

- [x] Seuil d'alerte personnalisable par produit (`stockSeuil`).
- [x] Mise en valeur visuelle des stocks faibles dans le tableau d'administration.
- [x] Journalisation obligatoire de tout ajustement manuel de stock avec motif (Réassort, Perte/Casse, Dégustation).

### US-ADM-09 — Organisation et ordonnancement des catégories

**En tant qu'** administrateur,  
**je veux** créer des catégories et choisir leur ordre d'affichage sur la boutique,  
**afin de** mettre en avant les cuvées phares en tête de catalogue.

**Critères d'acceptation :**

- [x] Interface de gestion des catégories `/admin/categories`.
- [x] Attribution d'un ordre numérique de position.
- [x] Protection contre la suppression d'une catégorie contenant encore des produits.

---

## 7. Épopée 7 — Administration : Clients & Tarifs Professionnels

### US-ADM-10 — Fiches clients et historique d'achats

**En tant que** gérant,  
**je veux** consulter la liste de mes clients, leurs coordonnées et l'ensemble de leurs commandes passées,  
**afin de** fidéliser la clientèle et retrouver rapidement un historique.

**Critères d'acceptation :**

- [x] Fiche client créée ou mise à jour automatiquement lors de chaque commande.
- [x] Vue des commandes passées avec montants et statuts.
- [x] Coordonnées téléphoniques et postales centralisées.

### US-ADM-11 — Statut Professionnel et remise commerciale automatique

**En tant qu'** administrateur,  
**je veux** marquer un client comme « Professionnel » (restaurant, caviste, bar),  
**afin qu'** il bénéficie automatiquement du tarif pro convenu sur ses commandes.

**Critères d'acceptation :**

- [x] Bascule d'un client en statut Pro depuis l'administration.
- [x] Calcul automatique du tarif pro selon le pourcentage global configuré dans les réglages.
- [x] Affichage clair de la remise accordée sur la facture.

---

## 8. Épopée 8 — Administration : Dashboard, Journal & Rôles

### US-ADM-12 — Tableau de bord des ventes et indicateurs clés (KPIs)

**En tant qu'** administrateur ou gestionnaire,  
**je veux** visualiser les chiffres clés de la cidrerie (Chiffre d'affaires, panier moyen, nombre de commandes, alertes stocks),  
**afin de** piloter l'activité commerciale en un coup d'œil.

**Critères d'acceptation :**

- [x] Cartes d'indicateurs synthétiques (CA total, commandes à traiter, panier moyen).
- [x] Liste des dernières commandes et raccourcis d'action.
- [x] Masquage automatique des données financières pour le rôle Préparateur.

### US-ADM-13 — Journal d'activité (Audit Log)

**En tant qu'** administrateur principal,  
**je veux** consulter un journal horodaté traçant les modifications sensibles (changements de prix, de stocks, annulations de commandes, créations d'utilisateurs),  
**afin de** comprendre qui a fait quoi et garantir une transparence totale au sein de l'équipe.

**Critères d'acceptation :**

- [x] Vue chronologique `/admin/journal` protégée (rôle Admin uniquement).
- [x] Enregistrement de l'auteur, de la date exacte, de la cible et du détail de la modification.
- [x] Conservation des logs même en cas de suppression du compte utilisateur auteur.

### US-ADM-14 — Gestion des rôles et habilitations de l'équipe

**En tant qu'** administrateur,  
**je veux** créer des comptes pour les collaborateurs de la cave et leur attribuer un rôle approprié (_Administrateur, Gestionnaire, Préparateur_),  
**afin de** sécuriser l'accès aux données financières et aux paramètres critiques.

**Critères d'acceptation :**

- [x] Gestion des utilisateurs dans `/admin/utilisateurs`.
- [x] Trois rôles distincts aux permissions cloisonnées :
  - **Administrateur** : Accès intégral, réglages, journal, utilisateurs.
  - **Gestionnaire** : Commandes, catalogue, stocks, clients.
  - **Préparateur** : Vue commandes, fiches de préparation, stocks en lecture, aucun montant financier.
- [x] Protection contre la suppression accidentelle de son propre compte ou du dernier administrateur.

### US-ADM-15 — Configuration des paramètres généraux de la cidrerie

**En tant qu'** administrateur,  
**je veux** modifier les paramètres de l'entreprise (nom, adresse, IBAN/BIC, taux de TVA, frais de port, seuil franco, remise pro),  
**afin d'** adapter les règles commerciales sans aucune intervention technique.

**Critères d'acceptation :**

- [x] Formulaire centralisé `/admin/parametres`.
- [x] Mise à jour en temps réel répercutée immédiatement sur la boutique et les factures.

---

## 9. Épopée 9 — Infrastructure, DevOps & Sécurité

### US-OPS-01 — Déploiement Cloud Serverless sur AWS

**En tant qu'** exploitant du site,  
**je veux** que le site et son API tournent sur une infrastructure serverless AWS robuste (Lambda, CloudFront, S3),  
**afin de** garantir une disponibilité maximale, des coûts maîtrisés et des performances ultra-rapides.

**Critères d'acceptation :**

- [x] Architecture déclarative via SST (Ion).
- [x] Distribution globale CloudFront avec certificat HTTPS automatique.
- [x] Hébergement des médias sur Amazon S3 avec CDN.
- [x] Isolation des environnements (Dev, Sandbox, Production).

### US-OPS-02 — Pipeline CI/CD automatisé sur serveur Homelab

**En tant que** développeur du projet,  
**je veux** que chaque validation de code sur GitLab déclenche automatiquement les tests, la compilation et le déploiement sur AWS via mon runner dédié,  
**afin de** déployer en toute sérénité sans manipulation manuelle risquée.

**Critères d'acceptation :**

- [x] GitLab Runner configuré sur machine dédiée (HP Elitedesk G5, Docker).
- [x] Pipeline multi-étapes (`.gitlab-ci.yml`) avec génération des types Prisma et SST.
- [x] Déploiement automatique sur la Sandbox lors de la fusion sur la branche `sandbox`.
- [x] Détection et affichage de la version du commit déployé en direct sur le site.

### US-OPS-03 — Sécurité et limitation du débit (Rate Limiting)

**En tant qu'** administrateur système,  
**je veux** limiter le nombre de requêtes suspectes et bloquer les attaques automatisées sur l'API de commande et la connexion admin,  
**afin de** préserver l'intégrité de la base de données et de la boîte mail.

**Critères d'acceptation :**

- [x] Rate limiting intelligent par adresse IP sur les formulaires sensibles.
- [x] Mots de passe administrateur hachés avec algorithme moderne (bcrypt).
- [x] Sessions authentifiées via cookies sécurisés `httpOnly`, `sameSite`, `secure`.

### US-OPS-04 — En-têtes HTTP de sécurité (Security Hardening)

**En tant qu'** administrateur système,  
**je veux** que le serveur HTTP renvoie des en-têtes de sécurité stricts au navigateur,  
**afin d'** immuniser la boutique contre le clickjacking, le détournement MIME et les attaques par iframe invisible.

**Critères d'acceptation :**

- [x] En-tête HSTS (`Strict-Transport-Security`) forçant le HTTPS avec sous-domaines.
- [x] En-tête anti-clickjacking (`X-Frame-Options: DENY`).
- [x] En-tête anti-reniflage de contenu (`X-Content-Type-Options: nosniff`).
- [x] Politique de référence stricte (`Referrer-Policy: strict-origin-when-cross-origin`).
- [x] Politique de permissions matérielles (`Permissions-Policy: camera=(), microphone=(), geolocation=()`).

---

## Tableau de Bord de Couverture des User Stories

| Épopée                          | Total US | Réalisées (Terminées) |   En cours / Prochaines étapes   |
| ------------------------------- | :------: | :-------------------: | :------------------------------: |
| **1. Boutique Publique**        |    3     |           3           |                —                 |
| **2. Prise de Commande**        |    3     |           3           |                —                 |
| **3. Infos Légales & Histoire** |    2     |           2           |   _(Contenu final /histoire)_    |
| **4. Gestion des Commandes**    |    4     |           4           |                —                 |
| **5. Facturation & Expédition** |    3     |           2           | **US-ADM-06 (Bon de livraison)** |
| **6. Catalogue & Stocks**       |    3     |           3           |                —                 |
| **7. Clients & Tarifs Pro**     |    2     |           2           |                —                 |
| **8. Dashboard & Rôles**        |    4     |           4           |                —                 |
| **9. DevOps & Sécurité**        |    4     |           4           |                —                 |
| **TOTAL**                       |  **28**  |        **27**         |          **1 en cours**          |
