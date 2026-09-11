'use client'

import { useTheme } from '@/components/ThemeProvider'
import { SunIcon, MoonIcon } from '@/components/admin/AdminIcons'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 dark:text-slate-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/5 transition-all w-full"
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 group-hover:bg-white/10 text-amber-300 dark:text-amber-400 transition-colors shrink-0">
        {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
      </div>
      <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
    </button>
  )
}
