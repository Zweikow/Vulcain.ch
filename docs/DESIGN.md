# DESIGN.md — Cidrerie du Vulcain

Référence de conception pour le site de commande en ligne. Ce document décrit le
système visuel, les écrans et les règles métier qui les gouvernent. Il accompagne
les maquettes `Vulcain - Nouveaux écrans.dc.html` (back-office) et
`Vulcain - Boutique client.dc.html` (boutique).

---

## 1. Fondations visuelles

### Palette

Reprise de `tailwind.config.ts`, inchangée.

| Rôle            | Hex                   | Usage                                          |
| --------------- | --------------------- | ---------------------------------------------- |
| `primary`       | `#80ED99`             | Boutons d'action, accents, barres de graphique |
| `primary-hover` | `#5ed97f`             | Survol des boutons primaires                   |
| `on-primary`    | `#153243`             | **Texte sur fond vert** — jamais du blanc      |
| `deep`          | `#153243`             | Sidebar, en-têtes, texte principal             |
| `deep-soft`     | `#284B63`             | Aplats secondaires sur fond sombre             |
| `body`          | `#4A6278`             | Texte courant, libellés                        |
| `muted`         | `#7A95A5`             | Texte tertiaire, placeholders                  |
| `surface`       | `#FFFFFF`             | Cartes, tableaux, modales                      |
| `canvas`        | `#F7F6F0`             | Fond de page, lignes d'en-tête de tableau      |
| `border`        | `#E2E8EF`             | Bordures de cartes et de champs                |
| `border-soft`   | `#EEF1F5`             | Séparateurs internes                           |
| `pro`           | `#977390` / `#6B4F68` | Tout ce qui touche au tarif professionnel      |

**Couleurs de statut** — un seul jeu, utilisé partout :

| Statut            | Fond      | Texte     |
| ----------------- | --------- | --------- |
| À traiter         | `#FFF8E1` | `#E65100` |
| En préparation    | `#E3F2FD` | `#1565C0` |
| Expédiée          | `#E8F5E9` | `#28a745` |
| Stock critique    | `#FDF2F2` | `#C62828` |
| Livraison offerte | `#F2FBF4` | `#1B6B33` |

Deux fonds seulement dans tout le produit : `#F7F6F0` pour les pages, `#153243`
pour la sidebar et l'en-tête client. Pas de dégradé.

### Correctif à appliquer au code

Le bouton primaire actuel est `bg-primary text-white` — du blanc sur `#80ED99`,
ratio de contraste insuffisant. Utiliser `text-on-primary` (`#153243`), déjà
défini dans la config Tailwind.

### Typographie

- **Fraunces** — titres de page, nom de la cidrerie, titres de section boutique.
  Poids 600. Réservée aux titres : jamais en corps de texte.
- **Plus Jakarta Sans** — tout le reste. 400 courant, 500 libellés, 600 accents,
  700 chiffres importants.
- **ui-monospace** — numéros de commande, IBAN, numéro de TVA. Tout identifiant
  qu'on lit caractère par caractère.

Échelle : 26px titre de page · 22px titre de section boutique · 15–16px titre de
carte · 13–14px corps · 12px libellé · 11px sur-titre en capitales
(`letter-spacing: .08em`).

Les montants portent `font-variant-numeric: tabular-nums` dès qu'ils s'alignent
en colonne.

### Formes et espacement

- Rayons : 16px cartes · 10px boutons et champs · 999px badges et pastilles
- Bordure : 1px `#E2E8EF`. Une ombre unique et discrète sur la facture
  (`0 1px 3px rgba(21,50,67,.06)`) ; ailleurs, la bordure suffit.
- Espacement sur une trame de 4px. Gouttières : 12–16px entre cartes,
  20–32px entre blocs, 28–32px de marge intérieure de page.
- Mise en page en flex/grid avec `gap`. Pas de marges compensatoires.

### Iconographie

Emoji, comme dans le code existant (`📊 📦 🍎 ⚙️ 🖨`). Choix assumé : il n'y a pas
de bibliothèque d'icônes dans le projet et l'inventaire est réduit. À remplacer
par un jeu SVG cohérent si le back-office s'étoffe.

### Images

Aucune photo n'est fournie. Les emplacements sont matérialisés par une trame
diagonale `repeating-linear-gradient` avec une légende monospace indiquant ce qui
doit venir là. Formats attendus : carré 1:1 pour les produits, 4:3 pour le
bandeau d'accueil, 800×600 minimum.

---

## 2. Règles métier portées par l'interface

Ces règles ne sont pas décoratives : elles déterminent des montants.

