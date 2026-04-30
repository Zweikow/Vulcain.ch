import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
})

export const orderSchema = z.object({
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  address: z.string().min(1, 'Requis'),
  npa: z.string().length(4, 'NPA invalide'),
  city: z.string().min(1, 'Requis'),
  total: z.number().positive(),
  items: z.array(orderItemSchema).min(1, 'Panier vide'),
  turnstileToken: z.string().min(1, 'Vérification requise'),
  website: z.string().max(0).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type OrderInput = z.infer<typeof orderSchema>
