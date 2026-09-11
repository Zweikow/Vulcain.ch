import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { sendMail } from '@/lib/mail'
import { getSiteUrl } from '@/lib/site'
import {
  orderConfirmation,
  shopNotification,
  shippingNotice,
  orderCancellation,
  invoiceEmail,
  paymentReminderEmail,
  testEmail,
  type MailOrder,
  type MailSettings,
} from '@/lib/mail-templates'

/**
 * Notifications liées au cycle de vie d'une commande.
 *
 * Aucune de ces fonctions ne lève : une commande enregistrée ne doit jamais être
 * perdue parce qu'un email n'est pas parti. Les envois sont journalisés dans la table
 * OrderEmailLog pour assurer une traçabilité totale dans le back-office.
 */

async function loadOrder(orderId: string): Promise<MailOrder | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPriceCents: true,
          product: { select: { bottleSize: true } },
        },
      },
    },
  })
  if (!order) return null
  return {
    id: order.id,
    numero: order.numero,
    invoiceNumber: order.invoiceNumber,
    clientName: order.clientName,
    clientEmail: order.clientEmail,
    clientPhone: order.clientPhone,
    address: order.address,
    npa: order.npa,
    city: order.city,
    deliveryDate: order.deliveryDate,
    message: order.message,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    isPickup: order.isPickup,
    items: order.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      bottleSize: i.product?.bottleSize ?? null,
    })),
  }
}

function mailSettings(s: Awaited<ReturnType<typeof getSettings>>): MailSettings {
  return {
    companyName: s.companyName,
    contactName: s.contactName,
    companyAddress: s.companyAddress,
    companyZipCity: s.companyZipCity,
    contactEmail: s.contactEmail,
    prepDays: s.prepDays,
    iban: s.iban,
    bankName: s.bankName,
    paymentTermsDays: s.paymentTermsDays,
  }
}

async function recordLog(
  orderId: string,
  type: string,
  recipient: string,
  subject: string,
  success: boolean,
  error?: string
) {
  try {
    await prisma.orderEmailLog.create({
      data: {
        orderId,
        type,
        recipient,
        subject,
        success,
        error: error ? String(error).slice(0, 500) : null,
      },
    })
  } catch (err) {
    console.error("Impossible d'enregistrer le log email", err)
  }
}

/** Confirmation au client et notification à la cidrerie (commandes@cidrerie-vulcain.ch). */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return

    const siteUrl = process.env.ADMIN_BASE_URL || getSiteUrl()
    const adminUrl = `${siteUrl}/admin/commandes/${orderId}`
    const mail = mailSettings(settings)

    const clientMsg = orderConfirmation(order, mail)
    const clientRes = await sendMail(clientMsg)
    await recordLog(
      orderId,
      'CONFIRMATION',
      clientMsg.to,
      clientMsg.subject,
      clientRes.success,
      clientRes.error
    )

    const adminMsg = shopNotification(order, mail, adminUrl)
    const adminRes = await sendMail(adminMsg)
    await recordLog(
      orderId,
      'NOTIFICATION_ADMIN',
      adminMsg.to,
      adminMsg.subject,
      adminRes.success,
      adminRes.error
    )
  } catch (error) {
    console.error('Notification de commande impossible', { orderId, error })
  }
}

/** Avis d'expédition ou de mise à disposition pour retrait au domaine. */
export async function notifyOrderShipped(orderId: string): Promise<boolean> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return false

    const msg = shippingNotice(order, mailSettings(settings))
    const res = await sendMail(msg)
    await recordLog(
      orderId,
      order.isPickup ? 'RETRAIT_DISPONIBLE' : 'EXPEDITION',
      msg.to,
      msg.subject,
      res.success,
      res.error
    )
    return res.success
  } catch (error) {
    console.error("Avis d'expédition impossible", { orderId, error })
    return false
  }
}

/** Confirmation d'annulation au client. */
export async function notifyOrderCancelled(orderId: string): Promise<void> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return

    const msg = orderCancellation(order, mailSettings(settings))
    const res = await sendMail(msg)
    await recordLog(orderId, 'ANNULATION', msg.to, msg.subject, res.success, res.error)
  } catch (error) {
    console.error("Confirmation d'annulation impossible", { orderId, error })
  }
}

