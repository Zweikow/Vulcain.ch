import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { requireCapability } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { CreateOrderForm } from '@/components/admin/CreateOrderForm'

export const dynamic = 'force-dynamic'

export default async function NouvelleCommandePage() {
  await requireCapability(can.manageOrders)

  const [products, customers, settings] = await Promise.all([
    prisma.product.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        priceCents: true,
        stock: true,
        bottleSize: true,
        bottlesPerUnit: true,
        category: { select: { name: true } },
        promotions: {
          where: { active: true },
        },
      },
    }),
    prisma.customer.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        npa: true,
        city: true,
        isPro: true,
        proRatePercent: true,
        customerNumber: true,
      },
    }),
    getSettings(),
  ])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary-dark mb-6">
        <Link href="/admin/commandes" className="hover:text-primary transition-colors">
          Commandes
        </Link>
        <span>/</span>
        <span className="text-text-primary dark:text-text-primary-dark font-medium">
          Nouvelle commande manuelle
        </span>
      </div>

      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-text-primary dark:text-text-primary-dark">
          Créer une commande manuellement
        </h1>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
          Enregistrez une commande prise par téléphone, au caveau ou reçue par message.
        </p>
      </div>

      <CreateOrderForm
        products={products}
        customers={customers}
        settings={{
          shippingCents: settings.shippingCents,
          francoCents: settings.francoCents,
          proRatePercent: settings.proRatePercent,
          vatRatePermille: settings.vatRatePermille,
          vatSubject: settings.vatSubject,
        }}
      />
    </div>
  )
}
