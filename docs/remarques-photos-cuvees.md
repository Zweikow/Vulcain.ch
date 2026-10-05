# Remarques & Diagnostic — Photographies Studio des Cuvées

**Date** : 1er octobre 2026  
**Projet** : Drinkcider.ch / Cidrerie du Vulcain  
**Branche** : `develop`  
**Interface de validation locale** : [`public/validation-photos.html`](../public/validation-photos.html)

---

## 1. Contexte & Diagnostic du problème (« Bouteilles qui volent »)

Lors de la première revue des photographies traitées, un effet irréaliste de **bouteilles qui flottent / volent** a été constaté sur la galerie de validation. Ce phénomène était causé par deux facteurs techniques distincts :

### A. Sur les photos Duo (Photo 1 — Deux bouteilles face et dos)

- **Cause** : Les détourages avaient été redimensionnés avec un centrage vertical automatique (`fit: contain` dans un cadre 896×1200). Les bouteilles flottaient de 30 à 50 pixels au-dessus de l'ombre au sol peinte sur le décor studio.
- **Statut de correction** : **Corrigé à 100% sur les 18 cuvées**. Un algorithme de détection dynamique de boîte englobante a été appliqué pour mesurer la position exacte du culot de verre et l'ancrer précisément sur la ligne de sol (`y = 1140`). Les ombres d'occlusion de contact (`#191e19`) et d'ambiance sont désormais projetées immédiatement sous la base de chaque bouteille.

### B. Sur les Photos 2 et 3 (Bouteille seule de face / Bouteille seule de dos)

- **Cause** : Dans la série de photos brutes fournies (`public/photo-all-bottle-raw`), pour 14 des 18 cuvées, seules des photos en **gros plan macro très serré sur l’étiquette** avaient été prises. Le col, le bouchon/capsule et le culot de la bouteille étaient coupés hors champ.
- En intégrant ces étiquettes tronquées dans le cadre studio 896×1200, sharp créait un « cylindre tronqué sans bouchon » flottant au milieu du vide, ce qui était visuellement inacceptable.

---

## 2. Spécification exacte des 3 photos par cuvée

Pour chaque fiche produit du site e-commerce, le triptyque visuel standardisé doit être le suivant :

| Visuel      | Type                       | Description                                                                                                                                      | Rendu attendu                                                                                   |
| :---------- | :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **Photo 1** | **Packshot Duo**           | Deux bouteilles de la même cuvée côte à côte : celle de gauche vue de dos, celle de droite vue de face.                                          | Décor studio dégradé clair, reflet subtil, double ombre de contact au sol. Format 896×1200.     |
| **Photo 2** | **Bouteille seule (Face)** | **Une seule bouteille entière** vue de face avec l'étiquette principale centrée.                                                                 | De la tête du bouchon jusqu'au culot complet, ancrée sur son ombre de contact. Format 896×1200. |
| **Photo 3** | **Bouteille seule (Dos)**  | **Une seule bouteille entière** vue de dos avec la contre-étiquette technique/légale centrée. _(Ou étiquette unique pour les bouteilles fines)._ | De la tête du bouchon jusqu'au culot complet, ancrée sur son ombre de contact. Format 896×1200. |

---

## 3. Modèle de référence conforme : _A Propos d'Ailes 2021_ (Art. #25)

Pour la cuvée **A Propos d'Ailes 2021**, le photographe avait réalisé à la fois les gros plans et les photos en plan large de la bouteille complète :

- Photo brute `PXL_20261001_083736991.RAW-01.jpg` : Duo (Photo 1)
- Photo brute `PXL_20261001_083852861.RAW-01.jpg` : Bouteille seule complète de face (Photo 2)
- Photo brute `PXL_20261001_083833116.RAW-01.jpg` : Bouteille seule complète de dos (Photo 3)

**Résultat produit** :

- `public/images/cuvees/a-propos-dailes-2021-duo.jpg` (Photo 1 Duo)
- `public/images/cuvees/a-propos-dailes-2021-etiquette-devant.jpg` (Photo 2 Face)
- `public/images/cuvees/a-propos-dailes-2021-etiquette-derriere.jpg` (Photo 3 Dos)
- `public/images/cuvees/a-propos-dailes-2021.jpg` + `.png` (Packshot catalogue unifié)

Ce modèle est consultable dans `public/validation-photos.html` et sert d'étalon visuel pour tout le catalogue.

---

## 4. Inventaire exhaustif des 18 cuvées & Photos à refaire

Au total, **29 photos simples** sont à prendre pour compléter le catalogue :

- **14 cuvées standards** × 2 photos (1 Face complète + 1 Dos complet) = **28 photos**
- **1 cuvée** (_Poiré La Prémoudière 2022_) × 1 photo (1 Dos complet) = **1 photo**
- _Botsi de glace 2017_ et _Cidre Glace Transparente 2012_ ont déjà leur bouteille seule complète de face et une étiquette panoramique unique qui fait le tour.

