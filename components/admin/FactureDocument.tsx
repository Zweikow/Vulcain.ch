import Image from 'next/image'
import { ClientType, OrderStatus } from '@prisma/client'
import { formatInvoiceAmount } from '@/lib/money'
import { creditorReference, formatCreditorReference } from '@/lib/reference'

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
  items: {
    id: string
    productName: string
    quantity: number
    unitPriceCents: number
    listPriceCents: number
    product: { articleNumber: number }
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
const EMPTY_ROWS_MIN = 4

export function FactureDocument({
  order,
  settings,
}: {
  order: FactureOrder
  settings: FactureSettings
}) {
  const isPro = order.clientType === ClientType.PRO
  const emptyRows = Math.max(0, EMPTY_ROWS_MIN - order.items.length)
  // Le délai de paiement court depuis l'émission de la facture, pas depuis la commande.
  const dueDate = new Date(order.invoicedAt ?? order.createdAt)
  dueDate.setDate(dueDate.getDate() + settings.paymentTermsDays)
  const paymentRef = order.invoiceNumber
    ? formatCreditorReference(creditorReference(order.invoiceNumber))
    : null

  const cellBase = 'border border-[#D8DEE6] px-2 py-1.5 align-top'
  const handFill = 'border border-[#D8DEE6] px-2 py-1.5 bg-[#FCFCFA]'

  return (
    <article className="facture-page bg-white text-[#153243]">
      {/* En-tête : expéditeur à gauche, logo à droite */}
      <header className="flex items-start justify-between gap-8">
        <div className="text-[13px] leading-relaxed">
          <p>{settings.contactName}</p>
          <p className="font-semibold">{settings.companyTagline}</p>
          <p>{settings.companyAddress}</p>
          <p>{settings.companyZipCity}</p>
          {settings.vatNumber && (
            <p className="mt-1 font-mono text-[11px] text-[#4A6278]">{settings.vatNumber}</p>
          )}
        </div>
        <Image
          src="/facture/logo-vulcain.png"
          alt={settings.companyName}
          width={200}
          height={96}
          className="h-auto w-[170px] shrink-0"
          priority
        />
      </header>

      {/* Lieu et date d'émission */}
      <p className="mt-10 text-[13px]">
        {settings.invoicePlace}, le {longDate.format(order.createdAt)}
      </p>

      {/* Destinataire (fenêtre à droite) */}
      <div className="mt-6 flex justify-end">
        <div className="text-[13px] leading-relaxed w-64">
          <p className="font-semibold">{order.clientName}</p>
          <p>{order.address}</p>
          <p>
            {order.npa} {order.city}
          </p>
        </div>
      </div>

      {/* Titre. Sans numéro attribué, le document n'est pas encore une facture :
          il le dit, pour qu'un brouillon imprimé ne soit pas pris pour l'original. */}
      <div className="mt-8 flex items-baseline justify-between border-b border-[#E2E8EF] pb-2">
        <h1 className="font-display text-[22px] font-semibold">
          {order.invoiceNumber ? 'Facture' : 'Projet de facture'}
        </h1>
        <span className="font-mono text-[15px] font-semibold tracking-tight">
          {order.invoiceNumber ?? 'non émise'}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-[12px] text-[#4A6278]">
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
            Tarif professionnel (−{settings.proRatePercent}%)
          </span>
        )}
      </div>

      {/* Lignes */}
      <table className="mt-4 w-full border-collapse text-[12px] tabular">
        <thead>
          <tr className="bg-[#F7F6F0] text-left text-[11px] font-semibold uppercase tracking-[.04em]">
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
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className={`${cellBase} font-medium`}>
                {item.productName}
                <div className="text-[10px] text-[#7A95A5] font-mono font-normal mt-0.5">
                  Article-Nr. {item.product.articleNumber.toString().padStart(5, '0')}
                </div>
              </td>
              <td className={handFill} />
              <td className={handFill} />
              <td className={handFill} />
              <td className={`${cellBase} text-right`}>{item.quantity}</td>
              <td className={`${cellBase} text-right`}>
                {/* Prix public barré à côté du prix appliqué (DESIGN.md §3) */}
                {isPro && item.listPriceCents !== item.unitPriceCents && (
                  <span className="mr-1.5 text-[#7A95A5] line-through">
                    {formatInvoiceAmount(item.listPriceCents)}
                  </span>
                )}
                {formatInvoiceAmount(item.unitPriceCents)}
              </td>
              <td className={`${cellBase} text-right`}>
                {formatInvoiceAmount(item.unitPriceCents * item.quantity)}
              </td>
            </tr>
          ))}

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
            <tr>
              <td className={`${cellBase} text-right text-[#6B4F68]`} colSpan={6}>
                Remise professionnelle
              </td>
              <td className={`${cellBase} text-right text-[#6B4F68]`}>
                −{formatInvoiceAmount(order.discountCents)}
              </td>
            </tr>
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

      {/* Une TVA ne se mentionne que si la cidrerie la perçoit réellement.
          Sinon, la mention de non-assujettissement évite qu'un client
          professionnel tente de déduire une taxe qui n'existe pas. */}
      <p className="mt-1.5 text-[11px] text-[#7A95A5]">
        {settings.vatSubject ? (
          <>
            {/* Point décimal, pas de virgule : convention suisse (DESIGN.md §5) */}
            TVA {(settings.vatRatePermille / 10).toFixed(1)}% incluse, soit{' '}
            {formatInvoiceAmount(order.vatCents)}.
          </>
        ) : (
          <>Non assujetti à la TVA (art. 10 al. 2 LTVA). Aucune TVA n&apos;est facturée.</>
        )}
      </p>

      {/* Paiement */}
      <section className="mt-8 flex items-start justify-between gap-6">
        <div className="text-[12px] leading-relaxed">
          <p className="font-semibold">Coordonnées bancaires</p>
          <p className="mt-1 font-mono">IBAN : {settings.iban}</p>
          <p>{settings.bankName}</p>
          <p>
            {settings.contactName} — {settings.invoicePlace}
          </p>
          {/* Référence créancier ISO 11649 : permet de rapprocher automatiquement
              le virement reçu de la facture correspondante. */}
          {paymentRef && (
            <p className="mt-2">
              Référence de paiement : <span className="font-mono">{paymentRef}</span>
              <br />
              <span className="text-[10px] text-[#7A95A5]">
                À indiquer lors du virement pour identifier votre paiement.
              </span>
            </p>
          )}
          <p className="mt-3 font-medium">
            Facture payable à {settings.paymentTermsDays} jours net, au {longDate.format(dueDate)}.
          </p>
        </div>

        {/* Emplacement réservé à la QR-facture suisse (voir docs/architecture-cible.md) */}
        <div className="flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center rounded border border-dashed border-[#C9D2DC] text-center">
          <span className="font-mono text-[9px] leading-tight text-[#7A95A5]">
            QR-facture
            <br />à venir
          </span>
        </div>
      </section>

      <div className="mt-8 text-[12px] leading-relaxed">
        <p>Merci beaucoup pour votre commande et bonne dégustation.</p>
        <p className="mt-3">Cidricolement,</p>
        <p className="mt-4 font-semibold">{settings.contactName}</p>
      </div>

      {/* Pied : mention légale obligatoire */}
      <footer className="mt-auto border-t border-[#E2E8EF] pt-3 text-[10px] text-[#7A95A5]">
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
          <span>
            {settings.companyName} · {settings.companyAddress}, {settings.companyZipCity}
            {settings.contactEmail && ` · ${settings.contactEmail}`}
            {settings.contactPhone && ` · ${settings.contactPhone}`}
          </span>
          <span>La vente d&apos;alcool est interdite aux mineurs.</span>
        </div>
      </footer>
    </article>
  )
}
