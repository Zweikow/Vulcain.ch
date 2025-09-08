# 📋 Fonctionnalités

- **Catalogue complet** : Cidres et eaux de vie avec prix et descriptions
- **Panier intelligent** : Calcul automatique des totaux et frais de livraison
- **Formulaire client** : Saisie des coordonnées avec validation
- **Envoi automatique d'emails** : Confirmation client et bon de commande
- **Design responsive** : Optimisé pour desktop, tablette et mobile
- **Protection anti-spam** : Honeypot intégré
- **Mode sombre/clair** : Basculement dynamique avec sauvegarde des préférences
- **Favicon personnalisé** : Icône pomme 🍎 thématique pour la cidrerie
- **Logo optimisé** : Logo de la cidrerie redimensionné pour tous les appareils
- **Information livraison** : Warning permanent "Livraison Uniquement en Suisse" 🇨🇭 de Commande - Cidrerie du Vulcain

Site web responsive pour la commande en ligne des produits de la Cidrerie du Vulcain.

## 📋 Fonctionnalités

- **Catalogue complet** : Cidres et eaux de vie avec prix et descriptions
- **Panier intelligent** : Calcul automatique des totaux et frais de livraison
- **Formulaire client** : Saisie des coordonnées avec validation
- **Envoi automatique d'emails** : Confirmation client et bon de commande
- **Design responsive** : Optimisé pour desktop, tablette et mobile
- **Protection anti-spam** : Honeypot intégré
- **Mode sombre/clair** : Basculement dynamique avec sauvegarde des préférences
- **Favicon personnalisé** : Icône pomme 🍎 thématique pour la cidrerie
- **Logo optimisé** : Logo de la cidrerie redimensionné pour tous les appareils

## 🎨 Design et Interface

### Favicon et Identité Visuelle
- **Favicon pomme** : Icône SVG 🍎 qui s'affiche dans l'onglet du navigateur
- **Logo agrandi** : Logo de la cidrerie plus visible sur tous les appareils
  - Desktop : 150px × 250px
  - Tablette : 120px × 200px  
  - Mobile : 100px × 180px

### Informations de Livraison
- **Warning permanent** : "Livraison Uniquement en Suisse 🇨🇭" affiché de manière bien visible
- **Emplacement stratégique** : Dans le header du site avec design attractif  
- **Section panier** : Warning permanent type "minimum bouteilles" pour rappel constant
- **Email de confirmation** : Information clairement visible dans l'email client
- **Style cohérent** : Design rouge/orange avec icône ⚠️ pour maximum de visibilité

### Mode Sombre/Clair
- Bouton de basculement dans le header
- Sauvegarde automatique des préférences utilisateur
- Design adapté pour les deux modes

## 🚀 Installation et Configuration

### 1. Hébergement Infomaniak

Le site est hébergé chez **Infomaniak** avec une formule de base de web hosting :

