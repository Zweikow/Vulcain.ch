import Image from 'next/image'
import type { DeliveryNote, DeliveryNoteSender } from '@/lib/delivery-note'

// Le bon est du papier : couleurs fixes, indépendantes du thème sombre, comme
// la facture. Il ne reçoit aucun montant : `DeliveryNote` n'en contient pas.

const printDate = new Intl.DateTimeFormat('fr-CH', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Zurich',
})

const cell = 'border-b border-[#E2E8EF] px-2 py-2 align-baseline'

export function BonLivraisonDocument({
  note,
  sender,
  printedAt,
}: {
  note: DeliveryNote
  sender: DeliveryNoteSender
  printedAt: Date
}) {
  const { recipient } = note

  return (
    <article
      className="bon-livraison bg-white text-[#153243]"
      style={{ colorScheme: 'only light', forcedColorAdjust: 'none' } as React.CSSProperties}
    >
      {/* En-tête : expéditeur à gauche, logo à droite (comme la facture) */}
      <header className="flex items-start justify-between gap-8">
        <div className="text-[12px] leading-relaxed">
          <p className="text-[13px] font-bold tracking-tight">
            {sender.companyTagline || sender.companyName}
          </p>
          {sender.contactName && <p className="font-medium">{sender.contactName}</p>}
          <p>{sender.companyAddress}</p>
          <p>{sender.companyZipCity}</p>
          {sender.contactPhone && <p className="text-[#4A6278]">Tél. {sender.contactPhone}</p>}
          {sender.contactEmail && <p className="text-[#4A6278]">{sender.contactEmail}</p>}
        </div>
        <Image
          src="/images/facture/logo-drinkcider.png"
          alt={sender.companyName}
          width={180}
          height={86}
          className="h-auto w-[140px] shrink-0 print:w-[125px]"
          priority
          unoptimized
        />
      </header>

      {/* Destinataire (fenêtre à droite) */}
      <div className="mt-6 flex justify-end">
        <div className="w-64 text-[12px] leading-relaxed">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[.06em] text-[#4A6278]">
            {note.isPickup ? 'Retrait à la cave' : 'Adresse de livraison'}
          </p>
          {recipient.company && <p className="font-semibold">{recipient.company}</p>}
          <p className="font-semibold">{recipient.name}</p>
          <p>{recipient.address}</p>
          <p>
            {recipient.npa} {recipient.city}
          </p>
        </div>
      </div>

      {/* Titre et référence : le numéro de commande, pas de série propre */}
      <div className="mt-6 flex items-baseline justify-between border-b border-[#E2E8EF] pb-1">
        <h1 className="font-display text-[22px] font-semibold">Bon de livraison</h1>
        <span className="text-[12px] text-[#4A6278]">
          Commande{' '}
          <span className="font-mono text-[14px] font-semibold tracking-tight text-[#153243]">
            {note.numero}
          </span>
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-[#4A6278]">
        {note.customerNumber != null && (
          <span className="font-semibold text-[#153243]">
            Client N° <span className="font-mono">{note.customerNumber}</span>
          </span>
        )}
        <span>Imprimé le {printDate.format(printedAt)}</span>
      </div>

      {/* Contenu du carton, une case à cocher par ligne pour le contrôle à l'emballage */}
      <table className="mt-4 w-full border-collapse text-[12px] tabular-nums">
        <thead>
          <tr className="bg-[#F7F6F0] text-left text-[10px] font-semibold uppercase tracking-[.04em]">
            <th className={`${cell} w-[9%] text-center`}>Contrôle</th>
            <th className={`${cell} w-[10%]`}>N° art.</th>
            <th className={cell}>Article</th>
            <th className={`${cell} w-[11%]`}>Millésime</th>
            <th className={`${cell} w-[22%]`}>Format</th>
            <th className={`${cell} w-[10%] text-right`}>Quantité</th>
            {note.hasMultiBottleItems && (
              <th className={`${cell} w-[11%] text-right`}>Bouteilles</th>
            )}
          </tr>
        </thead>
        <tbody>
          {note.lines.map((line) => (
            <tr key={line.id} className="break-inside-avoid">
              <td className={`${cell} text-center`}>
                <span
                  aria-hidden="true"
                  className="inline-block h-[14px] w-[14px] border border-[#153243] align-middle"
                />
              </td>
              <td className={`${cell} font-mono text-[11px]`}>{line.articleNumber ?? ''}</td>
              <td className={`${cell} font-medium`}>{line.name}</td>
              <td className={cell}>{line.year ?? ''}</td>
              <td className={`${cell} whitespace-nowrap`}>
                {line.bottlesPerUnit > 1
                  ? `Carton de ${line.bottlesPerUnit}${line.format ? ` × ${line.format}` : ' bouteilles'}`
                  : (line.format ?? '')}
              </td>
              <td className={`${cell} text-right font-semibold`}>{line.quantity}</td>
              {note.hasMultiBottleItems && <td className={`${cell} text-right`}>{line.bottles}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="break-inside-avoid">
            <td
              colSpan={note.hasMultiBottleItems ? 6 : 5}
              className="px-2 pt-2.5 text-right text-[12px] font-semibold"
            >
              Total des bouteilles
            </td>
            <td className="px-2 pt-2.5 text-right text-[13px] font-bold">{note.totalBottles}</td>
          </tr>
        </tfoot>
      </table>

      {note.message && (
        <section className="mt-6 break-inside-avoid rounded-[4px] border border-[#E2E8EF] bg-[#F7F6F0] px-3 py-2 text-[12px]">
          <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#4A6278]">
            Votre message
          </p>
          <p className="mt-0.5 whitespace-pre-line">{note.message}</p>
        </section>
      )}

      {note.invoiceSentByEmail && (
        <p className="mt-6 text-[12px]">La facture vous est envoyée séparément par courriel.</p>
      )}

      {/* Pied : mention légale obligatoire, comme sur la facture */}
      <footer className="mt-auto break-inside-avoid border-t border-[#E2E8EF] pt-1.5 text-[9px] text-[#7A95A5]">
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
          <span>
            {sender.companyName} · {sender.companyAddress}, {sender.companyZipCity}
            {sender.contactEmail && ` · ${sender.contactEmail}`}
            {sender.contactPhone && ` · ${sender.contactPhone}`}
          </span>
          <span className="font-medium text-[#153243]">
            La vente d&apos;alcool est interdite aux mineurs.
          </span>
        </div>
      </footer>
    </article>
  )
}

/**
 * Feuille A4 à l'écran, page imprimée sans cadre. Une page par bon en lot ; un
 * bon trop long continue sur la page suivante avec les mêmes marges.
 */
export function BonLivraisonPrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .bon-livraison {
            width: 210mm;
            min-height: 297mm;
            padding: 14mm 16mm 10mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            background: #fff !important;
            color: #153243 !important;
            border: 1px solid #e2e8ef;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(21, 50, 67, 0.06);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bon-livraison-shell {
            max-width: 100%;
            overflow-x: auto;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 14mm;
            }
            .bon-livraison-shell {
              max-width: none;
              overflow: visible;
            }
            .bon-livraison {
              width: auto;
              min-height: 272mm;
              padding: 0;
              border: 0;
              border-radius: 0;
              box-shadow: none;
              break-after: page;
              page-break-after: always;
            }
            .bon-livraison-shell:last-of-type .bon-livraison {
              break-after: auto;
              page-break-after: auto;
            }
            .bon-livraison thead {
              display: table-header-group;
            }
          }
        `,
      }}
    />
  )
}
