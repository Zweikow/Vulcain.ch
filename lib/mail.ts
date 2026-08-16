import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

/**
 * Envoi d'emails transactionnels via Amazon SES (région eu-central-2, Zurich :
 * le contenu des messages ne quitte pas la Suisse, comme la base).
 *
 * Les identifiants viennent de la chaîne standard du SDK AWS : variables
 * d'environnement en développement, rôle IAM d'exécution en production — aucune
 * clé n'est écrite dans le code.
 */

export type MailMessage = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

let client: SESv2Client | null = null

function getClient(): SESv2Client {
  if (!client) client = new SESv2Client({ region: process.env.AWS_REGION ?? 'eu-central-2' })
  return client
}

function isConfigured(): boolean {
  return Boolean(process.env.MAIL_FROM)
}

/**
 * Envoie un message. Sans configuration SES, écrit le message dans la console
 * en développement (le travail local ne dépend pas d'AWS) et échoue bruyamment
 * en production, où un email perdu est un client perdu.
 *
 * Ne lève jamais : l'appelant décide quoi faire d'un échec. Une commande ne doit
 * pas être perdue parce que la notification n'est pas partie.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      console.error('MAIL_FROM manquant : aucun email envoyé.', { to: message.to })
      return false
    }
    console.info(
      `\n--- Email (non envoyé, SES non configuré) ---\nÀ      : ${message.to}\nObjet  : ${message.subject}\n\n${message.text}\n--- fin ---\n`
    )
    return true
  }

  try {
    await getClient().send(
      new SendEmailCommand({
        FromEmailAddress: process.env.MAIL_FROM,
        Destination: { ToAddresses: [message.to] },
        ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: message.html, Charset: 'UTF-8' },
              Text: { Data: message.text, Charset: 'UTF-8' },
            },
          },
        },
      })
    )
    return true
  } catch (error) {
    console.error("Échec de l'envoi de l'email", {
      to: message.to,
      subject: message.subject,
      error,
    })
    return false
  }
}
