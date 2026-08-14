'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_LINKS = [
  { href: '/admin', label: 'Tableau de bord', icon: '📊', exact: true, adminOnly: false },
  { href: '/admin/preparation', label: 'Préparation', icon: '📦', exact: false, adminOnly: false },
  { href: '/admin/commandes', label: 'Commandes', icon: '🧾', exact: false, adminOnly: false },
  { href: '/admin/produits', label: 'Produits', icon: '🍎', exact: false, adminOnly: false },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥', exact: false, adminOnly: true },
  { href: '/admin/journal', label: 'Journal', icon: '📜', exact: false, adminOnly: true },
  { href: '/admin/parametres', label: 'Paramètres', icon: '⚙️', exact: false, adminOnly: true },
]

export function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  // Masquer un lien est un confort, pas une protection : chaque écran vérifie
  // le rôle côté serveur.
  const links = NAV_LINKS.filter((l) => !l.adminOnly || isAdmin)

  return (
    <aside className="w-56 bg-bg-sidebar dark:bg-bg-sidebar-dark text-white flex flex-col shrink-0 print:hidden">
      <div className="p-5 border-b border-white/10">
        <div className="font-display font-semibold text-sm leading-tight">Cidrerie du Vulcain</div>
        <div className="text-xs opacity-60 mt-0.5">Administration</div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {links.map(({ href, label, icon, exact }) => {
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

      <div className="p-3 border-t border-white/10 flex flex-col gap-1">
        <ThemeToggle />
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
