'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface AdminLayoutClientProps {
  children: ReactNode
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Si on est sur la page login, ne pas afficher le layout admin
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const navItems = [
    { href: '/admin', label: 'Tableau de bord', icon: '🏠' },
    { href: '/admin/categories', label: 'Catégories', icon: '📂' },
    { href: '/admin/produits', label: 'Produits', icon: '🍾' },
    { href: '/admin/stocks', label: 'Stocks', icon: '📦' },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-[#4a7c59] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="font-semibold text-sm leading-tight">
            🍎 Cidrerie du Vulcain
          </div>
          <div className="text-xs opacity-60 mt-0.5">Administration</div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                  isActive
                    ? 'bg-white/15 font-medium'
                    : 'opacity-70 hover:opacity-100 hover:bg-white/10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <span>🌐</span>
            <span>Voir le site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-70 hover:opacity-100 hover:bg-white/10 transition-all text-left"
          >
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
