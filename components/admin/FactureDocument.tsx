import Image from 'next/image'
import { ClientType, OrderStatus } from '@prisma/client'
import { formatInvoiceAmount } from '@/lib/money'
import { SwissQRBill } from '@/components/admin/SwissQRBill'

// Le document est du papier : couleurs fixes, indépendantes du thème sombre.

type FactureOrder = {
  numero: string
  invoiceNumber: string | null
  invoicedAt: Date | null
  clientType: ClientType
  status: OrderStatus
  clientName: string
  address: string
  npa: string
  city: string
  clientEmail: string
  deliveryDate: Date | null
  shippedAt: Date | null
  createdAt: Date
  subtotalCents: number
  discountCents: number
  shippingCents: number
  totalCents: number
  vatCents: number
  proRatePercent?: number | null
  paidAt?: Date | null
  paymentMethod?: string | null
  customer?: {
    customerNumber?: number | null
  } | null
  items: {
    id: string
    productName: string
    quantity: number
    unitPriceCents: number
    listPriceCents: number
    product: {
      articleNumber: number
      bottleSize?: string | null
    }
  }[]
}

type FactureSettings = {
  companyName: string
  companyTagline: string
  companyAddress: string
  companyZipCity: string
  contactName: string
  contactEmail: string
  contactPhone: string
  invoicePlace: string
  iban: string
  bankName: string
  vatNumber: string
  vatSubject: boolean
  vatRatePermille: number
  paymentTermsDays: number
  proRatePercent: number
}

