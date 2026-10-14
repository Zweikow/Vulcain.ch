import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { InstagramIcon } from '@/components/Icons'
import { SITE_CONFIG } from '@/lib/site'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card/50 text-muted-foreground text-xs py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-border/50">
          {/* Col 1 & 2 : Présentation & Réseaux */}
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

            {/* Bouton Instagram */}
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <a
                href={SITE_CONFIG.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border/80 hover:border-[#DD2A7B]/60 text-foreground hover:text-[#DD2A7B] transition-all duration-200 group shadow-xs hover:shadow-sm"
              >
                <span className="w-4 h-4 rounded-sm bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                  <InstagramIcon className="w-2.5 h-2.5 text-white" />
                </span>
                <span>Suivez-nous sur Instagram</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {SITE_CONFIG.social.instagramHandle}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#DD2A7B] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
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
