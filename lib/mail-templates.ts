import { formatCHF } from '@/lib/money'
import { creditorReference, formatCreditorReference } from '@/lib/reference'
import type { MailMessage } from '@/lib/mail'

/**
 * Gabarits des emails transactionnels.
 * Français, vouvoiement, ton factuel sans emphase commerciale, pas de point
 * d'exclamation (DESIGN.md §5). Styles en ligne et tableaux : les clients de
 * messagerie ignorent les feuilles externes et la plupart des sélecteurs.
 */

export type MailOrder = {
  numero: string
  invoiceNumber: string | null
  clientName: string
  clientEmail: string
  address: string
  npa: string
  city: string
  deliveryDate: Date | null
  message: string | null
  subtotalCents: number
  discountCents: number
  shippingCents: number
  totalCents: number
  items: { productName: string; quantity: number; unitPriceCents: number }[]
}

export type MailSettings = {
  companyName: string
  contactName: string
  companyAddress: string
  companyZipCity: string
  contactEmail: string
  prepDays: number
  iban: string
  bankName: string
  paymentTermsDays: number
}

const longDate = new Intl.DateTimeFormat('fr-CH', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shell(title: string, body: string, settings: MailSettings): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#F7F6F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#4A6278;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8EF;border-radius:12px;">
  <tr><td style="padding:20px 24px;background:#153243;border-radius:12px 12px 0 0;">
    <div style="color:#FFFFFF;font-size:17px;font-weight:600;">${escapeHtml(settings.companyName)}</div>
    <div style="color:#B9CBD8;font-size:12px;margin-top:2px;">${escapeHtml(settings.companyZipCity)}</div>
  </td></tr>
  <tr><td style="padding:24px;font-size:14px;line-height:1.6;">${body}</td></tr>
  <tr><td style="padding:16px 24px;border-top:1px solid #EEF1F5;font-size:11px;color:#7A95A5;">
    ${escapeHtml(settings.companyName)} · ${escapeHtml(settings.companyAddress)}, ${escapeHtml(settings.companyZipCity)} · ${escapeHtml(settings.contactEmail)}<br>
    La vente d'alcool est interdite aux mineurs.
  </td></tr>
</table>
</body></html>`
}

function itemsHtml(order: MailOrder): string {
  const rows = order.items
    .map(
      (item) => `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #EEF1F5;">${escapeHtml(item.productName)}</td>
      <td style="padding:6px 0;border-bottom:1px solid #EEF1F5;text-align:right;">${item.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px solid #EEF1F5;text-align:right;">${formatCHF(item.unitPriceCents * item.quantity)}</td>
    </tr>`
    )
    .join('')

  const shipping = order.shippingCents === 0 ? 'Offerts' : formatCHF(order.shippingCents)

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin:12px 0;">
    <tr style="color:#7A95A5;font-size:11px;text-transform:uppercase;letter-spacing:.06em;">
      <td style="padding-bottom:4px;">Article</td><td style="padding-bottom:4px;text-align:right;">Qté</td><td style="padding-bottom:4px;text-align:right;">Montant</td>
    </tr>
    ${rows}
    <tr><td colspan="2" style="padding:6px 0;">Frais de port</td><td style="padding:6px 0;text-align:right;">${shipping}</td></tr>
    <tr><td colspan="2" style="padding:6px 0;font-weight:700;color:#153243;">Total</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#153243;">${formatCHF(order.totalCents)}</td></tr>
  </table>`
}

function itemsText(order: MailOrder): string {
  const lines = order.items.map(
    (i) => `  ${i.quantity} × ${i.productName} — ${formatCHF(i.unitPriceCents * i.quantity)}`
  )
  lines.push(
    `  Frais de port — ${order.shippingCents === 0 ? 'offerts' : formatCHF(order.shippingCents)}`
  )
  lines.push(`  Total — ${formatCHF(order.totalCents)}`)
  return lines.join('\n')
}

/** 1. Confirmation envoyée au client dès la commande passée. */
export function orderConfirmation(order: MailOrder, settings: MailSettings): MailMessage {
  const body = `
    <p style="margin:0 0 12px;">Bonjour ${escapeHtml(order.clientName)},</p>
    <p style="margin:0 0 12px;">Nous avons bien reçu votre commande <strong style="font-family:monospace;color:#153243;">${order.numero}</strong>. Voici son récapitulatif.</p>
    ${itemsHtml(order)}
    <p style="margin:12px 0 0;">Votre commande est préparée sous ${settings.prepDays} jours ouvrés. Vous recevrez un message dès son expédition, accompagné de la facture.</p>
    <p style="margin:12px 0 0;">Le paiement se fait sur facture : aucune carte n'est demandée.</p>
    <p style="margin:16px 0 0;">Cidricolement,<br>${escapeHtml(settings.contactName)}</p>`

  const text = `Bonjour ${order.clientName},

Nous avons bien reçu votre commande ${order.numero}. Voici son récapitulatif.

${itemsText(order)}

Votre commande est préparée sous ${settings.prepDays} jours ouvrés. Vous recevrez
un message dès son expédition, accompagné de la facture.

Le paiement se fait sur facture : aucune carte n'est demandée.

Cidricolement,
${settings.contactName}
${settings.companyName} — ${settings.companyZipCity}`

  return {
    to: order.clientEmail,
    replyTo: settings.contactEmail,
    subject: `Votre commande ${order.numero} — ${settings.companyName}`,
    html: shell('Confirmation de commande', body, settings),
    text,
  }
}

/** 2. Notification à la cidrerie : c'est ce message qui déclenche le travail. */
export function shopNotification(
  order: MailOrder,
  settings: MailSettings,
  adminUrl: string | null
): MailMessage {
  const details = [
    `${order.clientName} · ${order.clientEmail}`,
    `${order.address}, ${order.npa} ${order.city}`,
    order.deliveryDate ? `Livraison souhaitée : ${longDate.format(order.deliveryDate)}` : null,
    order.message ? `Message : ${order.message}` : null,
  ].filter(Boolean) as string[]

  const body = `
    <p style="margin:0 0 12px;">Nouvelle commande <strong style="font-family:monospace;color:#153243;">${order.numero}</strong>.</p>
    <p style="margin:0 0 12px;">${details.map(escapeHtml).join('<br>')}</p>
    ${itemsHtml(order)}
    ${adminUrl ? `<p style="margin:16px 0 0;"><a href="${adminUrl}" style="background:#80ED99;color:#153243;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:10px;display:inline-block;">Ouvrir dans le back-office</a></p>` : ''}`

  const text = `Nouvelle commande ${order.numero}.

${details.join('\n')}

${itemsText(order)}
${adminUrl ? `\nBack-office : ${adminUrl}` : ''}`

  return {
    to: settings.contactEmail,
    replyTo: order.clientEmail,
    subject: `Nouvelle commande ${order.numero} · ${formatCHF(order.totalCents)}`,
    html: shell('Nouvelle commande', body, settings),
    text,
  }
}

/** 3. Avis d'expédition, avec tout ce qu'il faut au client pour payer. */
export function shippingNotice(order: MailOrder, settings: MailSettings): MailMessage {
  const due = new Date()
  due.setDate(due.getDate() + settings.paymentTermsDays)
  const reference = order.invoiceNumber
    ? formatCreditorReference(creditorReference(order.invoiceNumber))
    : null

  const payment = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;background:#F7F6F0;border-radius:10px;margin:12px 0;">
      <tr><td style="padding:12px 14px;">
        ${order.invoiceNumber ? `Facture <strong style="font-family:monospace;">${order.invoiceNumber}</strong><br>` : ''}
        Montant : <strong>${formatCHF(order.totalCents)}</strong><br>
        IBAN : <span style="font-family:monospace;">${escapeHtml(settings.iban)}</span><br>
        ${escapeHtml(settings.bankName)}<br>
        ${reference ? `Référence : <span style="font-family:monospace;">${reference}</span><br>` : ''}
        À payer d'ici au ${longDate.format(due)}.
      </td></tr>
    </table>`

  const body = `
    <p style="margin:0 0 12px;">Bonjour ${escapeHtml(order.clientName)},</p>
    <p style="margin:0 0 12px;">Votre commande <strong style="font-family:monospace;color:#153243;">${order.numero}</strong> vient d'être expédiée.</p>
    ${payment}
    <p style="margin:12px 0 0;">${reference ? "Merci d'indiquer la référence lors du virement : elle nous permet d'identifier votre paiement." : "Merci d'indiquer le numéro de facture lors du virement."}</p>
    <p style="margin:16px 0 0;">Bonne dégustation.</p>
    <p style="margin:12px 0 0;">Cidricolement,<br>${escapeHtml(settings.contactName)}</p>`

  const text = `Bonjour ${order.clientName},

Votre commande ${order.numero} vient d'être expédiée.

${order.invoiceNumber ? `Facture : ${order.invoiceNumber}\n` : ''}Montant : ${formatCHF(order.totalCents)}
IBAN : ${settings.iban}
${settings.bankName}
${reference ? `Référence : ${reference}\n` : ''}À payer d'ici au ${longDate.format(due)}.

${reference ? "Merci d'indiquer la référence lors du virement : elle nous permet d'identifier votre paiement." : "Merci d'indiquer le numéro de facture lors du virement."}

Bonne dégustation.

Cidricolement,
${settings.contactName}`

  return {
    to: order.clientEmail,
    replyTo: settings.contactEmail,
    subject: `Votre commande ${order.numero} est expédiée`,
    html: shell("Avis d'expédition", body, settings),
    text,
  }
}
