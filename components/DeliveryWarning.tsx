import { Truck } from 'lucide-react'

export default function DeliveryWarning() {
  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-medium text-foreground">
        <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>
          <span className="font-semibold text-primary">🇨🇭 Expédition exclusive en Suisse</span> —
          Préparation soignée à la cave les lundis &amp; jeudis. Délai : 2 à 4 jours ouvrés.
        </span>
      </div>
    </div>
  )
}
