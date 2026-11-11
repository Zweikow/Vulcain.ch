import { describe, it, expect, vi, beforeEach } from 'vitest'
import { creditorReference, formatCreditorReference, qrReference } from '@/lib/reference'

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: { order: { findMany: mocks.findMany } },
}))

import { analyzeCamtTransactions, parseCamtXml } from '@/lib/camt'
import { generateSampleCamtXml } from '@/lib/camt-sample'

// CMD-2026-0001 de la commande A et FAC-2026-0001 de la commande B donnaient
// la même référence QR avant le chiffre de série : le cas de la collision.
const orders = [
  {
    id: 'A',
    numero: 'CMD-2026-0001',
    invoiceNumber: 'FAC-2026-0002',
    clientName: 'Restaurant du Lac',
    totalCents: 13980,
    paidAt: null,
    paymentMethod: null,
    createdAt: new Date('2026-09-01'),
  },
  {
    id: 'B',
    numero: 'CMD-2026-0002',
    invoiceNumber: 'FAC-2026-0001',
    clientName: 'Jane Doe',
    totalCents: 15240,
    paidAt: null,
    paymentMethod: null,
    createdAt: new Date('2026-09-02'),
  },
  {
    id: 'C',
    numero: 'CMD-2026-0003',
    invoiceNumber: 'FAC-2026-0003',
    clientName: 'Chalet des Enfants',
    totalCents: 31680,
    paidAt: null,
    paymentMethod: null,
    createdAt: new Date('2026-09-03'),
  },
]

type Remittance = { qrr?: string; scor?: string; ustrd?: string }

/** Avis camt.054 minimal : une écriture créditrice par virement. */
function camt054(entries: { amount: string; remittance: Remittance }[]): string {
  const ntry = entries
    .map(({ amount, remittance }) => {
      const ref = remittance.qrr
        ? `<Strd><CdtrRefInf><Tp><CdOrPrtry><Prtry>QRR</Prtry></CdOrPrtry></Tp><Ref>${remittance.qrr}</Ref></CdtrRefInf></Strd>`
        : remittance.scor
          ? `<Strd><CdtrRefInf><Tp><CdOrPrtry><Cd>SCOR</Cd></CdOrPrtry></Tp><Ref>${remittance.scor}</Ref></CdtrRefInf></Strd>`
          : `<Ustrd>${remittance.ustrd}</Ustrd>`
      return `<Ntry>
        <Amt Ccy="CHF">${amount}</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-10-01</Dt></BookgDt>
        <NtryDtls><TxDtls><RmtInf>${ref}</RmtInf></TxDtls></NtryDtls>
      </Ntry>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.04">
  <BkToCstmrDbtCdtNtfctn><Ntfctn>${ntry}</Ntfctn></BkToCstmrDbtCdtNtfctn>
</Document>`
}

async function reconcile(entries: { amount: string; remittance: Remittance }[]) {
  const result = await analyzeCamtTransactions(parseCamtXml(camt054(entries)))
  return result.items
}

beforeEach(() => {
  mocks.findMany.mockReset()
  mocks.findMany.mockResolvedValue(orders)
})

describe('Lecture camt : les références restent du texte', () => {
  it('garde les zéros de tête et les 27 chiffres de la référence QR', () => {
    const qrr = qrReference('FAC-2026-0001')
    const [tx] = parseCamtXml(camt054([{ amount: '152.40', remittance: { qrr } }]))
    expect(tx.structuredRef).toBe(qrr)
    expect(tx.amountCents).toBe(15240)
  })

  it("lit la référence QR de l'exemple de démonstration", () => {
    const refs = parseCamtXml(generateSampleCamtXml()).map((tx) => tx.structuredRef)
    expect(refs).toContain(qrReference('FAC-2026-0003'))
  })
})

describe('Rapprochement camt : références QR', () => {
  it('rapproche la facture et non la commande de même numéro', async () => {
    const [byInvoice, byOrder] = await reconcile([
      { amount: '152.40', remittance: { qrr: qrReference('FAC-2026-0001') } },
      { amount: '139.80', remittance: { qrr: qrReference('CMD-2026-0001') } },
    ])
    expect(byInvoice.matchedOrder?.id).toBe('B')
    expect(byInvoice.status).toBe('EXACT_MATCH')
    expect(byOrder.matchedOrder?.id).toBe('A')
    expect(byOrder.status).toBe('EXACT_MATCH')
  })

  it('signale un montant différent sur la bonne commande', async () => {
    const [item] = await reconcile([
      { amount: '100.00', remittance: { qrr: qrReference('FAC-2026-0003') } },
    ])
    expect(item.matchedOrder?.id).toBe('C')
    expect(item.status).toBe('AMOUNT_MISMATCH')
  })
})

describe('Rapprochement camt : références RF des factures déjà envoyées', () => {
  it('rapproche une référence RF structurée (SCOR)', async () => {
    const [item] = await reconcile([
      { amount: '139.80', remittance: { scor: creditorReference('FAC-2026-0002') } },
    ])
    expect(item.matchedOrder?.id).toBe('A')
    expect(item.status).toBe('EXACT_MATCH')
  })

  it('rapproche une référence RF recopiée avec ses espaces en communication libre', async () => {
    const printed = formatCreditorReference(creditorReference('FAC-2026-0003'))
    const [item] = await reconcile([
      { amount: '316.80', remittance: { ustrd: `Paiement ${printed} merci` } },
    ])
    expect(item.matchedOrder?.id).toBe('C')
    expect(item.status).toBe('EXACT_MATCH')
  })

  it('rapproche toujours le numéro de facture écrit en communication libre', async () => {
    const [item] = await reconcile([
      { amount: '152.40', remittance: { ustrd: 'Facture FAC 2026 0001' } },
    ])
    expect(item.matchedOrder?.id).toBe('B')
  })
})
