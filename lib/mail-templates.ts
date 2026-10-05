import { formatCHF } from '@/lib/money'
import { creditorReference, formatCreditorReference } from '@/lib/reference'
import { getSiteUrl, SITE_CONFIG } from '@/lib/site'
import type { MailMessage } from '@/lib/mail'

/**
 * Gabarits des emails transactionnels pour Drinkcider.
 * Français, vouvoiement, ton chaleureux et professionnel.
 * Styles en ligne et balisage compatible avec tous les clients de messagerie.
 */

export type MailOrder = {
  id?: string
  numero: string
  invoiceNumber: string | null
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  address: string
  npa: string
  city: string
  deliveryDate: Date | null
  message: string | null
  subtotalCents: number
  discountCents: number
  shippingCents: number
  totalCents: number
  trackingNumber?: string | null
  carrier?: string | null
  isPickup?: boolean
  items: {
    productName: string
    quantity: number
    unitPriceCents: number
    bottleSize?: string | null
  }[]
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

function getDpdTrackingUrl(trackingNumber: string): string {
  return `https://tracking.dpd.de/status/fr_CH/parcel/${encodeURIComponent(trackingNumber.trim())}`
}

function shell(title: string, body: string, settings: MailSettings): string {
  const siteUrl = getSiteUrl()
  const logoUrl = `${siteUrl}/facture/logo-drinkcider.png`

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px 12px;background:#F6F4EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2C3E50;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E2D8;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
    <!-- En-tête avec Logo -->
    <tr>
      <td style="padding:24px;background:#153243;color:#FFFFFF;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#FFFFFF;">${escapeHtml(SITE_CONFIG.name)}</div>
              <div style="font-size:12px;color:#A9C2D4;margin-top:2px;">${escapeHtml(SITE_CONFIG.legalName)} · ${escapeHtml(settings.companyZipCity)}</div>
            </td>
            <td style="text-align:right;vertical-align:middle;width:60px;">
              <img src="${logoUrl}" alt="Logo Drinkcider" width="48" height="48" style="display:inline-block;border-radius:8px;border:1px solid rgba(255,255,255,0.15);" />
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Corps du message -->
    <tr>
      <td style="padding:28px 24px;font-size:14px;line-height:1.65;color:#2C3E50;">
        ${body}
      </td>
    </tr>

    <!-- Pied de page -->
    <tr>
      <td style="padding:20px 24px;background:#FAF9F5;border-top:1px solid #EAE7DC;font-size:11px;color:#7F8C8D;line-height:1.6;">
        <div style="font-weight:600;color:#2C3E50;margin-bottom:4px;">${escapeHtml(SITE_CONFIG.name)} · ${escapeHtml(SITE_CONFIG.legalName)}</div>
        ${escapeHtml(settings.companyAddress)}, ${escapeHtml(settings.companyZipCity)} · Tél / Contact : ${escapeHtml(settings.contactEmail)}<br>
        Site internet : <a href="${siteUrl}" style="color:#153243;text-decoration:none;font-weight:600;">${siteUrl.replace(/^https?:\/\//, '')}</a><br>
        <span style="color:#A0AAB2;display:inline-block;margin-top:6px;">La vente d'alcool est interdite aux mineurs de moins de 16/18 ans.</span>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function itemsHtml(order: MailOrder): string {
  const rows = order.items
    .map((item) => {
      const sizeBadge = item.bottleSize
        ? ` <span style="color:#7F8C8D;font-size:11px;">(${escapeHtml(item.bottleSize)})</span>`
        : ''
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #EAE7DC;vertical-align:middle;">
          <strong>${escapeHtml(item.productName)}</strong>${sizeBadge}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #EAE7DC;text-align:center;color:#555;vertical-align:middle;">
          ${item.quantity}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #EAE7DC;text-align:right;font-weight:600;color:#153243;vertical-align:middle;">
          ${formatCHF(item.unitPriceCents * item.quantity)}
        </td>
      </tr>`
    })
    .join('')

  const shippingText = order.isPickup
    ? 'Retrait à la cave (0.00 CHF)'
    : order.shippingCents === 0
      ? 'Frais de port offerts'
      : formatCHF(order.shippingCents)

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin:16px 0;border-collapse:collapse;">
    <thead>
      <tr style="color:#7F8C8D;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #EAE7DC;">
        <th style="padding-bottom:6px;text-align:left;font-weight:600;">Cuvée</th>
        <th style="padding-bottom:6px;text-align:center;font-weight:600;">Quantité</th>
        <th style="padding-bottom:6px;text-align:right;font-weight:600;">Montant</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr>
        <td colspan="2" style="padding:8px 0;color:#555;">Frais de livraison</td>
        <td style="padding:8px 0;text-align:right;color:#555;">${shippingText}</td>
      </tr>
      ${
        order.discountCents > 0
          ? `<tr>
              <td colspan="2" style="padding:4px 0;color:#27AE60;">Remise professionnelle</td>
              <td style="padding:4px 0;text-align:right;color:#27AE60;font-weight:600;">-${formatCHF(order.discountCents)}</td>
            </tr>`
          : ''
      }
      <tr style="border-top:2px solid #153243;">
        <td colspan="2" style="padding:10px 0;font-size:15px;font-weight:700;color:#153243;">Total TTC</td>
        <td style="padding:10px 0;text-align:right;font-size:16px;font-weight:700;color:#153243;">${formatCHF(order.totalCents)}</td>
      </tr>
    </tbody>
  </table>`
}

function itemsText(order: MailOrder): string {
  const lines = order.items.map(
    (i) =>
      `  ${i.quantity} × ${i.productName}${i.bottleSize ? ` (${i.bottleSize})` : ''} — ${formatCHF(i.unitPriceCents * i.quantity)}`
  )
  lines.push(
    `  Frais de port — ${order.isPickup ? 'Retrait à la cave' : order.shippingCents === 0 ? 'offerts' : formatCHF(order.shippingCents)}`
  )
  if (order.discountCents > 0) {
    lines.push(`  Remise pro — -${formatCHF(order.discountCents)}`)
  }
  lines.push(`  Total TTC — ${formatCHF(order.totalCents)}`)
  return lines.join('\n')
}

/** 1. Confirmation envoyée au client dès la commande passée. */
export function orderConfirmation(order: MailOrder, settings: MailSettings): MailMessage {
  const deliveryInfo = order.isPickup
    ? `<div style="background:#EBF5FB;border-left:4px solid #3498DB;padding:12px;border-radius:4px;margin:16px 0;">
         <strong>Mode convenu : Retrait à la cave</strong><br>
         Votre commande sera préparée à notre caveau (Chemin des Moilles 16, 1619 Les Paccots). Nous vous contacterons dès qu'elle sera prête pour convenir du moment de retrait.
       </div>`
    : `<div style="background:#F7F9FA;padding:12px;border-radius:6px;margin:16px 0;border:1px solid #EAE7DC;">
         <strong>Adresse de livraison :</strong><br>
         ${escapeHtml(order.clientName)}<br>
         ${escapeHtml(order.address)}<br>
         ${escapeHtml(order.npa)} ${escapeHtml(order.city)}
         ${order.deliveryDate ? `<br><em>Date souhaitée : ${longDate.format(order.deliveryDate)}</em>` : ''}
       </div>`

  const body = `
    <p style="margin:0 0 14px;font-size:15px;">Bonjour <strong>${escapeHtml(order.clientName)}</strong>,</p>
    <p style="margin:0 0 14px;">Nous vous remercions chaleureusement pour votre commande <strong style="font-family:monospace;color:#153243;background:#EDF2F7;padding:2px 6px;border-radius:4px;">${order.numero}</strong>.</p>
    <p style="margin:0 0 14px;">Voici le récapitulatif des cuvées sélectionnées :</p>
    
    ${itemsHtml(order)}
    ${deliveryInfo}

    <p style="margin:16px 0 10px;"><strong>Modalités de préparation & de paiement :</strong></p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#555;">
      <li style="margin-bottom:6px;">Votre commande est préparée sous ${settings.prepDays} jours ouvrés avec le plus grand soin.</li>
      <li style="margin-bottom:6px;">Le paiement s'effectue <strong>sur facture à 30 jours</strong> avec bulletin QR suisse : aucune carte bancaire n'a été débitée.</li>
      <li>Votre facture officielle vous sera transmise avec les coordonnées de paiement.</li>
    </ul>

    <p style="margin:20px 0 0;">Cidricolement,</p>
    <p style="margin:4px 0 0;font-weight:600;color:#153243;">${escapeHtml(settings.contactName)}<br><span style="font-weight:normal;font-size:12px;color:#7F8C8D;">${escapeHtml(SITE_CONFIG.name)}</span></p>`

  const text = `Bonjour ${order.clientName},

Nous vous remercions pour votre commande ${order.numero}.

Récapitulatif :
${itemsText(order)}

${order.isPickup ? 'Retrait convenu à la cave (Les Paccots).' : `Livraison à :\n${order.clientName}\n${order.address}\n${order.npa} ${order.city}`}

Votre commande est préparée sous ${settings.prepDays} jours ouvrés.
Le paiement se fait sur facture à 30 jours (bulletin QR officiel).

Cidricolement,
${settings.contactName}
${SITE_CONFIG.name}`

  return {
    to: order.clientEmail,
    replyTo: settings.contactEmail,
    subject: `Confirmation de votre commande ${order.numero} — ${SITE_CONFIG.name}`,
    html: shell('Confirmation de commande', body, settings),
    text,
  }
}

/** 2. Notification à la cidrerie : envoyée à info@drinkcider.ch pour traiter la commande. */
export function shopNotification(
  order: MailOrder,
  settings: MailSettings,
  adminUrl: string | null
): MailMessage {
  const details = [
    `<strong>Client :</strong> ${escapeHtml(order.clientName)}`,
    `<strong>Email :</strong> <a href="mailto:${escapeHtml(order.clientEmail)}" style="color:#153243;">${escapeHtml(order.clientEmail)}</a>`,
    order.clientPhone
      ? `<strong>Téléphone :</strong> <a href="tel:${escapeHtml(order.clientPhone)}" style="color:#153243;">${escapeHtml(order.clientPhone)}</a>`
      : null,
    `<strong>Adresse :</strong> ${escapeHtml(order.address)}, ${escapeHtml(order.npa)} ${escapeHtml(order.city)}`,
    order.isPickup
      ? `<span style="color:#2980B9;font-weight:600;">⭐ Mode : Retrait à la cave</span>`
      : `<span>📦 Mode : Expédition standard</span>`,
    order.deliveryDate
      ? `<strong>Date souhaitée :</strong> ${longDate.format(order.deliveryDate)}`
      : null,
    order.message
      ? `<strong>Message client :</strong> <em>${escapeHtml(order.message)}</em>`
      : null,
  ].filter(Boolean) as string[]

  const resolvedAdminUrl = adminUrl || `${getSiteUrl()}/admin/commandes/${order.id || ''}`

  const body = `
    <div style="background:#EDF2F7;border-left:4px solid #153243;padding:12px 16px;border-radius:4px;margin-bottom:18px;">
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#7F8C8D;font-weight:600;">Nouvelle commande reçue</span>
      <div style="font-size:18px;font-weight:700;color:#153243;margin-top:2px;">${order.numero} · ${formatCHF(order.totalCents)}</div>
    </div>

    <p style="margin:0 0 10px;font-weight:600;color:#153243;">Coordonnées du client :</p>
    <div style="background:#FAF9F5;border:1px solid #EAE7DC;padding:14px;border-radius:6px;font-size:13px;line-height:1.6;margin-bottom:16px;">
      ${details.join('<br>')}
    </div>

    <p style="margin:0 0 8px;font-weight:600;color:#153243;">Articles à préparer :</p>
    ${itemsHtml(order)}

    <div style="margin:24px 0 8px;text-align:center;">
      <a href="${resolvedAdminUrl}" style="background:#27AE60;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;display:inline-block;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        Ouvrir et traiter la commande #${order.numero}
      </a>
    </div>
    <div style="text-align:center;font-size:11px;color:#7F8C8D;margin-top:6px;">
      (Vous pouvez répondre directement à cet email pour contacter le client)
    </div>`

  const text = `Nouvelle commande ${order.numero} reçue !
Montant total : ${formatCHF(order.totalCents)}

Client : ${order.clientName}
Email : ${order.clientEmail}
Téléphone : ${order.clientPhone || 'Non renseigné'}
Adresse : ${order.address}, ${order.npa} ${order.city}
Mode : ${order.isPickup ? 'Retrait à la cave' : 'Expédition colis'}
${order.message ? `Message client : ${order.message}\n` : ''}
Articles :
${itemsText(order)}

Gérer la commande dans le panneau admin :
${resolvedAdminUrl}`

  return {
    to: settings.contactEmail,
    replyTo: order.clientEmail,
    subject: `[Nouvelle Commande] ${order.numero} — ${order.clientName} (${formatCHF(order.totalCents)})`,
    html: shell('Nouvelle commande reçue', body, settings),
    text,
  }
}

/** 3. Avis d'expédition ou mise à disposition pour retrait. */
export function shippingNotice(order: MailOrder, settings: MailSettings): MailMessage {
  const due = new Date()
  due.setDate(due.getDate() + settings.paymentTermsDays)
  const reference = order.invoiceNumber
    ? formatCreditorReference(creditorReference(order.invoiceNumber))
    : null

  // Cas 1 : Retrait à la cave
  if (order.isPickup) {
    const body = `
      <p style="margin:0 0 14px;font-size:15px;">Bonjour <strong>${escapeHtml(order.clientName)}</strong>,</p>
      <div style="background:#EBF5FB;border-left:4px solid #3498DB;padding:14px;border-radius:6px;margin:16px 0;">
        <strong style="color:#2980B9;font-size:15px;">Votre commande est prête à la cave !</strong><br>
        Les bouteilles de votre commande <strong style="font-family:monospace;">${order.numero}</strong> sont préparées et vous attendent à notre caveau.
      </div>

      <p style="margin:14px 0 6px;font-weight:600;color:#153243;">Lieu de retrait :</p>
      <div style="background:#FAF9F5;border:1px solid #EAE7DC;padding:12px;border-radius:6px;font-size:13px;line-height:1.5;margin-bottom:16px;">
        <strong>${escapeHtml(SITE_CONFIG.name)}</strong><br>
        ${escapeHtml(settings.companyAddress)}<br>
        ${escapeHtml(settings.companyZipCity)}<br>
        Contact : ${escapeHtml(settings.contactEmail)}
      </div>

      <p style="margin:16px 0 8px;"><strong>Rappel pour le règlement :</strong></p>
      <div style="background:#FAF9F5;border:1px solid #EAE7DC;border-radius:8px;padding:14px;font-size:13px;margin-bottom:16px;">
        ${order.invoiceNumber ? `Facture : <strong style="font-family:monospace;">${order.invoiceNumber}</strong><br>` : ''}
        Montant total : <strong>${formatCHF(order.totalCents)}</strong><br>
        IBAN PostFinance : <strong style="font-family:monospace;">${escapeHtml(settings.iban)}</strong><br>
        Bénéficiaire : <strong>${escapeHtml(SITE_CONFIG.legalName)}</strong> (Bertrand Baeriswyl)<br>
        ${reference ? `Référence : <span style="font-family:monospace;">${reference}</span><br>` : ''}
        Échéance de paiement : <strong>${longDate.format(due)}</strong>
      </div>

      <p style="margin:16px 0 0;">Au plaisir de vous accueillir,</p>
      <p style="margin:4px 0 0;font-weight:600;color:#153243;">${escapeHtml(settings.contactName)}</p>`

    const text = `Bonjour ${order.clientName},

Votre commande ${order.numero} est prête à être retirée à notre caveau !

Lieu de retrait :
${SITE_CONFIG.name}
${settings.companyAddress}
${settings.companyZipCity}

Règlement de votre commande :
Montant : ${formatCHF(order.totalCents)}
IBAN : ${settings.iban}
Échéance : ${longDate.format(due)}

Cidricolement,
${settings.contactName}`

    return {
      to: order.clientEmail,
      replyTo: settings.contactEmail,
      subject: `Votre commande ${order.numero} est prête à la cave — ${SITE_CONFIG.name}`,
      html: shell('Commande prête pour retrait', body, settings),
      text,
    }
  }

  // Cas 2 : Expédition colis (DPD ou livraison directe)
  const isDpd = !order.carrier || order.carrier.toUpperCase().includes('DPD')
  const trackingUrl = order.trackingNumber && isDpd ? getDpdTrackingUrl(order.trackingNumber) : null

  const trackingBlock = order.trackingNumber
    ? `<div style="background:#EBF5FB;border-left:4px solid #2980B9;padding:14px;border-radius:6px;margin:16px 0;">
        <strong style="color:#153243;">Colis pris en charge par ${escapeHtml(order.carrier || 'DPD')}</strong><br>
        Numéro de colis : <strong style="font-family:monospace;font-size:14px;">${escapeHtml(order.trackingNumber)}</strong>
        ${
          trackingUrl
            ? `<div style="margin-top:10px;">
                <a href="${trackingUrl}" style="background:#2980B9;color:#FFFFFF;text-decoration:none;font-weight:600;padding:8px 16px;border-radius:6px;display:inline-block;font-size:13px;">
                  Suivre mon colis DPD en direct →
                </a>
              </div>`
            : ''
        }
      </div>`
    : `<div style="background:#F7F9FA;padding:12px;border-radius:6px;margin:16px 0;border:1px solid #EAE7DC;color:#555;">
        Votre colis a été pris en charge pour acheminement à votre adresse.
      </div>`

  const paymentBlock = `
    <div style="background:#FAF9F5;border:1px solid #EAE7DC;border-radius:8px;padding:14px;font-size:13px;margin:18px 0;">
      <div style="font-weight:600;color:#153243;margin-bottom:6px;">Règlement de votre commande :</div>
      ${order.invoiceNumber ? `Numéro de facture : <strong style="font-family:monospace;">${order.invoiceNumber}</strong><br>` : ''}
      Montant total : <strong>${formatCHF(order.totalCents)}</strong><br>
      Compte IBAN PostFinance : <strong style="font-family:monospace;">${escapeHtml(settings.iban)}</strong><br>
      Bénéficiaire : <strong>${escapeHtml(SITE_CONFIG.legalName)}</strong> (Bertrand Baeriswyl)<br>
      ${reference ? `Référence structurée : <span style="font-family:monospace;">${reference}</span><br>` : ''}
      Date limite de paiement : <strong>${longDate.format(due)}</strong> (30 jours)
    </div>`

  const body = `
    <p style="margin:0 0 14px;font-size:15px;">Bonjour <strong>${escapeHtml(order.clientName)}</strong>,</p>
    <p style="margin:0 0 14px;">Bonne nouvelle ! Votre commande <strong style="font-family:monospace;color:#153243;">${order.numero}</strong> vient d'être expédiée.</p>
    
    ${trackingBlock}
    ${paymentBlock}

    <p style="margin:16px 0 6px;">Nous vous souhaitons une excellente dégustation de nos cuvées artisanales.</p>
    <p style="margin:16px 0 0;">Cidricolement,</p>
    <p style="margin:4px 0 0;font-weight:600;color:#153243;">${escapeHtml(settings.contactName)}<br><span style="font-weight:normal;font-size:12px;color:#7F8C8D;">${escapeHtml(SITE_CONFIG.name)}</span></p>`

  const text = `Bonjour ${order.clientName},

Votre commande ${order.numero} vient d'être expédiée !
${order.trackingNumber ? `Transporteur : ${order.carrier || 'DPD'}\nNuméro de colis : ${order.trackingNumber}\nSuivi : ${trackingUrl || 'En cours'}\n` : ''}
Règlement :
Montant : ${formatCHF(order.totalCents)}
IBAN : ${settings.iban}
Échéance : ${longDate.format(due)}

Bonne dégustation.
${settings.contactName}
${SITE_CONFIG.name}`

  return {
    to: order.clientEmail,
    replyTo: settings.contactEmail,
    subject: `Votre commande ${order.numero} est expédiée — ${SITE_CONFIG.name}`,
    html: shell("Avis d'expédition", body, settings),
    text,
  }
}

/** 4. Envoi de la facture officielle au client. */
export function invoiceEmail(order: MailOrder, settings: MailSettings): MailMessage {
  const siteUrl = getSiteUrl()
  const invoiceUrl = `${siteUrl}/admin/commandes/${order.id || ''}/facture`
  const due = new Date()
  due.setDate(due.getDate() + settings.paymentTermsDays)
  const reference = order.invoiceNumber
    ? formatCreditorReference(creditorReference(order.invoiceNumber))
    : null

  const body = `
    <p style="margin:0 0 14px;font-size:15px;">Bonjour <strong>${escapeHtml(order.clientName)}</strong>,</p>
    <p style="margin:0 0 14px;">Veuillez trouver ci-dessous les informations concernant la facture officielle de votre commande <strong style="font-family:monospace;color:#153243;">${order.numero}</strong>.</p>

    <div style="background:#FAF9F5;border:1px solid #EAE7DC;border-radius:8px;padding:16px;font-size:13px;margin:16px 0;">
      <div style="font-size:16px;font-weight:700;color:#153243;margin-bottom:8px;">
        Facture n° ${order.invoiceNumber || order.numero}
      </div>
      Montant à régler : <strong style="font-size:15px;color:#153243;">${formatCHF(order.totalCents)}</strong><br>
      Échéance : <strong>${longDate.format(due)}</strong> (Net 30 jours)<br>
      IBAN PostFinance : <strong style="font-family:monospace;">${escapeHtml(settings.iban)}</strong><br>
      Créancier : <strong>${escapeHtml(SITE_CONFIG.legalName)}</strong> (Bertrand Baeriswyl)<br>
      ${reference ? `Référence QR : <span style="font-family:monospace;">${reference}</span><br>` : ''}
    </div>

    ${itemsHtml(order)}

    <div style="margin:24px 0;text-align:center;">
      <a href="${invoiceUrl}" style="background:#153243;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;display:inline-block;font-size:14px;">
        Consulter la facture A4 avec QR-bulletin de paiement →
      </a>
    </div>

    <p style="margin:16px 0 0;">Nous restons à votre entière disposition pour toute question.</p>
    <p style="margin:16px 0 0;">Cidricolement,</p>
    <p style="margin:4px 0 0;font-weight:600;color:#153243;">${escapeHtml(settings.contactName)}<br><span style="font-weight:normal;font-size:12px;color:#7F8C8D;">${escapeHtml(SITE_CONFIG.legalName)}</span></p>`

  const text = `Bonjour ${order.clientName},

Voici votre facture pour la commande ${order.numero}.

Facture n° : ${order.invoiceNumber || order.numero}
Montant : ${formatCHF(order.totalCents)}
Échéance : ${longDate.format(due)}
IBAN : ${settings.iban}
Bénéficiaire : ${SITE_CONFIG.legalName}

Lien de consultation : ${invoiceUrl}

Cidricolement,
${settings.contactName}`

  return {
    to: order.clientEmail,
    replyTo: settings.contactEmail,
    subject: `Facture n° ${order.invoiceNumber || order.numero} — ${SITE_CONFIG.name}`,
    html: shell('Facture officielle', body, settings),
    text,
  }
}

/** 4b. Rappel bienveillant de paiement pour facture à échéance ou échue. */
export function paymentReminderEmail(
  order: MailOrder,
  settings: MailSettings,
  options?: {
    dueDate?: Date | null
    reminderCount?: number
    customNote?: string | null
  }
): MailMessage {
  const siteUrl = getSiteUrl()
  const invoiceUrl = `${siteUrl}/admin/commandes/${order.id || ''}/facture`
  const due = options?.dueDate || new Date()
  const count = options?.reminderCount ?? 1
  const reference = order.invoiceNumber
    ? formatCreditorReference(creditorReference(order.invoiceNumber))
    : null

  const isSecondReminder = count >= 2
  const reminderLabel = isSecondReminder ? 'Second rappel' : 'Rappel amical'

  const body = `
    <p style="margin:0 0 14px;font-size:15px;">Bonjour <strong>${escapeHtml(order.clientName)}</strong>,</p>
    <p style="margin:0 0 14px;">
      Sauf erreur ou omission de notre part, nous constatons que la facture n° <strong style="font-family:monospace;color:#153243;">${order.invoiceNumber || order.numero}</strong> relative à votre commande <strong style="font-family:monospace;color:#153243;">${order.numero}</strong> reste à ce jour en attente de règlement.
    </p>

    <div style="background:#FAF9F5;border:1px solid #EAE7DC;border-left:4px solid #C49A45;border-radius:8px;padding:16px;font-size:13px;margin:16px 0;">
      <div style="font-size:16px;font-weight:700;color:#153243;margin-bottom:8px;">
        Facture n° ${order.invoiceNumber || order.numero} (${reminderLabel})
      </div>
      Montant en suspens : <strong style="font-size:16px;color:#153243;">${formatCHF(order.totalCents)}</strong><br>
      Date d'échéance : <strong>${longDate.format(due)}</strong><br>
      IBAN PostFinance : <strong style="font-family:monospace;">${escapeHtml(settings.iban)}</strong><br>
      Bénéficiaire : <strong>${escapeHtml(SITE_CONFIG.legalName)}</strong> (${escapeHtml(settings.contactName)})<br>
      ${reference ? `Référence QR : <span style="font-family:monospace;">${reference}</span><br>` : ''}
    </div>

    ${
      options?.customNote
        ? `<div style="background:#FFFFFF;border:1px dashed #C49A45;border-radius:6px;padding:12px;font-size:13px;margin:14px 0;color:#153243;">
             <strong>Message de la cidrerie :</strong><br>
             ${escapeHtml(options.customNote).replace(/\n/g, '<br>')}
           </div>`
        : ''
    }

    <p style="margin:14px 0;">
      Si votre versement a déjà été transmis entre-temps, veuillez ignorer ce message et nous vous en remercions chaleureusement.
    </p>

    <div style="margin:24px 0;text-align:center;">
      <a href="${invoiceUrl}" style="background:#153243;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;display:inline-block;font-size:14px;">
        Consulter la facture avec QR-bulletin de paiement →
      </a>
    </div>

    <p style="margin:16px 0 0;">Nous restons à votre disposition pour toute question ou si vous avez besoin d'un duplicata.</p>
    <p style="margin:16px 0 0;">Cidricolement,</p>
    <p style="margin:4px 0 0;font-weight:600;color:#153243;">${escapeHtml(settings.contactName)}<br><span style="font-weight:normal;font-size:12px;color:#7F8C8D;">${escapeHtml(SITE_CONFIG.legalName)}</span></p>`

  const text = `Bonjour ${order.clientName},

Sauf erreur de notre part, la facture n° ${order.invoiceNumber || order.numero} pour votre commande ${order.numero} est en attente de règlement.

Montant à régler : ${formatCHF(order.totalCents)}
Échéance initiale : ${longDate.format(due)}
IBAN : ${settings.iban}
Bénéficiaire : ${SITE_CONFIG.legalName} (${settings.contactName})
${options?.customNote ? `\nMessage particulier :\n${options.customNote}\n` : ''}
Si votre paiement a déjà été effectué, nous vous en remercions et vous prions de ne pas tenir compte de ce rappel.

Lien vers la facture : ${invoiceUrl}

Cidricolement,
${settings.contactName}`

  return {
    to: order.clientEmail,
    replyTo: settings.contactEmail,
    subject: `Rappel amical : Facture n° ${order.invoiceNumber || order.numero} en attente — ${SITE_CONFIG.name}`,
    html: shell(
      `Rappel de paiement — Facture ${order.invoiceNumber || order.numero}`,
      body,
      settings
    ),
    text,
  }
}

/** 5. Confirmation d'annulation. */
export function orderCancellation(order: MailOrder, settings: MailSettings): MailMessage {
  const invoiced = order.invoiceNumber !== null

  const body = `
    <p style="margin:0 0 14px;font-size:15px;">Bonjour <strong>${escapeHtml(order.clientName)}</strong>,</p>
    <p style="margin:0 0 14px;">Votre commande <strong style="font-family:monospace;color:#153243;">${order.numero}</strong> a bien été annulée.</p>
    <p style="margin:0 0 14px;">Elle ne sera pas préparée et aucun montant ne vous sera facturé.</p>
    ${
      invoiced
        ? `<div style="background:#FAF9F5;border-left:4px solid #E67E22;padding:12px;border-radius:4px;margin:14px 0;font-size:13px;">
             La facture <strong>${order.invoiceNumber}</strong> ayant déjà été émise, une note de crédit / avoir vous sera transmise pour l'annuler comptablement. Si vous aviez déjà effectué le virement, nous procéderons au remboursement.
           </div>`
        : ''
    }
    <p style="margin:16px 0 0;">Si vous n'êtes pas à l'origine de cette demande d'annulation, n'hésitez pas à répondre directement à ce message pour que nous puissions vous assister.</p>
    <p style="margin:20px 0 0;">Cidricolement,</p>
    <p style="margin:4px 0 0;font-weight:600;color:#153243;">${escapeHtml(settings.contactName)}</p>`

  const text = `Bonjour ${order.clientName},

Votre commande ${order.numero} a bien été annulée. Elle ne sera pas préparée et rien ne vous sera facturé.
${invoiced ? `La facture ${order.invoiceNumber} sera annulée par note de crédit.` : ''}

Cidricolement,
${settings.contactName}`

  return {
    to: order.clientEmail,
    replyTo: settings.contactEmail,
    subject: `Annulation de votre commande ${order.numero} — ${SITE_CONFIG.name}`,
    html: shell('Annulation de commande', body, settings),
    text,
  }
}

/** 6. Email de test technique depuis l'administration. */
export function testEmail(toEmail: string, settings: MailSettings): MailMessage {
  const body = `
    <div style="background:#E8F8F5;border-left:4px solid #27AE60;padding:14px;border-radius:6px;margin-bottom:16px;">
      <strong style="color:#27AE60;font-size:15px;">✓ Amazon SES est opérationnel !</strong><br>
      Ce message confirme que la passerelle d'emails transactionnels de Drinkcider fonctionne parfaitement.
    </div>
    <p style="margin:0 0 10px;">Informations techniques de l'environnement :</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#555;font-size:13px;">
      <li>Site URL : <strong>${getSiteUrl()}</strong></li>
      <li>Adresse d'expédition (MAIL_FROM) : <strong>${escapeHtml(process.env.MAIL_FROM || 'Non configuré')}</strong></li>
      <li>Email de contact : <strong>${escapeHtml(settings.contactEmail)}</strong></li>
      <li>Date et heure du test : <strong>${new Date().toLocaleString('fr-CH')}</strong></li>
    </ul>`

  const text = `Test de notification Amazon SES réussi !
Environnement : ${getSiteUrl()}
Date : ${new Date().toLocaleString('fr-CH')}`

  return {
    to: toEmail,
    replyTo: settings.contactEmail,
    subject: `[Test Réussi] Messagerie Drinkcider (${getSiteUrl()})`,
    html: shell('Test de messagerie', body, settings),
    text,
  }
}
