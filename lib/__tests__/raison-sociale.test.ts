import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ClientType, OrderStatus } from '@prisma/client'
import {
  orderConfirmation,
  shopNotification,
  type MailOrder,
  type MailSettings,
} from '@/lib/mail-templates'
import { generatePlanzerCsv, type PlanzerOrderData } from '@/lib/planzer'
import { FactureDocument } from '@/components/admin/FactureDocument'
import { SwissQRBill } from '@/components/admin/SwissQRBill'

// Données fictives uniquement.
const COMPANY = 'Verger Exemple SA'

const mailOrder: MailOrder = {
  id: 'commande-test',
  numero: 'CMD-2026-0042',
  invoiceNumber: null,
  clientName: 'Jean Dupont',
  clientEmail: 'jean.dupont@example.ch',
  clientPhone: '079 000 00 00',
  address: 'Rue de l Exemple 1',
  npa: '1000',
  city: 'Lausanne',
  deliveryDate: null,
  message: null,
  subtotalCents: 5000,
  discountCents: 0,
  shippingCents: 1000,
  totalCents: 6000,
  items: [{ productName: 'Cidre Exemple', quantity: 2, unitPriceCents: 2500 }],
}

const mailSettings: MailSettings = {
  companyName: 'Drinkcider',
  contactName: 'Contact Exemple',
  companyAddress: 'Chemin de l Exemple 2',
  companyZipCity: '1619 Les Paccots',
  contactEmail: 'info@example.ch',
  prepDays: 3,
  iban: 'CH00 0000 0000 0000 0000 0',
  bankName: 'Banque Exemple',
  paymentTermsDays: 30,
}

describe('Raison sociale : e-mails', () => {
  it('ne change rien sans raison sociale (absente, nulle ou vide)', () => {
    const reference = orderConfirmation(mailOrder, mailSettings)
    const reference2 = shopNotification(mailOrder, mailSettings, 'https://example.ch/admin')
    for (const clientCompany of [null, undefined, '']) {
      const order = { ...mailOrder, clientCompany }
      expect(orderConfirmation(order, mailSettings)).toEqual(reference)
      expect(shopNotification(order, mailSettings, 'https://example.ch/admin')).toEqual(reference2)
    }
    expect(reference.html).not.toContain('Raison sociale')
    expect(reference2.html).not.toContain('Raison sociale')
    expect(reference2.text).not.toContain('Raison sociale')
  })

  it('place la raison sociale au-dessus du nom dans l adresse de livraison', () => {
    const msg = orderConfirmation({ ...mailOrder, clientCompany: COMPANY }, mailSettings)
    expect(msg.html).toContain(`${COMPANY}<br>Jean Dupont<br>`)
    expect(msg.text).toContain(`Livraison à :\n${COMPANY}\nJean Dupont\nRue de l Exemple 1`)
  })

  it('affiche la raison sociale dans la notification de la cidrerie', () => {
    const msg = shopNotification(
      { ...mailOrder, clientCompany: COMPANY },
      mailSettings,
      'https://example.ch/admin'
    )
    expect(msg.html).toContain(`<strong>Raison sociale :</strong> ${COMPANY}`)
    expect(msg.text).toContain(`Client : Jean Dupont\nRaison sociale : ${COMPANY}\nEmail :`)
  })

  it('échappe la raison sociale dans le HTML', () => {
    const msg = orderConfirmation(
      { ...mailOrder, clientCompany: 'Cidres & Fils <SA>' },
      mailSettings
    )
    expect(msg.html).toContain('Cidres &amp; Fils &lt;SA&gt;<br>')
    expect(msg.html).not.toContain('<SA>')
  })
})

const planzerOrder: PlanzerOrderData = {
  id: 'commande-test',
  numero: 'CMD-2026-0042',
  clientName: 'Jean Dupont',
  clientEmail: 'jean.dupont@example.ch',
  clientPhone: '079 000 00 00',
  clientType: 'PRIVE',
  address: 'Rue de l Exemple 1',
  npa: '1000',
  city: 'Lausanne',
  items: [{ productName: 'Cidre Exemple', quantity: 6, bottlesPerUnit: 1, bottleSize: '75cl' }],
}

const PICKUP = new Date(2026, 10, 16, 9, 0, 0)

// Champs 20 (prénom), 21 (nom) et 22 (entreprise) de la ligne A1.
function destinataire(order: PlanzerOrderData) {
  const a1 = generatePlanzerCsv([order], { pickupDate: PICKUP }).split('\r\n')[0].split(';')
  expect(a1).toHaveLength(43)
  return { firstName: a1[20], lastName: a1[21], company: a1[22] }
}

