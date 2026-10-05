'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { OrderStatus } from '@prisma/client'
import {
  cancelOrderAction,
  deleteOrderAction,
} from '@/app/admin/(protected)/commandes/[id]/actions'

interface OrderCancelProps {
  orderId: string
  numero: string
  status: OrderStatus
  invoiceNumber: string | null
  cancelledAt: Date | null
  cancelReason: string | null
}

const stamp = new Intl.DateTimeFormat('fr-CH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function OrderCancel({
  orderId,
  numero,
  status,
  invoiceNumber,
  cancelledAt,
  cancelReason,
}: OrderCancelProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [feedback, setFeedback] = useState<{ error?: string; message?: string } | null>(null)

  const cancelled = status === OrderStatus.ANNULEE

  // Commande annulée : rappel de l'annulation, et purge possible si jamais facturée.
  if (cancelled) {
    return (
      <div className="card border-[#F3D5D5] bg-[#FDF2F2] p-5 dark:border-[#5a2a2a] dark:bg-[#2a1717]">
        <h2 className="font-medium text-[#C62828] dark:text-[#EF5350]">Commande annulée</h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
          {cancelledAt && `Le ${stamp.format(cancelledAt)}. `}
          {cancelReason ? `Motif : ${cancelReason}` : 'Aucun motif consigné.'}
        </p>
        {invoiceNumber && (
          <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
            La facture <span className="font-mono">{invoiceNumber}</span> a été émise : elle reste
            due tant qu&apos;un avoir ne l&apos;annule pas. La commande ne peut donc pas être
            supprimée.
          </p>
        )}

        {!invoiceNumber && (
          <div className="mt-4">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  Supprimer définitivement {numero} ?
                </span>
                <button
                  onClick={() =>
                    startTransition(async () => {
                      const r = await deleteOrderAction(orderId)
                      if (r?.error) setFeedback({ error: r.error })
                    })
                  }
                  disabled={pending}
                  className="btn-danger px-3 py-1.5 text-xs"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-text-tertiary hover:underline dark:text-text-tertiary-dark"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-text-error hover:underline"
              >
                Supprimer définitivement
              </button>
            )}
          </div>
        )}
        {feedback?.error && <p className="mt-2 text-sm text-text-error">{feedback.error}</p>}
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h2 className="font-medium text-text-primary dark:text-text-primary-dark">
        Annuler la commande
      </h2>

      {!open ? (
        <>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
            Le client a renoncé à sa commande ? L&apos;annulation rend le stock et conserve la trace
            de l&apos;opération.
          </p>
          <button onClick={() => setOpen(true)} className="btn-secondary mt-3 text-sm">
            Annuler cette commande
          </button>
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
            Motif (facultatif, conservé sur la commande)
            <input
              className="input-field mt-1"
              placeholder="Annulation demandée par téléphone"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-text-secondary dark:text-text-secondary-dark">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5"
            />
            Prévenir le client par email
          </label>

          {status === OrderStatus.EXPEDIEE && (
            <p className="rounded-md bg-[#FFF8E1] px-3 py-2 text-xs text-text-warning dark:bg-[#3d2a0a] dark:text-[#FF9800]">
              Cette commande est expédiée : le stock ne sera pas rendu automatiquement, les
              bouteilles étant chez le client. Ajustez-le au retour de la marchandise.
            </p>
          )}
          {invoiceNumber && (
            <p className="rounded-md bg-[#FFF8E1] px-3 py-2 text-xs text-text-warning dark:bg-[#3d2a0a] dark:text-[#FF9800]">
              La facture <span className="font-mono">{invoiceNumber}</span> est émise : elle devra
              être annulée par un avoir, sans quoi elle reste due.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                startTransition(async () => {
                  const r = await cancelOrderAction(orderId, reason, notify)
                  setFeedback(r)
                  if (!r.error) {
                    setOpen(false)
                    router.refresh()
                  }
                })
              }
              disabled={pending}
              className="btn-danger text-sm disabled:opacity-50"
            >
              {pending ? 'Annulation…' : `Confirmer l'annulation de ${numero}`}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-text-tertiary hover:underline dark:text-text-tertiary-dark"
            >
              Renoncer
            </button>
          </div>
        </div>
      )}

      {feedback?.error && <p className="mt-2 text-sm text-text-error">{feedback.error}</p>}
      {feedback?.message && <p className="mt-2 text-sm text-text-success">{feedback.message}</p>}
    </div>
  )
}
