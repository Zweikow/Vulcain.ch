import Link from 'next/link'
import Header from '@/components/Header'

export default function LegalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-page dark:bg-bg-page-dark flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="mb-8">
          <Link
            href="/"
            className="text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark transition-colors inline-flex items-center gap-2 text-sm font-medium"
          >
            ← Retour à la boutique
          </Link>
        </div>
        <div className="card p-8 md:p-12 prose dark:prose-invert prose-headings:font-display prose-headings:font-semibold prose-a:text-primary max-w-none">
          {children}
        </div>
      </main>

      {/* Footer simplifié */}
      <footer className="mt-8 bg-bg-header dark:bg-bg-header-dark px-4 py-8 text-sm text-white/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="font-display font-semibold text-base text-white">Cidrerie du Vulcain</p>
            <p className="mt-1 text-xs">© {new Date().getFullYear()} Cidrerie du Vulcain</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
