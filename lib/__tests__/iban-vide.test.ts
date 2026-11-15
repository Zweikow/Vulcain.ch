import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ClientType, OrderStatus } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { DEFAULT_SETTINGS } from '@/lib/settings'
import { FactureDocument } from '@/components/admin/FactureDocument'
import { SwissQRBill } from '@/components/admin/SwissQRBill'

// Aucun IBAN par défaut dans le code : une base neuve démarre avec un IBAN
// vide, que l'écran Paramètres exige avant d'enregistrer quoi que ce soit.
// Ces tests vérifient qu'en attendant, rien ne plante.

const settings = {
  companyName: 'Cidrerie Exemple',
  companyTagline: 'Cidres et poirés',
  companyAddress: 'Chemin de l Exemple 2',
  companyZipCity: '1619 Les Paccots',
  contactName: 'Contact Exemple',
  contactEmail: 'info@example.ch',
  contactPhone: '',
  invoicePlace: 'Les Paccots',
  iban: '',
  bankName: 'Banque Exemple',
  vatNumber: '',
  vatSubject: false,
  vatRatePermille: 81,
  paymentTermsDays: 30,
  proRatePercent: 20,
}

const order = {
  numero: 'CMD-2026-0042',
  invoiceNumber: 'FAC-2026-0007',
  invoicedAt: new Date(2026, 10, 15),
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
  createdAt: new Date(2026, 10, 15),
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

describe('IBAN vide', () => {
  it("n'a plus d'IBAN par défaut dans le code", () => {
    expect(DEFAULT_SETTINGS.iban).toBe('')
  })

  it("la QR-facture affiche son cadre d'erreur au lieu de planter", () => {
    const html = renderToStaticMarkup(createElement(SwissQRBill, { order, settings }))
    expect(html).toContain('Impossible de générer la QR-facture suisse.')
  })

  for (const layout of ['single', 'multipage'] as const) {
    it(`la facture se rend, avec le cadre d'erreur de la QR-facture (mise en page ${layout})`, () => {
      const html = renderToStaticMarkup(
        createElement(FactureDocument, { order, settings, forcedLayout: layout })
      )
      expect(html).toContain('FAC-2026-0007')
      expect(html).toContain('Impossible de générer la QR-facture suisse.')
    })
  }
})
