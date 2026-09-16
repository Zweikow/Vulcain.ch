import Image from 'next/image'
import { ClientType, OrderStatus } from '@prisma/client'
import { formatInvoiceAmount } from '@/lib/money'
import { SwissQRBill } from '@/components/admin/SwissQRBill'
import { CheckIcon } from '@/components/admin/AdminIcons'

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
    bottlesPerUnit?: number
    unitPriceCents: number
    listPriceCents: number
    product: {
      articleNumber: number
      bottleSize?: string | null
      bottlesPerUnit?: number
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
  unitPriceCents?: number,
  bottlesPerUnit: number = 1,
  listPriceCents?: number
) {
  // Détection d'un pack estival historique (1 pack = 3 cartons de 24 = 72 bouteilles)
  const isSummerPack =
    productName?.includes('Pack Été 3 cartons') || productName?.includes('3 cartons (2+1')
  if (isSummerPack) {
    const totalBottles = 72 * quantity
    const bottlePrice = Math.round(unitPriceCents ? unitPriceCents / 72 : 360)
    return {
      c24: 3 * quantity,
      c6: null,
      c12: null,
      bottles: totalBottles,
      displayPriceCents: bottlePrice,
      displayListPriceCents: listPriceCents ? Math.round(listPriceCents / 72) : 360,
    }
  }

  // Si le produit est vendu par carton / lot (ex: Effervescence ou toute future offre en carton)
  const nameLower = (productName ?? '').toLowerCase()
  const detectedBpu =
    nameLower.includes('24x') || nameLower.includes('24×') || nameLower.includes('24 bout')
      ? 24
      : nameLower.includes('12x') || nameLower.includes('12×') || nameLower.includes('12 bout')
        ? 12
        : nameLower.includes('6x') || nameLower.includes('6×') || nameLower.includes('6 bout')
          ? 6
          : nameLower.includes('effervescence') || nameLower.includes('evervescence')
            ? 24
            : 1

  const effectiveBpu = bottlesPerUnit > 1 ? bottlesPerUnit : detectedBpu

  if (effectiveBpu > 1) {
    const c24 = effectiveBpu === 24 ? quantity : null
    const c12 = effectiveBpu === 12 ? quantity : null
    const c6 = effectiveBpu === 6 ? quantity : null
    return {
      c24,
      c6,
      c12,
      bottles: quantity * effectiveBpu,
      displayPriceCents:
        unitPriceCents != null ? Math.round(unitPriceCents / effectiveBpu) : undefined,
      displayListPriceCents:
        listPriceCents != null ? Math.round(listPriceCents / effectiveBpu) : undefined,
    }
  }

  const isSmallBottle =
    bottleSize === '27.5cl' ||
    bottleSize === '33cl' ||
    productName?.includes('27.5') ||
    productName?.includes('Evervescence') ||
    productName?.includes('Effervescence')

  if (isSmallBottle) {
    const c24 = Math.floor(quantity / 24)
    return {
      c24: c24 > 0 ? c24 : null,
      c6: null,
      c12: null,
      bottles: quantity,
      displayPriceCents: unitPriceCents,
      displayListPriceCents: listPriceCents,
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

  return {
    c24: null,
    c6,
    c12,
    bottles: quantity,
    displayPriceCents: unitPriceCents,
    displayListPriceCents: listPriceCents,
  }
}

export function FactureDocument({
  order,
  settings,
  forcedLayout = 'auto',
}: {
  order: FactureOrder
  settings: FactureSettings
  forcedLayout?: 'auto' | 'single' | 'multipage'
}) {
  const isPro = order.clientType === ClientType.PRO
  const effectiveProRate = order.proRatePercent ?? settings.proRatePercent

  // Si le mode est forcé, on le respecte, sinon seuil automatique à 3 articles
  const isMultiPage =
    forcedLayout === 'multipage'
      ? true
      : forcedLayout === 'single'
        ? false
        : order.items.length >= 3

  // Sur mode multi-page, pas de lignes vides. Sur 1 page, seulement pour combler à l'écran si nécessaire, mais masqué à l'impression
  const emptyRows = isMultiPage ? 0 : Math.max(0, EMPTY_ROWS_MIN - order.items.length)

  // Le délai de paiement court depuis l'émission de la facture, pas depuis la commande.
  const dueDate = new Date(order.invoicedAt ?? order.createdAt)
  dueDate.setDate(dueDate.getDate() + settings.paymentTermsDays)

  const cellBase = 'border border-[#D8DEE6] px-2 py-1 align-top'
  const handFill = 'border border-[#D8DEE6] px-2 py-1 bg-[#FCFCFA]'

  // --- Rendu 2 pages pour les commandes moyennes/grandes (QR-code entier sur page 2) ---
  if (isMultiPage) {
    return (
      <div className="flex flex-col gap-6 print:gap-0 print:block">
        {/* Page 1 : Corps de facture complet */}
        <article
          className="facture-page facture-page-1 facture-page-multipage bg-white text-[#153243]"
          style={{ colorScheme: 'only light', forcedColorAdjust: 'none' } as React.CSSProperties}
        >
          <div className="facture-body">
            {/* En-tête : expéditeur à gauche, logo à droite */}
            <header className="flex items-start justify-between gap-8">
              <div className="text-[12px] leading-relaxed">
                <p className="font-bold text-[13px] tracking-tight">
                  {settings.companyTagline === 'Cidrerie du Vulcain'
                    ? 'Drinkcider'
                    : settings.companyTagline || 'Drinkcider'}
                </p>
                <p className="font-medium">{settings.contactName}</p>
                <p>{settings.companyAddress}</p>
                <p>{settings.companyZipCity}</p>
                {settings.vatNumber && (
                  <p className="mt-0.5 font-mono text-[10px] text-[#4A6278]">
                    {settings.vatNumber}
                  </p>
                )}
              </div>
              <Image
                src="/facture/logo-vulcain.png"
                alt={settings.companyName}
                width={180}
                height={86}
                className="h-auto w-[145px] shrink-0"
                priority
                unoptimized
              />
            </header>

            {/* Lieu et date d'émission */}
            <p className="mt-3.5 text-[12px]">
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

            {/* Titre */}
            <div className="mt-3.5 flex items-baseline justify-between border-b border-[#E2E8EF] pb-1.5">
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
                  <CheckIcon className="w-3 h-3 text-green-700 inline" /> Facture acquittée{' '}
                  {order.paymentMethod ? `(${order.paymentMethod})` : ''}
                </span>
              )}
            </div>

            {/* Lignes de commande */}
            <table className="mt-3 w-full border-collapse text-[11px] tabular">
              <thead>
                <tr className="bg-[#F7F6F0] text-left text-[10px] font-semibold uppercase tracking-[.04em]">
                  <th className={`${cellBase} w-[22%]`}>Cuvée</th>
                  <th className={`${cellBase} w-[12%] text-center font-medium`}>
                    Cartons 24×27.5 cl
                  </th>
                  <th className={`${cellBase} w-[12%] text-center font-medium`}>Cartons 6×75 cl</th>
                  <th className={`${cellBase} w-[12%] text-center font-medium`}>
                    Cartons 12×75 cl
                  </th>
                  <th className={`${cellBase} w-[12%] text-right`}>Bouteilles</th>
                  <th className={`${cellBase} w-[15%] text-right`}>Prix / bouteille</th>
                  <th className={`${cellBase} w-[15%] text-right`}>Montant CHF</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const bpu = item.bottlesPerUnit ?? (item.product as any)?.bottlesPerUnit ?? 1
                  const cartons = getCartonCounts(
                    item.quantity,
                    item.product.bottleSize,
                    item.productName,
                    item.unitPriceCents,
                    bpu,
                    item.listPriceCents
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
                                {formatInvoiceAmount(
                                  cartons.displayListPriceCents ?? item.listPriceCents
                                )}
                              </span>
                            )}
                            {formatInvoiceAmount(cartons.displayPriceCents ?? item.unitPriceCents)}
                          </>
                        )}
                      </td>
                      <td className={`${cellBase} text-right`}>
                        {isFreeItem
                          ? '0.--'
                          : formatInvoiceAmount(item.unitPriceCents * item.quantity)}
                      </td>
                    </tr>
                  )
                })}
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
                    {order.shippingCents === 0
                      ? 'Offerts'
                      : formatInvoiceAmount(order.shippingCents)}
                  </td>
                </tr>
                <tr className="bg-[#F7F6F0] font-bold">
                  <td className={`${cellBase} text-right`} colSpan={6}>
                    {settings.vatSubject ? 'Total TTC' : 'Total'}
                  </td>
                  <td className={`${cellBase} text-right`}>
                    {formatInvoiceAmount(order.totalCents)}
                  </td>
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
                  <p className="mt-1 font-semibold text-green-700 flex items-center gap-1">
                    <CheckIcon className="w-3.5 h-3.5 text-green-700 inline shrink-0" />
                    <span>
                      Facture acquittée le {longDate.format(new Date(order.paidAt))}
                      {order.paymentMethod ? ` (${order.paymentMethod})` : ''}. Merci !
                    </span>
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

            {/* Encart explicatif : le bulletin QR est sur la page suivante */}
            <div className="mt-4 rounded border border-[#D8DEE6] bg-[#F7F6F0] px-3.5 py-2.5 text-[11px] text-[#153243] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#4A6278] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="font-semibold">
                  Section de paiement : Bulletin QR-facture officiel sur la page suivante
                </span>
              </div>
              <span className="font-semibold text-[#4A6278] text-[10px] uppercase tracking-wider">
                Page 1 / 2 &rarr;
              </span>
            </div>

            {/* Pied de page 1 */}
            <footer className="mt-auto border-t border-[#E2E8EF] pt-2 text-[9px] text-[#7A95A5]">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                <span>
                  {settings.companyName} · {settings.companyAddress}, {settings.companyZipCity}
                  {settings.contactEmail && ` · ${settings.contactEmail}`}
                  {settings.contactPhone && ` · ${settings.contactPhone}`}
                </span>
                <span className="font-medium text-[#153243]">
                  La vente d&apos;alcool est interdite aux mineurs. · Page 1 / 2
                </span>
              </div>
            </footer>
          </div>
        </article>

        {/* Séparateur visuel à l'écran entre les deux feuilles (non imprimé) */}
        <div className="py-2.5 px-4 bg-[#F0F4F8] border-y border-[#D8DEE6] text-center text-[12px] font-medium text-[#4A6278] print:hidden flex items-center justify-center gap-2 select-none">
          <span>Feuille 1 terminée</span>
          <span className="text-[#A0AEC0]">·</span>
          <span className="font-semibold text-[#153243]">Saut de page automatique</span>
          <span className="text-[#A0AEC0]">·</span>
          <span>Feuille 2 ci-dessous (Bulletin QR de paiement)</span>
        </div>

        {/* Page 2 : Annexe de paiement avec le QR-code suisse officiel complet en bas */}
        <article
          className="facture-page facture-page-2 bg-white text-[#153243]"
          style={{ colorScheme: 'only light', forcedColorAdjust: 'none' } as React.CSSProperties}
        >
          <div className="facture-body facture-body-p2">
            {/* En-tête Page 2 */}
            <header className="flex items-start justify-between gap-8">
              <div className="text-[12px] leading-relaxed">
                <p className="font-bold text-[13px] tracking-tight">
                  {settings.companyTagline === 'Cidrerie du Vulcain'
                    ? 'Drinkcider'
                    : settings.companyTagline || 'Drinkcider'}
                </p>
                <p className="font-medium text-[#4A6278]">{settings.contactName}</p>
                <p className="text-[#7A95A5] text-[11px]">
                  {settings.companyAddress}, {settings.companyZipCity}
                </p>
                <h2 className="mt-2.5 font-display text-[18px] font-bold tracking-tight text-[#153243]">
                  Annexe de paiement — QR-facture suisse
                </h2>
                <p className="text-[11px] text-[#4A6278]">
                  Bulletin de versement officiel lié à la{' '}
                  {order.invoiceNumber
                    ? `facture ${order.invoiceNumber}`
                    : `commande ${order.numero}`}
                </p>
              </div>
              <Image
                src="/facture/logo-vulcain.png"
                alt={settings.companyName}
                width={140}
                height={67}
                className="h-auto w-[120px] shrink-0"
                priority
                unoptimized
              />
            </header>

            {/* Encadré récapitulatif débiteur / commande */}
            <div className="mt-4 rounded border border-[#D8DEE6] bg-[#FCFCFA] p-3 text-[11px] leading-relaxed">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#E2E8EF]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A95A5]">
                    Références facture
                  </p>
                  <p className="mt-1 font-semibold text-[#153243]">
                    {order.invoiceNumber
                      ? `Facture N° ${order.invoiceNumber}`
                      : 'Projet de facture'}
                  </p>
                  <p className="text-[#4A6278]">
                    Commande : <span className="font-mono">{order.numero}</span>
                  </p>
                  <p className="text-[#4A6278]">
                    Date d&apos;émission : {longDate.format(order.createdAt)}
                  </p>
                  {order.customer?.customerNumber && (
                    <p className="text-[#4A6278]">
                      Client N° <span className="font-mono">{order.customer.customerNumber}</span>
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A95A5]">
                    Débiteur (client)
                  </p>
                  <p className="mt-1 font-semibold text-[#153243]">{order.clientName}</p>
                  <p className="text-[#4A6278]">{order.address}</p>
                  <p className="text-[#4A6278]">
                    {order.npa} {order.city}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[#4A6278]">Délai de règlement : </span>
                  <span className="font-medium text-[#153243]">
                    {settings.paymentTermsDays} jours net (échéance au {longDate.format(dueDate)})
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-medium text-[#4A6278]">Total à régler :</span>
                  <span className="font-mono text-[17px] font-bold text-[#153243]">
                    CHF {formatInvoiceAmount(order.totalCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions de paiement */}
            <div className="mt-3 rounded border border-[#E2E8EF] bg-white p-3 text-[11px] leading-relaxed text-[#4A6278]">
              <p className="font-semibold text-[#153243] mb-1">Modes de règlement acceptés</p>
              <ul className="space-y-1 text-[10.5px]">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-[#153243]">•</span>
                  <span>
                    <strong className="text-[#153243]">
                      Application bancaire mobile & e-banking :
                    </strong>{' '}
                    Scannez directement le QR-code ci-dessous avec l&apos;application de votre
                    banque suisse.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-[#153243]">•</span>
                  <span>
                    <strong className="text-[#153243]">Guichet postal ou bancaire :</strong> Si vous
                    utilisez du papier pré-perforé ou imprimez ce document, détachez le bulletin le
                    long des lignes de découpe ci-dessous.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-[#153243]">•</span>
                  <span>
                    <strong className="text-[#153243]">Virement bancaire classique :</strong> IBAN{' '}
                    <span className="font-mono font-semibold text-[#153243]">{settings.iban}</span>{' '}
                    ({settings.bankName}), en indiquant en communication la référence{' '}
                    <span className="font-mono font-medium text-[#153243]">
                      {order.invoiceNumber ?? order.numero}
                    </span>
                    .
                  </span>
                </li>
              </ul>

              {order.paidAt && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded border border-green-200 text-[11px]">
                  <CheckIcon className="w-3.5 h-3.5 text-green-700 inline shrink-0" />
                  <span>
                    Facture acquittée le {longDate.format(new Date(order.paidAt))}
                    {order.paymentMethod ? ` (${order.paymentMethod})` : ''}. Ce bulletin est fourni
                    pour votre comptabilité.
                  </span>
                </div>
              )}
            </div>

            {/* Pied supérieur de la page 2 */}
            <footer className="mt-auto border-t border-[#E2E8EF] pt-1.5 pb-1 text-[9px] text-[#7A95A5] flex justify-between items-center">
              <span>
                Annexe de paiement conforme à la norme suisse des QR-factures (SIX Payment Services)
              </span>
              <span className="font-semibold text-[#153243]">Page 2 / 2</span>
            </footer>
          </div>

          {/* Section QR-facture suisse officielle (norme SIX, 210 x 105 mm) */}
          <div className="facture-qr">
            <SwissQRBill order={order} settings={settings} />
          </div>
        </article>
      </div>
    )
  }

  // --- Rendu 1 page compact pour les commandes 1-2 articles ---
  return (
    <article
      className="facture-page bg-white text-[#153243]"
      style={{ colorScheme: 'only light', forcedColorAdjust: 'none' } as React.CSSProperties}
    >
      <div className="facture-body">
        {/* En-tête : expéditeur à gauche, logo à droite */}
        <header className="flex items-start justify-between gap-8">
          <div className="text-[12px] leading-relaxed">
            <p className="font-bold text-[13px] tracking-tight">
              {settings.companyTagline === 'Cidrerie du Vulcain'
                ? 'Drinkcider'
                : settings.companyTagline || 'Drinkcider'}
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
            className="h-auto w-[140px] print:w-[125px] shrink-0"
            priority
            unoptimized
          />
        </header>

        {/* Lieu et date d'émission */}
        <p className="mt-3 text-[12px] print:mt-1.5">
          {settings.invoicePlace}, le {longDate.format(order.createdAt)}
        </p>

        {/* Destinataire (fenêtre à droite) */}
        <div className="mt-1.5 flex justify-end print:mt-1">
          <div className="w-64 text-[12px] leading-relaxed">
            <p className="font-semibold">{order.clientName}</p>
            <p>{order.address}</p>
            <p>
              {order.npa} {order.city}
            </p>
          </div>
        </div>

        {/* Titre */}
        <div className="mt-3 flex items-baseline justify-between border-b border-[#E2E8EF] pb-1 print:mt-1.5">
          <h1 className="font-display text-[20px] font-semibold">
            {order.invoiceNumber ? 'Facture' : 'Projet de facture'}
          </h1>
          <span className="font-mono text-[14px] font-semibold tracking-tight">
            {order.invoiceNumber ?? 'non émise'}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-[#4A6278] print:mt-1">
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
              <CheckIcon className="w-3 h-3 text-green-700 inline" /> Facture acquittée{' '}
              {order.paymentMethod ? `(${order.paymentMethod})` : ''}
            </span>
          )}
        </div>

        {/* Lignes */}
        <table className="mt-2.5 w-full border-collapse text-[11px] tabular print:mt-1.5">
          <thead>
            <tr className="bg-[#F7F6F0] text-left text-[10px] font-semibold uppercase tracking-[.04em]">
              <th className={`${cellBase} w-[22%]`}>Cuvée</th>
              <th className={`${cellBase} w-[12%] text-center font-medium`}>Cartons 24×27.5 cl</th>
              <th className={`${cellBase} w-[12%] text-center font-medium`}>Cartons 6×75 cl</th>
              <th className={`${cellBase} w-[12%] text-center font-medium`}>Cartons 12×75 cl</th>
              <th className={`${cellBase} w-[12%] text-right`}>Bouteilles</th>
              <th className={`${cellBase} w-[15%] text-right`}>Prix / bouteille</th>
              <th className={`${cellBase} w-[15%] text-right`}>Montant CHF</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const bpu = item.bottlesPerUnit ?? (item.product as any)?.bottlesPerUnit ?? 1
              const cartons = getCartonCounts(
                item.quantity,
                item.product.bottleSize,
                item.productName,
                item.unitPriceCents,
                bpu,
                item.listPriceCents
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
                            {formatInvoiceAmount(
                              cartons.displayListPriceCents ?? item.listPriceCents
                            )}
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

            {/* Lignes vierges : à l'écran seulement, masquées à l'impression pour économiser l'espace */}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`vide-${i}`} className="print:hidden">
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
        <section className="mt-2.5 flex items-start justify-between gap-6 text-[11px] leading-relaxed print:mt-1.5">
          <div>
            <p className="font-semibold">Coordonnées bancaires</p>
            <p className="mt-0.5 font-mono">IBAN : {settings.iban}</p>
            <p>{settings.bankName}</p>
            {order.paidAt ? (
              <p className="mt-1 font-semibold text-green-700 flex items-center gap-1">
                <CheckIcon className="w-3.5 h-3.5 text-green-700 inline shrink-0" />
                <span>
                  Facture acquittée le {longDate.format(new Date(order.paidAt))}
                  {order.paymentMethod ? ` (${order.paymentMethod})` : ''}. Merci !
                </span>
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
            <p className="mt-1 font-semibold">{settings.contactName}</p>
          </div>
        </section>

        {/* Pied : mention légale obligatoire */}
        <footer className="mt-auto border-t border-[#E2E8EF] pt-1.5 text-[9px] text-[#7A95A5]">
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
            <span>
              {settings.companyName} · {settings.companyAddress}, {settings.companyZipCity}
              {settings.contactEmail && ` · ${settings.contactEmail}`}
              {settings.contactPhone && ` · ${settings.contactPhone}`}
            </span>
            <span className="font-medium text-[#153243]">
              La vente d&apos;alcool est interdite aux mineurs. · Page 1 / 1
            </span>
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
