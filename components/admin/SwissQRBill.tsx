import { useMemo } from 'react'
import { SwissQRBill as SwissQRBillGenerator } from 'swissqrbill/svg'

export interface SwissQRBillProps {
  order: {
    numero: string
    invoiceNumber: string | null
    clientName: string
    address: string
    npa: string
    city: string
    totalCents: number
  }
  settings: {
    iban: string
    contactName: string
    companyAddress: string
    companyZipCity: string
  }
}

function parseZipCity(zipCity: string): { zip: string; city: string } {
  const trimmed = zipCity.trim()
  const match = trimmed.match(/^(\d{4,5})\s+(.+)$/)
  if (match) {
    return { zip: match[1], city: match[2].trim() }
  }
  const parts = trimmed.split(/\s+/)
  return {
    zip: parts[0] || '1619',
    city: parts.slice(1).join(' ') || 'Les Paccots',
  }
}

export function SwissQRBill({ order, settings }: SwissQRBillProps) {
  const svgMarkup = useMemo(() => {
    try {
      const { zip, city } = parseZipCity(settings.companyZipCity)
      const cleanIban = settings.iban.replace(/\s+/g, '')

      const hasDebtor =
        Boolean(order.clientName?.trim()) &&
        Boolean(order.address?.trim()) &&
        Boolean(order.city?.trim())

      const amountInChf =
        order.totalCents > 0 ? Number((order.totalCents / 100).toFixed(2)) : undefined

      const message = order.invoiceNumber
        ? `Facture ${order.invoiceNumber} / Commande ${order.numero}`
        : `Commande ${order.numero}`

      const bill = new SwissQRBillGenerator(
        {
          currency: 'CHF',
          amount: amountInChf,
          creditor: {
            account: cleanIban,
            name: settings.contactName || 'Baeriswyl Bertrand',
            address: settings.companyAddress || 'Chemin des Moilles 16',
            zip: zip || 1619,
            city: city || 'Les Paccots',
            country: 'CH',
          },
          debtor: hasDebtor
            ? {
                name: order.clientName.trim(),
                address: order.address.trim(),
                zip: order.npa?.trim() || '',
                city: order.city.trim(),
                country: 'CH',
              }
            : undefined,
          message: message.slice(0, 140),
        },
        {
          language: 'FR',
          scissors: true,
          outlines: true,
        }
      )

      return bill.toString()
    } catch {
      return null
    }
  }, [order, settings])

  if (!svgMarkup) {
    return (
      <div className="flex h-[105mm] w-[210mm] items-center justify-center border border-dashed border-red-300 text-sm text-red-500">
        Impossible de générer la QR-facture suisse.
      </div>
    )
  }

  return (
    <div
      className="swiss-qr-bill-container w-[210mm] h-[105mm] select-none bg-white"
      style={{ colorScheme: 'only light', forcedColorAdjust: 'none' } as React.CSSProperties}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  )
}