**Montants en centimes entiers.** Toute la maquette calcule en `Int`. Les
arrondis flottants sur une remise de 20% et une TVA de 8.1% produisent des écarts
d'un centime qui finissent sur une facture papier. Votre schéma utilise
`Decimal @db.Decimal(10,2)`, ce qui est correct sur PostgreSQL — mais le calcul
côté application doit rester entier.

**Le prix pro est dérivé, jamais saisi.** Un seul taux, stocké dans `Setting`,
appliqué à tous les produits. Le champ « prix pro » de la modale produit est en
lecture seule. Changer le taux dans Paramètres met à jour le catalogue, les
factures et la boutique simultanément.

**Le tarif pro appartient au client, pas à la commande.** Il vit sur la fiche
client et se réapplique aux commandes suivantes. La bascule sur la facture est
un rattrapage, pas le mode nominal.

**Le port est offert aux professionnels** et à partir du seuil de franco
(150 CHF par défaut). Les deux valeurs viennent de `Setting`, jamais du code —
aujourd'hui les 10 CHF sont en dur dans `Cart.tsx` et `OrderForm.tsx`, ce qui
signifie que le client voit un total et que la base en enregistre un autre.

**La TVA est incluse dans les prix affichés** et détaillée pour information.
Obligation d'indication des prix en Suisse.

**Le stock borne les quantités côté client.** Le sélecteur de la boutique ne
dépasse pas le stock réel ; à zéro, le produit affiche « Épuisé » sans bouton
d'ajout.

**Un produit désactivé disparaît de la boutique** — et sa catégorie avec lui si
elle se vide. Le compteur du bandeau d'accueil est dérivé du catalogue.

**Un produit cité dans une commande ne se supprime pas.** La maquette bloque la
suppression et l'explique. En base, cela devient un archivage.

**Le total est recalculé côté serveur.** Déjà fait dans `api/commandes` — à
conserver, et à étendre aux frais de port.

---

## 3. Back-office

Sidebar fixe de 224px sur `#153243`, contenu sur `#F7F6F0`. En-tête de page :
titre Fraunces 26px, sous-titre contextuel 14px, actions alignées à droite.

### Tableau de bord

Quatre indicateurs, puis graphique et meilleures ventes, puis alerte de stock.

- Sélecteur de période 30 j / 4 mois / 1 an : il pilote le graphique, les
  indicateurs et l'écran des ventes.
- Barres empilées privé (vert) / pro (mauve). Au survol : détail chiffré, la
  barre se surligne, les autres s'estompent.
- Meilleures ventes : au survol, bouteilles vendues, chiffre d'affaires et part
  du total.
- La carte « Chiffre d'affaires » est cliquable et mène aux commandes expédiées.
- L'alerte de stock n'apparaît que si un produit actif passe sous son seuil, et
  renvoie directement au catalogue.

Chaque indicateur porte une seconde ligne qui le qualifie (« dont 1 pro »,
« 5 références »). Un chiffre sans référent ne dit rien.

### Préparation

L'écran central du métier. Deux colonnes.

À gauche, **la liste de picking** : le total à sortir de la cave, agrégé toutes
commandes ouvertes confondues, trié par quantité décroissante. On coche en
remplissant les caisses ; le compteur « restant » descend. C'est une liste de
cave, pas une liste de commandes.

À droite, **les commandes** : une carte chacune, articles en pastilles lisibles
à distance, note de livraison, et deux actions — voir la facture, faire avancer
le statut. Le badge privé/pro est cliquable et recalcule le total en direct.

Flux à trois statuts : À traiter → En préparation → Expédiée. Une commande
expédiée quitte l'écran et sort de la liste de picking.

### Facture

Format A4 fidèle à l'impression. En-tête cidrerie et coordonnées client,
tableau des lignes, totaux alignés à droite, mentions légales en pied.

Quand le tarif pro s'applique, le prix public apparaît barré à côté du prix
appliqué — le client voit ce qu'il économise, et vous vérifiez d'un coup d'œil
que la remise est passée.

Colonne latérale : bascule privé/pro avec son explication, statut cliquable,
horodatage. Un sélecteur permet de passer d'une commande à l'autre sans revenir
en arrière.

Mention obligatoire en pied : interdiction de vente d'alcool aux mineurs.

### Catalogue

Tableau avec recherche et filtres par catégorie. Colonnes : produit, catégorie,
prix public, prix pro, stock (pastille verte / rouge / grise), interrupteur de
visibilité boutique, action modifier.

Modale d'édition : zone de dépôt d'image, nom, catégorie, millésime,
description, prix public, prix pro en lecture seule, stock, seuil d'alerte,
visibilité. Suppression en deux temps, bloquée si le produit figure dans une
commande.

