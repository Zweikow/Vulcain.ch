# Design — Promo été "3 cartons achetés 2 payés"

**Date :** 2026-05-02  
**Produit concerné :** Cidre Effervescence 2022 (`cidre-effervescence`)  
**Fichiers modifiés :** `script.js`, `index.html`

---

## Contexte

Le client souhaite une promotion estivale sur le Cidre Effervescence 2022 :  
**3 cartons achetés → 2 payés** (1 carton offert par tranche de 3).  
La remise doit s'appliquer automatiquement au terminal de commande, sans action manuelle du client.

---

## Données produit

Le produit `cidre-effervescence` reçoit deux champs supplémentaires dans `PRODUITS.offreSpecial` :

```js
{
  id: 'cidre-effervescence',
  nom: 'Cidre Effervescence 2022',
  prix: 3.60,           // prix par bouteille (inchangé)
  uniteCommande: 24,    // 1 unité de commande = 1 carton = 24 bouteilles
  promo: { type: 'xPourY', achat: 3, paie: 2 }
}
```

Le panier stocke le nombre de **cartons** (entiers ≥ 0) pour ce produit.

---

## Interface produit

- Les boutons +/− incrémentent par **carton** (1, 2, 3…)
- Badge fixe sous le contrôle : **"1 carton = 24 bouteilles"**
- Prix affiché sur la fiche : `3.60 CHF / bouteille` — inchangé

---

## Calcul de la remise

Fonction centralisée `calculerRemisePromo(produit, qteCartons)` dans `script.js` :

```
cartonsGratuits = Math.floor(qteCartons / promo.achat) × (promo.achat - promo.paie)
remise          = cartonsGratuits × uniteCommande × prix
```

Exemples :

| Cartons commandés | Cartons gratuits | Remise appliquée |
|:-----------------:|:----------------:|:----------------:|
| 1 | 0 | 0.00 CHF |
| 2 | 0 | 0.00 CHF |
| 3 | 1 | − 86.40 CHF |
| 6 | 2 | − 172.80 CHF |
| 9 | 3 | − 259.20 CHF |

---

## Affichage au panier (`mettreAJourPanier`)

Si la remise est > 0, une ligne dédiée s'insère après la ligne produit :

```
Cidre Effervescence 2022    3 cartons × 86.40 CHF    259.20 CHF
🎁 Promo été (1 carton offert)                       − 86.40 CHF
```

- Le sous-total et le total sont calculés **après déduction** de la remise.
- La remise est également déduite dans `calculerTotal()` (utilisé à l'envoi).

---

## PDF facture (`genererFacturePDF`)

- Une ligne supplémentaire est ajoutée dans le tableau des produits :  
  `🎁 Promo été — 1 carton offert` | | | `− XX.XX CHF`
- Le sous-total sur la facture reflète la remise déduite.

---

## Email de confirmation

Le bloc `panierTexte` (admin et client) inclut la ligne de remise :

```
• Cidre Effervescence 2022
  3 cartons (72 bouteilles) à 86.40 CHF = 259.20 CHF
  🎁 Promo été (1 carton offert) : − 86.40 CHF
```

---

## Ce qui ne change pas

- Le prix unitaire par bouteille (3.60 CHF) n'est pas modifié.
- Les autres produits (cidres, eaux-de-vie) ne sont pas affectés.
- La logique de livraison gratuite (≥ 24 bouteilles) est calculée sur le nombre total de bouteilles réelles commandées (cartons × 24).

---

## Périmètre

Modifications limitées à `script.js` et `index.html`. Aucune nouvelle dépendance. Aucun backend.
