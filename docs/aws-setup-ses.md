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

Compter de quelques minutes à quelques heures avant que SES bascule sur
_Verified_.

Pendant que vous y êtes, deux enregistrements qui améliorent nettement la
délivrabilité — sans eux, une partie des messages finit en indésirables :

- **SPF** : ajouter `include:amazonses.com` à l'enregistrement TXT existant, ou
  le créer : `v=spf1 include:amazonses.com ~all`
- **DMARC** : TXT sur `_dmarc.cidrerie-vulcain.ch` →
  `v=DMARC1; p=none; rua=mailto:commandes@cidrerie-vulcain.ch`

Attention : s'il existe déjà un SPF pour la messagerie Infomaniak, il faut
**compléter la ligne existante**, pas en ajouter une seconde. Deux SPF sur un
domaine invalident les deux.

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

## 3. Créer l'utilisateur d'envoi (dev uniquement)

En production, l'application utilisera le **rôle IAM d'exécution** et aucune clé
ne traînera. Pour le développement local, il faut en revanche une clé — à limiter
au strict nécessaire, jamais l'utilisateur administrateur :

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
