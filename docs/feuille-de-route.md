# Feuille de route

Dernière mise à jour : 15 août 2026.
Branche `develop`.

---

## Où on en est

Le cycle métier complet tourne sur la base RDS de Zurich : un client commande
sur la boutique → la cidrerie reçoit un email → l'écran Préparation affiche la
liste de picking → la facture s'émet avec son numéro → l'expédition déclenche
l'avis au client avec l'IBAN et la référence de paiement ISO 11649.

Sont en place : le catalogue lu en base, le stock transactionnel, les montants
en centimes entiers, les séries de numérotation `CMD` / `FAC`, l'annulation de
commande avec retour de stock, les trois rôles, le journal d'activité
généralisé, les emails SES, la facture A4 imprimable, le tableau de bord et les
trois pages légales.

Les **six premiers bloquants** de `DESIGN.md` sont levés.

---

## 1. À faire avant la mise en ligne

### 1.1 Durcissement

- [x] Mot de passe administrateur — 32 caractères
- [x] `AUTH_SECRET` sans valeur de repli
- [x] `package-lock.json` versionné — `npm ci` reproductible en CI
- [ ] **Vraies clés Turnstile** — celles en place sont les clés de test
      Cloudflare, qui laissent tout passer. Créer un site sur
      `dash.cloudflare.com/turnstile`.
- [ ] **Upstash Redis** — non configuré. Le rate limiting est désactivé en
      développement et lève une erreur explicite en production : l'application
      refusera de démarrer sans. Base gratuite sur `console.upstash.com`.

### 1.2 Contenus légaux — relecture

Les trois pages existent (`/cgv`, `/mentions-legales`, `/confidentialite`) et
sont liées depuis le pied de la boutique. Restent à faire :

- [ ] **Relecture par Bertrand** — les mentions doivent correspondre à la
      réalité de l'entreprise (raison sociale, adresse, statut).
- [ ] Vérifier la cohérence avec `Setting` : la cidrerie **n'est pas assujettie
      à la TVA**, aucune page ne doit en mentionner une.
- [ ] Confirmer le **droit de rétractation** : en Suisse il n'existe pas de
      droit de retour légal pour la vente à distance, contrairement à l'UE. Ne
      pas recopier une formulation française.

### 1.3 Déploiement

OpenNext + SST : S3 + CloudFront + Lambda, déclarés en TypeScript. Voir
`docs/architecture-cible.md`. Donne une URL de démo à montrer à Bertrand, et
c'est la brique AWS qui manque au projet.

Prérequis : le durcissement (1.1) — rien ne doit être exposé avant.

### 1.4 Sortie du bac à sable SES

Demande à lancer depuis _Account dashboard → Request production access_.
Environ un jour ouvré. Tant qu'on est en sandbox, SES n'écrit qu'aux adresses
vérifiées : un vrai client ne recevrait rien.

### 1.5 Vrai catalogue et purge des données d'essai

La base contient des commandes de test et des produits fictifs (« Brut Orte »
à 10 000 CHF). À nettoyer, et à remplacer par le vrai catalogue avec Bertrand.

---

## 2. Améliorations proposées

Aucune n'est bloquante, par ordre d'utilité.

### 2.1 Comptes et journal

- **Assignation des commandes** — « qui a préparé » serait plus parlant qu'un
  « statut modifié par X » : un préparateur prend une commande en charge, son
  nom reste dessus. Utile dès que deux personnes préparent en parallèle.
- **Désactiver un compte plutôt que le supprimer** — pour l'aide saisonnière
  aux vendanges, un interrupteur actif/inactif évite de recréer un compte
  chaque année.
- **Forcer le changement de mot de passe à la première connexion** — le mot de
  passe initial est communiqué de vive voix ; tant qu'il n'est pas changé,
  l'administrateur peut agir sous l'identité d'un autre, ce qui affaiblit le
  journal.

### 2.2 Documents

