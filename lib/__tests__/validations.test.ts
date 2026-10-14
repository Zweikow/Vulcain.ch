import { describe, it, expect } from 'vitest'
import { loginSchema, orderItemSchema, orderSchema } from '@/lib/validations'

describe('lib/validations', () => {
  describe('loginSchema', () => {
    it('valide des identifiants corrects', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejette un mot de passe trop court (< 8 caracteres)', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'short',
      })
      expect(result.success).toBe(false)
    })

    it('rejette un nom d utilisateur vide', () => {
      const result = loginSchema.safeParse({
        username: '',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('orderItemSchema', () => {
    it('valide un article correct', () => {
      const result = orderItemSchema.safeParse({
        productId: 'prod_123',
        quantity: 2,
      })
      expect(result.success).toBe(true)
    })

    it('rejette une quantite nulle ou negative', () => {
      expect(orderItemSchema.safeParse({ productId: 'prod_123', quantity: 0 }).success).toBe(false)
      expect(orderItemSchema.safeParse({ productId: 'prod_123', quantity: -1 }).success).toBe(false)
    })
  })

  describe('orderSchema', () => {
    const validOrderData = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.ch',
      phone: '079 123 45 67',
      address: 'Rue de la Gare 1',
      npa: '1000',
      city: 'Lausanne',
      ageConfirmed: true,
      items: [{ productId: 'prod_1', quantity: 3 }],
      turnstileToken: 'test-token',
    }

    it('valide une commande complete et conforme avec telephone valide', () => {
      const result = orderSchema.safeParse(validOrderData)
      expect(result.success).toBe(true)
    })

    it('accepte les formats de telephone internationaux et locaux', () => {
      const validPhones = [
        '079 123 45 67',
        '+41 79 123 45 67',
        '+41791234567',
        '021.311.22.33',
        '078-987-65-43',
        '0041791234567',
      ]

      for (const phone of validPhones) {
        const res = orderSchema.safeParse({ ...validOrderData, phone })
        expect(res.success, `Devrait accepter le numero: ${phone}`).toBe(true)
      }
    })

    it('rejette une commande avec telephone manquant ou vide', () => {
      const resEmpty = orderSchema.safeParse({ ...validOrderData, phone: '' })
      expect(resEmpty.success).toBe(false)

      const resWhitespace = orderSchema.safeParse({ ...validOrderData, phone: '   ' })
      expect(resWhitespace.success).toBe(false)

      const withoutPhone = { ...validOrderData }
      delete (withoutPhone as { phone?: string }).phone
      const resMissing = orderSchema.safeParse(withoutPhone)
      expect(resMissing.success).toBe(false)
    })

    it('rejette un format de telephone invalide', () => {
      const invalidPhones = ['123', 'abc', 'tropcourt', '079-abc-def']
      for (const phone of invalidPhones) {
        const res = orderSchema.safeParse({ ...validOrderData, phone })
        expect(res.success, `Devrait rejeter: ${phone}`).toBe(false)
      }
    })

    it('rejette si la confirmation de majorite (18 ans) n est pas cochee', () => {
      const res = orderSchema.safeParse({
        ...validOrderData,
        ageConfirmed: false,
      })
      expect(res.success).toBe(false)
    })

    it('rejette un panier sans article', () => {
      const res = orderSchema.safeParse({
        ...validOrderData,
        items: [],
      })
      expect(res.success).toBe(false)
    })

    it('rejette un NPA qui ne fait pas exactement 4 chiffres', () => {
      const res1 = orderSchema.safeParse({ ...validOrderData, npa: '100' })
      expect(res1.success).toBe(false)

      const res2 = orderSchema.safeParse({ ...validOrderData, npa: '10000' })
      expect(res2.success).toBe(false)
    })
  })
})
