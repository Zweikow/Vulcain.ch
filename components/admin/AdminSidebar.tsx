'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Role } from '@prisma/client'
import { can, ROLE_LABELS } from '@/lib/permissions'

import { useState } from 'react'

const NAV_LINKS = [
  {
    href: '/admin',
    label: 'Tableau de bord',
    icon: '📊',
    exact: true,
    capability: can.seeDashboard,
  },
  {
    href: '/admin/preparation',
    label: 'Préparation',
    icon: '📦',
    exact: false,
    capability: () => true,
  },
  {
    href: '/admin/commandes',
    label: 'Commandes',
    icon: '🧾',
    exact: false,
    capability: () => true,
  },
  { href: '/admin/produits', label: 'Produits', icon: '🍎', exact: false, capability: () => true },
  {
    href: '/admin/categories',
    label: 'Catégories',
    icon: '📁',
    exact: false,
    capability: () => true,
  },
  {
    href: '/admin/utilisateurs',
    label: 'Utilisateurs',
    icon: '👥',
    exact: false,
    capability: can.manageUsers,
  },
  {
    href: '/admin/journal',
    label: 'Journal',
    icon: '📜',
    exact: false,
    capability: can.seeJournal,
  },
  {
    href: '/admin/parametres',
    label: 'Paramètres',
    icon: '⚙️',
    exact: false,
    capability: can.manageSettings,
  },
]

export function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const role = (user?.role as Role) ?? Role.PREPARATEUR
  const links = NAV_LINKS.filter((l) => l.capability(role))

  return (
    <>
      {/* Barre supérieure mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-bg-sidebar dark:bg-bg-sidebar-dark text-white print:hidden">
        <div className="font-display font-semibold text-sm leading-tight">Cidrerie du Vulcain</div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 -mr-2 focus:outline-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 md:w-56 bg-bg-sidebar dark:bg-bg-sidebar-dark text-white 
        flex flex-col shrink-0 transition-transform duration-200 ease-in-out print:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        <div className="p-5 border-b border-white/10 hidden md:block">
          <div className="font-display font-semibold text-sm leading-tight">
            Cidrerie du Vulcain
          </div>
          <div className="text-xs opacity-60 mt-0.5">{ROLE_LABELS[role]}</div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto flex flex-col gap-1">
          {links.map(({ href, label, icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
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
          {user && (
            <Link
              href="/admin/profil"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-90 hover:opacity-100 hover:bg-white/10 transition-all mb-2"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                👤
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate">{user.name}</span>
                <span className="text-[10px] opacity-70 uppercase tracking-wider">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </Link>
          )}
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
    </>
  )
}
