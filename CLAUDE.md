# Cidrerie du Vulcain — Contexte Projet

## Présentation

Site de commande en ligne pour la **Cidrerie du Vulcain** (vulcain.ch / cidrerie-vulcain.ch).
Développé par **Hugo Baeriswyl** (Zweikow) — développeur solo sur ce projet.

Le client (la cidrerie) doit pouvoir gérer ses articles et prix de manière autonome,
sans passer par le développeur. C'est la raison principale du passage à NextJS.

## État actuel du projet

### Site statique (production actuelle)
- Fichiers : `index.html`, `styles.css`, `script.js`, `email-template.html`
- Hébergé sur **Infomaniak** (`cidrerie-vulcain.ch`) + GitHub Pages (`vulcain.ch`)
- Commandes reçues par email via **EmailJS** → `commandes@cidrerie-vulcain.ch`
- Gestion des produits fastidieuse : le client doit contacter le développeur pour chaque modification

### App NextJS (en cours de développement)
- Branche locale : `Site-Self-Managed-Dev` (jamais pushée sur remote)
- Générée depuis des maquettes Pencil
- Contient déjà : page catalogue, panier, formulaire commande, page admin (`/admin`)
- Objectif : remplacer totalement le site statique
- Hébergement : **pas encore décidé**

## Workflow Git (décidé, à mettre en place)

### Branches
| Branche | Rôle | Push direct |
|---|---|---|
| `main` | Production — protégée | ❌ MR uniquement |
| `sandbox` | Démo client + expérimentation | ❌ MR depuis develop |
| `develop` | Intégration — seule branche où on code | ✅ |

### Flow
```
[local] → push → develop → MR → sandbox → MR → main
```

### Règles GitHub
- `main` : branch protection, require pull request, no direct push
- `sandbox` : branch protection, require pull request depuis `develop`
- `develop` : push direct autorisé pour Zweikow

### Initialisation (à faire)
1. Créer `develop` et `sandbox` depuis `main`
2. Intégrer le code NextJS de `Site-Self-Managed-Dev` dans `develop`
3. Configurer les branch protections sur GitHub
4. Archiver / supprimer `feature/pdf-invoice-generation` (abandonné, contenu repris sur main)

## Stack technique

### Site statique actuel
- HTML / CSS / JavaScript vanilla
- EmailJS pour l'envoi d'emails de commande
- Pas de build system

### App NextJS (cible)
- **Framework :** Next.js (App Router)
- **Styling :** Tailwind CSS
- **Language :** TypeScript
- **Structure :** `app/`, `components/`, `lib/`, `types/`
- Page admin : `app/admin/page.tsx`

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
