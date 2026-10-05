# TODO : Retouches & Améliorations IA des Visuels Cuvées

Ce document répertorie les tâches d'amélioration visuelle à exécuter avec l'IA (`generate_image`) dès que les quotas sont disponibles.

---

## 1. Tâche Prioritaire : Contre-Étiquettes (Dos de bouteille)

### Contexte & Problème rencontré

- **Constat** : Les essais de détourage automatique par script (OpenCV/GrabCut) sur les photos de dos créaient des artefacts visuels inacceptables (cylindre tronqué, halos gris/noirs, perspective déformée, contours baveux).
- **Conséquence** : Dans le carrousel produit, l'image apparaissait mal détourée et la bouteille avant figurait en doublon.
- **Action immédiate réalisée** :
  - Suppression de l'étiquette avant en double.
  - Retrait du visuel arrière mal détouré du carrousel (`lib/cuvees-gallery.ts`).
  - Le carrousel affiche désormais uniquement les visuels conformes (Bouteille Solo Studio + Duo Face & Dos).

---

## 2. Spécification pour la génération IA (dès réinitialisation du quota)

| Élément           | Spécification                                                                                     |
| :---------------- | :------------------------------------------------------------------------------------------------ |
| **Outil**         | `generate_image` (Gemini Imagen 3)                                                                |
| **Disponibilité** | Dès réinitialisation du quota API (prochaine fenêtre après 14:17 UTC+2)                           |
| **Objectif**      | Rendu studio packshot haut de gamme de la contre-étiquette ou de la bouteille complète vue de dos |
| **Fond**          | Blanc pur (`#FFFFFF`) ou transparent                                                              |
| **Lumière**       | Douce, de type studio photographique professionnel, reflet subtil et ombre portée naturelle       |
| **Typographie**   | Nette, parfaitement alignée et fidèle au texte légal d'origine                                    |
| **Interdiction**  | Pas de détourage grossier par script, pas de découpe tronquée de bouteille                        |

---

## 3. Liste des cuvées à traiter

### A. Priorité 1 : Cuvée À Propos d'Ailes 2021 (Art. #25)

- **Photo brute source** : `public/photo-bouteilles-raw/PXL_20261001_083833116.RAW-01.jpg`
- **Cible** : `public/images/cuvees/a-propos-dailes-2021-etiquette-derriere.jpg`
- **Texte exact de l'étiquette à conserver** :
  > _Cuvée Ailes 2021_  
  > _Cidre de pomme et poire_  
  > _Cidrerie du Vulcain — Jacques Perritaz — Le Mouret, Suisse_  
  > _Fermentation naturelle sur levures indigènes, non pasteurisé, non filtré_  
  > _Alc. 7.5% vol. — 750 ml — Contient des sulfites naturels_
- **Rendu attendu** :
  - Option 1 : Bouteille complète vue de dos, ancrée au sol, bouchon ficelé visible, contre-étiquette parfaitement lisible.
  - Option 2 : Packshot studio de l'étiquette arrière à plat, texturée papier vergé crème sur fond blanc neutre.

### B. Priorité 2 : Poiré La Prémoudière 2022 (Art. #13)

- **Photo brute source** : Photo brute de dos disponible dans `public/photo-bouteilles-raw/`
- **Cible** : `public/images/cuvees/poire-la-premoudiere-2022-etiquette-derriere.jpg`
- **Rendu attendu** : Vue arrière complète ou étiquette arrière studio propre.

### C. Priorité 3 : Détourage studio IA pour les 14 autres cuvées

- Actuellement publiées avec succès avec leurs photos duo authentiques grand format (`public/photo-bouteilles-raw/`).
- Traitement IA individuel (Solo Face + Solo Dos) à programmer progressivement sans urgence, les photos authentiques actuelles étant déjà validées et esthétiques.

---

## 4. Règles de validation

1. **Validation humaine obligatoire** : Toute image générée par IA doit être inspectée avant inclusion dans `CUVEE_GALLERY_MAP`.
2. **Zéro altération destructive** : Conserver systématiquement les originaux dans `public/photo-bouteilles-raw/`.
