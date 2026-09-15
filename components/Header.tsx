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
    { label: 'Nous contacter', href: 'mailto:contact@cidrerie-vulcain.ch' },
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
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1C1C1C]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LOGO - Gauche */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex flex-col">
              <span className="font-display font-semibold text-lg leading-tight text-text-primary dark:text-text-primary-dark">
                Cidrerie du Vulcain
              </span>
            </Link>
          </div>

          {/* LIENS - Centre (Desktop) */}
          <nav className="hidden md:flex flex-1 justify-center gap-2">
            {links.map((link) => {
              if (link.children) {
                return (
                  <div key={link.label} className="relative group px-3 py-2">
                    <span className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark cursor-pointer group-hover:text-primary dark:group-hover:text-primary-dark transition-colors flex items-center gap-1">
                      {link.label}
                      <svg
                        className="w-4 h-4 opacity-50 group-hover:rotate-180 transition-transform"
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
                    </span>
                    {/* Menu déroulant */}
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-white dark:bg-[#2A2A2A] rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-200 dark:border-white/10 overflow-hidden z-50">
                      <div className="py-1">
                        {link.children.map((child) => {
                          const isChildActive = pathname === child.href
                          return (
                            <Link
                              key={child.label}
                              href={child.href}
                              className={`block px-4 py-2 text-sm transition-colors ${
                                isChildActive
                                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-dark'
                                  : 'text-text-secondary dark:text-text-secondary-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-dark'
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-dark'
                      : 'text-text-secondary dark:text-text-secondary-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-dark'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* ACTIONS - Droite */}
          <div className="flex items-center gap-4">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isDark ? 'bg-primary' : 'bg-gray-300'
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

            {/* Menu Mobile Toggle */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-text-secondary dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-white/5 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Ouvrir le menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
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

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1C]">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {links.map((link) => {
              if (link.children) {
                return (
                  <div key={link.label} className="space-y-1 mt-2">
                    <div className="px-3 py-2 text-sm font-semibold text-text-primary dark:text-text-primary-dark uppercase tracking-wider">
                      {link.label}
                    </div>
                    {link.children.map((child) => {
                      const isChildActive = pathname === child.href
                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block pl-6 pr-3 py-2 rounded-md text-base font-medium transition-colors ${
                            isChildActive
                              ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-dark'
                              : 'text-text-secondary dark:text-text-secondary-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-dark'
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
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-dark'
                      : 'text-text-secondary dark:text-text-secondary-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-dark'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}

            {/* Bascule Mode Sombre / Mode Clair dans le menu mobile */}
            <div className="border-t border-gray-200 dark:border-white/10 mt-3 pt-3 px-3 flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                Thème d&apos;affichage
              </span>
              <button
                onClick={toggle}
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border dark:border-border-dark text-xs font-semibold text-text-primary dark:text-text-primary-dark hover:bg-primary/10 transition-colors"
              >
                {isDark ? (
                  <>
                    <SunIcon className="w-4 h-4 text-amber-400" />
                    <span>Mode clair</span>
                  </>
                ) : (
                  <>
                    <MoonIcon className="w-4 h-4 text-primary" />
                    <span>Mode sombre</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
