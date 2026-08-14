import { Role } from '@prisma/client'
import { SessionWatcher } from '@/components/admin/SessionWatcher'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { currentUser } from '@/lib/guards'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  return (
    <>
      <SessionWatcher />
      <div className="min-h-screen flex bg-bg-page dark:bg-bg-page-dark">
        <AdminSidebar isAdmin={user?.role === Role.ADMIN} />
        <main className="flex-1 overflow-auto p-8 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </>
  )
}
