'use client'

interface ConfirmationModalProps {
  orderId: string
  total: number
  onClose: () => void
}

export default function ConfirmationModal({ orderId, total, onClose }: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card p-8 w-full max-w-sm text-center flex flex-col items-center gap-4 shadow-xl">
        {/* Success icon */}
        <div className="w-12 h-12 rounded-full bg-primary-light dark:bg-primary-light-dark flex items-center justify-center">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold text-text-primary dark:text-text-primary-dark">
            Commande confirmée !
          </h2>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark leading-relaxed">
            Merci pour votre commande ! Un email de confirmation a été envoyé à votre adresse.
            Nous vous contacterons pour les détails et délais.
          </p>
        </div>

        <div className="w-full bg-bg-page dark:bg-bg-page-dark rounded-md p-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary dark:text-text-secondary-dark">N° de commande</span>
            <span className="font-semibold text-primary">{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary dark:text-text-secondary-dark">Total</span>
            <span className="font-semibold text-text-primary dark:text-text-primary-dark">
              CHF {total.toFixed(2)}
            </span>
          </div>
        </div>

        <button onClick={onClose} className="btn-primary w-full">
          Fermer
        </button>
      </div>
    </div>
  )
}