- **Hébergeur** : [Infomaniak.com](https://www.infomaniak.com)
- **Formule** : Web hosting de base
- **Domaine** : `cidrerie-vulcain.ch`
- **Email personnalisé** : `commandes@cidrerie-vulcain.ch`

#### Configuration de l'hébergement
1. Le site est déployé directement sur le serveur Infomaniak
2. Les fichiers HTML, CSS et JavaScript sont uploadés via FTP/SFTP
3. L'adresse email personnalisée `commandes@cidrerie-vulcain.ch` est configurée
4. L'administrateur du site a accès à cette boîte email pour récupérer toutes les commandes

#### Avantages de cette configuration
- **Email professionnel** : Les commandes arrivent sur `commandes@cidrerie-vulcain.ch`
- **Hébergement suisse** : Serveurs locaux pour de meilleures performances
- **Support technique** : Assistance Infomaniak disponible
- **Sauvegarde automatique** : Protection des données incluse

### 2. Configuration EmailJS

#### Configuration des Emails de Commande
Le système d'emails utilise **EmailJS** avec une approche optimisée :

- **Email client** : Confirmation automatique envoyée au client
- **Email administrateur** : Copie de la commande envoyée via **Bcc** à `commandes@cidrerie-vulcain.ch`
- **Une seule transmission** : Évite la duplication et optimise les quotas EmailJS

#### Configuration Bcc dans EmailJS
1. Dans votre template EmailJS, ajoutez le champ **Bcc**
2. Définissez la valeur : `commandes@cidrerie-vulcain.ch`
3. Cette adresse recevra automatiquement une copie de chaque commande

#### Étape 1 : Créer un compte EmailJS
1. Rendez-vous sur [EmailJS.com](https://www.emailjs.com/)
2. Créez un compte gratuit
3. Vérifiez votre email

#### Étape 2 : Configurer le service email
1. Dans le dashboard EmailJS, allez dans "Email Services"
2. Ajoutez votre service email (Gmail, Outlook, etc.)
3. Suivez les instructions pour connecter votre compte

#### Étape 3 : Créer un template
1. Allez dans "Email Templates"
2. Créez un nouveau template
3. Utilisez le contenu du fichier `email-template.html` comme base
4. Personnalisez selon vos besoins

#### Étape 4 : Configurer les clés
1. Dans le dashboard, notez votre :
   - Service ID
   - Template ID
   - Public Key
2. Ouvrez le fichier `script.js`
3. Remplacez les valeurs dans `EMAILJS_CONFIG` :

```javascript
const EMAILJS_CONFIG = {
    serviceId: 'votre_service_id',
    templateId: 'votre_template_id',
    publicKey: 'votre_public_key'
};
```

### 3. Personnalisation du catalogue

Pour modifier les produits, éditez la constante `PRODUITS` dans `script.js` :

```javascript
const PRODUITS = {
    cidres: [
        {
            id: 'nouveau-cidre',
            nom: 'Nouveau Cidre',
            annee: '2024',
            prix: 8.50,
            description: 'Description du nouveau cidre'
        }
        // ... autres cidres
    ],
    eauxDeVie: [
        // ... eaux de vie
    ]
};
```

## 📧 Configuration des emails

### Template EmailJS

Le template email utilise des variables dynamiques :

- `{{nom}}`, `{{prenom}}` : Nom du client
- `{{email}}`, `{{telephone}}` : Contact
- `{{adresse}}`, `{{npa}}`, `{{lieu}}` : Adresse
- `{{articles}}` : Liste des articles commandés
- `{{totalGeneral}}` : Total de la commande
- `{{date}}`, `{{heure}}` : Date et heure de commande

### Personnalisation des emails

1. Modifiez le fichier `email-template.html`
2. Copiez le contenu dans votre template EmailJS
3. Ajustez les variables selon vos besoins

## 🛡️ Sécurité

### Protection anti-spam
- **Honeypot** : Champ caché pour détecter les bots
- **Validation côté client** : Vérification des champs obligatoires
- **Limitation EmailJS** : Quotas gratuits (200 emails/mois)

### Recommandations
- Surveillez les quotas EmailJS
- Considérez une solution payante pour un volume important
- Ajoutez reCAPTCHA si nécessaire (optionnel)

## 📱 Responsive Design

Le site s'adapte automatiquement à :
- **Desktop** : Affichage en grille optimisé
- **Tablette** : Adaptation des colonnes
- **Mobile** : Interface simplifiée et tactile

## 🎨 Personnalisation du design

### Couleurs
Les couleurs sont définies dans `styles.css` avec des variables CSS :

```css
:root {
    --vert-naturel: #4a7c59;
    --vert-clair: #6b8e6b;
    --brun-terre: #8b4513;
    --beige-chaud: #f5f5dc;
    /* ... autres couleurs */
}
```

### Modifier les couleurs
1. Changez les valeurs des variables CSS
2. Redéployez sur GitHub Pages
3. Les changements sont immédiats

## 📊 Gestion des commandes

### Réception des commandes
- **Client** : Email de confirmation automatique envoyé à l'adresse fournie
- **Cidrerie** : Toutes les commandes arrivent sur `commandes@cidrerie-vulcain.ch`
- **Format** : Email HTML lisible avec tableau détaillé des articles commandés
- **Accès** : L'administrateur du site consulte la boîte email pour traiter les commandes

### Suivi des commandes
- **Centralisation** : Toutes les commandes dans une seule boîte email professionnelle
- **Organisation** : Possibilité de créer des dossiers/labels pour trier les commandes
- **Archivage** : Conservation automatique de l'historique des commandes
- **Notifications** : Alerte email immédiate à chaque nouvelle commande

### Processus de traitement
1. **Réception** : Commande reçue sur `commandes@cidrerie-vulcain.ch`
2. **Traitement** : L'administrateur traite la commande manuellement
3. **Confirmation** : Contact direct avec le client si nécessaire
4. **Livraison** : Organisation selon les informations fournies

## 🔧 Maintenance

### Mise à jour des prix
1. Modifiez les prix dans `script.js`
2. Commitez et poussez sur GitHub
3. Les changements sont automatiquement déployés

### Ajout de produits
1. Ajoutez le nouveau produit dans `PRODUITS`
2. Respectez la structure existante
3. Testez avant déploiement

### Surveillance
- Vérifiez régulièrement les quotas EmailJS
- Surveillez les emails de commande
- Testez le formulaire périodiquement

## 🚨 Dépannage

### Problèmes courants

**Les emails ne s'envoient pas :**
- Vérifiez la configuration EmailJS
- Contrôlez les quotas
- Vérifiez les clés dans `script.js`

**Le design ne s'affiche pas :**
- Vérifiez que `styles.css` est bien chargé
- Contrôlez la console du navigateur
- Vérifiez les chemins des fichiers

**Le panier ne fonctionne pas :**
- Vérifiez que `script.js` est chargé
- Contrôlez la console pour les erreurs
- Vérifiez la structure des produits

### Support
Pour toute question technique, consultez :
- [Documentation EmailJS](https://www.emailjs.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## 📈 Évolutions possibles

### Court terme
- Ajout de reCAPTCHA
- Export CSV des commandes
- Statistiques de commandes

### Moyen terme
- Intégration avec un CRM
- Génération de PDF
- Système de paiement en ligne

### Long terme
- Application mobile
- Gestion des stocks
- Interface d'administration

## 📄 Licence

Ce projet est développé pour la Cidrerie du Vulcain. Tous droits réservés.

---

**Développé avec ❤️ pour la Cidrerie du Vulcain**

## 📝 Changelog Récent

### Version Septembre 8, 2025 - Améliorations Visuelles et Fonctionnelles

#### ✅ Améliorations Visuelles Terminées
- **Favicon pomme 🍎** : Icône SVG personnalisée dans les onglets navigateur
- **Logo agrandi** : Redimensionnement optimal pour tous les appareils (150x250px desktop)
- **Correction DOCTYPE** : Fix de la syntaxe HTML corrompue
- **Nettoyage titre** : Suppression des emojis superflus du titre de page

#### ✅ Système de Livraison Optimisé
- **Warning permanent** : "Livraison Uniquement en Suisse 🇨🇭" visible partout
- **Header du site** : Information avec drapeau suisse et design attractif
- **Section panier** : Warning type "minimum bouteilles" permanent et visible
- **Email template** : Warning intégré dans l'email de confirmation client
- **Design cohérent** : Style rouge/orange avec animation pour maximum de visibilité

#### ✅ Optimisations Email Système
- **Configuration Bcc** : Solution unique pour notification administrateur
- **Template simplifié** : Format texte simple compatible tous clients email
- **Variables nettoyées** : Suppression des éléments complexes causant des erreurs
- **Header épuré** : Retrait ligne "De: Cidrerie du Vulcain" dans les emails

#### ✅ Gestion de Version
- **Commits organisés** : Messages descriptifs pour chaque modification
- **Repository synchronisé** : Toutes les modifications pushées sur GitHub
- **Documentation à jour** : README.md enrichi avec toutes les modifications

#### 🔧 Configurations Techniques Appliquées
- **EmailJS Bcc** : `commandes@cidrerie-vulcain.ch` configuré pour réception copies
- **CSS responsive** : Styles adaptés mobile/tablette/desktop pour tous les éléments
- **Mode sombre** : Support maintenu pour tous les nouveaux éléments
- **Performance** : Suppression du CSS inutilisé (ancien bandeau complexe)

#### 📊 Résultats Obtenus
- **Visibilité maximale** : Information livraison impossible à manquer
- **Professionnalisme** : Design cohérent et épuré sur site et emails
- **Compatibilité email** : Format simple fonctionnel sur tous les clients
- **UX améliorée** : Favicon et logo plus visibles, information claire
- **Maintenance simplifiée** : Code nettoyé et optimisé

### Prochaines Évolutions Possibles
- **Tests utilisateurs** : Validation du nouveau système d'avertissement
- **Statistiques commandes** : Suivi de l'impact des modifications
- **Optimisations supplémentaires** : Selon retours d'expérience
