'use client'

import { useTheme } from '@/components/ThemeProvider'
import { SunIcon, MoonIcon } from '@/components/admin/AdminIcons'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  if (compact) {
    return (
      <button
        onClick={toggle}
        type="button"
        title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        className="w-8 h-8 rounded-md flex items-center justify-center bg-white/10 hover:bg-white/20 text-amber-300 dark:text-amber-400 transition-colors shrink-0"
      >
        {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4 text-slate-200" />}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      type="button"
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 dark:text-slate-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/5 transition-all w-full"
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 group-hover:bg-white/10 text-amber-300 dark:text-amber-400 transition-colors shrink-0">
        {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4 text-slate-300" />}
      </div>
      <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
    </button>
  )
}
