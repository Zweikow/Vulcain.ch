import { describe, it, expect } from 'vitest'
import { Role } from '@prisma/client'
import { can } from '@/lib/permissions'

function formatDateToInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDeliveryDateInput(val: string | null | undefined): Date | null {
  if (!val || !val.trim()) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

describe('Gestion de la date de livraison (Backoffice)', () => {
  describe('Permissions', () => {
    it('autorise les administrateurs et gestionnaires à gérer les commandes et la livraison', () => {
      expect(can.manageOrders(Role.ADMIN)).toBe(true)
      expect(can.manageOrders(Role.GESTIONNAIRE)).toBe(true)
    })

    it('interdit la gestion globale des commandes aux préparateurs', () => {
      expect(can.manageOrders(Role.PREPARATEUR)).toBe(false)
    })
  })

  describe('Conversion et formatage de la date de livraison', () => {
    it('formate correctement une Date en format YYYY-MM-DD pour l input HTML', () => {
      const date = new Date(2026, 9, 28) // 28 octobre 2026 local
      expect(formatDateToInput(date)).toBe('2026-10-28')
    })

    it('retourne une chaîne vide si aucune date n est fournie', () => {
      expect(formatDateToInput(null)).toBe('')
      expect(formatDateToInput(undefined)).toBe('')
      expect(formatDateToInput('')).toBe('')
    })

    it('gère correctement une chaîne ISO', () => {
      const dateStr = '2026-11-15T10:00:00.000Z'
      const formatted = formatDateToInput(dateStr)
      expect(formatted).toMatch(/^2026-11-1[456]$/) // Dépend du fuseau local, mais chaîne valide YYYY-MM-DD
    })

    it('parse correctement une chaîne YYYY-MM-DD en Date valide', () => {
      const parsed = parseDeliveryDateInput('2026-10-24')
      expect(parsed).not.toBeNull()
      expect(parsed instanceof Date).toBe(true)
      expect(parsed?.getFullYear()).toBe(2026)
    })

    it('retourne null si la date est effacée', () => {
      expect(parseDeliveryDateInput('')).toBeNull()
      expect(parseDeliveryDateInput(null)).toBeNull()
      expect(parseDeliveryDateInput(undefined)).toBeNull()
    })
  })
})
