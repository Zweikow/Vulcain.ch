<<<<<<< HEAD
# 🍎 Formulaire de Commande - Cidrerie du Vulcain

Site web responsive pour la commande en ligne des produits de la Cidrerie du Vulcain.

## 📋 Fonctionnalités

- **Catalogue complet** : Cidres et eaux de vie avec prix et descriptions
- **Panier intelligent** : Calcul automatique des totaux et frais de livraison
- **Formulaire client** : Saisie des coordonnées avec validation
- **Envoi automatique d'emails** : Confirmation client et bon de commande
- **Design responsive** : Optimisé pour desktop, tablette et mobile
- **Protection anti-spam** : Honeypot intégré

## 🚀 Installation et Configuration

### 1. Hébergement sur GitHub Pages

1. Créez un nouveau repository GitHub
2. Uploadez tous les fichiers du projet
3. Activez GitHub Pages dans les paramètres du repository
4. Votre site sera accessible à l'adresse : `https://votre-username.github.io/nom-du-repo`

### 2. Configuration EmailJS

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
- **Client** : Email de confirmation automatique
- **Cidrerie** : Email avec bon de commande complet
- **Format** : HTML lisible avec tableau des articles

### Suivi des commandes
- Pas de base de données intégrée
- Toutes les commandes arrivent par email
- Recommandation : Utiliser un gestionnaire d'emails

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
=======
# Vulcain.ch
Ce site a pour but d'un formulaire de commande automatisé pour la Cidrerie du Vulcain
>>>>>>> 3a5b2babe00e0cd9417c977e586d1d9e703c13bf
