# Git Workflow + Migration NextJS — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place les branches `develop` et `sandbox`, protéger `main`, et migrer le code NextJS de `Site-Self-Managed-Dev` vers la racine de `develop` en supprimant l'ancien site statique.

**Architecture:** Flow linéaire `develop → sandbox → main` avec MR obligatoires sur `sandbox` et `main`. Le code NextJS (actuellement dans une branche locale) est déplacé à la racine du repo sur `develop`. Les fichiers de l'ancien site statique sont supprimés.

**Tech Stack:** Git, GitHub CLI (`gh`), Next.js, TypeScript, Tailwind CSS

**Repo :** `Zweikow/Vulcain.ch`

---

## Fichiers impactés

**Supprimés de `develop` :**
- `index.html`
- `script.js`
- `styles.css`
- `email-template.html`
- `config-example.js`
- `logo-cidrerie-vulcain.png`
- `SETUP_FORMSUBMIT.md`

**Ajoutés à la racine de `develop` (depuis `Site-Self-Managed-Dev/`) :**
- `app/admin/page.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `components/AdminProductModal.tsx`
- `components/Cart.tsx`
- `components/ConfirmationModal.tsx`
- `components/DeliveryWarning.tsx`
- `components/Header.tsx`
- `components/OrderForm.tsx`
- `components/ProductCard.tsx`
- `lib/data.ts`
- `types/index.ts`
- `next.config.js`
- `package.json`
- `tailwind.config.ts`
- `tsconfig.json`
- `postcss.config.js`

**Conservés :**
- `CLAUDE.md`
- `CNAME`
- `README.md`
- `.gitignore`
- `docs/`

---

## Task 1 : Créer et pousser les branches `develop` et `sandbox`

**Prérequis :** Être sur la branche `main` locale et à jour avec le remote.

- [ ] **Étape 1 : Se positionner sur `main` et le mettre à jour**

```bash
git checkout main
git pull origin main
```

Résultat attendu : `Already up to date.` ou liste de fichiers mis à jour.

- [ ] **Étape 2 : Créer la branche `develop` depuis `main`**

```bash
git checkout -b develop
```

Résultat attendu : `Switched to a new branch 'develop'`

- [ ] **Étape 3 : Pousser `develop` sur le remote**

```bash
git push -u origin develop
```

Résultat attendu : `Branch 'develop' set up to track remote branch 'develop' from 'origin'.`

- [ ] **Étape 4 : Créer la branche `sandbox` depuis `main`**

```bash
git checkout main
git checkout -b sandbox
```

Résultat attendu : `Switched to a new branch 'sandbox'`

- [ ] **Étape 5 : Pousser `sandbox` sur le remote**

```bash
git push -u origin sandbox
```

Résultat attendu : `Branch 'sandbox' set up to track remote branch 'sandbox' from 'origin'.`

- [ ] **Étape 6 : Vérifier les branches remote**

```bash
git branch -r
```

Résultat attendu : les trois branches apparaissent —
```
origin/develop
origin/main
origin/sandbox
```

---

## Task 2 : Configurer les branch protections GitHub via `gh` CLI

**Prérequis :** `gh` CLI installé et authentifié (`gh auth status` doit retourner un compte valide).

- [ ] **Étape 1 : Protéger `main` — exiger une PR avant tout merge**

```bash
gh api repos/Zweikow/Vulcain.ch/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Résultat attendu : JSON de confirmation avec `"url": "...branches/main/protection"`

- [ ] **Étape 2 : Vérifier la protection de `main`**

```bash
gh api repos/Zweikow/Vulcain.ch/branches/main/protection \
  --jq '{pull_request_required: .required_pull_request_reviews.required_approving_review_count, conversation_resolution: .required_conversation_resolution}'
```

Résultat attendu :
```json
{
  "pull_request_required": 0,
  "conversation_resolution": true
}
```

- [ ] **Étape 3 : Protéger `sandbox` avec les mêmes règles**

```bash
gh api repos/Zweikow/Vulcain.ch/branches/sandbox/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Résultat attendu : JSON de confirmation avec `"url": "...branches/sandbox/protection"`

- [ ] **Étape 4 : Vérifier sur GitHub**

Ouvrir `https://github.com/Zweikow/Vulcain.ch/settings/branches` et confirmer que `main` et `sandbox` apparaissent avec l'icône de protection.

---

## Task 3 : Intégrer le code NextJS dans `develop`

**Prérequis :** La branche locale `Site-Self-Managed-Dev` existe (vérifier avec `git branch`).

- [ ] **Étape 1 : Se positionner sur `develop`**

```bash
git checkout develop
```

Résultat attendu : `Switched to branch 'develop'`

- [ ] **Étape 2 : Importer les fichiers NextJS depuis `Site-Self-Managed-Dev`**

