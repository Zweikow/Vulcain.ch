'use client'

import { useTheme } from '@/components/ThemeProvider'

export default function Header() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

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
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors focus:outline-none ${
            isDark ? 'bg-primary' : 'bg-white/30'
          }`}
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isDark ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </header>
  )
}
