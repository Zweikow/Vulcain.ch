'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { assertCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { recordAudit } from '@/lib/audit'
import { AuditAction, AuditTargetType, ClientType } from '@prisma/client'
import { recalculateOrderPricing } from '@/lib/order-pricing'

export interface UpdateCustomerInput {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  address: string
  npa: string
  city: string
  isPro: boolean
  proRatePercent?: number | null
  notes?: string | null
  updateFirstOrder?: boolean
}

export async function updateCustomerAction(
  id: string,
  input: UpdateCustomerInput
): Promise<{ success: boolean; error?: string; updatedOrderNumero?: string }> {
  const guard = await assertCapability(can.manageCustomers)
  if (!guard.ok) return { success: false, error: guard.error }

  if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
    return { success: false, error: 'Le prénom, le nom et l’email sont requis.' }
  }

  // Validate custom pro rate if provided
  let cleanRate: number | null = null
  if (input.isPro && input.proRatePercent !== undefined && input.proRatePercent !== null) {
    const num = Number(input.proRatePercent)
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      return { success: false, error: 'Le taux de remise doit être un pourcentage entre 0 et 100.' }
    }
    cleanRate = Math.round(num)
  }

  try {
    const previous = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isPro: true,
        proRatePercent: true,
        customerNumber: true,
      },
    })

    if (!previous) return { success: false, error: 'Client introuvable' }

    // Check if email changed and is taken by another customer
    if (input.email.trim().toLowerCase() !== previous.email.toLowerCase()) {
      const exists = await prisma.customer.findUnique({
        where: { email: input.email.trim().toLowerCase() },
      })
      if (exists && exists.id !== id) {
        return { success: false, error: 'Cette adresse email est déjà associée à un autre client.' }
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        address: input.address.trim(),
        npa: input.npa.trim(),
        city: input.city.trim(),
        isPro: input.isPro,
        proRatePercent: input.isPro ? cleanRate : null,
        notes: input.notes?.trim() || null,
      },
    })

    // Audit log
    const changes: string[] = []
    if (previous.isPro !== updated.isPro) {
      changes.push(
        `Statut Pro: ${previous.isPro ? 'OUI' : 'NON'} → ${updated.isPro ? 'OUI' : 'NON'}`
      )
    }
    if (previous.proRatePercent !== updated.proRatePercent) {
      changes.push(
        `Taux personnalisé: ${previous.proRatePercent ?? 'Défaut'}% → ${
          updated.proRatePercent ?? 'Défaut'
        }%`
      )
    }

    await recordAudit(
      AuditAction.TARIF_BASCULE,
      {
        type: AuditTargetType.COMMANDE,
        id: updated.id,
        label: `Client N° ${updated.customerNumber || updated.id}`,
      },
      changes.length > 0
        ? changes.join(' · ')
        : `Mise à jour fiche client ${updated.firstName} ${updated.lastName}`
    )

    // Si le client est passé en PRO, mettre à jour automatiquement sa première commande
    let updatedOrderNumero: string | undefined

    if (input.isPro && input.updateFirstOrder !== false) {
      const firstOrder = await prisma.order.findFirst({
        where: {
          customerId: id,
          clientType: ClientType.PRIVE,
          status: { not: 'ANNULEE' },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, numero: true },
      })

      if (firstOrder) {
        await recalculateOrderPricing(firstOrder.id, {
          targetType: ClientType.PRO,
          proRatePercent: cleanRate,
          updateCustomer: false,
        })
        updatedOrderNumero = firstOrder.numero

        revalidatePath(`/admin/commandes/${firstOrder.id}`)
        revalidatePath(`/admin/commandes/${firstOrder.id}/facture`)
        revalidatePath('/admin/commandes')
        revalidatePath('/admin/factures')
      }
    }

    revalidatePath('/admin/clients')
    revalidatePath(`/admin/clients/${id}`)
    revalidatePath('/admin/commandes/nouvelle')
    return { success: true, updatedOrderNumero }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la mise à jour' }
  }
}

export async function deleteCustomerAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertCapability(can.manageCustomers)
  if (!guard.ok) return { success: false, error: guard.error }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
      },
    })

    if (!customer) return { success: false, error: 'Client introuvable' }

    if (customer._count.orders > 0) {
      return {
        success: false,
        error: `Impossible de supprimer ce client car il possède ${customer._count.orders} commande(s) dans l'historique comptable.`,
      }
    }

    await prisma.customer.delete({ where: { id } })

    await recordAudit(
      AuditAction.STATUT_MODIFIE,
      {
        type: AuditTargetType.COMMANDE,
        id: null,
        label: `Client N° ${customer.customerNumber || customer.id}`,
      },
      `Fiche client supprimée : ${customer.firstName} ${customer.lastName} (${customer.email})`
    )

    revalidatePath('/admin/clients')
    revalidatePath('/admin/commandes/nouvelle')
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la suppression' }
  }

  redirect('/admin/clients')
}