```bash
git checkout Site-Self-Managed-Dev -- Site-Self-Managed-Dev/
```

Résultat attendu : Les fichiers apparaissent dans le dossier `Site-Self-Managed-Dev/` à la racine du repo. Vérifier avec `ls Site-Self-Managed-Dev/`.

- [ ] **Étape 3 : Déplacer les fichiers NextJS vers la racine**

```bash
cp -r Site-Self-Managed-Dev/app ./app
cp -r Site-Self-Managed-Dev/components ./components
cp -r Site-Self-Managed-Dev/lib ./lib
cp -r Site-Self-Managed-Dev/types ./types
cp Site-Self-Managed-Dev/next.config.js ./next.config.js
cp Site-Self-Managed-Dev/package.json ./package.json
cp Site-Self-Managed-Dev/tailwind.config.ts ./tailwind.config.ts
cp Site-Self-Managed-Dev/tsconfig.json ./tsconfig.json
cp Site-Self-Managed-Dev/postcss.config.js ./postcss.config.js
```

Ne pas copier `Site-Self-Managed-Dev/README.md` — on garde le README existant à la racine.

- [ ] **Étape 4 : Supprimer le dossier temporaire `Site-Self-Managed-Dev/`**

```bash
rm -rf Site-Self-Managed-Dev/
```

- [ ] **Étape 5 : Vérifier la structure à la racine**

```bash
ls -la
```

Résultat attendu — les dossiers suivants doivent être présents à la racine :
```
app/
components/
docs/
lib/
types/
next.config.js
package.json
tailwind.config.ts
tsconfig.json
postcss.config.js
CLAUDE.md
CNAME
README.md
.gitignore
```

---

## Task 4 : Supprimer les fichiers de l'ancien site statique

- [ ] **Étape 1 : Supprimer les fichiers obsolètes**

```bash
git rm index.html script.js styles.css email-template.html config-example.js logo-cidrerie-vulcain.png SETUP_FORMSUBMIT.md
```

Résultat attendu : chaque fichier listé avec `rm 'nom-du-fichier'`

- [ ] **Étape 2 : Vérifier qu'aucun fichier statique ne subsiste**

```bash
git status
```

Résultat attendu : les 7 fichiers apparaissent en `deleted`, et les nouveaux dossiers NextJS en `new file`.

- [ ] **Étape 3 : Stager les nouveaux fichiers NextJS**

```bash
git add app/ components/ lib/ types/ next.config.js package.json tailwind.config.ts tsconfig.json postcss.config.js
```

- [ ] **Étape 4 : Vérifier le staging complet**

```bash
git status
```

Résultat attendu : tous les fichiers en `Changes to be committed`, aucun `Untracked`.

- [ ] **Étape 5 : Commiter la migration**

```bash
git commit -m "feat: Migration vers app NextJS — suppression site statique"
```

---

## Task 5 : Pousser `develop` et nettoyer les branches obsolètes

- [ ] **Étape 1 : Pousser `develop` sur le remote**

```bash
git push origin develop
```

Résultat attendu : liste des fichiers uploadés et `Branch 'develop' -> 'origin/develop'`

- [ ] **Étape 2 : Vérifier sur GitHub**

Ouvrir `https://github.com/Zweikow/Vulcain.ch/tree/develop` et confirmer que les dossiers `app/`, `components/`, `lib/`, `types/` sont présents et que `index.html` a disparu.

- [ ] **Étape 3 : Supprimer la branche locale `Site-Self-Managed-Dev`**

```bash
git branch -d Site-Self-Managed-Dev
```

Résultat attendu : `Deleted branch Site-Self-Managed-Dev`

> Si Git refuse avec "not fully merged", utiliser `-D` à la place — le code a été copié dans `develop`, la branche est devenue inutile.

- [ ] **Étape 4 : Supprimer la branche remote obsolète `feature/pdf-invoice-generation`**

```bash
git push origin --delete feature/pdf-invoice-generation
```

Résultat attendu : `- [deleted] feature/pdf-invoice-generation`

- [ ] **Étape 5 : Vérifier l'état final des branches**

```bash
git branch -r
```

Résultat attendu :
```
origin/develop
origin/main
origin/sandbox
```

---

## Vérification finale

- [ ] `main` sur GitHub contient encore l'ancien site statique (normal — aucune MR n'a encore été faite)
- [ ] `develop` sur GitHub contient uniquement l'app NextJS + `CLAUDE.md` + `README.md` + `CNAME`
- [ ] `sandbox` sur GitHub est identique à `main` (sera mis à jour via MR depuis `develop`)
- [ ] `main` et `sandbox` sont protégées dans GitHub Settings → Branches
- [ ] Aucune branche obsolète sur le remote
