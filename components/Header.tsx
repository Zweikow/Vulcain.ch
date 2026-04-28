'use client'

import { useEffect, useState } from 'react'

export default function Header() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored === 'true') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('darkMode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <header className="bg-bg-header dark:bg-bg-header-dark text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-display font-semibold text-base leading-tight">
            Cidrerie de Vulcain
          </span>
          <span className="text-xs opacity-75">Aubonne, VD, Suisse</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 text-sm opacity-90">
        <span>Commandes &amp; livraisons</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs opacity-75 hidden md:block">
          À disposition pour toute question
        </span>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors focus:outline-none ${
            darkMode ? 'bg-primary' : 'bg-white/30'
          }`}
          aria-label="Toggle dark mode"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              darkMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </header>
  )
}