describe('Raison sociale : export Planzer', () => {
  it('ne change rien sans raison sociale', () => {
    const csv = generatePlanzerCsv([planzerOrder], { pickupDate: PICKUP })
    for (const clientCompany of [null, undefined, '', '   ']) {
      expect(generatePlanzerCsv([{ ...planzerOrder, clientCompany }], { pickupDate: PICKUP })).toBe(
        csv
      )
    }
    expect(destinataire(planzerOrder)).toEqual({
      firstName: 'Jean',
      lastName: 'Dupont',
      company: '',
    })
    // Un pro sans raison sociale garde l'ancien comportement : nom recopié en entreprise.
    expect(destinataire({ ...planzerOrder, clientType: 'PRO' })).toEqual({
      firstName: '',
      lastName: 'Jean Dupont',
      company: 'Jean Dupont',
    })
  })

  it('renseigne le champ entreprise et garde la personne en prénom et nom', () => {
    for (const clientType of ['PRIVE', 'PRO']) {
      expect(destinataire({ ...planzerOrder, clientType, clientCompany: COMPANY })).toEqual({
        firstName: 'Jean',
        lastName: 'Dupont',
        company: COMPANY,
      })
    }
  })

  it('retire les points-virgules de la raison sociale', () => {
    expect(destinataire({ ...planzerOrder, clientCompany: 'Verger; Exemple SA' }).company).toBe(
      'Verger  Exemple SA'
    )
  })
})

const factureSettings = {
  companyName: 'Drinkcider',
  companyTagline: 'Drinkcider',
  companyAddress: 'Chemin de l Exemple 2',
  companyZipCity: '1619 Les Paccots',
  contactName: 'Contact Exemple',
  contactEmail: 'info@example.ch',
  contactPhone: '',
  invoicePlace: 'Les Paccots',
  // IBAN d'exemple de la documentation des paiements suisses, fictif.
  iban: 'CH93 0076 2011 6238 5295 7',
  bankName: 'Banque Exemple',
  vatNumber: '',
  vatSubject: false,
  vatRatePermille: 81,
  paymentTermsDays: 30,
  proRatePercent: 20,
}

const factureOrder = {
  numero: 'CMD-2026-0042',
  invoiceNumber: 'FAC-2026-0007',
  invoicedAt: new Date(2026, 10, 12),
  clientType: ClientType.PRIVE,
  status: OrderStatus.A_TRAITER,
  clientName: 'Jean Dupont',
  address: 'Rue de l Exemple 1',
  npa: '1000',
  city: 'Lausanne',
  clientEmail: 'jean.dupont@example.ch',
  clientPhone: '079 000 00 00',
  deliveryDate: null,
  shippedAt: null,
  createdAt: new Date(2026, 10, 12),
  subtotalCents: 5000,
  discountCents: 0,
  shippingCents: 1000,
  totalCents: 6000,
  vatCents: 0,
  items: [
    {
      id: 'ligne-1',
      productName: 'Cidre Exemple',
      quantity: 2,
      unitPriceCents: 2500,
      listPriceCents: 2500,
      product: { articleNumber: 1, bottleSize: '75cl' },
    },
  ],
}

function facture(order: typeof factureOrder & { clientCompany?: string | null }, layout: string) {
  return renderToStaticMarkup(
    createElement(FactureDocument, {
      order,
      settings: factureSettings,
      forcedLayout: layout as 'single' | 'multipage',
    })
  )
}

describe('Raison sociale : facture et QR-facture', () => {
  for (const layout of ['single', 'multipage']) {
    it(`ne change rien sans raison sociale (mise en page ${layout})`, () => {
      const html = facture(factureOrder, layout)
      expect(html).not.toContain('Impossible de générer')
      expect(facture({ ...factureOrder, clientCompany: null }, layout)).toBe(html)
    })

    it(`imprime la raison sociale au-dessus du nom (mise en page ${layout})`, () => {
      const html = facture({ ...factureOrder, clientCompany: COMPANY }, layout)
      expect(html).not.toContain('Impossible de générer')
      expect(html).toContain(
        `<p class="font-semibold">${COMPANY}</p><p class="font-semibold">Jean Dupont</p>`
      )
    })
  }

  it('reprend la raison sociale dans l encadré débiteur de la page 2', () => {
    const html = facture({ ...factureOrder, clientCompany: COMPANY }, 'multipage')
    expect(html).toContain(
      `<p class="mt-1 font-semibold text-[#153243]">${COMPANY}</p><p class="font-semibold text-[#153243]">Jean Dupont</p>`
    )
  })

  function qrBill(clientCompany?: string | null) {
    return renderToStaticMarkup(
      createElement(SwissQRBill, {
        order: { ...factureOrder, clientCompany },
        settings: factureSettings,
      })
    )
  }

  it('garde le nom du client comme débiteur sans raison sociale', () => {
    const svg = qrBill()
    expect(svg).toContain('Jean Dupont')
    expect(qrBill(null)).toBe(svg)
    expect(qrBill('  ')).toBe(svg)
  })

  it('met la raison sociale comme débiteur, jusqu à 70 caractères', () => {
    const svg = qrBill(COMPANY)
    expect(svg).toContain(COMPANY)
    expect(svg).not.toContain('Jean Dupont')

    // Le nom long est replié sur plusieurs lignes : on vérifie qu'il ne casse rien.
    expect(qrBill('V'.repeat(70))).not.toContain('Impossible de générer')
  })

  it('justifie la limite de 70 caractères : au-delà, la QR-facture ne se génère plus', () => {
    expect(qrBill('V'.repeat(71))).toContain('Impossible de générer')
  })
})
