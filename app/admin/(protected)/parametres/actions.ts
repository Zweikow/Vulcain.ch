'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { checkIban, ibanErrorMessage } from '@/lib/iban'

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
  // Compte qui reçoit les paiements : contrôlé en entier (pays, longueur, clé
  // MOD 97, QR-IBAN refusé), puis enregistré en majuscules groupées par 4.
  iban: z.string().transform((value, ctx) => {
    const check = checkIban(value)
    if (check.ok) return check.iban
    ctx.addIssue({ code: 'custom', message: ibanErrorMessage(check) })
    return z.NEVER
  }),
  // En-tête et pied de la facture papier
  contactName: z.string().max(120),
  companyTagline: z.string().max(200),
  companyZipCity: z.string().max(120),
  invoicePlace: z.string().max(120),
  bankName: z.string().max(120),
  paymentTermsDays: z.coerce.number().int().min(0).max(180),
})

type SettingsField = keyof z.infer<typeof settingsSchema>

/** Libellés de l'écran, pour dire quel champ corriger quand la saisie est refusée. */
const FIELD_LABELS: Record<SettingsField, string> = {
  proRatePercent: 'Remise pro',
  shippingCents: 'Port',
  francoCents: 'Franco dès',
  prepDays: 'Jours de préparation',
  companyName: 'Raison sociale',
  companyAddress: 'Adresse',
  contactEmail: 'Email de contact',
  contactPhone: 'Téléphone',
  vatNumber: 'Numéro de TVA',
  vatSubject: 'Assujettie à la TVA',
  vatRatePermille: 'Taux de TVA',
  iban: 'IBAN',
  contactName: 'Nom du signataire',
  companyTagline: "Ligne d'activité",
  companyZipCity: 'NPA et localité',
  invoicePlace: "Lieu d'émission",
  bankName: 'Banque',
  paymentTermsDays: 'Délai de paiement',
}

export type SaveSettingsResult =
  /** `iban` : la valeur enregistrée, normalisée, à remettre dans le champ. */
  | { ok: true; iban: string }
  /** `ibanError` : message affiché sous le champ IBAN. */
  | { ok: false; error: string; ibanError?: string }

export async function saveSettings(formData: FormData): Promise<SaveSettingsResult> {
  // Tarifs, port et IBAN : réservés à l'administrateur, comme la page
  const check = await assertCapability(can.manageSettings)
  if (!check.ok) return { ok: false, error: check.error }

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    // Rien n'est enregistré : le formulaire garde la saisie et dit quoi corriger.
    const fields = new Set<SettingsField>()
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (typeof field === 'string' && field in FIELD_LABELS) fields.add(field as SettingsField)
    }
    const labels = [...fields].map((field) => FIELD_LABELS[field])
    const ibanError = parsed.error.issues.find((issue) => issue.path[0] === 'iban')?.message
    return {
      ok: false,
      error:
        labels.length > 0
          ? `Rien n'a été enregistré. Vérifiez : ${labels.join(', ')}.`
          : "Rien n'a été enregistré : la saisie n'a pas pu être lue. Rechargez la page.",
      ibanError,
    }
  }

  await prisma.setting.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  })
  // Port, franco et taux pro se répercutent immédiatement sur la boutique.
  revalidatePath('/', 'layout')
  return { ok: true, iban: parsed.data.iban }
}

export async function sendTestEmailAction(
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  const check = await assertCapability(can.manageSettings)
  if (!check.ok) return { success: false, error: check.error }

  const trimmed = toEmail.trim()
  if (!trimmed || !trimmed.includes('@')) {
    return { success: false, error: 'Adresse email invalide' }
  }

  const { sendTestEmail } = await import('@/lib/notifications')
  return sendTestEmail(trimmed)
}

/**
 * Ouvre ou ferme la boutique. Réservé à l'administrateur, vérifié ici et pas
 * seulement à l'affichage : l'action reste appelable directement.
 */
export async function setMaintenanceMode(
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = await assertCapability(can.manageSettings)
  if (!check.ok) return { ok: false, error: check.error }

  await prisma.setting.upsert({
    where: { id: 1 },
    update: { maintenanceMode: enabled },
    create: { id: 1, maintenanceMode: enabled },
  })
  // La vitrine et l'API de commande lisent le réglage à chaque requête ;
  // on invalide aussi les pages admin pour le bandeau d'alerte.
  revalidatePath('/', 'layout')
  return { ok: true }
}
