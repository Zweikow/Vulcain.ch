# Promo été — 3 cartons achetés 2 payés — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la promotion "3 cartons achetés 2 payés" sur le Cidre Effervescence 2022, avec commande par carton, remise automatique visible dans le panier, le PDF et les emails.

**Architecture:** Toutes les modifications sont dans `script.js` (vanilla JS). La quantité dans `panier` représente des cartons pour les produits avec `uniteCommande`. Une fonction centralisée `calculerRemisePromo()` est appelée partout où un total est calculé.

**Tech Stack:** Vanilla JS, jsPDF + jspdf-autotable (PDF), EmailJS (email client), FormSubmit (email admin)

---

## Fichiers modifiés

- `script.js` — données produit, calcul remise, panier, PDF, email

---

## Task 1 : Ajouter les métadonnées promo au produit

**Fichier :** `script.js:23-25`

- [ ] **Étape 1 : Mettre à jour le produit cidre-effervescence** (`script.js:23-25`)

Remplacer le bloc `offreSpecial` par :

```js
offreSpecial: [
    {
        id: 'cidre-effervescence',
        nom: 'Cidre Effervescence 2022',
        prix: 3.60,
        description: 'Bouteille de 27.5cl, carton de 24 bouteilles, 3 cartons achetés 2 payés.',
        uniteCommande: 24,
        promo: { type: 'xPourY', achat: 3, paie: 2 }
    }
],
```

- [ ] **Étape 2 : Vérifier en console navigateur**

Ouvrir `index.html`, F12, taper :
```js
produitsData['cidre-effervescence']
// Attendu : objet avec uniteCommande: 24 et promo: { type: 'xPourY', achat: 3, paie: 2 }
```

- [ ] **Étape 3 : Commit**
```bash
git add script.js
git commit -m "feat: ajouter métadonnées promo (uniteCommande, promo) sur Cidre Effervescence"
```

---

## Task 2 : Ajouter `calculerRemisePromo()`

**Fichier :** `script.js` — insérer après la fermeture de `initialiserProduits()` (après la ligne 77)

- [ ] **Étape 1 : Insérer la fonction**

```js
function calculerRemisePromo(produit, qteCartons) {
    if (!produit.promo || produit.promo.type !== 'xPourY') return 0;
    const cartonsGratuits = Math.floor(qteCartons / produit.promo.achat) * (produit.promo.achat - produit.promo.paie);
    return cartonsGratuits * (produit.uniteCommande || 1) * produit.prix;
}
```

- [ ] **Étape 2 : Vérifier en console navigateur**

```js
const p = produitsData['cidre-effervescence'];
console.assert(calculerRemisePromo(p, 0) === 0, 'KO 0 carton');
console.assert(calculerRemisePromo(p, 2) === 0, 'KO 2 cartons');
console.assert(Math.abs(calculerRemisePromo(p, 3) - 86.40) < 0.01, 'KO 3 cartons');
console.assert(Math.abs(calculerRemisePromo(p, 6) - 172.80) < 0.01, 'KO 6 cartons');
console.log('calculerRemisePromo OK');
```

- [ ] **Étape 3 : Commit**
```bash
git add script.js
git commit -m "feat: ajouter calculerRemisePromo() — logique xPourY centralisée"
```

---

## Task 3 : Mettre à jour `creerElementProduit` — badge carton

**Fichier :** `script.js:103-120`

- [ ] **Étape 1 : Remplacer la fonction `creerElementProduit` entière**

```js
function creerElementProduit(produit) {
    const div = document.createElement('div');
    div.className = 'product-card';
    const prixLabel = produit.uniteCommande
        ? `${produit.prix.toFixed(2)} CHF / bouteille`
        : `${produit.prix.toFixed(2)} CHF`;
    const badgeCarton = produit.uniteCommande
        ? `<div class="carton-badge">1 carton = ${produit.uniteCommande} bouteilles</div>`
        : '';
    div.innerHTML = `
        <div class="product-info">
            <h4 class="product-name">${produit.nom}</h4>
            ${produit.annee ? `<span class="product-year">${produit.annee}</span>` : ''}
            <p class="product-description">${produit.description}</p>
            <div class="product-price">${prixLabel}</div>
        </div>
        <div class="product-controls">
            <button class="btn-quantity" onclick="modifierQuantite('${produit.id}', -1)">-</button>
            <input type="number" id="qty-${produit.id}" class="quantity-input" value="0" min="0" onchange="modifierQuantite('${produit.id}', 0, this.value)">
            <button class="btn-quantity" onclick="modifierQuantite('${produit.id}', 1)">+</button>
            ${badgeCarton}
        </div>
    `;
    return div;
}
```

