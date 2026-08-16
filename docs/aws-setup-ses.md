# Mise en route — Emails transactionnels avec Amazon SES

Objectif : envoyer trois emails depuis la région **eu-central-2 (Zurich)**, pour
que le contenu des messages (nom et adresse des clients) reste en Suisse, comme
la base de données.

| Email                    | Déclencheur                     | Destinataire |
| ------------------------ | ------------------------------- | ------------ |
| Confirmation de commande | Commande passée sur la boutique | Le client    |
| Nouvelle commande        | Commande passée sur la boutique | La cidrerie  |
| Avis d'expédition        | Passage au statut Expédiée      | Le client    |

L'avis d'expédition porte le numéro de facture, l'IBAN, le montant et la
référence de paiement ISO 11649 : le client a tout pour régler sans rien chercher.

Le code est déjà en place. **Tant que `MAIL_FROM` est vide, rien n'est envoyé** :
les messages s'affichent dans la console du serveur de développement. C'est le
mode par défaut, et il évite d'écrire à de vraies adresses pendant les essais.

## 1. Vérifier le domaine (console, ~10 min + propagation DNS)

Console → **SES** → région **Europe (Zurich) eu-central-2** →
_Identities_ → **Create identity** :

- Type : **Domain**
- Domaine : `cidrerie-vulcain.ch`
- **Domaine MAIL FROM personnalisé** : saisir `mail`, soit
  `mail.cidrerie-vulcain.ch`. Sans lui, l'adresse d'enveloppe reste un
  sous-domaine d'`amazonses.com` et seul DKIM s'aligne avec DMARC ; avec lui,
  SPF et DKIM s'alignent tous les deux, ce qui pèse lourd chez Gmail et Outlook.
  Le MX ajouté porte sur le **sous-domaine** : la messagerie Infomaniak de
  `cidrerie-vulcain.ch` n'est pas touchée.
- Comportement en cas d'échec MX : **Utiliser le domaine MAIL FROM par défaut**.
  Un incident DNS fait alors basculer SES sur son propre domaine au lieu de
  refuser l'envoi — un problème d'email ne doit jamais bloquer une commande.
- **Easy DKIM**, longueur de clé RSA 2048
- Laisser _Publish DNS records to Route 53_ décoché (le domaine est chez
  Infomaniak)

SES affiche alors les enregistrements à créer dans la zone DNS du domaine, chez
**Infomaniak** (Manager → Domaine → Zone DNS) :

| Type  | Nom                 | Valeur                                                  |
| ----- | ------------------- | ------------------------------------------------------- |
| CNAME | `…._domainkey` (×3) | `….dkim.amazonses.com` — signature DKIM                 |
| MX    | `mail`              | `feedback-smtp.eu-central-2.amazonses.com`, priorité 10 |
| TXT   | `mail`              | `v=spf1 include:amazonses.com ~all`                     |

Ajouter aussi un **DMARC** : TXT sur `_dmarc` →
`v=DMARC1; p=none; rua=mailto:commandes@cidrerie-vulcain.ch`. Vérifier d'abord
qu'il n'en existe pas déjà un ; deux enregistrements DMARC s'annulent.

Compter de quelques minutes à quelques heures avant que SES bascule sur
_Verified_.

### Deux pièges à la saisie

**Noms relatifs.** Infomaniak attend la partie relative dans le champ « Nom » et
ajoute le domaine lui-même. Saisir `mail`, pas `mail.cidrerie-vulcain.ch` — sinon
l'enregistrement créé est `mail.cidrerie-vulcain.ch.cidrerie-vulcain.ch` et la
vérification échoue sans message clair. Idem pour les `…._domainkey` et `_dmarc`.

**Priorité du MX.** Le `10` va dans le champ « priorité » dédié, pas collé devant
le nom d'hôte dans la valeur.

### Le SPF du domaine racine ne doit pas être modifié

Grâce au domaine MAIL FROM personnalisé, l'adresse d'enveloppe est
`mail.cidrerie-vulcain.ch` : c'est le SPF de ce **sous-domaine** qui est vérifié,
celui créé ci-dessus. Le SPF de `cidrerie-vulcain.ch`, qui sert à la messagerie
Infomaniak, reste inchangé — et l'alignement DMARC fonctionne quand même, les
deux partageant le même domaine organisationnel. Ne pas y toucher évite le
classique « deux SPF sur un domaine s'invalident mutuellement ».

## 2. Demander la sortie du bac à sable (~1 jour ouvré)

Par défaut, SES n'écrit qu'à des adresses vérifiées : c'est le _sandbox_. Pour
écrire à n'importe quel client, il faut le quitter.