- **L'avoir** (série `AV`, déjà réservée) — l'interface signale qu'un avoir est
  nécessaire après l'annulation d'une commande facturée, mais ne le produit
  pas. Même mise en page que la facture, montants en négatif, référence à la
  facture annulée.
- **QR-facture suisse** — l'emplacement est réservé sur la facture et la
  référence ISO 11649 existe déjà. Reste le rendu (bloc 210 × 105 mm, croix
  suisse) et le choix QR-IBAN ou non. Voir `docs/architecture-cible.md` §4.

### 2.3 Back-office

- **Catégories** — pas gérables depuis l'admin aujourd'hui. Sujet mis de côté
  par Hugo, à reprendre ; c'est dans le périmètre du rôle gestionnaire.
- **Ventes expédiées** (`DESIGN.md` §3) — accessible depuis la carte chiffre
  d'affaires : total encaissé, part professionnelle, panier moyen.
- **Recherche client** (US-06).
- **Photos produits sur S3** — la boutique affiche des trames d'attente. À
  faire **après** le déploiement, pour que le bucket soit déclaré dans la même
  description d'infrastructure. Dépend aussi des photos de Bertrand. En
  attendant, le champ URL de la modale produit fonctionne.

---

## 3. Décisions en attente

- **Le préparateur et la facture** — il ne peut plus la voir (elle est
  financière). Concrètement : qui imprime la facture à glisser dans le colis ?
  Si c'est le préparateur, il lui faudra un accès restreint au document sans
  les montants, ou un « bon de livraison » distinct.
- **Dépôt public** — `github.com/Zweikow/Vulcain.ch` est public et contient la
  structure commerciale d'un client réel. Un `.env` a fuité dans l'historique ;
  `AUTH_SECRET` a été tourné. Purger l'historique n'est plus qu'un geste
  cosmétique ; passer le dépôt en privé reste une option.
- **Doublon DMARC** — deux enregistrements `_dmarc` coexistent chez Infomaniak
  (`p=none` et `p=reject`), ce qui annule la politique. Probablement régénéré
  par un réglage de messagerie Infomaniak plutôt que par l'éditeur de zone.
  Non bloquant.

---

## 4. Ménage

- [ ] Supprimer les comptes de vérification `claude` (admin), `test-gestion`
      et `test-prepa` — mot de passe commun `verification-back-office`.
- [ ] Passer `bbaeriswyl` en **Gestionnaire** (il est préparateur). Les rôles
      existants n'ont pas été changés par migration : c'est une décision
      d'exploitation.
- [ ] Supprimer le dossier `C:\Users\Hugo0\dev\vulcain` — donneur de code du
      portage initial, tout est repris dans ce dépôt.
- [ ] Élaguer les worktrees git d'anciennes sessions dans `.claude/worktrees/`.

---

## 5. Rappels d'environnement

**Ne jamais lancer `npm run build` pendant que `npm run dev` tourne** : le
build écrase le `.next` du serveur de développement, et la page s'affiche sans
CSS ou lève « Cannot find module './267.js' ». Correctif : arrêter le serveur,
`rm -rf .next`, relancer.

**Vérifier qu'un seul serveur tourne.** Plusieurs incidents venaient d'un
serveur fantôme resté sur le port 3000 avec du code périmé, pendant que le
nouveau démarrait sur 3001.

**Session SSO AWS** — expire toutes les 8 à 12 heures. Quand les emails
cessent de partir en développement, c'est presque toujours ça :

```bash
aws sso login --profile vulcain
```

**Groupe de sécurité RDS** — n'autorise que l'IP courante. En changeant de
réseau (ou depuis le Mac), ajouter la nouvelle IP dans les règles entrantes,
sinon Prisma tombe en délai d'attente sans explication claire.

**Sur le Mac** — le `.env` n'est pas versionné : le recréer depuis
`.env.example`, avec la chaîne RDS, un `AUTH_SECRET` propre à la machine et le
profil SSO (`aws configure sso --profile vulcain`, portail
`https://d-cc67018df5.awsapps.com/start`).
