'use client'

import { formatCHF } from '@/lib/money'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ConfirmationModalProps {
  orderId: string
  totalCents: number
  onClose: () => void
}

export default function ConfirmationModal({
  orderId,
  totalCents,
  onClose,
}: ConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-3xl p-8 text-center flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icône de succès */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Badge variant="success" className="mx-auto text-xs py-0.5 px-3">
            Commande enregistrée
          </Badge>
          <h2 className="font-display text-2xl font-bold text-foreground mt-1">
            Merci pour votre commande !
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Votre commande a bien été transmise à la cave. Vous recevrez un courriel récapitulatif
            avec la facture et le QR-code de paiement suisse.
          </p>
        </div>

        {/* Détails de la commande */}
        <div className="w-full bg-secondary/50 rounded-2xl p-4 border border-border/60 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-mono">
              Référence
            </span>
            <span className="font-mono font-bold text-primary">{orderId}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-border/40 pt-2">
            <span className="text-muted-foreground text-xs">Montant total</span>
            <span className="font-bold text-base text-foreground font-mono tabular">
              {formatCHF(totalCents)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>Expédition soignée par Planzer Vins &amp; Spiritueux</span>
        </div>

        <Button onClick={onClose} variant="default" size="lg" className="w-full font-semibold">
          Retour à la boutique
        </Button>
      </div>
    </div>
  )
}
