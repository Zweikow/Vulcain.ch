import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({ prisma: { setting: { upsert: vi.fn() } } }))

vi.mock('@/lib/prisma', () => ({ prisma: db.prisma }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/guards', () => ({
  assertCapability: vi.fn(async () => ({ ok: true, user: { id: 'compte-test' } })),
}))

import { saveSettings } from '@/app/admin/(protected)/parametres/actions'

// IBAN d'exemple de la documentation des paiements suisses, fictif.
const IBAN_EXEMPLE = 'CH93 0076 2011 6238 5295 7'

/** Saisie complète et valide de l'écran Paramètres, telle que le navigateur l'envoie. */
function saisie(changes: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    proRatePercent: '20',
    shippingCents: '1000',
    francoCents: '12000',
    prepDays: '3',
    companyName: 'Cidrerie Exemple',
    companyAddress: 'Chemin de l Exemple 2',
    contactEmail: 'info@example.ch',
    contactPhone: '',
    vatNumber: '',
    vatRatePermille: '81',
    iban: IBAN_EXEMPLE,
    contactName: 'Contact Exemple',
    companyTagline: 'Cidres et poirés',
    companyZipCity: '1619 Les Paccots',
    invoicePlace: 'Les Paccots',
    bankName: 'Banque Exemple',
    paymentTermsDays: '30',
    ...changes,
  }
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  db.prisma.setting.upsert.mockResolvedValue({})
})

describe('saveSettings - IBAN', () => {
  it('enregistre un IBAN valide, normalisé en majuscules groupées par 4', async () => {
    const result = await saveSettings(saisie({ iban: 'ch9300762011623852957' }))

    expect(result).toEqual({ ok: true, iban: IBAN_EXEMPLE })
    expect(db.prisma.setting.upsert).toHaveBeenCalledTimes(1)
    const { update } = db.prisma.setting.upsert.mock.calls[0][0]
    expect(update.iban).toBe(IBAN_EXEMPLE)
  })

  it("n'enregistre rien quand l'IBAN a une faute de frappe, et le dit sous le champ", async () => {
    const result = await saveSettings(saisie({ iban: 'CH93 0076 2011 6283 5295 7' }))

    expect(result).toEqual({
      ok: false,
      error: "Rien n'a été enregistré. Vérifiez : IBAN.",
      ibanError: "Cet IBAN n'est pas valide : vérifiez chaque caractère.",
    })
    expect(db.prisma.setting.upsert).not.toHaveBeenCalled()
  })

  it("n'enregistre pas un QR-IBAN", async () => {
    const result = await saveSettings(saisie({ iban: 'CH44 3199 9123 0008 8901 2' }))

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.ibanError).toContain('QR-IBAN')
    expect(db.prisma.setting.upsert).not.toHaveBeenCalled()
  })

  it("n'enregistre pas un IBAN vide", async () => {
    const result = await saveSettings(saisie({ iban: '' }))

    expect(result.ok).toBe(false)
    expect(db.prisma.setting.upsert).not.toHaveBeenCalled()
  })
})

describe('saveSettings - autres champs', () => {
  it('nomme chaque champ refusé au lieu de ne rien afficher', async () => {
    const result = await saveSettings(
      saisie({ proRatePercent: '95', contactEmail: 'pas-une-adresse' })
    )

    expect(result).toEqual({
      ok: false,
      error: "Rien n'a été enregistré. Vérifiez : Remise pro, Email de contact.",
      ibanError: undefined,
    })
    expect(db.prisma.setting.upsert).not.toHaveBeenCalled()
  })

  it("signale l'IBAN et les autres champs ensemble", async () => {
    const result = await saveSettings(
      saisie({ companyName: '', iban: 'CH94 0076 2011 6238 5295 7' })
    )

    expect(result.ok === false && result.error).toBe(
      "Rien n'a été enregistré. Vérifiez : Raison sociale, IBAN."
    )
    expect(result.ok === false && result.ibanError).toBe(
      "Cet IBAN n'est pas valide : vérifiez chaque caractère."
    )
  })
})
