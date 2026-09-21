import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'

export const metadata = {
  title: 'Notre Histoire — Drinkcider & Jacques Perritaz',
  description:
    "Découvrez l'histoire de Drinkcider, la complicité entre Bertrand Baeriswyl et le maître cidrier Jacques Perritaz, et l'art des cidres d'auteurs suisses.",
}

export default function HistoirePage() {
  return (
    <div className="min-h-screen bg-bg-page dark:bg-bg-page-dark flex flex-col text-text-primary dark:text-text-primary-dark transition-colors">
      <Header />

      <main className="flex-1">
        {/* En-tête Hero */}
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 px-4 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-light dark:bg-secondary/40 text-secondary dark:text-text-primary-dark text-xs font-semibold uppercase tracking-wider mb-6 border border-border dark:border-border-dark">
            <span>Terroir suisse · Amitié · Cidres d&apos;auteurs</span>
          </div>
          <h1 className="font-display font-semibold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-text-primary dark:text-text-primary-dark max-w-4xl mx-auto leading-tight">
            L&apos;Histoire de Drinkcider
          </h1>
          <p className="mt-6 text-base sm:text-xl text-text-secondary dark:text-text-secondary-dark max-w-2xl mx-auto leading-relaxed">
            Une aventure née d&apos;une passion partagée, d&apos;un amour inconditionnel pour les
            fruits anciens et d&apos;une profonde amitié avec l&apos;un des plus grands maîtres
            cidriers de Suisse.
          </p>
        </section>

        {/* Bloc 1 : Bertrand Baeriswyl & La genèse de Drinkcider */}
        <section className="py-12 sm:py-16 px-4 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Image Bertrand à gauche */}
            <div className="lg:col-span-5">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-tr from-[#284B63]/20 via-[#80ED99]/10 to-transparent rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative overflow-hidden rounded-2xl border border-border dark:border-border-dark shadow-xl bg-card dark:bg-card-dark aspect-[4/3] sm:aspect-[4/3]">
                  <Image
                    src="/images/histoire/bertrand-baeriswyl.jpg"
                    alt="Bertrand Baeriswyl — Fondateur de Drinkcider"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    priority
                  />
                </div>
                <div className="mt-3 text-center sm:text-left">
                  <p className="text-xs font-medium text-text-tertiary dark:text-text-tertiary-dark">
                    <strong>Bertrand Baeriswyl</strong> · Fondateur & Ambassadeur Drinkcider
                  </p>
                </div>
              </div>
            </div>

            {/* Texte Bertrand à droite */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="text-xs font-bold uppercase tracking-widest text-[#284B63] dark:text-[#80ED99]">
                La Genèse
              </div>
              <h2 className="font-display font-semibold text-2xl sm:text-3xl text-text-primary dark:text-text-primary-dark leading-snug">
                D&apos;où vient l&apos;idée de Drinkcider ?
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-text-secondary dark:text-text-secondary-dark leading-relaxed">
                <p>
                  Pendant trop longtemps, le cidre est resté enfermé dans l&apos;image d&apos;une
                  boisson secondaire, souvent standardisée ou sucrée. Pourtant, au cœur du terroir
                  suisse, des crus d&apos;une complexité aromatique bouleversante voyaient le jour
                  dans l&apos;ombre des caves artisanales.
                </p>
                <p>
                  Amoureux de gastronomie authentique et de vins vivants,{' '}
                  <strong>Bertrand Baeriswyl</strong> a fait un constat simple : ces bouteilles
                  rares méritaient une vitrine à la hauteur de leur noblesse. Une passerelle
                  directe, soignée et accessible entre la cave et les tables des épicuriens.
                </p>
                <p>
                  C&apos;est de cette étincelle qu&apos;est né <strong>Drinkcider</strong>. Plus
                  qu&apos;une simple boutique en ligne, Drinkcider a été pensé comme un écrin de
                  dégustation : sélectionner des cuvées pures, préserver leur fraîcheur par une
                  logistique irréprochable en Suisse, et partager l&apos;émotion d&apos;un vrai
                  nectar vivant.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Citation Intermède */}
        <section className="py-12 sm:py-16 px-4 max-w-4xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-bg-header to-[#1C3B4E] text-white shadow-2xl relative overflow-hidden text-center border border-white/10">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <blockquote className="font-display italic text-lg sm:text-2xl leading-relaxed max-w-2xl mx-auto text-white/95">
              « Le vin a ses grands terroirs, le cidre a désormais ses auteurs. Entre le verger
              centenaire et le verre, une même exigence du vrai. »
            </blockquote>
            <p className="mt-6 text-xs sm:text-sm font-semibold tracking-wider uppercase text-white/60">
              La Philosophie Drinkcider
            </p>
          </div>
        </section>

        {/* Bloc 2 : Jacques Perritaz & Le Maître Cidrier */}
        <section className="py-12 sm:py-16 px-4 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Texte Jacques à gauche (Desktop) */}
            <div className="lg:col-span-7 order-2 lg:order-1 flex flex-col gap-4">
              <div className="text-xs font-bold uppercase tracking-widest text-[#284B63] dark:text-[#80ED99]">
                Le Maître Cidrier
              </div>
              <h2 className="font-display font-semibold text-2xl sm:text-3xl text-text-primary dark:text-text-primary-dark leading-snug">
                Jacques Perritaz : le pionnier des cidres d&apos;auteurs
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-text-secondary dark:text-text-secondary-dark leading-relaxed">
                <p>
                  Pour les sommeliers des grandes tables et les passionnés de fermentation
                  naturelle, le nom de <strong>Jacques Perritaz</strong> résonne comme une référence
                  absolue. Biologiste de formation, il a fait le choix audacieux au début des années
                  2000 de sauver de l&apos;oubli les vergers traditionnels à hautes tiges de Suisse
                  romande.
                </p>
                <p>
                  Sa méthode est sans compromis : ramasser à la main des variétés anciennes et
                  sauvages (pommes de fer, bohnapfel, poires à Botzi), respecter le rythme naturel
                  des saisons, et laisser agir <strong>100% de levures indigènes</strong> sans
                  pasteurisation, sans filtration forcée, ni artifice. Chaque millésime est une
                  œuvre vivante, tendue, minérale et éclatante.
                </p>
                <div className="p-5 rounded-2xl bg-content1 border border-divider shadow-heroui-sm mt-2">
                  <h3 className="font-semibold text-sm text-text-primary dark:text-text-primary-dark mb-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Une alliance de confiance et d&apos;amitié
                  </h3>
                  <p className="text-xs sm:text-sm text-default-600 dark:text-default-400 leading-relaxed">
                    Liés par des années de complicité et une estime réciproque, c&apos;est tout
                    naturellement que Jacques a confié à Bertrand la{' '}
                    <strong className="text-text-primary dark:text-text-primary-dark">
                      revente et la distribution officielle
                    </strong>{' '}
                    de ses précieux flacons. Cet accord fraternel permet à Jacques de consacrer
                    toute son énergie à ses vergers et à ses fûts, tout en garantissant aux fidèles
                    amateurs un accès direct, fidèle et soigné à ses créations.
                  </p>
                </div>
              </div>
            </div>

            {/* Image Jacques à droite (Desktop) */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-tr from-[#977390]/20 via-[#284B63]/20 to-transparent rounded-3xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative overflow-hidden rounded-3xl border border-divider shadow-heroui-md bg-content1 aspect-[4/3] sm:aspect-[4/3]">
                  <Image
                    src="/images/histoire/jacques-perritaz.jpg"
                    alt="Jacques Perritaz — Maître Cidrier"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 45vw"
                  />
                </div>
                <div className="mt-3 text-center sm:text-right">
                  <p className="text-xs font-medium text-default-400">
                    <strong className="text-text-primary dark:text-text-primary-dark">
                      Jacques Perritaz
                    </strong>{' '}
                    · Maître Cidrier & Artisan des terroirs suisses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Appel à l'action */}
        <section className="py-16 px-4 max-w-4xl mx-auto text-center border-t border-divider mt-8">
          <h2 className="font-display font-semibold text-2xl sm:text-3xl text-text-primary dark:text-text-primary-dark">
            Goûtez à la différence du pur fruit
          </h2>
          <p className="mt-3 text-sm sm:text-base text-default-600 dark:text-default-400 max-w-xl mx-auto">
            Retrouvez les cuvées emblématiques de Jacques Perritaz, prêtes à être expédiées
            directement chez vous en Suisse.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/#catalogue"
              className="heroui-btn-primary w-full sm:w-auto px-8 py-3.5 text-sm font-semibold rounded-2xl shadow-heroui-primary"
            >
              Découvrir le catalogue des cuvées
            </Link>
            <a
              href="mailto:info@drinkcider.ch"
              className="heroui-btn-secondary w-full sm:w-auto px-6 py-3.5 text-sm font-medium rounded-2xl"
            >
              Contacter Bertrand
            </a>
          </div>
        </section>
      </main>

      {/* Footer épuré */}
      <footer className="bg-bg-header dark:bg-bg-header-dark px-4 py-10 text-sm text-white/80 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div>
            <p className="font-semibold text-white text-sm">Drinkcider</p>
            <p className="mt-0.5">
              © {new Date().getFullYear()} Drinkcider.ch · Distribution officielle
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition-colors">
              Boutique
            </Link>
            <Link href="/cgv" className="hover:text-white transition-colors">
              CGV
            </Link>
            <Link href="/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">
              Protection des données
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
