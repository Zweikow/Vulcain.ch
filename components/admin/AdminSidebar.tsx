'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_LINKS = [
  { href: '/admin', label: 'Tableau de bord', icon: '📊', exact: true },
  { href: '/admin/commandes', label: 'Commandes', icon: '📦', exact: false },
  { href: '/admin/produits', label: 'Produits', icon: '🍎', exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-bg-sidebar dark:bg-bg-sidebar-dark text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-white/10">
        <div className="font-display font-semibold text-sm leading-tight">Cidrerie du Vulcain</div>
        <div className="text-xs opacity-60 mt-0.5">Administration</div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV_LINKS.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                isActive
                  ? 'bg-white/15 font-medium'
                  : 'opacity-70 hover:opacity-100 hover:bg-white/10'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
        >
          <span>🚪</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
