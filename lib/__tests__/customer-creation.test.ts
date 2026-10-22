import { describe, it, expect } from 'vitest'
import { Role } from '@prisma/client'
import { can } from '@/lib/permissions'

describe('Création de client & Permissions', () => {
  describe('can.manageCustomers', () => {
    it('autorise les rôles ADMIN et GESTIONNAIRE à gérer les clients', () => {
      expect(can.manageCustomers(Role.ADMIN)).toBe(true)
      expect(can.manageCustomers(Role.GESTIONNAIRE)).toBe(true)
    })

    it('interdit au rôle PREPARATEUR de gérer les clients', () => {
      expect(can.manageCustomers(Role.PREPARATEUR)).toBe(false)
    })
  })

  describe('Validation des données client', () => {
    it('valide un format email standard', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(emailRegex.test('client@example.ch')).toBe(true)
      expect(emailRegex.test('jean.dupont+pro@resto-fribourg.ch')).toBe(true)
      expect(emailRegex.test('invalid-email')).toBe(false)
      expect(emailRegex.test('invalid@')).toBe(false)
      expect(emailRegex.test('@domain.ch')).toBe(false)
    })

    it('valide la plage du taux pro personnalisé entre 0 et 100', () => {
      const isValidRate = (rate: number | null | undefined) => {
        if (rate === null || rate === undefined) return true
        return Number.isFinite(rate) && rate >= 0 && rate <= 100
      }

      expect(isValidRate(0)).toBe(true)
      expect(isValidRate(25)).toBe(true)
      expect(isValidRate(100)).toBe(true)
      expect(isValidRate(null)).toBe(true)
      expect(isValidRate(-5)).toBe(false)
      expect(isValidRate(105)).toBe(false)
    })
  })
})
