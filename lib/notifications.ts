import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { sendMail } from '@/lib/mail'
import {
  orderConfirmation,
  shopNotification,
  shippingNotice,
  type MailOrder,
  type MailSettings,
} from '@/lib/mail-templates'

/**
 * Notifications liées au cycle de vie d'une commande.
 *
 * Aucune de ces fonctions ne lève : une commande enregistrée ne doit jamais être
 * perdue parce qu'un email n'est pas parti. Un échec est journalisé et reste
 * rattrapable depuis le back-office, qui montre la commande de toute façon.
 */

async function loadOrder(orderId: string): Promise<MailOrder | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productName: true, quantity: true, unitPriceCents: true } } },
  })
  if (!order) return null
  return {
    numero: order.numero,
    invoiceNumber: order.invoiceNumber,
    clientName: order.clientName,
    clientEmail: order.clientEmail,
    address: order.address,
    npa: order.npa,
    city: order.city,
    deliveryDate: order.deliveryDate,
    message: order.message,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    items: order.items,
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

/** Confirmation au client et notification à la cidrerie, à la prise de commande. */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return

    const adminUrl = process.env.ADMIN_BASE_URL
      ? `${process.env.ADMIN_BASE_URL}/admin/commandes/${orderId}`
      : null
    const mail = mailSettings(settings)

    await Promise.all([
      sendMail(orderConfirmation(order, mail)),
      sendMail(shopNotification(order, mail, adminUrl)),
    ])
  } catch (error) {
    console.error('Notification de commande impossible', { orderId, error })
  }
}

/** Avis d'expédition au client, avec les informations de paiement. */
export async function notifyOrderShipped(orderId: string): Promise<void> {
  try {
    const [order, settings] = await Promise.all([loadOrder(orderId), getSettings()])
    if (!order) return
    await sendMail(shippingNotice(order, mailSettings(settings)))
  } catch (error) {
    console.error("Avis d'expédition impossible", { orderId, error })
  }
}
