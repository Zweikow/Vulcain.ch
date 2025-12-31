# 🚀 Configuration FormSubmit - Solution Hybride

## 📋 Étapes de configuration :

### 1️⃣ **Obtenir la clé d'accès FormSubmit**

1. Va sur https://formsubmit.co/
2. Dans le champ "your@email.com", tape: `commandes@cidrerie-vulcain.ch`
3. Copie le code suivant et teste-le :

```html
<form action="https://formsubmit.co/commandes@cidrerie-vulcain.ch" method="POST" enctype="multipart/form-data">
    <input type="email" name="email" value="test@test.com" required>
    <input type="text" name="name" value="Test FormSubmit" required>
    <input type="file" name="attachment">
    <button type="submit">Test</button>
</form>
```

### 2️⃣ **Première soumission de confirmation**

- Lors du premier envoi, FormSubmit va envoyer un email de confirmation à `commandes@cidrerie-vulcain.ch`
- **Tu DOIS cliquer sur le lien de confirmation** dans cet email
- Après confirmation, tous les futurs emails arriveront directement

### 3️⃣ **Clé d'accès optionnelle (recommandée)**

Après le premier test réussi, tu peux demander une clé d'accès pour masquer ton email :

1. Envoie un email à support@formsubmit.co avec :
   ```
   Sujet: Access Key Request
   Email: commandes@cidrerie-vulcain.ch
   ```

2. Ils t'enverront une clé du type : `abc123-def456-ghi789`

3. Remplace dans `script.js` ligne ~408 :
   ```javascript
   formData.append('access_key', 'ta-cle-formsubmit-ici');
   ```

### 4️⃣ **Test de la solution hybride**

Une fois configuré :

✅ **Admin (toi)** recevra via FormSubmit :
- Email simple avec toutes les infos
- **PDF de facture en pièce jointe** 📎
- Format pratique pour traitement

✅ **Client** recevra via EmailJS :
- **Magnifique template HTML** avec logo
- Confirmation professionnelle
- Pas de PDF (évite la confusion)

## 🎯 **Avantages de cette solution :**

- 💰 **100% GRATUIT** pour les deux services
- 📎 **PDF en pièce jointe** pour l'admin
- 🎨 **Template professionnel** pour le client
- 🚀 **Illimité** - pas de limite de 200 emails
- 🔧 **Simple à maintenir**

## ⚙️ **Configuration actuelle :**

- FormSubmit URL: `https://formsubmit.co/commandes@cidrerie-vulcain.ch`
- EmailJS reste identique pour les confirmations client
- Génération PDF : jsPDF (comme avant)

## 🧪 **Pour tester :**

1. Configure FormSubmit (étapes 1-2)
2. Fait une commande test sur ton site  
3. Vérifie que tu reçois 2 emails :
   - FormSubmit (avec PDF) sur `commandes@cidrerie-vulcain.ch`
   - EmailJS (template HTML) sur l'email du client

## 🆘 **En cas de problème :**

- Vérifier les logs console (F12)
- S'assurer que FormSubmit est confirmé
- Tester FormSubmit séparément d'abord