const longDate = new Intl.DateTimeFormat('fr-CH', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// Colonnes du modèle papier : les trois colonnes « cartons » sont remplies à la
// main à la cave (le conditionnement n'est pas encore modélisé par produit).
const EMPTY_ROWS_MIN = 2

function getCartonCounts(
  quantity: number,
  bottleSize?: string | null,
  productName?: string,
  unitPriceCents?: number
) {
  // Détection d'un pack estival historique (1 pack = 3 cartons de 24 = 72 bouteilles)
  const isSummerPack =
    productName?.includes('Pack Été 3 cartons') || productName?.includes('3 cartons (2+1')
  if (isSummerPack) {
    const totalBottles = 72 * quantity
    const bottlePrice = Math.round(unitPriceCents ? unitPriceCents / 48 : 360)
    return {
      c24: 3 * quantity,
      c6: null,
      c12: null,
      bottles: totalBottles,
      displayPriceCents: bottlePrice,
    }
  }

  const isSmallBottle =
    bottleSize === '27.5cl' ||
    bottleSize === '33cl' ||
    productName?.includes('27.5') ||
    productName?.includes('Evervescence')

  if (isSmallBottle) {
    const c24 = Math.floor(quantity / 24)
    return {
      c24: c24 > 0 ? c24 : null,
      c6: null,
      c12: null,
      bottles: quantity,
      displayPriceCents: unitPriceCents,
    }
  }

  // Bouteilles de 75cl (ou standard)
  let c12: number | null = null
  let c6: number | null = null

  if (quantity >= 12) {
    c12 = Math.floor(quantity / 12)
    const rem = quantity % 12
    if (rem >= 6) {
      c6 = Math.floor(rem / 6)
    }
  } else if (quantity >= 6) {
    c6 = Math.floor(quantity / 6)
  }

  return { c24: null, c6, c12, bottles: quantity, displayPriceCents: unitPriceCents }
}

export function FactureDocument({
  order,
  settings,
}: {
  order: FactureOrder
  settings: FactureSettings
}) {
  const isPro = order.clientType === ClientType.PRO
  const effectiveProRate = order.proRatePercent ?? settings.proRatePercent
  const emptyRows = Math.max(0, EMPTY_ROWS_MIN - order.items.length)
  // Le délai de paiement court depuis l'émission de la facture, pas depuis la commande.
  const dueDate = new Date(order.invoicedAt ?? order.createdAt)
  dueDate.setDate(dueDate.getDate() + settings.paymentTermsDays)

  const cellBase = 'border border-[#D8DEE6] px-2 py-1 align-top'
  const handFill = 'border border-[#D8DEE6] px-2 py-1 bg-[#FCFCFA]'

  return (
    <article className="facture-page bg-white text-[#153243]">
      <div className="facture-body">
        {/* En-tête : expéditeur à gauche, logo à droite */}
        <header className="flex items-start justify-between gap-8">
          <div className="text-[12px] leading-relaxed">
            <p className="font-bold text-[13px] tracking-tight">
              {settings.companyTagline === 'Cidrerie du Vulcain'
                ? 'Vulcano Distribution'
                : settings.companyTagline || 'Vulcano Distribution'}
            </p>
            <p className="font-medium">{settings.contactName}</p>
            <p>{settings.companyAddress}</p>
            <p>{settings.companyZipCity}</p>
            {settings.vatNumber && (
              <p className="mt-0.5 font-mono text-[10px] text-[#4A6278]">{settings.vatNumber}</p>
            )}
          </div>
          <Image
            src="/facture/logo-vulcain.png"
            alt={settings.companyName}
            width={180}
            height={86}
            className="h-auto w-[150px] shrink-0"
            priority
            unoptimized
          />
        </header>

        {/* Lieu et date d'émission */}
        <p className="mt-4 text-[12px]">
          {settings.invoicePlace}, le {longDate.format(order.createdAt)}
        </p>

        {/* Destinataire (fenêtre à droite) */}
        <div className="mt-2 flex justify-end">
          <div className="w-64 text-[12px] leading-relaxed">
            <p className="font-semibold">{order.clientName}</p>
            <p>{order.address}</p>
            <p>
              {order.npa} {order.city}
            </p>
          </div>
        </div>

        {/* Titre. Sans numéro attribué, le document n'est pas encore une facture :
            il le dit, pour qu'un brouillon imprimé ne soit pas pris pour l'original. */}
        <div className="mt-4 flex items-baseline justify-between border-b border-[#E2E8EF] pb-1.5">
          <h1 className="font-display text-[20px] font-semibold">
            {order.invoiceNumber ? 'Facture' : 'Projet de facture'}
          </h1>
          <span className="font-mono text-[14px] font-semibold tracking-tight">
            {order.invoiceNumber ?? 'non émise'}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-[#4A6278]">
          {order.customer?.customerNumber && (
            <span className="font-semibold text-[#153243]">
              Client N° <span className="font-mono">{order.customer.customerNumber}</span>
            </span>
          )}
          <span>
            Votre commande : <span className="font-mono">{order.numero}</span>
          </span>
          <span>
            Livraison :{' '}
            {order.deliveryDate
              ? longDate.format(order.deliveryDate)
              : order.shippedAt
                ? longDate.format(order.shippedAt)
                : 'à convenir'}
          </span>
          {isPro && (
            <span className="font-medium text-[#6B4F68]">
              Tarif professionnel (−{effectiveProRate}%)
            </span>
          )}
          {order.paidAt && (
            <span className="inline-flex items-center gap-1 font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
              ✓ Facture acquittée {order.paymentMethod ? `(${order.paymentMethod})` : ''}
            </span>
          )}
        </div>

        {/* Lignes */}
        <table className="mt-3 w-full border-collapse text-[11px] tabular">
          <thead>
            <tr className="bg-[#F7F6F0] text-left text-[10px] font-semibold uppercase tracking-[.04em]">
              <th className={`${cellBase} w-[22%]`}>Cuvée</th>
              <th className={`${cellBase} w-[12%] text-center font-medium`}>Cartons 24×33 cl</th>
              <th className={`${cellBase} w-[12%] text-center font-medium`}>Cartons 6×75 cl</th>
              <th className={`${cellBase} w-[12%] text-center font-medium`}>Cartons 12×75 cl</th>
              <th className={`${cellBase} w-[12%] text-right`}>Bouteilles</th>
              <th className={`${cellBase} w-[15%] text-right`}>Prix / bouteille</th>
              <th className={`${cellBase} w-[15%] text-right`}>Montant CHF</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const cartons = getCartonCounts(
                item.quantity,
                item.product?.bottleSize,
                item.productName,
                item.unitPriceCents
              )
              const isFreeItem = item.unitPriceCents === 0
              return (
                <tr key={item.id}>
                  <td className={`${cellBase} font-medium`}>
                    {item.productName}
                    <div className="mt-0.5 font-mono text-[9px] font-normal text-[#7A95A5]">
                      Article-Nr. {item.product.articleNumber.toString().padStart(5, '0')}
                    </div>
                  </td>
                  <td className={`${cellBase} text-center font-medium`}>{cartons.c24 ?? ''}</td>
                  <td className={`${cellBase} text-center font-medium`}>{cartons.c6 ?? ''}</td>
                  <td className={`${cellBase} text-center font-medium`}>{cartons.c12 ?? ''}</td>
                  <td className={`${cellBase} text-right font-medium`}>{cartons.bottles}</td>
                  <td className={`${cellBase} text-right`}>
                    {isFreeItem ? (
                      <span className="font-semibold text-green-700">Offert</span>
                    ) : (
                      <>
                        {isPro && item.listPriceCents !== item.unitPriceCents && (
                          <span className="mr-1.5 text-[#7A95A5] line-through">
                            {formatInvoiceAmount(item.listPriceCents)}
                          </span>
                        )}
                        {formatInvoiceAmount(cartons.displayPriceCents ?? item.unitPriceCents)}
                      </>
                    )}
                  </td>
                  <td className={`${cellBase} text-right`}>
                    {isFreeItem ? '0.--' : formatInvoiceAmount(item.unitPriceCents * item.quantity)}
                  </td>
                </tr>
              )
            })}

            {/* Lignes vierges : le modèle papier laisse de la place à la main */}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`vide-${i}`}>
                <td className={cellBase}>&nbsp;</td>
                <td className={handFill} />
                <td className={handFill} />
                <td className={handFill} />
                <td className={cellBase} />
                <td className={cellBase} />
                <td className={cellBase} />
              </tr>
            ))}
          </tbody>
          <tfoot>
            {isPro && order.discountCents > 0 && (
              <>
                <tr>
                  <td className={`${cellBase} text-right`} colSpan={6}>
                    Total brut
                  </td>
                  <td className={`${cellBase} text-right`}>
                    {formatInvoiceAmount(order.subtotalCents + order.discountCents)}
                  </td>
                </tr>
                <tr>
                  <td className={`${cellBase} text-right text-[#6B4F68]`} colSpan={6}>
                    Remise professionnelle (−{effectiveProRate}%)
                  </td>
                  <td className={`${cellBase} text-right text-[#6B4F68]`}>
                    −{formatInvoiceAmount(order.discountCents)}
                  </td>
                </tr>
              </>
            )}
            <tr>
              <td className={`${cellBase} text-right`} colSpan={6}>
                Frais de port
              </td>
              <td className={`${cellBase} text-right`}>
                {order.shippingCents === 0 ? 'Offerts' : formatInvoiceAmount(order.shippingCents)}
              </td>
            </tr>
            <tr className="bg-[#F7F6F0] font-bold">
              <td className={`${cellBase} text-right`} colSpan={6}>
                {settings.vatSubject ? 'Total TTC' : 'Total'}
              </td>
              <td className={`${cellBase} text-right`}>{formatInvoiceAmount(order.totalCents)}</td>
            </tr>
          </tfoot>
        </table>

        {/* TVA */}
        <p className="mt-1 text-[10px] text-[#7A95A5]">
          {settings.vatSubject ? (
            <>
              TVA {(settings.vatRatePermille / 10).toFixed(1)}% incluse, soit{' '}
              {formatInvoiceAmount(order.vatCents)}.
            </>
          ) : (
            <>Non assujetti à la TVA (art. 10 al. 2 LTVA). Aucune TVA n&apos;est facturée.</>
          )}
        </p>

        {/* Coordonnées bancaires & message */}
        <section className="mt-3 flex items-start justify-between gap-6 text-[11px] leading-relaxed">
          <div>
            <p className="font-semibold">Coordonnées bancaires</p>
            <p className="mt-0.5 font-mono">IBAN : {settings.iban}</p>
            <p>{settings.bankName}</p>
            {order.paidAt ? (
              <p className="mt-1 font-semibold text-green-700">
                ✓ Facture acquittée le {longDate.format(new Date(order.paidAt))}
                {order.paymentMethod ? ` (${order.paymentMethod})` : ''}. Merci !
              </p>
            ) : (
              <p className="mt-1 font-medium">
                Facture payable à {settings.paymentTermsDays} jours net, au{' '}
                {longDate.format(dueDate)}.
              </p>
            )}
          </div>

          <div className="text-right">
            <p>Merci beaucoup pour votre commande.</p>
            <p className="mt-1">Cidricolement,</p>
            <p className="mt-1.5 font-semibold">{settings.contactName}</p>
          </div>
        </section>

        {/* Pied : mention légale obligatoire */}
        <footer className="mt-auto border-t border-[#E2E8EF] pt-2 text-[9px] text-[#7A95A5]">
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
            <span>
              {settings.companyName} · {settings.companyAddress}, {settings.companyZipCity}
              {settings.contactEmail && ` · ${settings.contactEmail}`}
              {settings.contactPhone && ` · ${settings.contactPhone}`}
            </span>
            <span>La vente d&apos;alcool est interdite aux mineurs.</span>
          </div>
        </footer>
      </div>

      {/* Section QR-facture suisse officielle (norme SIX, 210 x 105 mm) */}
      <div className="facture-qr">
        <SwissQRBill order={order} settings={settings} />
      </div>
    </article>
  )
}
