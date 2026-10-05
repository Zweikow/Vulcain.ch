import { Role } from '@prisma/client'
import { SessionWatcher } from '@/components/admin/SessionWatcher'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import Link from 'next/link'
import { currentUser } from '@/lib/guards'
import { can } from '@/lib/permissions'
import { isMaintenanceMode } from '@/lib/settings'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [user, maintenance] = await Promise.all([currentUser(), isMaintenanceMode()])

  return (
    <>
      <SessionWatcher />
      <div className="min-h-screen flex flex-col md:flex-row bg-bg-page dark:bg-bg-page-dark">
        <AdminSidebar user={user} />
        <main className="flex-1 overflow-auto p-4 md:p-8 print:overflow-visible print:p-0">
          {/* Rappel permanent tant que la boutique est fermée, pour ne pas l'oublier */}
          {maintenance && (
            <div
              role="status"
              className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#C62828]/30 bg-[#FDF2F2] px-4 py-2.5 text-sm text-[#C62828] dark:border-[#EF5350]/40 dark:bg-[#3a1d1d] dark:text-[#EF9A9A] print:hidden"
            >
              <strong>Boutique en maintenance</strong>
              <span>Les commandes sont suspendues.</span>
              {user && can.manageSettings(user.role) && (
                <Link href="/admin/parametres" className="font-medium underline">
                  Gérer
                </Link>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </>
  )
}
