import { describe, it, expect } from 'vitest'
import {
  invoiceEmail,
  orderCancellation,
  orderConfirmation,
  shippingNotice,
  shopNotification,
  type MailOrder,
  type MailSettings,
} from '@/lib/mail-templates'

const settings: MailSettings = {
  companyName: 'Drinkcider',
  contactName: 'Contact test',
  companyAddress: 'Rue du Test 1',
  companyZipCity: '1700 Fribourg',
  contactEmail: 'info@example.com',
  prepDays: 3,
  iban: 'IBAN-FACTICE-DE-TEST',
  bankName: 'Banque test',
  paymentTermsDays: 30,
}

const base: MailOrder = {
  id: 'o1',
  numero: 'CMD-2026-0042',
  invoiceNumber: 'FAC-2026-0007',
  clientName: 'Client Test',
  clientEmail: 'client@example.com',
  address: 'Rue du Test 2',
  npa: '1700',
  city: 'Fribourg',
  deliveryDate: null,
  message: null,
  subtotalCents: 4800,
  discountCents: 0,
  shippingCents: 1000,
  totalCents: 5800,
  paymentMode: 'EN_LIGNE',
  items: [{ productName: 'Cidre test', quantity: 1, unitPriceCents: 4800 }],
}

const powerPay: MailOrder = {
  ...base,
  invoiceFeeCents: 500,
  totalCents: 6300,
  invoiceAcceptedAt: new Date('2026-10-28T10:00:00Z'),
  paymentMethod: 'Facture (PowerPay)',
}
const settled: MailOrder = { ...powerPay, paidAt: new Date('2026-10-30T10:00:00Z') }

describe('Emails d’une commande acceptée sur facture PowerPay', () => {
  it('confirmation : supplément affiché, acceptée sur facture, aucun bulletin QR annoncé', () => {
    const mail = orderConfirmation(powerPay, settings)
    for (const content of [mail.html, mail.text]) {
      expect(content).toContain('Supplément facture')
      expect(content).toContain('CHF 5.00')
      expect(content).toContain('CHF 63.00')
      expect(content).toContain('acceptée sur facture PowerPay')
      expect(content).toContain('MF Group vous enverra sa facture PowerPay')
      expect(content).toContain('en fin de mois')
      expect(content).not.toContain('facture à 30 jours')
      expect(content).not.toMatch(/avis d(&apos;|'|’)expédition/)
    }
  })

  it('notification à la cidrerie : distingue l’acceptation d’un paiement reçu', () => {
    const mail = shopNotification(powerPay, settings, null)
    for (const content of [mail.html, mail.text]) {
      expect(content).toContain('acceptée sur facture PowerPay')
      expect(content).not.toContain('Paiement : reçu')
    }
  })

  it('avis d’expédition : facture envoyée par MF Group en fin de mois, sans IBAN de la cidrerie', () => {
    const mail = shippingNotice(settled, settings)
    for (const content of [mail.html, mail.text]) {
      expect(content).toContain(
        'MF Group vous enverra sa facture PowerPay de CHF 63.00 en fin de mois'
      )
      expect(content).not.toContain(settings.iban)
      expect(content).not.toContain('déjà réglée')
    }
  })

  it('retrait à la cave : même règle', () => {
    const mail = shippingNotice({ ...settled, isPickup: true }, settings)
    for (const content of [mail.html, mail.text]) {
      expect(content).toContain('MF Group vous enverra sa facture PowerPay')
      expect(content).not.toContain(settings.iban)
    }
  })

  it('facture Drinkcider : règlement via PowerPay, ni IBAN ni « acquittée »', () => {
    const mail = invoiceEmail(settled, settings)
    for (const content of [mail.html, mail.text]) {
      expect(content).toContain('qui vous enverra sa facture PowerPay en fin de mois')
      expect(content).not.toContain(settings.iban)
      expect(content).not.toContain('acquittée')
    }
    expect(mail.html).toContain('règlement via PowerPay')
    expect(mail.html).toContain('Supplément facture')
  })

  it('annulation : MF Group ne facture rien, aucun remboursement sur carte annoncé', () => {
    const mail = orderCancellation(settled, settings)
    for (const content of [mail.html, mail.text]) {
      expect(content).toContain('MF Group ne vous facturera rien pour cette commande')
      expect(content).not.toContain('remboursé')
    }
  })

  it('aucun texte n’écrit plus la marque en capitales', () => {
    const mails = [
      orderConfirmation(powerPay, settings),
      shippingNotice(settled, settings),
      invoiceEmail(settled, settings),
      orderCancellation(settled, settings),
    ]
    for (const mail of mails) expect(`${mail.html}${mail.text}`).not.toContain('POWERPAY')
  })
})

describe('Autres modes : rien ne change', () => {
  it('sans supplément : pas de ligne « Supplément facture »', () => {
    const paid = { ...base, paidAt: new Date(), paymentMethod: 'Paiement en ligne (TWINT)' }
    const mail = orderConfirmation(paid, settings)
    expect(mail.text).not.toContain('Supplément facture')
    expect(mail.html).not.toContain('Supplément facture')
    expect(mail.text).toContain('a bien été reçu')
  })

  it('facture Drinkcider à 30 jours : IBAN toujours présent', () => {
    const invoice = { ...base, paymentMode: 'FACTURE' as const }
    expect(shippingNotice(invoice, settings).text).toContain(settings.iban)
    expect(invoiceEmail(invoice, settings).text).toContain(settings.iban)
  })
})
