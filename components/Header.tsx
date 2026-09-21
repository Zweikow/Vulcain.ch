'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { SunIcon, MoonIcon } from '@/components/admin/AdminIcons'

export default function Header() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const links = [
    { label: 'Catalogue', href: '/' },
    { label: 'Notre Histoire', href: '/histoire' },
    { label: 'Nous contacter', href: 'mailto:info@drinkcider.ch' },
    {
      label: 'Informations légales',
      href: '#',
      children: [
        { label: 'Conditions de vente', href: '/cgv' },
        { label: 'Mentions légales', href: '/mentions-legales' },
        { label: 'Protection des données', href: '/confidentialite' },
      ],
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-[#0B131D]/80 border-b border-divider transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LOGO - Gauche */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="font-display font-bold text-xl tracking-tight text-foreground transition-colors group-hover:text-primary">
                Drinkcider
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                CH
              </span>
            </Link>
          </div>

          {/* LIENS - Centre (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-default-100/60 p-1 rounded-2xl border border-divider">
            {links.map((link) => {
              if (link.children) {
                return (
                  <div key={link.label} className="relative group">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-default-600 hover:text-foreground hover:bg-content1 transition-all duration-200 flex items-center gap-1.5"
                    >
                      <span>{link.label}</span>
                      <svg
                        className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform duration-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {/* Menu déroulant HeroUI Card */}
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-content1/95 dark:bg-[#131F2D]/95 backdrop-blur-xl rounded-2xl shadow-heroui-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-divider p-1.5 z-50">
                      <div className="flex flex-col gap-0.5">
                        {link.children.map((child) => {
                          const isChildActive = pathname === child.href
                          return (
                            <Link
                              key={child.label}
                              href={child.href}
                              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                isChildActive
                                  ? 'bg-primary/15 text-primary font-semibold'
                                  : 'text-default-600 hover:text-foreground hover:bg-default-100'
                              }`}
                            >
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              }

              const isActive = pathname === link.href
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-content1 text-foreground shadow-heroui-sm'
                      : 'text-default-600 hover:text-foreground hover:bg-content1/70'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* ACTIONS - Droite */}
          <div className="flex items-center gap-2.5">
            {/* Dark mode button HeroUI */}
            <button
              onClick={toggle}
              className="p-2 rounded-xl border border-divider bg-content1/80 hover:bg-default-100 text-default-600 hover:text-foreground transition-all duration-200 active:scale-95 shadow-heroui-sm"
              aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {isDark ? (
                <SunIcon className="w-4 h-4 text-amber-400" />
              ) : (
                <MoonIcon className="w-4 h-4 text-primary" />
              )}
            </button>

            {/* Menu Mobile Toggle */}
            <button
              type="button"
              className="md:hidden p-2 rounded-xl border border-divider bg-content1 text-default-600 hover:text-foreground hover:bg-default-100 focus:outline-none transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Ouvrir le menu</span>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile HeroUI */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-divider bg-content1/95 backdrop-blur-xl px-4 py-4 space-y-3">
          <div className="flex flex-col gap-1">
            {links.map((link) => {
              if (link.children) {
                return (
                  <div key={link.label} className="mt-2 space-y-1">
                    <div className="px-3 py-1 text-[11px] font-bold text-default-400 uppercase tracking-wider">
                      {link.label}
                    </div>
                    {link.children.map((child) => {
                      const isChildActive = pathname === child.href
                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block pl-6 pr-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isChildActive
                              ? 'bg-primary/15 text-primary font-semibold'
                              : 'text-default-600 hover:text-foreground hover:bg-default-100'
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )
              }

              const isActive = pathname === link.href
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-default-600 hover:text-foreground hover:bg-default-100'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}
