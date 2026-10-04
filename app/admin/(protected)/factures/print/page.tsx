import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { FactureDocument } from '@/components/admin/FactureDocument'
import { BatchPrintHeader } from '@/components/admin/BatchPrintHeader'
import { FileTextIcon } from '@/components/admin/AdminIcons'

export const dynamic = 'force-dynamic'

export default async function FacturesBatchPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const user = await currentUser()
  if (!user || !can.seeFinancials(user.role)) {
    redirect('/admin')
  }

  const { ids: rawIds } = await searchParams
  const idList = (rawIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (idList.length === 0) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center flex flex-col items-center gap-4">
        <FileTextIcon className="w-12 h-12 text-text-tertiary" />
        <h1 className="text-xl font-bold font-display text-text-primary dark:text-text-primary-dark">
          Aucune facture sélectionnée
        </h1>
        <p className="text-sm text-text-secondary">
          Veuillez retourner à la liste des factures et sélectionner au moins une facture à
          exporter.
        </p>
        <Link href="/admin/factures" className="btn-primary py-2 px-4 text-sm mt-2">
          <ArrowLeft className="inline-block h-[1em] w-[1em] align-[-0.125em]" /> Retour à la liste
          des factures
        </Link>
      </div>
    )
  }

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { id: { in: idList } },
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
      orderBy: [{ invoiceNumber: 'asc' }, { createdAt: 'asc' }],
    }),
    getSettings(),
  ])

  if (orders.length === 0) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center flex flex-col items-center gap-4">
        <h1 className="text-xl font-bold">Factures introuvables</h1>
        <Link href="/admin/factures" className="btn-secondary text-sm">
          <ArrowLeft className="inline-block h-[1em] w-[1em] align-[-0.125em]" /> Retour aux
          factures
        </Link>
      </div>
    )
  }

  const totalAmountCents = orders.reduce((sum, o) => sum + o.totalCents, 0)

  return (
    <div className="min-h-screen bg-bg-page dark:bg-bg-page-dark print:bg-white pb-16 print:pb-0">
      {/* En-tête non imprimé */}
      <BatchPrintHeader count={orders.length} totalAmountCents={totalAmountCents} />

      {/* Ensemble des factures A4 séquentielles */}
      <div className="flex flex-col gap-10 print:gap-0 max-w-[210mm] mx-auto">
        {orders.map((order) => (
          <div key={order.id} className="facture-shell mx-auto facture-batch-item">
            <FactureDocument order={order} settings={settings} />
          </div>
        ))}
      </div>

      {/* Règles d'impression pour forcer le saut de page entre chaque facture */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            .facture-batch-item {
              break-after: page !important;
              page-break-after: always !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .facture-batch-item:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }
          }
        `,
        }}
      />
    </div>
  )
}
