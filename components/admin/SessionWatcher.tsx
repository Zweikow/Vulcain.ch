'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useCallback, useRef } from 'react'

const WARNING_BEFORE_MS = 2 * 60 * 1000 // 2 minutes

export function SessionWatcher() {
  const { data: session, update } = useSession()
  const [showModal, setShowModal] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const isExtending = useRef(false)

  useEffect(() => {
    if (!session?.expires) return

    const check = () => {
      if (isExtending.current) return
      const remaining = new Date(session.expires).getTime() - Date.now()
      if (remaining > 0 && remaining <= WARNING_BEFORE_MS) {
        setShowModal(true)
        setCountdown(Math.floor(remaining / 1000))
      }
    }

    check()
    const interval = setInterval(check, 10_000)
    return () => clearInterval(interval)
  }, [session?.expires])

  useEffect(() => {
    if (!showModal) return
    const timerId = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerId)
          signOut({ callbackUrl: '/admin/login' })
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerId)
  }, [showModal])

  const handleExtend = useCallback(async () => {
    isExtending.current = true
    setShowModal(false)
    setCountdown(120)
    await update()
    isExtending.current = false
  }, [update])

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Session bientôt expirée
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          Votre session expire dans <span className="font-bold text-orange-500">{countdown}s</span>.
          Souhaitez-vous la prolonger ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExtend}
            className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Prolonger la session
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
