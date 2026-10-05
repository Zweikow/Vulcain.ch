import { z } from 'zod'

// Connexion par nom d'utilisateur : l'exploitant n'a pas à taper une adresse
// complète pour entrer chez lui.
export const loginSchema = z.object({
  username: z.string().min(1, 'Requis').max(60),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
})

// Le client n'envoie ni prix ni total : tout est recalculé côté serveur
// depuis la base (prix, tarif pro, port depuis Setting).
export const orderSchema = z.object({
  firstName: z.string().min(1, 'Requis'),
  lastName: z.string().min(1, 'Requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  address: z.string().min(1, 'Requis'),
  npa: z.string().length(4, 'NPA invalide'),
  city: z.string().min(1, 'Requis'),
  deliveryDate: z.string().optional(),
  message: z.string().max(500).optional(),
  acceptsMarketing: z.boolean().default(false),
  ageConfirmed: z.literal(true, {
    message: 'Vous devez confirmer avoir 18 ans révolus',
  }),
  items: z.array(orderItemSchema).min(1, 'Panier vide'),
  turnstileToken: z.string().min(1, 'Vérification requise'),
  website: z.string().max(0).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type OrderInput = z.infer<typeof orderSchema>
