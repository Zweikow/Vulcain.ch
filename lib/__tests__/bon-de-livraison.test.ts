import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OrderStatus, Role } from '@prisma/client'
import {
  buildDeliveryNote,
  canPrintDeliveryNote,
  deliveryNoteOrderSelect,
  deliveryNoteSender,
  formatBottleSize,
  hasInvoiceEmail,
  type DeliveryNoteOrderInput,
} from '@/lib/delivery-note'
import { can } from '@/lib/permissions'
import type { requireCapability } from '@/lib/guards'
import { BonLivraisonDocument } from '@/components/admin/BonLivraisonDocument'

// Données factices : aucune personne ni adresse réelle.
const sender = {
  companyName: 'Cidrerie Exemple',
  companyTagline: 'Cidres et poirés Exemple',
  contactName: 'Contact Exemple',
  companyAddress: 'Chemin de l Exemple 2',
  companyZipCity: '1000 Exempleville',
  contactEmail: 'info@example.ch',
  contactPhone: '000 000 00 00',
}

function order(overrides: Partial<DeliveryNoteOrderInput> = {}): DeliveryNoteOrderInput {
  return {
    numero: 'CMD-2026-0042',
    status: OrderStatus.EN_PREPARATION,
    clientName: 'Camille Exemple',
    clientCompany: null,
    clientEmail: 'camille@example.ch',
    address: 'Rue Fictive 3',
    npa: '1700',
    city: 'Fribourg',
    isPickup: false,
    message: null,
    customer: { customerNumber: 1234 },
    items: [
      {
        id: 'l1',
        productName: 'Cuvée Exemple',
        quantity: 3,
        bottlesPerUnit: 1,
        product: { articleNumber: 101, year: 2023, bottleSize: '75cl' },
      },
      {
        id: 'l2',
        productName: 'Petit cidre en carton',
        quantity: 2,
        bottlesPerUnit: 24,
        product: { articleNumber: 205, year: null, bottleSize: '27.5cl' },
      },
    ],
    ...overrides,
  }
}

const printedAt = new Date('2026-11-23T10:00:00Z')

function render(input: DeliveryNoteOrderInput) {
  return renderToStaticMarkup(
    createElement(BonLivraisonDocument, { note: buildDeliveryNote(input), sender, printedAt })
  )
}

/** Toutes les clés d'un objet, à toute profondeur. */
function deepKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([k, v]) => [k, ...deepKeys(v)])
}

