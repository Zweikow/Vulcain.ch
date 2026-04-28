# Design : Workflow Git professionnel + Migration NextJS
**Date :** 2026-04-28
**Projet :** Cidrerie du Vulcain
**Auteur :** Hugo Baeriswyl (Zweikow)

---

## Contexte et objectif

Le site de commande en ligne de la Cidrerie du Vulcain est actuellement un site statique
(HTML/CSS/JS) hébergé sur Infomaniak. Sa gestion est fastidieuse : le client doit contacter
le développeur pour chaque modification d'article ou de prix.

**Objectif :** Mettre en place un workflow Git professionnel et migrer vers une app NextJS
qui permettra au client de gérer son catalogue de manière autonome.

---

## 1. Workflow Git

### Branches

| Branche | Rôle | Push direct | Protection |
|---|---|---|---|
| `main` | Production — ce que le client voit en ligne | ❌ MR uniquement | ✅ Branch protection GitHub |
| `sandbox` | Démo client + expérimentation | ❌ MR depuis develop | ✅ Branch protection GitHub |
| `develop` | Intégration — seule branche de travail actif | ✅ | ❌ |

### Flow de déploiement

```
[local] → git push origin develop → MR → sandbox → MR → main
```

### Cas d'usage quotidiens

**Modification simple (prix, article, texte) :**
1. Modifier localement sur `develop`
2. `git push origin develop`
3. Ouvrir MR `develop → sandbox` pour vérification visuelle
4. Si OK, ouvrir MR `sandbox → main`

**Nouvelle fonctionnalité :**
1. Développer directement sur `develop` (projet solo)
2. `git push origin develop`
3. MR `develop → sandbox` pour démo client si nécessaire
4. MR `sandbox → main` une fois validé

**Expérimentation risquée :**
1. Créer une branche locale temporaire depuis `develop`
2. Tester librement
3. Merger dans `develop` si concluant, supprimer sinon
4. Ne jamais pousser une branche d'expérimentation sur remote

**Démo client :**
- Le client consulte toujours l'URL de `sandbox`
- `main` reste stable pendant les démos

### Configuration GitHub Branch Protection

**Pour `main` et `sandbox` :**
- ✅ Require a pull request before merging
- ❌ Require approvals (projet solo — bloquerait le développeur)
- ✅ Require conversation resolution before merging
- ❌ Allow force pushes
- ❌ Allow deletions

> Note : GitHub Free sur repo public laisse les administrateurs bypasser les protections.
> La discipline de ne jamais push directement sur `main` est une règle de processus, pas seulement technique.

---

## 2. Migration NextJS

### Situation de départ

- `main` : site statique HTML/CSS/JS, état de production actuel
- `Site-Self-Managed-Dev` : branche locale uniquement, app NextJS générée depuis maquettes Pencil
  - Diverge de `main` au commit `232acda` (ne contient pas les 6 derniers commits)
  - Contient : page catalogue, panier, formulaire commande, page admin (`/admin`)

### Stratégie

Ne pas merger `Site-Self-Managed-Dev` dans `develop` (risque de conflits inutiles).
Créer `develop` depuis `main` puis y intégrer le code NextJS proprement.

### Structure cible dans `develop`

```
/
  app/                    ← Next.js App Router
    admin/
      page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    AdminProductModal.tsx
    Cart.tsx
    ConfirmationModal.tsx
    DeliveryWarning.tsx
    Header.tsx
    OrderForm.tsx
    ProductCard.tsx
  lib/
    data.ts
  types/
    index.ts
  next.config.js
  package.json
  tailwind.config.ts
  tsconfig.json
  postcss.config.js
  .gitignore
  CLAUDE.md
  CNAME
  README.md
```

### Fichiers à supprimer (ancien site statique)

- `index.html`
- `script.js`
- `styles.css`
- `email-template.html`
- `config-example.js`
- `logo-cidrerie-vulcain.png`
- `SETUP_FORMSUBMIT.md`

### Étapes de migration

1. Créer `develop` depuis `main` (head actuel : `d7b2c7b`)
2. Créer `sandbox` depuis `main`
3. Configurer branch protections sur GitHub pour `main` et `sandbox`
4. Sur `develop` :
   a. Copier les fichiers NextJS depuis `Site-Self-Managed-Dev/` vers la racine
   b. Supprimer les fichiers de l'ancien site statique
   c. Commit : `feat: Migration vers app NextJS — suppression site statique`
   d. `git push origin develop`
5. Supprimer la branche locale `Site-Self-Managed-Dev`
6. Archiver ou supprimer `origin/feature/pdf-invoice-generation` (abandonné)

---

## 3. Stack technique cible

| Élément | Technologie |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Emails | À définir (EmailJS ou autre) |
| Hébergement | Non décidé |
| Domaine | `cidrerie-vulcain.ch` / `vulcain.ch` |

---

## 4. Ce qui n'est pas dans ce scope

- Choix et configuration de l'hébergement NextJS
- Développement de l'interface d'administration
- Système de paiement en ligne
- Migration des données produits vers une base de données
