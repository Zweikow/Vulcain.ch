'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  setTheme: (_theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return
  const isDark = theme === 'dark'
  const root = document.documentElement

  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'

  // Met à jour la balise meta color-scheme
  const metaColorScheme =
    document.getElementById('meta-color-scheme') ||
    document.querySelector('meta[name="color-scheme"]')
  if (metaColorScheme) {
    metaColorScheme.setAttribute('content', isDark ? 'dark' : 'light')
  }

  // Met à jour la balise meta theme-color active (pour la barre d'état iOS/Android)
  let themeColorMeta =
    document.getElementById('meta-theme-color') ||
    document.querySelector('meta[name="theme-color"]')
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta')
    themeColorMeta.setAttribute('name', 'theme-color')
    themeColorMeta.setAttribute('id', 'meta-theme-color')
    document.head.appendChild(themeColorMeta)
  }
  themeColorMeta.setAttribute('content', isDark ? '#0D1B2A' : '#F7F6F0')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  // Clair par défaut, quel que soit le réglage du téléphone : le sombre ne
  // s'applique que si le visiteur l'a choisi lui-même (bouton, mémorisé).
  useEffect(() => {
    let initial: Theme = 'light'
    try {
      // Migration depuis l'ancienne clé 'darkMode'
      const legacy = localStorage.getItem('darkMode')
      if (legacy !== null) {
        localStorage.setItem('theme', legacy === 'true' ? 'dark' : 'light')
        localStorage.removeItem('darkMode')
      }
      if (localStorage.getItem('theme') === 'dark') initial = 'dark'
    } catch {}

    setThemeState(initial)
    applyThemeToDOM(initial)
  }, [])

  const setTheme = (next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem('theme', next)
    } catch {}
    applyThemeToDOM(next)
  }

  const toggle = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('theme', next)
      } catch {}
      applyThemeToDOM(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
  )
}
