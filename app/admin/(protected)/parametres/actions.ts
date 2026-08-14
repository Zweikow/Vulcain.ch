'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const settingsSchema = z.object({
  proRatePercent: z.coerce.number().int().min(0).max(90),
  shippingCents: z.coerce.number().int().min(0),
  francoCents: z.coerce.number().int().min(0),
  prepDays: z.coerce.number().int().min(0).max(60),
  companyName: z.string().min(1).max(200),
  companyAddress: z.string().max(300),
  contactEmail: z.string().email().or(z.literal('')),
  contactPhone: z.string().max(30),
  vatNumber: z.string().max(50),
  // Case à cocher : absente du formulaire quand elle est décochée
  vatSubject: z.preprocess((v) => v === 'on' || v === true, z.boolean()),
  vatRatePermille: z.coerce.number().int().min(0).max(999),
  iban: z.string().max(40),
  // En-tête et pied de la facture papier
  contactName: z.string().max(120),
  companyTagline: z.string().max(200),
  companyZipCity: z.string().max(120),
  invoicePlace: z.string().max(120),
  bankName: z.string().max(120),
  paymentTermsDays: z.coerce.number().int().min(0).max(180),
})

export async function saveSettings(formData: FormData) {
  const session = await auth()
  if (!session) return

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return

  await prisma.setting.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  })
  // Port, franco et taux pro se répercutent immédiatement sur la boutique.
  revalidatePath('/', 'layout')
}
