'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Role } from '@prisma/client'
import { can, ROLE_LABELS } from '@/lib/permissions'

import { useState } from 'react'
import {
  DashboardIcon,
  PreparationIcon,
  CommandesIcon,
  ClientsIcon,
  ProduitsIcon,
  CategoriesIcon,
  UtilisateursIcon,
  JournalIcon,
  ParametresIcon,
  UserIcon,
  LogoutIcon,
  PromoIcon,
  FacturesIcon,
} from '@/components/admin/AdminIcons'

const NAV_LINKS = [
  {
    href: '/admin',
    label: 'Tableau de bord',
    icon: DashboardIcon,
    exact: true,
    capability: can.seeDashboard,
  },
  {
    href: '/admin/preparation',
    label: 'Préparation',
    icon: PreparationIcon,
    exact: false,
    capability: () => true,
  },
  {
    href: '/admin/commandes',
    label: 'Commandes',
    icon: CommandesIcon,
    exact: false,
    capability: () => true,
  },
  {
    href: '/admin/factures',
    label: 'Factures',
    icon: FacturesIcon,
    exact: false,
    capability: can.seeFinancials,
  },
  {
    href: '/admin/clients',
    label: 'Clients',
    icon: ClientsIcon,
    exact: false,
    capability: () => true,
  },
  {
    href: '/admin/produits',
    label: 'Produits',
    icon: ProduitsIcon,
    exact: false,
    capability: () => true,
  },
  {
    href: '/admin/promotions',
    label: 'Offres & Promos',
    icon: PromoIcon,
    exact: false,
    capability: can.manageCatalogue,
  },
  {
    href: '/admin/categories',
    label: 'Catégories',
    icon: CategoriesIcon,
    exact: false,
    capability: () => true,
  },
  {
    href: '/admin/utilisateurs',
    label: 'Utilisateurs',
    icon: UtilisateursIcon,
    exact: false,
    capability: can.manageUsers,
  },
  {
    href: '/admin/journal',
    label: 'Journal',
    icon: JournalIcon,
    exact: false,
    capability: can.seeJournal,
  },
  {
    href: '/admin/parametres',
    label: 'Paramètres',
    icon: ParametresIcon,
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
        <div className="flex items-center gap-2.5">
          <Image
            src="/images/logo-drinkcider.svg"
            alt="Drinkcider"
            width={24}
            height={24}
            className="w-6 h-6 rounded-full object-cover shrink-0 border border-amber-500/30"
          />
          <div className="font-display font-semibold text-sm leading-tight">Drinkcider</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 -mr-2 focus:outline-none"
            aria-label="Menu de navigation"
          >
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
        border-r border-white/5 dark:border-white/10
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        <div className="p-4 border-b border-white/10 hidden md:flex items-center gap-3">
          <Image
            src="/images/logo-drinkcider.svg"
            alt="Drinkcider"
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-amber-500/30 shadow-xs"
          />
          <div>
            <div className="font-display font-semibold text-sm leading-tight">Drinkcider</div>
            <div className="text-xs opacity-60 mt-0.5">{ROLE_LABELS[role]}</div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto flex flex-col gap-1.5">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-white/15 dark:bg-white/10 text-white font-medium shadow-sm'
                    : 'text-slate-300 dark:text-slate-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                    isActive
                      ? 'bg-primary/20 text-primary dark:bg-primary/25 dark:text-primary shadow-sm'
                      : 'bg-white/5 text-slate-300 dark:text-slate-400 group-hover:text-white group-hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10 flex flex-col gap-1">
          {user && (
            <Link
              href="/admin/profil"
              onClick={() => setIsOpen(false)}
              className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 dark:text-slate-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/5 transition-all mb-1"
            >
              <div className="w-7 h-7 rounded-md bg-white/10 text-white flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate font-medium text-white">{user.name}</span>
                <span className="text-[10px] opacity-70 uppercase tracking-wider">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </Link>
          )}
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 dark:text-slate-400 hover:text-red-300 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-all"
          >
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 group-hover:bg-red-500/20 group-hover:text-red-300 transition-colors shrink-0">
              <LogoutIcon className="w-4 h-4" />
            </div>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