### Tableau récapitulatif par cuvée :

| Art. # | Slug                        | Nom de la Cuvée                      |          Photo 1 (Duo)           |  Photo 2 (Seule Face)   |           Photo 3 (Seule Dos)           | Action à mener                                |
| :----: | :-------------------------- | :----------------------------------- | :------------------------------: | :---------------------: | :-------------------------------------: | :-------------------------------------------- |
| **13** | `poire-la-premoudiere-2022` | Poiré La Prémoudière 2022            |              ✅ OK               | ✅ OK (shoot précédent) | ❌ Manquante (seul gros plan étiquette) | **Prendre 1 photo bouteille complète de dos** |
| **25** | `a-propos-dailes-2021`      | A Propos d'Ailes 2021                |              ✅ OK               |   ✅ OK (`083852861`)   |           ✅ OK (`083833116`)           | **Aucune (100% complet et conforme)**         |
| **33** | `botsi-de-glace-2017`       | Botsi de glace 2017 (37.5cl)         | 🍾 Étiquette unique (pas de duo) |   ✅ OK (`083943812`)   |           🍾 Étiquette unique           | **Aucune (bouteille fine complète)**          |
| **32** | `cidre-glace-2012`          | Cidre Glace Transparente 2012 (50cl) | 🍾 Étiquette unique (pas de duo) |   ✅ OK (`084022954`)   |           🍾 Étiquette unique           | **Aucune (bouteille fine complète)**          |
| **15** | `lande-foy-2022`            | La Lande Foy 2022                    |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **14** | `trois-pepins-2023`         | Trois Pépins 2023                    |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **22** | `la-fribourgeoise-2021`     | La Fribourgeoise 2021                |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **31** | `trois-pepins-2010`         | Trois Pépins 2010                    |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **23** | `premiers-emois-2021`       | Premiers Émois 2021                  |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **21** | `cidre-de-fer-2020`         | Cidre de Fer 2020                    |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **24** | `brute-de-rue-2021`         | Brute de Rue 2021                    |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **16** | `belle-brutale-2017`        | Belle Brutale 2017                   |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **26** | `quatre-pepins-2022`        | Quatre Pépins 2022                   |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **30** | `quatre-pepins-2023`        | Quatre Pépins 2023                   |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **28** | `turgowy-2023`              | Turgowy 2023                         |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **19** | `turgowy-2020`              | Turgowy 2020                         |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **18** | `turgowy-2019`              | Turgowy 2019                         |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |
| **29** | `baie-de-rue-2023`          | Baie de Rue 2023                     |              ✅ OK               |      ❌ Manquante       |              ❌ Manquante               | **Prendre 2 photos (1 face + 1 dos)**         |

---

## 5. Guide pratique pour la prise de vue des 29 photos

Pour garantir un détourage automatique net par Apple Vision et un rendu studio parfait :

1. **Isolement** : Poser **une seule bouteille** au centre du plateau de prise de vue.
2. **Verticalité** : Positionner l'appareil bien à niveau (éviter la plongée ou contre-plongée excessive).
3. **Cadrage complet avec marges de sécurité** :
   - Inclure impérativement la **capsule/bouchon au sommet**, le **col**, le **corps de la bouteille avec son étiquette**, et le **culot en verre posé sur le support**.
   - Laisser environ **5 à 10 cm de marge blanche/neutre** au-dessus du bouchon et sous le culot. Ne pas zoomer au ras de l'étiquette.
4. **Orientation** :
   - **Photo Face** : Étiquette principale parfaitement centrée face à l'objectif.
   - **Photo Dos** : Bouteille tournée de 180°, contre-étiquette technique/textes bien lisible et centrée.
5. **Éclairage & Fond** : Conserver le même diffuseur et le même fond clair que pour la série du 1er octobre.

---

## 6. Workflow dès réception des nouvelles photos

1. Déposer les 29 nouveaux fichiers RAW / JPEG dans le dossier `public/photo-all-bottle-raw/`.
2. Le script de traitement automatisé réalisera :
   - Le détourage haute fidélité via l'API native Apple Vision (`VNGenerateForegroundInstanceMaskRequest`).
   - L'ancrage au sol calibré à `y = 1140` avec calcul dynamique des ombres d'occlusion.
   - La génération des JPEG studio 896×1200 et des PNG transparents.
3. Mise à jour de l'interface [`public/validation-photos.html`](../public/validation-photos.html) pour ta validation finale.
4. **Seulement après ta validation formelle**, mise à jour des URLs d'images sur les fiches produits en base de données PostgreSQL.