SES → **Account dashboard** → _Request production access_ :

- Type de messagerie : **Transactional**
- URL du site : `https://www.cidrerie-vulcain.ch`
- Description : expliquer en une fois qu'il s'agit des confirmations de commande,
  notifications internes et avis d'expédition d'une boutique de vente directe ;
  que les destinataires sont uniquement les clients ayant passé commande ; qu'il
  n'y a ni liste de diffusion ni envoi commercial ; et comment les retours et
  plaintes sont traités.
- Volume attendu : quelques dizaines de messages par mois

La demande est examinée par AWS, généralement sous 24 heures. **À lancer tôt** :
c'est le seul délai incompressible de la mise en place.

En attendant, vérifier une ou deux adresses de test (_Identities_ → Create
identity → Email address) pour pouvoir essayer de bout en bout.

## 3. Donner à l'application de quoi s'authentifier (dev uniquement)

En production, l'application utilise le **rôle IAM d'exécution** : aucune clé
n'existe nulle part. La question ne se pose donc que pour le poste de dev.

### Option recommandée : identifiants temporaires via Identity Center

Pas de secret sur le disque, et c'est la pratique courante en entreprise.

```bash
winget install -e --id Amazon.AWSCLI
aws configure sso --profile vulcain    # URL du portail, région eu-central-2
```

Puis, dans `.env`, une seule ligne remplace les clés :

```
AWS_PROFILE="vulcain"
```

Le SDK lit les identifiants temporaires du cache SSO. À l'expiration (8 à 12 h),
`aws sso login --profile vulcain` renouvelle la session par le navigateur.

Réserve : l'ensemble d'autorisations `AdministratorAccess` donne à l'application
locale plus de droits que nécessaire. Un ensemble dédié limité à SES serait plus
rigoureux si le projet se durcit.

### Option rapide : utilisateur IAM et clé statique

Défendable ici — la politique est limitée à `ses:SendEmail` sur une seule région
et `.env` est ignoré par git — mais la clé est longue durée : **la supprimer une
fois le déploiement en place**, elle ne sert alors plus à rien.

IAM → Users → Create user (`vulcain-ses-dev`) → attacher une politique en ligne :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail"],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "aws:RequestedRegion": "eu-central-2" }
      }
    }
  ]
}
```

Puis _Security credentials_ → **Create access key** → usage « Application
running outside AWS ».

## 4. Brancher l'application

Dans `.env` :

```
AWS_REGION="eu-central-2"
MAIL_FROM="commandes@cidrerie-vulcain.ch"
AWS_ACCESS_KEY_ID="AKIA…"
AWS_SECRET_ACCESS_KEY="…"
ADMIN_BASE_URL="http://localhost:3000"
```

`MAIL_FROM` doit appartenir au domaine vérifié. L'adresse de la cidrerie qui
reçoit les notifications est celle de l'écran **Paramètres**, pas une variable
d'environnement : la cidrerie peut la changer elle-même.

## 5. Vérifications

- [ ] Passer une commande de test : le client reçoit la confirmation, la cidrerie
      la notification
- [ ] Marquer la commande expédiée : l'avis part avec le numéro de facture et la
      référence `RF…`
- [ ] Ouvrir un message et vérifier qu'il s'affiche correctement sur mobile
- [ ] Vérifier dans SES → _Reputation metrics_ que les taux de rejet et de
      plainte restent à zéro
- [ ] Couper `MAIL_FROM` et confirmer qu'une commande passe toujours : un email
      qui ne part pas ne doit jamais faire échouer une commande

## Coût et plan tarifaire

Choisir le plan **Essentials** : c'est le seul sans abonnement mensuel (Pro et
Enterprise facturent 105 et 500 USD par région et par mois pour des fonctions
inutiles ici). Il revient à **0.16 USD les 1000 emails** et inclut le
gestionnaire virtuel de diffusion, qui signale si les messages partent en
indésirables. L'option « à la carte » est à peine moins chère (0.10 USD les 1000) et n'apporte pas ce suivi : l'écart se compte en millièmes de dollar au
volume de la cidrerie.

Passer les étapes facultatives, en particulier le **pool d'adresses IP dédiées**.
Une IP dédiée doit être chauffée par plusieurs milliers d'envois quotidiens pour
bâtir sa réputation ; à quelques dizaines de messages par mois elle dégraderait
la délivrabilité, là où les IP partagées de SES sont déjà bien établies.

À ce volume, la facture SES restera sous le dollar — l'essentiel du coût AWS du
projet vient de RDS.
