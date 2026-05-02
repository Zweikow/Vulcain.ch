'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [blockedMinutes, setBlockedMinutes] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBlocked(false)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Identifiants invalides')
        if (data.blocked || res.status === 429) {
          setBlocked(true)
          setBlockedMinutes(data.blockedMinutes || 30)
        }
        return
      }

      router.push('/admin')
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5dc]">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🍎</div>
          <h1 className="text-2xl font-semibold text-[#4a7c59]">
            Cidrerie du Vulcain
          </h1>
          <p className="text-sm text-gray-600 mt-1">Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email ou nom d&apos;utilisateur</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59] focus:border-transparent disabled:bg-gray-100"
              placeholder="admin@vulcain.ch"
              required
              disabled={blocked}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a7c59] focus:border-transparent disabled:bg-gray-100"
              placeholder="••••••••"
              required
              disabled={blocked}
            />
          </div>

          {error && (
            <div className={`text-sm px-4 py-3 rounded-lg ${blocked ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-red-50 text-red-600'}`}>
              {blocked && <span className="font-medium">🔒 </span>}
              {error}
              {blocked && (
                <p className="mt-2 text-xs">
                  Veuillez patienter {blockedMinutes} minute(s) avant de réessayer.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || blocked}
            className="mt-2 px-4 py-3 bg-[#4a7c59] text-white font-medium rounded-lg hover:bg-[#3d6a4b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : blocked ? 'Compte temporairement bloqué' : 'Se connecter'}
          </button>

          {/* ⚠️ SUPPRIMER CE BOUTON EN PRODUCTION */}
          <button
            type="button"
            onClick={async () => {
              setLoading(true)
              try {
                const res = await fetch('/api/auth/dev-login', { method: 'POST' })
                if (res.ok) {
                  router.push('/admin')
                }
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="px-4 py-2 border-2 border-dashed border-orange-400 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            🧪 Accès DEV (test)
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-[#4a7c59] transition-colors">
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  )
}
