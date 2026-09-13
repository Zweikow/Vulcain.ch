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
  root.style.colorScheme = theme

  // Met à jour la balise meta color-scheme
  const metaColorScheme = document.querySelector('meta[name="color-scheme"]')
  if (metaColorScheme) {
    metaColorScheme.setAttribute('content', isDark ? 'dark' : 'light')
  }

  // Met à jour la balise meta theme-color active (pour la barre d'état iOS/Android)
  let themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta')
    themeColorMeta.setAttribute('name', 'theme-color')
    document.head.appendChild(themeColorMeta)
  }
  themeColorMeta.setAttribute('content', isDark ? '#0D1B2A' : '#F7F6F0')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    let initial: Theme = 'light'
    try {
      // Migration depuis l'ancienne clé 'darkMode'
      const legacy = localStorage.getItem('darkMode')
      if (legacy !== null) {
        localStorage.setItem('theme', legacy === 'true' ? 'dark' : 'light')
        localStorage.removeItem('darkMode')
      }
      const stored = localStorage.getItem('theme') as Theme | null
      const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      initial = stored ?? preferred
    } catch {
      try {
        initial = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } catch {
        initial = 'light'
      }
    }

    setThemeState(initial)
    applyThemeToDOM(initial)

    // Écouteur pour adapter au changement système si l'utilisateur n'a pas forcé de choix manuel
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const hasManualChoice = localStorage.getItem('theme') !== null
        if (!hasManualChoice) {
          const sysTheme: Theme = e.matches ? 'dark' : 'light'
          setThemeState(sysTheme)
          applyThemeToDOM(sysTheme)
        }
      } catch {}
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
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
