import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card/50 text-muted-foreground text-xs py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-border/50">
          {/* Col 1 & 2 : Présentation & Terroir Fribourg */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo-drinkcider.svg"
                alt="Drinkcider"
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover border border-border/80 shadow-xs"
              />
              <span className="font-display font-bold text-base text-foreground">Drinkcider</span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-md">
              Drinkcider est une boutique en ligne de cidres et de poirés artisanaux, sélectionnés
              auprès de producteurs indépendants et livrés partout en Suisse.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground mt-1">
              <span>
                Partenaire actif :{' '}
                <a
                  href="https://www.terroir-fribourg.ch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary-text transition-colors underline font-medium"
                >
                  Terroir Fribourg{' '}
                  <ArrowUpRight className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                </a>
              </span>
              <span>·</span>
              <span>
                Instagram :{' '}
                <a
                  href="https://www.instagram.com/drinkcider.ch/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary-text transition-colors underline font-medium"
                >
                  @drinkcider.ch{' '}
                  <ArrowUpRight className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                </a>
              </span>
            </div>
          </div>

          {/* Col 3 : Navigation */}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider text-foreground mb-3">
              La boutique
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/#catalogue" className="hover:text-foreground transition-colors">
                  Catalogue des cuvées
                </Link>
              </li>
              <li>
                <Link href="/producteurs" className="hover:text-foreground transition-colors">
                  Les producteurs
                </Link>
              </li>
              <li>
                <Link href="/#commande" className="hover:text-foreground transition-colors">
                  Commander en ligne
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 : Informations Légales */}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider text-foreground mb-3">
              Informations &amp; Vente
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/cgv" className="hover:text-foreground transition-colors">
                  Conditions Générales de Vente
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="hover:text-foreground transition-colors">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-foreground transition-colors">
                  Protection des données
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-muted-foreground text-[11px]">
          <span>&copy; {new Date().getFullYear()} Drinkcider · Tous droits réservés.</span>
          <span>
            Expédition réservée aux personnes majeures en Suisse · Facture avec QR-code suisse
          </span>
        </div>
      </div>
    </footer>
  )
}
