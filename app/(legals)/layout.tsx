import Link from 'next/link'
import Header from '@/components/Header'

export default function LegalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-page dark:bg-bg-page-dark flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="heroui-btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3.5 rounded-xl"
          >
            ← Retour à la boutique
          </Link>
        </div>
        <div className="heroui-card p-8 md:p-12 prose dark:prose-invert prose-headings:font-display prose-headings:font-semibold prose-a:text-primary max-w-none rounded-3xl border border-divider shadow-heroui-md">
          {children}
        </div>
      </main>

      {/* Footer simplifié HeroUI */}
      <footer className="mt-12 bg-content1 dark:bg-[#0B131D] border-t border-divider px-4 py-8 text-sm text-default-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-display font-semibold text-base text-text-primary dark:text-text-primary-dark">
              Drinkcider
            </p>
            <p className="mt-0.5">
              © {new Date().getFullYear()} Drinkcider.ch · Terroir &amp; cidres d&apos;auteurs
              suisses
            </p>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/cgv" className="hover:text-primary transition-colors">
              CGV
            </Link>
            <Link href="/mentions-legales" className="hover:text-primary transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-primary transition-colors">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