/** Envoi de la facture officielle au client. */
export async function sendInvoiceEmail(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return { success: false, error: 'Commande introuvable' }

    const msg = invoiceEmail(order, mailSettings(settings))
    const res = await sendMail(msg)
    await recordLog(orderId, 'FACTURE', msg.to, msg.subject, res.success, res.error)
    return {
      success: res.success,
      error: res.error,
    }
  } catch (error: any) {
    console.error('Envoi de facture impossible', { orderId, error })
    return { success: false, error: error?.message || "Erreur lors de l'envoi" }
  }
}

/** Renvoi manuel de la confirmation de commande. */
export async function resendOrderConfirmation(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return { success: false, error: 'Commande introuvable' }

    const msg = orderConfirmation(order, mailSettings(settings))
    const res = await sendMail(msg)
    await recordLog(orderId, 'CONFIRMATION (RENVOI)', msg.to, msg.subject, res.success, res.error)
    return {
      success: res.success,
      error: res.error,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erreur lors du renvoi' }
  }
}

/** Renvoi manuel de l'avis d'expédition. */
export async function resendShippingNotice(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return { success: false, error: 'Commande introuvable' }

    const msg = shippingNotice(order, mailSettings(settings))
    const res = await sendMail(msg)
    await recordLog(
      orderId,
      order.isPickup ? 'RETRAIT_DISPONIBLE (RENVOI)' : 'EXPEDITION (RENVOI)',
      msg.to,
      msg.subject,
      res.success,
      res.error
    )
    return {
      success: res.success,
      error: res.error,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erreur lors du renvoi' }
  }
}

/** Envoi d'un rappel de paiement courtois avec incrément du compteur de rappels. */
export async function sendPaymentReminderNotification(
  orderId: string,
  customNote?: string
): Promise<{ success: boolean; reminderCount?: number; error?: string }> {
  try {
    const [orderData, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            select: {
              productName: true,
              quantity: true,
              unitPriceCents: true,
              product: { select: { bottleSize: true } },
            },
          },
        },
      }),
      getSettings(),
    ])

    if (!orderData) return { success: false, error: 'Commande introuvable' }
    if (orderData.paidAt)
      return { success: false, error: 'Cette commande est déjà marquée comme payée' }
    if (orderData.status === 'ANNULEE')
      return { success: false, error: 'Cette commande est annulée' }

    const mailOrder: MailOrder = {
      id: orderData.id,
      numero: orderData.numero,
      invoiceNumber: orderData.invoiceNumber,
      clientName: orderData.clientName,
      clientEmail: orderData.clientEmail,
      clientPhone: orderData.clientPhone,
      address: orderData.address,
      npa: orderData.npa,
      city: orderData.city,
      deliveryDate: orderData.deliveryDate,
      message: orderData.message,
      subtotalCents: orderData.subtotalCents,
      discountCents: orderData.discountCents,
      shippingCents: orderData.shippingCents,
      totalCents: orderData.totalCents,
      trackingNumber: orderData.trackingNumber,
      carrier: orderData.carrier,
      isPickup: orderData.isPickup,
      items: orderData.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        bottleSize: i.product?.bottleSize ?? null,
      })),
    }

    const baseDate = orderData.invoicedAt || orderData.createdAt
    const dueDate = new Date(baseDate)
    dueDate.setDate(dueDate.getDate() + settings.paymentTermsDays)

    const nextCount = orderData.reminderCount + 1
    const msg = paymentReminderEmail(mailOrder, mailSettings(settings), {
      dueDate,
      reminderCount: nextCount,
      customNote: customNote?.trim() || null,
    })

    const res = await sendMail(msg)

    await recordLog(
      orderId,
      `RAPPEL_PAIEMENT_${nextCount}`,
      msg.to,
      msg.subject,
      res.success,
      res.error
    )

    if (res.success) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          reminderCount: nextCount,
          lastReminderAt: new Date(),
        },
      })
    }

    return {
      success: res.success,
      reminderCount: nextCount,
      error: res.error,
    }
  } catch (error: any) {
    console.error('Envoi de rappel impossible', { orderId, error })
    return { success: false, error: error?.message || "Erreur lors de l'envoi du rappel" }
  }
}

/** Envoi d'un email de test technique depuis le panneau admin. */
export async function sendTestEmail(
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getSettings()
    const msg = testEmail(toEmail, mailSettings(settings))
    const res = await sendMail(msg)
    return {
      success: res.success,
      error: res.error,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Erreur lors de l'envoi du test" }
  }
}
