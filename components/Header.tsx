'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { Sun, Moon, Menu, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OriginBadge } from '@/components/OriginBadge'

export default function Header() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const links = [
    { label: 'Catalogue', href: '/#catalogue' },
    { label: 'Notre Histoire', href: '/histoire' },
    { label: 'Nous contacter', href: 'mailto:info@drinkcider.ch' },
    {
      label: 'Informations',
      href: '#',
      children: [
        { label: 'Conditions de vente', href: '/cgv' },
        { label: 'Mentions légales', href: '/mentions-legales' },
        { label: 'Protection des données', href: '/confidentialite' },
      ],
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LOGO Artisanal */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-border/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <Image
                  src="/images/logo-drinkcider.svg"
                  alt="Drinkcider"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg text-foreground tracking-tight leading-none group-hover:text-primary-text transition-colors">
                  Drinkcider
                </span>
                <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-mono mt-0.5">
                  Cidres artisanaux · Suisse
                </span>
              </div>
            </Link>

            <Badge
              variant="outline"
              className="hidden sm:inline-flex gap-1.5 text-[10px] py-0 px-2 text-muted-foreground border-border/70"
            >
              <OriginBadge origin="CH" className="w-3 h-3" />
              Boutique suisse
            </Badge>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              if (link.children) {
                return (
                  <div key={link.label} className="relative group px-1">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground group-hover:text-foreground group-hover:bg-accent/60 transition-colors flex items-center gap-1 focus:outline-none"
                    >
                      <span>{link.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform duration-200" />
                    </button>

                    {/* Menu déroulant */}
                    <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-1.5 z-50">
                      {link.children.map((child) => {
                        const isChildActive = pathname === child.href
                        return (
                          <Link
                            key={child.label}
                            href={child.href}
                            className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              isChildActive
                                ? 'bg-primary/10 text-primary-text font-semibold'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              const isActive = pathname === link.href
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary-text font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Actions : Dark mode toggle & Menu mobile */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="text-muted-foreground hover:text-foreground rounded-xl"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-90 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-primary-text transition-transform hover:-rotate-12 duration-300" />
              )}
            </Button>

            {/* Bouton burger mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-md px-4 py-4 space-y-1">
          {links.map((link) => {
            if (link.children) {
              return (
                <div key={link.label} className="py-2 border-b border-border/50">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1">
                    {link.label}
                  </div>
                  {link.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg font-medium"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )
            }

            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg font-medium"
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
