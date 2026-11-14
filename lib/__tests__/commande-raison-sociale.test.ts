import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Base simulée : on vérifie ce que les deux chemins de création écrivent sur la
// fiche client et dans l'instantané de la commande. Données fictives uniquement.
const db = vi.hoisted(() => {
  const tx = {
    customer: { upsert: vi.fn() },
    product: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    order: { create: vi.fn() },
    stockMovement: { createMany: vi.fn() },
    discountCode: { update: vi.fn() },
  }
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      product: { findMany: vi.fn(async () => []) },
    },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: db.prisma }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/numbering', () => ({
  SERIES: { COMMANDE: 'CMD' },
  nextNumber: vi.fn(async () => 'CMD-2026-0001'),
}))
vi.mock('@/lib/notifications', () => ({ notifyOrderPlaced: vi.fn(async () => {}) }))
vi.mock('@/lib/turnstile', () => ({ verifyTurnstileToken: vi.fn(async () => true) }))
vi.mock('@/lib/ratelimit', () => ({
  getOrderRatelimit: () => ({ limit: async () => ({ success: true }) }),
}))
vi.mock('@/lib/audit', () => ({ recordCustomerAudit: vi.fn(), recordAudit: vi.fn() }))
vi.mock('@/lib/guards', () => ({ requireCapability: vi.fn(async () => ({ id: 'compte-test' })) }))
vi.mock('@/lib/settings', () => ({
  isMaintenanceMode: vi.fn(async () => false),
  getSettings: vi.fn(async () => ({
    proRatePercent: 20,
    shippingCents: 1000,
    francoCents: 12000,
    vatSubject: false,
    vatRatePermille: 81,
  })),
}))

import { POST } from '@/app/api/commandes/route'
import { createManualOrder } from '@/app/admin/(protected)/commandes/nouvelle/actions'

const product = {
  id: 'produit-test',
  name: 'Cidre Exemple',
  slug: 'cidre-exemple',
  priceCents: 2500,
  purchasePriceCents: 1000,
  stock: 50,
  bottleSize: '75cl',
  bottlesPerUnit: 1,
  category: { name: 'Cidre' },
  promotions: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  db.tx.customer.upsert.mockResolvedValue({ id: 'client-test', isPro: false, proRatePercent: null })
  db.tx.product.findMany.mockResolvedValue([product])
  db.tx.product.updateMany.mockResolvedValue({ count: 1 })
  db.tx.product.update.mockResolvedValue({})
  db.tx.order.create.mockResolvedValue({
    id: 'commande-test',
    numero: 'CMD-2026-0001',
    totalCents: 6000,
  })
  db.tx.stockMovement.createMany.mockResolvedValue({ count: 1 })
})

function commander(extra: Record<string, unknown>) {
  const body = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.ch',
    phone: '079 000 00 00',
    address: 'Rue de l Exemple 1',
    npa: '1000',
    city: 'Lausanne',
    ageConfirmed: true,
    items: [{ productId: 'produit-test', quantity: 2 }],
    turnstileToken: 'jeton-test',
    website: '',
    ...extra,
  }
  return POST(
    new NextRequest('http://localhost/api/commandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

function ecrit() {
  const upsert = db.tx.customer.upsert.mock.calls[0][0]
  const order = db.tx.order.create.mock.calls[0][0].data
  return {
    ficheMiseAJour: upsert.update.company,
    ficheCreee: upsert.create.company,
    commande: order.clientCompany,
  }
}

describe('POST /api/commandes : raison sociale', () => {
  it('enregistre la raison sociale sans les espaces, sur la fiche et la commande', async () => {
    const res = await commander({ company: '  Verger Exemple SA  ' })
    expect(res.status).toBe(201)
    expect(ecrit()).toEqual({
      ficheMiseAJour: 'Verger Exemple SA',
      ficheCreee: 'Verger Exemple SA',
      commande: 'Verger Exemple SA',
    })
  })

  it('enregistre une raison sociale absente, vide ou blanche comme nulle', async () => {
    for (const extra of [{}, { company: '' }, { company: '   ' }]) {
      vi.clearAllMocks()
      db.tx.customer.upsert.mockResolvedValue({ id: 'c', isPro: false, proRatePercent: null })
      const res = await commander(extra)
      expect(res.status).toBe(201)
      expect(ecrit()).toEqual({ ficheMiseAJour: null, ficheCreee: null, commande: null })
    }
  })

  it('refuse une raison sociale de plus de 70 caractères sans rien écrire', async () => {
    const res = await commander({ company: 'V'.repeat(71) })
    expect(res.status).toBe(422)
    expect(db.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('recalcule toujours le total côté serveur', async () => {
    await commander({ company: 'Verger Exemple SA', totalCents: 1 })
    const data = db.tx.order.create.mock.calls[0][0].data
    expect(data.subtotalCents).toBe(5000)
    expect(data.totalCents).toBe(6000)
  })
})

describe('Saisie manuelle : raison sociale', () => {
  const input = {
    customer: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.ch',
      address: 'Rue de l Exemple 1',
      npa: '1000',
      city: 'Lausanne',
      isPro: true,
    },
    items: [{ productId: 'produit-test', quantity: 2, unitPriceCents: 2000 }],
    shippingOption: 'STANDARD' as const,
    status: 'A_TRAITER' as const,
    notifyCustomer: false,
    allowNegativeStock: false,
  }

  it('applique la même règle que la boutique', async () => {
    const res = await createManualOrder({
      ...input,
      customer: { ...input.customer, company: ' Verger Exemple SA ' },
    })
    expect(res.success).toBe(true)
    expect(ecrit()).toEqual({
      ficheMiseAJour: 'Verger Exemple SA',
      ficheCreee: 'Verger Exemple SA',
      commande: 'Verger Exemple SA',
    })
  })

  it('enregistre une raison sociale vide comme nulle', async () => {
    const res = await createManualOrder({ ...input, customer: { ...input.customer, company: '' } })
    expect(res.success).toBe(true)
    expect(ecrit()).toEqual({ ficheMiseAJour: null, ficheCreee: null, commande: null })
  })

  it('refuse plus de 70 caractères avec un message clair', async () => {
    const res = await createManualOrder({
      ...input,
      customer: { ...input.customer, company: 'V'.repeat(71) },
    })
    expect(res).toEqual({ success: false, error: 'Raison sociale : 70 caractères au maximum' })
    expect(db.prisma.$transaction).not.toHaveBeenCalled()
  })
})