describe('bon de livraison - lignes et total des bouteilles', () => {
  it('construit une ligne par article : n° d article, nom, millésime, format, quantité', () => {
    const note = buildDeliveryNote(order())
    expect(note.lines).toEqual([
      {
        id: 'l1',
        articleNumber: 101,
        name: 'Cuvée Exemple',
        year: 2023,
        format: '75 cl',
        quantity: 3,
        bottlesPerUnit: 1,
        bottles: 3,
      },
      {
        id: 'l2',
        articleNumber: 205,
        name: 'Petit cidre en carton',
        year: null,
        format: '27.5 cl',
        quantity: 2,
        bottlesPerUnit: 24,
        bottles: 48,
      },
    ])
  })

  it('additionne les bouteilles, cartons compris', () => {
    const note = buildDeliveryNote(order())
    expect(note.totalBottles).toBe(51)
    expect(note.hasMultiBottleItems).toBe(true)
  })

  it('compte une bouteille par unité quand bottlesPerUnit manque ou vaut 0', () => {
    const note = buildDeliveryNote(
      order({
        items: [
          { id: 'a', productName: 'A', quantity: 4, bottlesPerUnit: 0, product: null },
          { id: 'b', productName: 'B', quantity: 2, product: { bottleSize: null } },
        ],
      })
    )
    expect(note.lines.map((l) => l.bottles)).toEqual([4, 2])
    expect(note.totalBottles).toBe(6)
    expect(note.hasMultiBottleItems).toBe(false)
  })

  it('affiche le nombre de bouteilles des cartons et le total sur le bon', () => {
    const html = render(order())
    expect(html).toContain('Carton de 24 × 27.5 cl')
    expect(html).toContain('>Bouteilles<')
    expect(html).toContain('>48<')
    expect(html).toContain('Total des bouteilles')
    expect(html).toContain('>51<')
  })

  it('omet la colonne Bouteilles quand chaque article est une bouteille', () => {
    const html = render(order({ items: [order().items[0]] }))
    expect(html).not.toContain('>Bouteilles<')
    expect(html).toContain('Total des bouteilles')
  })

  it('prévoit une case à cocher par ligne', () => {
    const html = render(order())
    expect(html.match(/border border-\[#153243\]/g)).toHaveLength(2)
  })

  it('met en forme la contenance', () => {
    expect(formatBottleSize('75cl')).toBe('75 cl')
    expect(formatBottleSize('27.5cl')).toBe('27.5 cl')
    expect(formatBottleSize('  ')).toBeNull()
    expect(formatBottleSize('Magnum')).toBe('Magnum')
  })
})

describe('bon de livraison - contenu du document', () => {
  it('reprend l en-tête de l expéditeur, le titre, le numéro de commande et de client', () => {
    const html = render(order())
    expect(html).toContain('Cidres et poirés Exemple')
    expect(html).toContain('Chemin de l Exemple 2')
    expect(html).toContain('1000 Exempleville')
    expect(html).toContain('Bon de livraison')
    expect(html).toContain('CMD-2026-0042')
    expect(html).toContain('1234')
    expect(html).toContain('Imprimé le 23 novembre 2026')
  })

  it('imprime la raison sociale si elle est remplie, sinon rien', () => {
    const avec = render(order({ clientCompany: 'Exemple Sàrl' }))
    expect(avec).toContain('Exemple Sàrl')
    expect(buildDeliveryNote(order({ clientCompany: '   ' })).recipient.company).toBeNull()
  })

  it('imprime la note du client seulement s il y en a une', () => {
    expect(render(order({ message: 'Livrer chez la voisine' }))).toContain('Livrer chez la voisine')
    expect(render(order({ message: '  ' }))).not.toContain('Votre message')
  })

  it('annonce la facture par courriel seulement si la commande a une adresse email', () => {
    const phrase = 'La facture vous est envoyée séparément par courriel.'
    expect(render(order())).toContain(phrase)
    expect(render(order({ clientEmail: '' }))).not.toContain(phrase)
    expect(render(order({ clientEmail: null }))).not.toContain(phrase)
    expect(hasInvoiceEmail('pas-une-adresse')).toBe(false)
    expect(hasInvoiceEmail(' camille@example.ch ')).toBe(true)
  })

  it('porte la mention d interdiction de vente aux mineurs', () => {
    expect(render(order())).toContain('La vente d&#x27;alcool est interdite aux mineurs.')
  })

  it('signale un retrait à la cave', () => {
    expect(render(order({ isPickup: true }))).toContain('Retrait à la cave')
    expect(render(order())).toContain('Adresse de livraison')
  })

  it('n a ni tiret long ni point d exclamation', () => {
    const html = render(order({ message: 'Merci', clientCompany: 'Exemple Sàrl' }))
    expect(html).not.toMatch(/[\u2013\u2014]/)
    expect(html.replace(/<!--.*?-->/g, '')).not.toContain('!')
  })
})

describe('bon de livraison - aucun montant', () => {
  // Une commande telle que la base la renvoie, prix compris.
  const withPrices = {
    ...order(),
    subtotalCents: 12345,
    totalCents: 13345,
    shippingCents: 1000,
    discountCents: 678,
    vatCents: 999,
    items: order().items.map((item, i) => ({
      ...item,
      unitPriceCents: 2490 + i,
      listPriceCents: 3110 + i,
      purchasePriceCents: 1555 + i,
    })),
  } as DeliveryNoteOrderInput

  it('ne recopie aucun champ de prix dans le bon', () => {
    const note = buildDeliveryNote(withPrices)
    expect(deepKeys(note).filter((k) => /cents|price|amount|vat|discount/i.test(k))).toEqual([])
    const json = JSON.stringify(note)
    for (const n of ['12345', '13345', '2490', '3110', '1555', '678', '999']) {
      expect(json).not.toContain(n)
    }
  })

  it('n imprime ni CHF ni somme', () => {
    const html = render(withPrices)
    expect(html).not.toMatch(/CHF|Fr\.|Prix|Montant|TVA|Sous-total/)
    expect(html).not.toMatch(/\d+[.,]\d{2}\b/)
    for (const n of ['123.45', '133.45', '24.90', '31.10', '10.00']) {
      expect(html).not.toContain(n)
    }
  })

  it('ne charge aucun prix depuis la base', () => {
    expect(
      deepKeys(deliveryNoteOrderSelect).filter((k) => /cents|price|amount|vat|discount/i.test(k))
    ).toEqual([])
  })

  it('ne transmet de getSettings() que l en-tête, ni IBAN ni taux', () => {
    const settings = {
      ...sender,
      iban: 'CH00 0000 0000 0000 0000 0',
      bankName: 'Banque Exemple',
      proRatePercent: 20,
      shippingCents: 1000,
    }
    const kept = deliveryNoteSender(settings)
    expect(Object.keys(kept).sort()).toEqual(Object.keys(sender).sort())
    expect(JSON.stringify(kept)).not.toContain('CH00')
  })
})

describe('bon de livraison - visibilité selon le statut', () => {
  it.each([
    [OrderStatus.A_TRAITER, false],
    [OrderStatus.EN_PREPARATION, true],
    [OrderStatus.EXPEDIEE, true],
    [OrderStatus.ANNULEE, false],
  ])('statut %s : bon disponible = %s', (status, expected) => {
    expect(canPrintDeliveryNote(status)).toBe(expected)
  })
})

describe('bon de livraison - capacité par rôle', () => {
  // Signature de requireCapability : une capacité reçoit le rôle.
  const printDeliveryNotes: Parameters<typeof requireCapability>[0] = can.printDeliveryNotes

  it.each(Object.values(Role))('le rôle %s imprime les bons', (role) => {
    expect(printDeliveryNotes(role)).toBe(true)
  })

  it('reste ouvert au préparateur, qui ne voit aucun montant', () => {
    expect(can.seeFinancials(Role.PREPARATEUR)).toBe(false)
    expect(printDeliveryNotes(Role.PREPARATEUR)).toBe(true)
  })
})
