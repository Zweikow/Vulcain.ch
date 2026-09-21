'use client'

import { formatCHF } from '@/lib/money'

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
    <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in transition-all duration-200">
      <div className="heroui-card p-8 w-full max-w-md text-center flex flex-col items-center gap-5 shadow-heroui-lg rounded-3xl border border-divider">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shadow-heroui-primary">
          <svg
            className="w-8 h-8 text-[#153243] dark:text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            Commande confirmée !
          </h2>
          <p className="text-sm text-default-600 dark:text-default-400 leading-relaxed">
            Merci pour votre confiance ! Un email de confirmation récapitulatif a été envoyé à votre
            adresse. Nous préparons votre colis avec soin.
          </p>
        </div>

        <div className="w-full bg-default-100 rounded-2xl p-4 border border-divider flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-default-500">N° de référence</span>
            <span className="font-mono font-bold text-primary dark:text-primary-hover">
              {orderId}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm pt-2 border-t border-divider">
            <span className="text-default-500">Montant total</span>
            <span className="font-bold text-base text-text-primary dark:text-text-primary-dark tabular">
              {formatCHF(totalCents)}
            </span>
          </div>
        </div>

        <button onClick={onClose} className="heroui-btn-primary w-full py-3.5 rounded-xl text-sm">
          Retourner à la boutique
        </button>
      </div>
    </div>
  )
}
