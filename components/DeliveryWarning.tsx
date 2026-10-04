import { Truck } from 'lucide-react'
import { OriginBadge } from '@/components/OriginBadge'

export default function DeliveryWarning() {
  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-medium text-foreground">
        <Truck className="w-3.5 h-3.5 text-primary-text shrink-0" />
        <span>
          <span className="font-semibold text-primary-text">
            <OriginBadge origin="CH" className="w-3 h-3" /> Expédition exclusive en Suisse
          </span>{' '}
          — Préparation soignée les lundis et jeudis. Délai : 2 à 4 jours ouvrés.
        </span>
      </div>
    </div>
  )
}
