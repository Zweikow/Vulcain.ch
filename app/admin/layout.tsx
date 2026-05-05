import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { SessionWatcher } from '@/components/admin/SessionWatcher'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <SessionProvider session={session}>
      <SessionWatcher />
      <div className="min-h-screen flex bg-bg-page dark:bg-bg-page-dark">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </SessionProvider>
  )
}
