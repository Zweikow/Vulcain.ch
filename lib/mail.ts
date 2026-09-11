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

export type SendMailResult = {
  success: boolean
  error?: string
}

let client: SESv2Client | null = null

function getClient(): SESv2Client {
  // Priorité à SES_REGION (par défaut Zurich eu-central-2, comme prévu par docs/aws-setup-ses.md)
  // Ne pas dépendre de AWS_REGION qui vaut eu-central-1 (Francfort) sur le runtime Lambda Next.js.
  const region = process.env.SES_REGION || process.env.AWS_SES_REGION || 'eu-central-2'
  if (!client) client = new SESv2Client({ region })
  return client
}

function getMailFrom(): string {
  return process.env.MAIL_FROM || 'commandes@cidrerie-vulcain.ch'
}

/**
 * Envoie un message via Amazon SES.
 * Sans configuration SES ou en dev local, écrit le message dans la console.
 * Retourne le statut et le message d'erreur AWS exact en cas d'échec.
 */
export async function sendMail(message: MailMessage): Promise<SendMailResult> {
  const mailFrom = getMailFrom()
  if (!mailFrom) {
    if (process.env.NODE_ENV === 'production') {
      const err = 'MAIL_FROM manquant : aucun email envoyé.'
      console.error(err, { to: message.to })
      return { success: false, error: err }
    }
    console.info(
      `\n--- Email (non envoyé, SES non configuré) ---\nÀ      : ${message.to}\nObjet  : ${message.subject}\n\n${message.text}\n--- fin ---\n`
    )
    return { success: true }
  }

  try {
    await getClient().send(
      new SendEmailCommand({
        FromEmailAddress: mailFrom,
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
    return { success: true }
  } catch (error: any) {
    const errorMsg = error?.message || error?.name || String(error)
    console.error("Échec de l'envoi de l'email via Amazon SES", {
      to: message.to,
      subject: message.subject,
      error,
    })
    return { success: false, error: errorMsg }
  }
}
