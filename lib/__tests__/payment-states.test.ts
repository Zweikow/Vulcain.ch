import { describe, it, expect } from 'vitest'
import {
  paymentStatusOf,
  isFinalTransactionState,
  isReusableTransactionState,
  isSettlingTransactionState,
} from '@/lib/payments/states'

describe('États PostFinance → statut de paiement de la commande', () => {
  it.each([
    ['FULFILL', 'PAYE'],
    ['FAILED', 'ECHOUE'],
    ['VOIDED', 'ECHOUE'],
    ['DECLINE', 'REFUSE'],
    ['CREATE', 'EN_COURS'],
    ['PENDING', 'EN_COURS'],
    ['CONFIRMED', 'EN_COURS'],
    ['PROCESSING', 'EN_COURS'],
    ['AUTHORIZED', 'EN_COURS'],
    // Encaissé mais pas encore « livrable » selon PostFinance : on attend FULFILL
    ['COMPLETED', 'EN_COURS'],
    ['ETAT_INCONNU', 'EN_COURS'],
  ])('%s → %s', (state, expected) => {
    expect(paymentStatusOf(state)).toBe(expected)
  })

  it('états finaux', () => {
    for (const s of ['FULFILL', 'FAILED', 'VOIDED', 'DECLINE']) {
      expect(isFinalTransactionState(s)).toBe(true)
    }
    for (const s of ['PENDING', 'PROCESSING', 'AUTHORIZED', 'COMPLETED']) {
      expect(isFinalTransactionState(s)).toBe(false)
    }
  })

  it('nouvelle tentative : page réutilisable tant que le client n’a pas payé', () => {
    expect(isReusableTransactionState('PENDING')).toBe(true)
    expect(isReusableTransactionState('PROCESSING')).toBe(true)
    expect(isReusableTransactionState('AUTHORIZED')).toBe(false)
    expect(isReusableTransactionState('FAILED')).toBe(false)
  })

  it('aucune nouvelle tentative pendant l’encaissement', () => {
    expect(isSettlingTransactionState('AUTHORIZED')).toBe(true)
    expect(isSettlingTransactionState('COMPLETED')).toBe(true)
    expect(isSettlingTransactionState('FULFILL')).toBe(true)
    expect(isSettlingTransactionState('PENDING')).toBe(false)
  })
})
