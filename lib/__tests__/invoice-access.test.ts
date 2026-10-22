import { describe, it, expect } from 'vitest'
import {
  invoiceEmail,
  paymentReminderEmail,
  type MailOrder,
  type MailSettings,
} from '@/lib/mail-templates'
import { authConfig } from '@/auth.config'

const dummyOrder: MailOrder = {
  id: 'cmvdv0rai0002l202opnm1gv5',
  numero: 'CMD-2026-0042',
  invoiceNumber: 'FAC-2026-0010',
  clientName: 'Jane Doe',
  clientEmail: 'jane@example.com',
  address: 'Chemin des Fleurs 1',
  npa: '1000',
  city: 'Lausanne',
  deliveryDate: null,
  message: null,
  subtotalCents: 5000,
  discountCents: 0,
  shippingCents: 1500,
  totalCents: 6500,
  items: [
    {
      productName: 'Cidre Artisanal',
      quantity: 2,
      unitPriceCents: 2500,
    },
  ],
}

const dummySettings: MailSettings = {
  companyName: 'Drinkcider',
  contactName: 'Bertrand',
  companyAddress: 'Chemin des Moilles 16',
  companyZipCity: '1619 Les Paccots',
  contactEmail: 'info@drinkcider.ch',
  prepDays: 3,
  iban: 'CH123456789',
  bankName: 'PostFinance',
  paymentTermsDays: 30,
}

describe('Accès Facture Client & Gabarits Emails', () => {
  it('génère un lien public /facture/[id] dans invoiceEmail sans préfixe /admin', () => {
    const msg = invoiceEmail(dummyOrder, dummySettings)
    expect(msg.html).toContain('/facture/cmvdv0rai0002l202opnm1gv5')
    expect(msg.html).not.toContain('/admin/commandes/cmvdv0rai0002l202opnm1gv5/facture')
    expect(msg.text).toContain('/facture/cmvdv0rai0002l202opnm1gv5')
    expect(msg.text).not.toContain('/admin/commandes/cmvdv0rai0002l202opnm1gv5/facture')
  })

  it('génère un lien public /facture/[id] dans paymentReminderEmail sans préfixe /admin', () => {
    const msg = paymentReminderEmail(dummyOrder, dummySettings)
    expect(msg.html).toContain('/facture/cmvdv0rai0002l202opnm1gv5')
    expect(msg.html).not.toContain('/admin/commandes/cmvdv0rai0002l202opnm1gv5/facture')
    expect(msg.text).toContain('/facture/cmvdv0rai0002l202opnm1gv5')
    expect(msg.text).not.toContain('/admin/commandes/cmvdv0rai0002l202opnm1gv5/facture')
  })

  describe('authConfig authorized callback (redirection transparente)', () => {
    const authorized = authConfig.callbacks?.authorized!

    it('redirige un visiteur non authentifié depuis /admin/commandes/:id/facture vers /facture/:id', () => {
      const nextUrl = new URL(
        'https://drinkcider.ch/admin/commandes/cmvdv0rai0002l202opnm1gv5/facture'
      )
      const result = authorized({
        auth: null,
        request: { nextUrl } as any,
      })

      expect(result).toBeInstanceOf(Response)
      const res = result as Response
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe(
        'https://drinkcider.ch/facture/cmvdv0rai0002l202opnm1gv5'
      )
    })

    it('redirige un client arrivant sur /admin/login?callbackUrl=.../admin/commandes/:id/facture vers /facture/:id', () => {
      const nextUrl = new URL(
        'https://drinkcider.ch/admin/login?callbackUrl=https%3A%2F%2Fdrinkcider.ch%2Fadmin%2Fcommandes%2Fcmvdv0rai0002l202opnm1gv5%2Ffacture'
      )
      const result = authorized({
        auth: null,
        request: { nextUrl } as any,
      })

      expect(result).toBeInstanceOf(Response)
      const res = result as Response
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe(
        'https://drinkcider.ch/facture/cmvdv0rai0002l202opnm1gv5'
      )
    })

    it('laisse passer un administrateur connecté vers /admin/commandes/:id/facture', () => {
      const nextUrl = new URL(
        'https://drinkcider.ch/admin/commandes/cmvdv0rai0002l202opnm1gv5/facture'
      )
      const result = authorized({
        auth: { user: { id: 'admin_1', name: 'Admin' } } as any,
        request: { nextUrl } as any,
      })

      expect(result).toBe(true)
    })

    it('bloque l accès à une autre page admin pour un non-authentifié', () => {
      const nextUrl = new URL('https://drinkcider.ch/admin/commandes/cmvdv0rai0002l202opnm1gv5')
      const result = authorized({
        auth: null,
        request: { nextUrl } as any,
      })

      expect(result).toBe(false)
    })
  })
})