- [ ] **Étape 2 : Vérifier visuellement**

La fiche "Cidre Effervescence 2022" affiche `3.60 CHF / bouteille` et le badge `1 carton = 24 bouteilles`. Les autres produits n'ont pas de badge.

- [ ] **Étape 3 : Commit**
```bash
git add script.js
git commit -m "feat: badge '1 carton = 24 bouteilles' sur produits avec uniteCommande"
```

---

## Task 4 : Mettre à jour `mettreAJourPanier()` — totaux et affichage remise

**Fichier :** `script.js:122-196`

- [ ] **Étape 1 : Remplacer le bloc de calcul des totaux** (début de la fonction)

Remplacer :
```js
    let totalProduits = 0;
    let totalBouteilles = 0;

    Object.entries(panier).forEach(([id, quantite]) => {
        const produit = produitsData[id];
        if (produit) {
            totalProduits += produit.prix * quantite;
            totalBouteilles += quantite;
        }
    });
```

Par :
```js
    let totalProduits = 0;
    let totalRemise = 0;
    let totalBouteilles = 0;

    Object.entries(panier).forEach(([id, quantite]) => {
        const produit = produitsData[id];
        if (produit) {
            const unite = produit.uniteCommande || 1;
            totalProduits += produit.prix * quantite * unite;
            totalBouteilles += quantite * unite;
            totalRemise += calculerRemisePromo(produit, quantite);
        }
    });
```

- [ ] **Étape 2 : Appliquer la remise au total général**

Remplacer :
```js
    const totalGeneral = totalProduits + fraisLivraison;
```

Par :
```js
    const totalGeneral = totalProduits - totalRemise + fraisLivraison;
```

- [ ] **Étape 3 : Mettre à jour l'affichage du sous-total**

Remplacer :
```js
    sousTotal.textContent = `${totalProduits.toFixed(2)} CHF`;
```

Par :
```js
    sousTotal.textContent = totalRemise > 0
        ? `${totalProduits.toFixed(2)} CHF − ${totalRemise.toFixed(2)} CHF = ${(totalProduits - totalRemise).toFixed(2)} CHF`
        : `${totalProduits.toFixed(2)} CHF`;
```

- [ ] **Étape 4 : Remplacer le bloc HTML des items du panier**

Remplacer le bloc `panierItems.innerHTML = Object.entries(panier).map(...)` par :

```js
    panierItems.innerHTML = Object.entries(panier).map(([id, quantite]) => {
        const produit = produitsData[id];
        if (!produit) return '';
        const unite = produit.uniteCommande || 1;
        const sousTotalItem = produit.prix * quantite * unite;
        const remiseItem = calculerRemisePromo(produit, quantite);
        const cartonsGratuits = remiseItem > 0
            ? Math.floor(quantite / produit.promo.achat) * (produit.promo.achat - produit.promo.paie)
            : 0;
        const ligneRemise = remiseItem > 0
            ? '<div class="panier-item panier-remise"><div class="item-info"><span class="item-name">Promo ete (' + cartonsGratuits + ' carton' + (cartonsGratuits > 1 ? 's' : '') + ' offert' + (cartonsGratuits > 1 ? 's' : '') + ')</span></div><div class="item-total">- ' + remiseItem.toFixed(2) + ' CHF</div></div>'
            : '';
        const labelQuantite = produit.uniteCommande
            ? `${quantite} carton${quantite > 1 ? 's' : ''} (${quantite * unite} bouteilles) x ${(produit.prix * unite).toFixed(2)} CHF`
            : `${produit.prix.toFixed(2)} CHF x ${quantite}`;
        return '
