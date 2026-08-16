# User Stories — Cidrerie du Vulcain
### Interface d'administration Next.js + Strapi

> **Projet :** Refonte du site [cidrerie-vulcain.ch](http://cidrerie-vulcain.ch)
> **Stack :** Next.js (App Router) · Strapi v5 · PostgreSQL · EmailJS
> **Repo :** github.com/Zweikow/Vulcain.ch
> **Date :** Avril 2026

---

## Table des matières

1. [Dashboard & Statistiques](#1-dashboard--statistiques)
2. [Gestion des commandes](#2-gestion-des-commandes)
3. [Gestion du catalogue produits](#3-gestion-du-catalogue-produits)
4. [Expérience admin (UX)](#4-expérience-admin-ux)
5. [Configuration & Sécurité](#5-configuration--sécurité)

---

## 1. Dashboard & Statistiques

### US-01 — Vue des commandes du mois avec filtres temporels

> **Priorité :** 🔴 Haute

**En tant qu'** administrateur,
**je veux** voir un résumé des commandes (non commencées / en cours / terminées) avec un switch entre 1 mois, 4 mois, 6 mois et 1 an,
**afin de** suivre l'activité de la cidrerie d'un coup d'œil.

**Critères d'acceptation :**
- [ ] 4 boutons de filtre temporel visibles en permanence (1M / 4M / 6M / 1A)
- [ ] 3 compteurs colorés : à traiter (orange), en cours (bleu), terminées (vert)
- [ ] Mise à jour instantanée sans rechargement de page
- [ ] Données issues de l'API Strapi (`/api/commandes`)

---

### US-02 — Graphique d'évolution du chiffre d'affaires

> **Priorité :** 🟡 Moyenne

**En tant qu'** administrateur,
**je veux** voir l'évolution du chiffre d'affaires sur la période sélectionnée via un graphique,
**afin de** identifier les tendances saisonnières et ajuster ma production.

**Critères d'acceptation :**
- [ ] Graphique en barres ou courbe groupé par semaine ou mois selon la période
- [ ] Valeur en CHF affichée sur chaque point ou au survol
- [ ] Suit le même filtre temporel qu'US-01
- [ ] Librairie suggérée : Recharts ou Chart.js

---

### US-03 — Top produits vendus

> **Priorité :** 🟢 Basse

**En tant qu'** administrateur,
**je veux** voir quels produits se vendent le mieux sur la période sélectionnée,
**afin d'** ajuster mon stock et ma production en conséquence.

**Critères d'acceptation :**
- [ ] Liste des 5 produits les plus commandés avec quantités totales
- [ ] Mise à jour selon le filtre temporel actif (même contrôle qu'US-01)
- [ ] Affichage du pourcentage du total des ventes

---

## 2. Gestion des commandes

### US-04 — Vue ticket d'une commande

> **Priorité :** 🔴 Haute

**En tant qu'** administrateur,
**je veux** voir chaque commande sous forme de ticket détaillé,
**afin de** préparer et expédier la commande efficacement.

**Critères d'acceptation :**
- [ ] Le ticket affiche : nom du client, adresse de livraison, articles commandés + quantités, total CHF
- [ ] Statut affiché et modifiable depuis le ticket (à traiter / en préparation / expédiée)
- [ ] Date d'expédition enregistrée automatiquement lors du passage en statut "expédiée"
- [ ] Bouton d'impression ou export PDF du ticket
- [ ] Numéro de commande unique affiché en en-tête

---

### US-05 — Liste des commandes filtrable par statut

> **Priorité :** 🔴 Haute

**En tant qu'** administrateur,
**je veux** filtrer les commandes par statut,
**afin de** me concentrer sur celles qui nécessitent une action immédiate.

**Critères d'acceptation :**
- [ ] Filtres disponibles : Toutes / À traiter / En préparation / Expédiées
- [ ] Badge avec compteur sur chaque filtre
- [ ] Tri par date décroissante par défaut
- [ ] Chaque ligne cliquable pour ouvrir le ticket (US-04)

---

### US-06 — Recherche de commande par nom client

> **Priorité :** 🟡 Moyenne

**En tant qu'** administrateur,
**je veux** retrouver une commande spécifique rapidement par le nom du client,
**afin de** répondre rapidement à une demande ou réclamation.

**Critères d'acceptation :**
- [ ] Champ de recherche avec résultats en temps réel (debounce 300ms)
- [ ] Recherche sur nom, prénom et adresse email
- [ ] Combinable avec les filtres de statut (US-05)

---

## 3. Gestion du catalogue produits

### US-07 — Alerte stock bas

> **Priorité :** 🔴 Haute

**En tant qu'** administrateur,
**je veux** être averti visuellement quand un produit passe sous un seuil de stock critique,
**afin d'** éviter de vendre des produits en rupture de stock.

**Critères d'acceptation :**
- [ ] Seuil d'alerte configurable par produit (champ `stockSeuil` dans Strapi)
- [ ] Badge d'alerte rouge sur la ligne produit dans le tableau
- [ ] Indicateur d'alerte sur l'icône du menu latéral "Produits"
- [ ] Section "Stocks bas" visible sur le tableau de bord (US-01)

---

### US-08 — Ajout et édition d'un produit avec image

> **Priorité :** 🟡 Moyenne

**En tant qu'** administrateur,
**je veux** ajouter ou modifier un produit avec photo via un formulaire simple,
**afin de** maintenir le catalogue à jour sans toucher au code.

**Critères d'acceptation :**
- [ ] Upload d'image géré par la Strapi Media Library
- [ ] Champs du formulaire : nom, catégorie, prix (CHF), stock, description, statut actif/inactif
- [ ] Validation des champs obligatoires avant soumission avec messages d'erreur clairs
- [ ] Aperçu de l'image avant enregistrement
- [ ] Toast de confirmation après sauvegarde

---

### US-09 — Gestion des catégories

> **Priorité :** 🟢 Basse

**En tant qu'** administrateur,
**je veux** créer, renommer ou supprimer des catégories de produits,
**afin d'** organiser mon catalogue de manière flexible.

**Critères d'acceptation :**
- [ ] Liste des catégories existantes avec compteur de produits associés
- [ ] Suppression bloquée si des produits actifs sont attachés à la catégorie
- [ ] Renommage inline ou via modale

---

## 4. Expérience admin (UX)

### US-10 — Confirmation avant suppression

> **Priorité :** 🟡 Moyenne

**En tant qu'** administrateur,
**je veux** voir une modale de confirmation avant de supprimer un produit ou une commande,
**afin d'** éviter les suppressions accidentelles.

**Critères d'acceptation :**
- [ ] Modale affichant le nom de l'élément concerné
- [ ] Bouton "Annuler" mis en avant (couleur neutre), bouton "Supprimer" en rouge
- [ ] Fermeture de la modale en cliquant en dehors ou via la touche Echap
- [ ] Comportement identique pour les produits et les commandes

---

### US-11 — Interface responsive sur mobile

> **Priorité :** 🟡 Moyenne

**En tant qu'** administrateur,
**je veux** pouvoir consulter les commandes et changer leur statut depuis mon téléphone,
**afin de** gérer la cidrerie même lorsque je suis à la cave ou en déplacement.

**Critères d'acceptation :**
- [ ] Menu latéral rétractable (hamburger) sur écrans < 768px
- [ ] Tableau des commandes transformé en vue cartes sur mobile
- [ ] Changement de statut accessible en un tap depuis la liste et le ticket
- [ ] Tailles de touch targets ≥ 44px (recommandation WCAG)

---

## 5. Configuration & Sécurité

### US-12 — Connexion sécurisée à l'espace admin

> **Priorité :** 🔴 Haute

**En tant qu'** administrateur,
**je veux** me connecter via un identifiant et mot de passe,
**afin de** protéger l'accès à l'interface de gestion contre tout accès non autorisé.

**Critères d'acceptation :**
- [ ] Authentification via l'API Strapi Users & Permissions
- [ ] JWT stocké en cookie `httpOnly` (non accessible via JS)
- [ ] Middleware Next.js bloquant toutes les routes `/admin/*` sans session valide
- [ ] Redirection automatique vers `/admin/login` si la session est expirée
- [ ] Page `/admin` totalement inaccessible sans authentification

---

### US-13 — Paramétrage des informations de la cidrerie

> **Priorité :** 🟢 Basse

**En tant qu'** administrateur,
**je veux** mettre à jour les coordonnées, textes et liens affichés sur la boutique,
**afin de** ne jamais avoir besoin d'un développeur pour une simple mise à jour de contenu.

**Critères d'acceptation :**
- [ ] Single type Strapi `Parametres` avec champs : adresse, email, téléphone, texte d'accueil, liens réseaux sociaux
- [ ] Formulaire d'édition dédié dans l'interface admin Next.js
- [ ] Modifications répercutées sur la boutique publique sans redéploiement (ISR ou revalidation)

---

## Récapitulatif des priorités

| ID | Titre | Épopée | Priorité |
|----|-------|--------|----------|
| US-01 | Vue des commandes avec filtres temporels | Dashboard | 🔴 Haute |
| US-04 | Vue ticket d'une commande | Commandes | 🔴 Haute |
| US-05 | Liste des commandes filtrable | Commandes | 🔴 Haute |
| US-07 | Alerte stock bas | Produits | 🔴 Haute |
| US-12 | Connexion sécurisée | Sécurité | 🔴 Haute |
| US-02 | Graphique CA | Dashboard | 🟡 Moyenne |
| US-06 | Recherche par client | Commandes | 🟡 Moyenne |
| US-08 | Ajout / édition produit | Produits | 🟡 Moyenne |
| US-10 | Confirmation avant suppression | UX | 🟡 Moyenne |
| US-11 | Interface mobile responsive | UX | 🟡 Moyenne |
| US-03 | Top produits vendus | Dashboard | 🟢 Basse |
| US-09 | Gestion des catégories | Produits | 🟢 Basse |
| US-13 | Paramétrage cidrerie | Config | 🟢 Basse |
