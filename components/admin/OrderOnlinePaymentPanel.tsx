'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  acceptPaymentToVerifyAction,
  verifyOnlinePaymentAction,
} from '@/app/admin/(protected)/commandes/[id]/actions'
import { formatCHF } from '@/lib/money'
import { CheckIcon, CoinsIcon } from '@/components/admin/AdminIcons'

export type OnlinePaymentAttempt = {
  transactionId: string
  state: string
  stateLabel: string
  amountCents: number
  paymentMethod: string | null
  failureReason: string | null
  createdAt: string
  /** Mode auquel la transaction est limitée */
  choiceLabel: string | null
  /** Remplacée par une transaction plus récente : plus la transaction active */
  superseded: boolean
}

interface OrderOnlinePaymentPanelProps {
  orderId: string
  totalCents: number
  paidAt: string | null
  paymentMethod: string | null
  invoiceNumber: string | null
  awaitingPayment: boolean
  paymentLink: string | null
  attempts: OnlinePaymentAttempt[]
  canVerify: boolean
  /** Mode choisi par le client (null : mode choisi sur la Payment Page) */
  choiceLabel: string | null
  invoiceFeeCents: number
  /** Acceptée sur facture PowerPay : encaissement à l'expédition */
  invoiceAcceptedAt: string | null
  toVerify: boolean
  /** Écart constaté par le webhook, repris du journal */
  verificationReason: string | null
}

