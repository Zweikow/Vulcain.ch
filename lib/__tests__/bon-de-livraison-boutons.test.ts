import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OrderStatus } from '@prisma/client'
import { DeliveryNoteLink } from '@/components/admin/DeliveryNoteLink'
import { PrintDeliveryNotesLink } from '@/components/admin/PrintDeliveryNotesLink'

describe('bouton « Bon de livraison » selon le statut', () => {
  it.each([OrderStatus.EN_PREPARATION, OrderStatus.EXPEDIEE])(
    'visible en %s (préparation, puis réimpression)',
    (status) => {
      const html = renderToStaticMarkup(createElement(DeliveryNoteLink, { orderId: 'o1', status }))
      expect(html).toContain('href="/admin/commandes/o1/bon-de-livraison"')
      expect(html).toContain('Bon de livraison')
    }
  )

  it.each([OrderStatus.A_TRAITER, OrderStatus.ANNULEE])('absent en %s', (status) => {
    expect(renderToStaticMarkup(createElement(DeliveryNoteLink, { orderId: 'o1', status }))).toBe(
      ''
    )
  })
})

describe('action groupée « Imprimer les bons de livraison »', () => {
  it('absente sans commande en préparation', () => {
    expect(renderToStaticMarkup(createElement(PrintDeliveryNotesLink, { count: 0 }))).toBe('')
  })

  it('ouvre l impression de toutes les commandes en préparation', () => {
    const html = renderToStaticMarkup(createElement(PrintDeliveryNotesLink, { count: 3 }))
    expect(html).toContain('href="/admin/preparation/bons-de-livraison"')
    expect(html).toContain('Imprimer les bons de livraison')
    expect(html).toContain('(3)')
    // Bouton vert : texte foncé, jamais blanc (DESIGN.md).
    expect(html).toContain('btn-primary')
    expect(html).not.toContain('text-white')
  })
})
