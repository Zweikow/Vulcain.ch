import { SessionWatcher } from '@/components/admin/SessionWatcher'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionWatcher />
      <div className="min-h-screen flex bg-bg-page dark:bg-bg-page-dark">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-8 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </>
  )
}
