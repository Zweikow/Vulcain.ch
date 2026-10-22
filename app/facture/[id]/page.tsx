import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { FactureDocument } from '@/components/admin/FactureDocument'
import { FactureClientControls } from '@/components/FactureClientControls'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    select: { numero: true, invoiceNumber: true },
  })

  if (!order) {
    return {
      title: 'Facture introuvable — Drinkcider',
      robots: { index: false, follow: false },
    }
  }

  const titleRef = order.invoiceNumber || order.numero
  return {
    title: `Facture ${titleRef} — Drinkcider`,
    description: `Facture officielle et bulletin de versement QR de la commande ${order.numero}.`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function PublicFacturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ layout?: string }>
}) {
  const [{ id }, { layout }] = await Promise.all([params, searchParams])
  const forcedLayout =
    layout === 'multipage' || layout === '2pages'
      ? 'multipage'
      : layout === 'single' || layout === '1page'
        ? 'single'
        : 'auto'

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { customerNumber: true } },
        items: {
          include: {
            product: {
              select: {
                articleNumber: true,
                bottleSize: true,
                bottlesPerUnit: true,
              },
            },
          },
        },
      },
    }),
    getSettings(),
  ])

  if (!order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] dark:bg-slate-900 py-6 sm:py-10 print:py-0 print:bg-white text-text-primary">
      <div className="max-w-[210mm] mx-auto px-4 sm:px-0 print:p-0 print:max-w-none">
        <FactureClientControls
          numero={order.numero}
          invoiceNumber={order.invoiceNumber}
          isPaid={Boolean(order.paidAt)}
        />

        <div className="facture-shell mx-auto shadow-md print:shadow-none bg-white">
          <FactureDocument order={order} settings={settings} forcedLayout={forcedLayout} />
        </div>
      </div>
    </div>
  )
}
