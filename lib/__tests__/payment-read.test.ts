import { describe, it, expect, vi } from 'vitest'
import { TransactionsService, type Transaction } from 'postfinancecheckout'
import { readTransaction } from '@/lib/payments/postfinance'

// Identifiants factices : la réponse de l'API est simulée, aucun appel réseau
process.env.PFC_SPACE_ID = '1'
process.env.PFC_USER_ID = '2'
process.env.PFC_AUTH_KEY = Buffer.from('cle-de-test-factice').toString('base64')

// Forme observée sur le space de test : le connecteur et la méthode ne sont
// renvoyés que s'ils sont demandés par expand.
const paid = {
  id: 614819767,
  state: 'FULFILL',
  currency: 'CHF',
  authorizationAmount: 96.4,
  completedOn: new Date('2026-10-28T15:25:32.950Z'),
  deliveryDecisionMadeOn: new Date('2026-10-28T15:25:33.067Z'),
  paymentConnectorConfiguration: {
    name: 'Wallee All-in-One - TWINT',
    // ID factice : les vrais sont propres à chaque space
    paymentMethodConfiguration: { id: 14, name: 'TWINT', resolvedTitle: { 'fr-CH': 'TWINT' } },
  },
} as unknown as Transaction

const read = vi.spyOn(TransactionsService.prototype, 'getPaymentTransactionsId')

describe('Relecture d’une transaction PostFinance', () => {
  it('demande le connecteur et la méthode, et en tire le moyen de paiement', async () => {
    read.mockResolvedValueOnce(paid)
    const snapshot = await readTransaction(614819767)

    const [request] = read.mock.calls[0]
    expect([...(request.expand ?? [])]).toEqual([
      'paymentConnectorConfiguration',
      'paymentConnectorConfiguration.paymentMethodConfiguration',
    ])
    expect(snapshot).toMatchObject({
      state: 'FULFILL',
      currency: 'CHF',
      authorizationAmountCents: 9640,
      paymentMethod: 'TWINT',
      paymentMethodConfigurationId: 14,
      completedOn: new Date('2026-10-28T15:25:32.950Z'),
    })
  })

  it('sans détail du connecteur : moyen de paiement inconnu, sans erreur', async () => {
    read.mockResolvedValueOnce({ ...paid, paymentConnectorConfiguration: undefined })
    expect((await readTransaction(614819767)).paymentMethod).toBeNull()
  })
})
