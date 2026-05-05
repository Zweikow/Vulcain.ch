'use client'

import { useTheme } from '@/components/ThemeProvider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-70 hover:opacity-100 hover:bg-white/10 transition-all w-full"
    >
      <span className="text-base">{theme === 'dark' ? '☀️' : '🌙'}</span>
      <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
    </button>
  )
}
