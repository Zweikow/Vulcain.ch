import { SessionWatcher } from '@/components/admin/SessionWatcher'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionWatcher />
      <div className="min-h-screen flex bg-bg-page dark:bg-bg-page-dark">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </>
  )
}
