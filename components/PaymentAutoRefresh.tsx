'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Recharge la page de paiement le temps que le webhook PostFinance confirme le
 * paiement. Au-delà de deux minutes, on cesse d'interroger le serveur et on
 * rassure le client : la confirmation lui parviendra par email.
 */
export function PaymentAutoRefresh({ intervalMs = 4000, maxAttempts = 30 }) {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= maxAttempts) return
    const timer = setTimeout(() => {
      setAttempts((n) => n + 1)
      router.refresh()
    }, intervalMs)
    return () => clearTimeout(timer)
  }, [attempts, intervalMs, maxAttempts, router])

  if (attempts < maxAttempts) return null
  return (
    <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
      La confirmation prend plus de temps que prévu. Inutile de payer une seconde fois : vous
      recevrez un email dès qu&apos;elle nous parviendra.
    </p>
  )
}
