import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { OrderStatus, Role } from '@prisma/client'

// Pages réelles, garde réelle (lib/guards) : seuls la session, la base et les
// réglages sont simulés. Données factices.
const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string; role: string; name: string } },
  prisma: {
    order: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => mocks.session) }))
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({
    companyName: 'Cidrerie Exemple',
    companyTagline: 'Cidres et poirés Exemple',
    contactName: 'Contact Exemple',
    companyAddress: 'Chemin de l Exemple 2',
    companyZipCity: '1000 Exempleville',
    contactEmail: 'info@example.ch',
    contactPhone: '',
    iban: 'CH00 0000 0000 0000 0000 0',
    bankName: 'Banque Exemple',
  })),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

import BonLivraisonPage from '@/app/admin/(protected)/commandes/[id]/bon-de-livraison/page'
import BonsDeLivraisonPage from '@/app/admin/(protected)/preparation/bons-de-livraison/page'
import FacturesBatchPrintPage from '@/app/admin/(protected)/factures/print/page'
import { deliveryNoteOrderSelect } from '@/lib/delivery-note'

function dbOrder(status: OrderStatus = OrderStatus.EN_PREPARATION) {
  return {
    id: 'commande-test',
    numero: 'CMD-2026-0042',
    status,
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
        quantity: 6,
        bottlesPerUnit: 1,
        product: { articleNumber: 101, year: 2023, bottleSize: '75cl' },
      },
    ],
  }
}

function signIn(role: Role | null) {
  mocks.session = role ? { user: { id: 'compte-test', role, name: 'Compte test' } } : null
}

const params = Promise.resolve({ id: 'commande-test' })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.prisma.order.findUnique.mockResolvedValue(dbOrder())
  mocks.prisma.order.findMany.mockResolvedValue([
    dbOrder(),
    { ...dbOrder(), id: 'b', numero: 'CMD-2026-0043' },
  ])
})

describe('bon de livraison - accès selon le rôle', () => {
  it.each([Role.ADMIN, Role.GESTIONNAIRE, Role.PREPARATEUR])(
    'le rôle %s ouvre le bon d une commande',
    async (role) => {
      signIn(role)
      const html = renderToStaticMarkup((await BonLivraisonPage({ params })) as ReactElement)
      expect(html).toContain('Bon de livraison')
      expect(html).toContain('CMD-2026-0042')
      expect(html).not.toContain('CHF')
    }
  )

  it.each([Role.ADMIN, Role.GESTIONNAIRE, Role.PREPARATEUR])(
    'le rôle %s ouvre l impression groupée',
    async (role) => {
      signIn(role)
      const html = renderToStaticMarkup((await BonsDeLivraisonPage()) as ReactElement)
      expect(html).toContain('CMD-2026-0042')
      expect(html).toContain('CMD-2026-0043')
      expect(html).not.toContain('CHF')
    }
  )

  it('renvoie à la connexion sans session', async () => {
    signIn(null)
    await expect(BonLivraisonPage({ params })).rejects.toThrow('REDIRECT /admin/login')
    await expect(BonsDeLivraisonPage()).rejects.toThrow('REDIRECT /admin/login')
    expect(mocks.prisma.order.findUnique).not.toHaveBeenCalled()
  })

  it('contrairement à l impression des factures, refusée au préparateur', async () => {
    signIn(Role.PREPARATEUR)
    await expect(
      FacturesBatchPrintPage({ searchParams: Promise.resolve({ ids: 'commande-test' }) })
    ).rejects.toThrow('REDIRECT /admin')
  })
})

describe('bon de livraison - chargement et statut', () => {
  it('charge la commande sans aucun champ de prix', async () => {
    signIn(Role.PREPARATEUR)
    await BonLivraisonPage({ params })
    expect(mocks.prisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: 'commande-test' },
      select: deliveryNoteOrderSelect,
    })
  })

  it('imprime en lot toutes les commandes En préparation, dans l ordre de l écran', async () => {
    signIn(Role.PREPARATEUR)
    await BonsDeLivraisonPage()
    expect(mocks.prisma.order.findMany).toHaveBeenCalledWith({
      where: { status: OrderStatus.EN_PREPARATION },
      select: deliveryNoteOrderSelect,
      orderBy: { createdAt: 'asc' },
    })
  })

  it.each([OrderStatus.A_TRAITER, OrderStatus.ANNULEE])(
    'n imprime pas de bon pour une commande %s',
    async (status) => {
      signIn(Role.ADMIN)
      mocks.prisma.order.findUnique.mockResolvedValue(dbOrder(status))
      const html = renderToStaticMarkup((await BonLivraisonPage({ params })) as ReactElement)
      expect(html).toContain('Pas encore de bon de livraison')
      expect(html).not.toContain('Total des bouteilles')
    }
  )

  it('réimprime le bon d une commande expédiée', async () => {
    signIn(Role.PREPARATEUR)
    mocks.prisma.order.findUnique.mockResolvedValue(dbOrder(OrderStatus.EXPEDIEE))
    const html = renderToStaticMarkup((await BonLivraisonPage({ params })) as ReactElement)
    expect(html).toContain('Total des bouteilles')
  })

  it('répond 404 pour une commande inconnue', async () => {
    signIn(Role.ADMIN)
    mocks.prisma.order.findUnique.mockResolvedValue(null)
    await expect(BonLivraisonPage({ params })).rejects.toThrow('NOT_FOUND')
  })
})