const dateTime = new Intl.DateTimeFormat('fr-CH', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Paiement en ligne PostFinance d'une commande : aucune saisie manuelle
 * possible, l'état vient de PostFinance (webhook ou bouton de vérification).
 */
export function OrderOnlinePaymentPanel({
  orderId,
  totalCents,
  paidAt,
  paymentMethod,
  invoiceNumber,
  awaitingPayment,
  paymentLink,
  attempts,
  canVerify,
  choiceLabel,
  invoiceFeeCents,
  invoiceAcceptedAt,
  toVerify,
  verificationReason,
}: OrderOnlinePaymentPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )
  const [copied, setCopied] = useState(false)

  const verify = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await verifyOnlinePaymentAction(orderId)
      if (res.error) setFeedback({ type: 'error', message: res.error })
      else {
        setFeedback({ type: 'success', message: res.message ?? 'Vérification effectuée.' })
        router.refresh()
      }
    })
  }

  const acceptPayment = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await acceptPaymentToVerifyAction(orderId)
      if (res.error) setFeedback({ type: 'error', message: res.error })
      else {
        setFeedback({ type: 'success', message: res.message ?? 'Paiement accepté.' })
        router.refresh()
      }
    })
  }

  const copyLink = async () => {
    if (!paymentLink) return
    try {
      await navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="card p-5 mb-4 border border-border dark:border-border-dark">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border dark:border-border-dark pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CoinsIcon className="w-5 h-5 text-secondary dark:text-secondary-dark" />
            <h2 className="font-medium text-text-primary dark:text-text-primary-dark">
              Paiement en ligne PostFinance
            </h2>
          </div>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            {choiceLabel ? `Mode : ${choiceLabel}` : 'Payé à la commande'} · Montant :{' '}
            <strong className="tabular">{formatCHF(totalCents)}</strong>
            {invoiceFeeCents > 0 && (
              <>
                {' '}
                (dont supplément facture{' '}
                <span className="tabular">{formatCHF(invoiceFeeCents)}</span>)
              </>
            )}
            {invoiceNumber ? ` · Facture ${invoiceNumber}` : ''}
          </p>
        </div>
        {toVerify ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-pill bg-[#FDF2F2] dark:bg-[#3a1f1f] text-[#C62828] dark:text-[#EF5350]">
            À vérifier
          </span>
        ) : invoiceAcceptedAt && !paidAt ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-pill bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300">
            <CheckIcon className="w-3 h-3" /> Acceptée sur facture le{' '}
            {new Date(invoiceAcceptedAt).toLocaleDateString('fr-CH')}
          </span>
        ) : paidAt ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-pill bg-[#E8F5E9] dark:bg-[#1e3326] text-text-success dark:text-[#81C784]">
            <CheckIcon className="w-3 h-3" />{' '}
            {invoiceAcceptedAt ? 'Réglée via PowerPay le' : 'Payée le'}{' '}
            {new Date(paidAt).toLocaleDateString('fr-CH')}
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-pill bg-[#F1F3F5] dark:bg-[#26303a] text-[#495057] dark:text-[#ADB5BD]">
            {awaitingPayment ? 'Paiement en attente' : 'Non payée'}
          </span>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className={`mt-4 p-3 rounded-md text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-4 space-y-3 text-xs text-text-secondary dark:text-text-secondary-dark">
        {paidAt && paymentMethod && <p>Moyen de paiement : {paymentMethod}</p>}
        {invoiceAcceptedAt && !paidAt && (
          <p>
            Solvabilité acceptée par PowerPay. L&apos;encaissement se déclenche au passage à «
            Expédiée ». MF Group envoie ensuite sa facture au client en fin de mois, puis suit le
            paiement et les rappels.
          </p>
        )}
        {toVerify && (
          <div
            role="alert"
            className="rounded-md border border-[#C62828]/20 bg-[#FDF2F2] dark:bg-[#2a1717] p-3 text-text-primary dark:text-text-primary-dark"
          >
            <p className="font-semibold text-[#C62828] dark:text-[#EF5350]">
              Paiement reçu mais incohérent : commande bloquée
            </p>
            {verificationReason && <p className="mt-1">{verificationReason}</p>}
            <p className="mt-1">
              Contrôlez la transaction dans le back-office PostFinance. Acceptez ce paiement
              s&apos;il est correct. Sinon, annulez la commande plus bas et remboursez le client
              depuis le back-office PostFinance.
            </p>
            {canVerify && (
              <button
                type="button"
                onClick={acceptPayment}
                disabled={isPending}
                className="btn-primary text-sm mt-2 disabled:opacity-50"
              >
                {isPending ? 'En cours…' : 'Accepter ce paiement'}
              </button>
            )}
          </div>
        )}
        {awaitingPayment && (
          <p>
            La commande passera « À traiter » dès que PostFinance confirmera le paiement. Elle
            n&apos;apparaît ni en préparation ni dans les chiffres d&apos;ici là.
          </p>
        )}

        {attempts.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-text-tertiary dark:text-text-tertiary-dark">
                <th className="py-1 pr-2 font-medium">Tentative</th>
                <th className="py-1 pr-2 font-medium">Transaction</th>
                <th className="py-1 pr-2 font-medium">État</th>
                <th className="py-1 font-medium text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr
                  key={a.transactionId}
                  className="border-t border-border dark:border-border-dark"
                >
                  <td className="py-1.5 pr-2">{dateTime.format(new Date(a.createdAt))}</td>
                  <td className="py-1.5 pr-2 font-mono">{a.transactionId}</td>
                  <td className="py-1.5 pr-2">
                    {a.stateLabel}
                    {a.paymentMethod ? ` · ${a.paymentMethod}` : ''}
                    {a.choiceLabel && !a.paymentMethod ? ` · ${a.choiceLabel}` : ''}
                    {a.superseded ? ' · remplacée' : ''}
                    {a.failureReason ? (
                      <span className="block text-text-tertiary dark:text-text-tertiary-dark">
                        {a.failureReason}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-right tabular">{formatCHF(a.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Aucune tentative de paiement enregistrée.</p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {canVerify && attempts.length > 0 && (
            <button
              type="button"
              onClick={verify}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-border dark:border-border-dark bg-bg-card dark:bg-bg-card-dark text-text-primary dark:text-text-primary-dark hover:bg-primary/10 disabled:opacity-50"
            >
              {isPending ? 'Vérification…' : 'Vérifier auprès de PostFinance'}
            </button>
          )}
          {awaitingPayment && paymentLink && (
            <button
              type="button"
              onClick={copyLink}
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-border dark:border-border-dark bg-bg-card dark:bg-bg-card-dark text-text-secondary dark:text-text-secondary-dark hover:bg-primary/10"
              title="Lien personnel du client vers le paiement de sa commande"
            >
              {copied ? 'Lien copié' : 'Copier le lien de paiement du client'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