### Paramètres

Trois blocs : tarifs professionnels (le taux, avec un exemple chiffré en direct),
livraison (port, franco, jours de préparation), facturation (raison sociale,
TVA, taux, IBAN). Tout se répercute immédiatement sur les autres écrans.

### Ventes expédiées

Accessible depuis la carte chiffre d'affaires. Total encaissé, part
professionnelle, panier moyen, puis la liste des commandes expédiées sur la
période avec filtre pro / particuliers et total en pied de tableau.

---

## 4. Boutique client

Aucune trace d'administration. En-tête `#153243` collant, bandeau ambre
rappelant les conditions de livraison, pied de page sombre.

### Accueil et catalogue

Bandeau : sur-titre « Récolte 2026 », titre Fraunces 46px, phrase de
positionnement, deux actions. Le compteur de références est dérivé du catalogue
réel.

Produits groupés par catégorie, trois par ligne. Chaque carte : photo, nom,
description courte, prix, sélecteur de quantité borné par le stock. Badge
« Nouveau » ou « Derniers exemplaires » quand c'est pertinent — jamais les deux.

Connecté en compte professionnel, tous les prix passent au tarif pro avec le
prix public barré, et le port devient franco.

### Panier et commande

Une seule page : lignes modifiables, formulaire de coordonnées, récapitulatif
collant à droite.

Le récapitulatif détaille sous-total, remise pro, port, TVA incluse, total. Sous
le seuil de franco, il indique ce qu'il reste à ajouter pour la livraison
offerte.

Deux cases bloquantes : **18 ans révolus** (obligation légale) et acceptation des
CGV. Le bouton reste inerte tant que le formulaire est incomplet ; les champs
manquants se surlignent à la soumission.

Champs collectés qui doivent être persistés — et qui sont aujourd'hui perdus
par l'API : date de livraison souhaitée, message de livraison, consentement
marketing.

### Confirmation

Numéro de commande, adresse de notification, récapitulatif, rappel du rythme de
préparation. Paiement sur facture : aucune carte n'est demandée, et c'est dit.

---

## 5. Écriture

Français, vouvoiement, ton du domaine — factuel, sans emphase commerciale.

- « Passer la commande », pas « Commander maintenant ! »
- Les erreurs disent quoi faire : « Complétez les champs surlignés. »
- Les confirmations disent ce qui s'est passé : « CMD-2026-0023 → En préparation »
- Les nombres sont qualifiés : « 3 commandes à traiter · 31 bouteilles »
- Pas de point d'exclamation.

Formats : `CHF 129.00` · `10 août 2026` en toutes lettres, `08.08.2026` en
tableau · `CMD-2026-0023` en monospace.

---

## 6. Comportements

**Retour immédiat.** Toute action produit une réponse visible : le toast en bas
d'écran confirme les changements de statut, les enregistrements, les bascules de
visibilité. Il disparaît seul en 2 secondes.

**États vides utiles.** Panier vide, aucun résultat de recherche, plus rien à
préparer : chacun explique la situation et propose la sortie.

**Actions destructives en deux temps.** La suppression demande confirmation en
place, dans la modale, sans boîte de dialogue système.

**Focus visible.** Contour `#5ed97f` de 2px, décalé de 2px, sur tous les éléments
interactifs.

**Impression.** La facture et la liste de picking sont conçues pour sortir sur
papier : c'est le support de travail réel à la cave.

---

## 7. À faire avant la mise en ligne

Bloquants :

1. Brancher le catalogue client sur la base — `app/page.tsx` lit encore
   `lib/data.ts` avec des identifiants `'1'`, `'2'`, que l'API ne retrouve pas.
   Toute commande réelle échoue aujourd'hui.
2. Décrémenter le stock dans une transaction Prisma à la création de commande.
3. Recalculer les frais de port côté serveur depuis `Setting`.
4. Remplacer `order.count()` par une séquence PostgreSQL pour la numérotation.
5. Persister `deliveryDate`, `message` et `acceptsMarketing`.
6. Envoyer les emails : confirmation client, notification cidrerie, avis
   d'expédition.
7. Vérification d'âge, CGV, mentions légales, conformité nLPD.

Modèle de données à compléter :

- `Customer` — le tarif pro doit persister d'une commande à l'autre
- `Order.clientType` — privé / professionnel
- `Order.shippingCost` — le port facturé, figé au moment de la commande
- `StockMovement` — l'historique des mouvements de stock
- `Product.archived` — pour ne jamais casser une facture passée

Infrastructure : Neon en développement, PostgreSQL managé Infomaniak en
production. Données clients hébergées en Suisse.
