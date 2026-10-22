import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Printer, Download, Sparkles, Wine, Thermometer, GlassWater } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Fiche Dégustation A5 - Congrès Anniversaire | Drinkcider',
  description:
    'Fiche de présentation et dégustation des cidres de la Cidrerie du Vulcain (Jacques Perritaz) pour événements et congrès.',
  robots: { index: false, follow: false },
}

export default function FicheDegustationPage() {
  return (
    <div className="min-h-screen bg-[#E5E1D8] py-8 print:p-0 print:bg-transparent flex flex-col items-center">
      {/* Barre d'outils écran */}
      <div className="no-print bg-[#133425] text-[#F6EAD0] px-6 py-3 rounded-full mb-6 flex items-center gap-4 shadow-xl z-50">
        <Link
          href="/"
          className="text-[#F6EAD0]/80 hover:text-white flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Boutique
        </Link>
        <span className="text-[#B98C44]">|</span>
        <h2 className="font-serif text-sm font-semibold text-[#F6EAD0]">
          Fiche A5 Congrès Anniversaire
        </h2>
        <a
          href="/flyer-a5-degustation.pdf"
          download
          className="bg-[#B98C44] hover:bg-[#D4A355] text-white text-xs font-semibold px-4 py-2 rounded-full inline-flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Télécharger le PDF
        </a>
      </div>

      {/* Feuille A5 Physique (148 x 210 mm) */}
      <div className="w-[148mm] min-h-[210mm] h-[210mm] bg-[#F9F6F0] relative overflow-hidden shadow-2xl print:shadow-none print:m-0 print:w-[148mm] print:h-[210mm] flex flex-col justify-between text-[#133425]">
        {/* Cadre de luxe doré */}
        <div className="absolute top-[5mm] left-[5mm] right-[5mm] bottom-[5mm] border-[1.5pt] border-[#B98C44] pointer-events-none" />
        <div className="absolute top-[6.5mm] left-[6.5mm] right-[6.5mm] bottom-[6.5mm] border-[0.5pt] border-[#B98C44]/40 pointer-events-none" />

        {/* Coins d'angle dorés */}
        <div className="absolute top-[4mm] left-[4mm] w-[4.5mm] h-[4.5mm] border-t-2 border-l-2 border-[#B98C44] pointer-events-none" />
        <div className="absolute top-[4mm] right-[4mm] w-[4.5mm] h-[4.5mm] border-t-2 border-r-2 border-[#B98C44] pointer-events-none" />
        <div className="absolute bottom-[4mm] left-[4mm] w-[4.5mm] h-[4.5mm] border-b-2 border-l-2 border-[#B98C44] pointer-events-none" />
        <div className="absolute bottom-[4mm] right-[4mm] w-[4.5mm] h-[4.5mm] border-b-2 border-r-2 border-[#B98C44] pointer-events-none" />

        <div className="relative z-10 p-[8.5mm_9.5mm_8mm_9.5mm] h-full flex flex-col justify-between">
          {/* EN-TÊTE */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2.5 mb-1">
              <svg className="w-7 h-7" viewBox="0 0 800 800" fill="none">
                <circle cx="400" cy="400" r="380" fill="#133425" />
                <path
                  d="M400 256C365 224 318 227 285 259C252 291 244 346 259 396C278 459 331 493 400 496C469 493 522 459 541 396C556 346 548 291 515 259C482 227 435 224 400 256Z"
                  fill="#F6EAD0"
                />
                <path
                  d="M384 225C390 193 402 167 425 145"
                  stroke="#B98C44"
                  strokeWidth="26"
                  strokeLinecap="round"
                />
                <path
                  d="M408.059 207.677C442.918 153.522 504.543 143.961 542.417 163.724C511.144 213.282 459.584 231.131 408.059 207.677Z"
                  fill="#B98C44"
                />
              </svg>
              <div className="text-left">
                <div className="text-[6.2pt] font-bold tracking-[1.5px] uppercase text-[#B98C44] flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#D52B1E] text-white text-[6.5px] flex items-center justify-center rounded-[1px] font-bold">
                    +
                  </span>
                  Terroir Fribourgeois • Cidrerie d’Auteur
                </div>
                <div className="font-serif text-[13.5pt] font-bold text-[#133425] leading-none">
                  Cidrerie du Vulcain
                </div>
              </div>
            </div>

            <div className="inline-block mt-1 px-3 py-0.5 bg-[#133425] text-[#F6EAD0] rounded-full text-[6.8pt] font-semibold tracking-wide">
              ✦ Fiche Dégustation • À l’occasion de votre Congrès Anniversaire ✦
            </div>

            <div className="flex items-center justify-center gap-2 my-1.5">
              <div className="w-20 h-[0.75pt] bg-[#B98C44]" />
              <div className="w-1 h-1 bg-[#B98C44] rotate-45" />
              <div className="w-20 h-[0.75pt] bg-[#B98C44]" />
            </div>
          </div>

          {/* 1. HISTOIRE */}
          <div className="bg-white border border-[#E3D9C3] rounded p-[2.8mm_3.2mm] shadow-sm">
            <div className="font-serif text-[8.8pt] font-bold text-[#133425] flex items-center gap-1.5 mb-1">
              <span className="text-[#B98C44]">❦</span> L’Histoire : Un Pionnier du Grand Cidre en
              Suisse
            </div>
            <p className="text-[6.9pt] leading-relaxed text-[#2D4235] text-justify">
              Biologiste de formation, <strong>Jacques Perritaz</strong> fonde la{' '}
              <strong>Cidrerie du Vulcain</strong> en 2006 au Mouret (Fribourg). Sa vocation :
              réhabiliter le patrimoine fruitier helvétique et élever le cidre au rang des{' '}
              <strong>plus grands vins de gastronomie</strong>. Inspiré par le papillon{' '}
              <em>Vulcain</em> qui se délecte des fruits mûrs à l’automne, Jacques élabore des
              cuvées vivantes et cristallines, aujourd’hui plébiscitées sur les plus prestigieuses
              tables étoilées du monde.
            </p>
          </div>

          {/* 2. PILIERS */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#F6EAD0]/50 border border-[#DFD2B7] rounded p-[2mm_2.2mm] text-center">
              <span className="text-xs mb-0.5 block">🌳</span>
              <div className="text-[6.5pt] font-bold uppercase text-[#133425] tracking-wider mb-0.5">
                Arbres Hautes-Tiges
              </div>
              <div className="text-[6pt] text-[#44594C] leading-snug">
                Vergers centenaires de plein vent, sans chimie. Racines profondes gorgées de
                minéralité.
              </div>
            </div>
            <div className="bg-[#F6EAD0]/50 border border-[#DFD2B7] rounded p-[2mm_2.2mm] text-center">
              <span className="text-xs mb-0.5 block">🍏</span>
              <div className="text-[6.5pt] font-bold uppercase text-[#133425] tracking-wider mb-0.5">
                Variétés Rares
              </div>
              <div className="text-[6pt] text-[#44594C] leading-snug">
                Fruits anciens cueillis à la main : Boskoop, Bohnapfel, poires à poiré et coings
                d’antan.
              </div>
            </div>
            <div className="bg-[#F6EAD0]/50 border border-[#DFD2B7] rounded p-[2mm_2.2mm] text-center">
              <span className="text-xs mb-0.5 block">✨</span>
              <div className="text-[6.5pt] font-bold uppercase text-[#133425] tracking-wider mb-0.5">
                100% Pur Jus Vivant
              </div>
              <div className="text-[6pt] text-[#44594C] leading-snug">
                Fermentation spontanée aux levures indigènes. Prise de mousse naturelle en bouteille
                (~6-7% vol).
              </div>
            </div>
          </div>

          {/* 3. LES DEUX CUVÉES */}
          <div>
            <div className="font-serif text-[8.8pt] font-bold text-[#133425] flex items-center gap-1.5 mb-1.5">
              <span className="text-[#B98C44]">🍾</span> Les Deux Cuvées Servies à Vos Invités
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Cuvée 1 */}
              <div className="bg-white border border-[#D9CBAC] rounded p-[3mm_3.2mm] flex flex-col justify-between relative shadow-sm">
                <span className="absolute -top-2 right-2 bg-[#133425] text-[#F6EAD0] text-[5.2pt] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider">
                  Apéritif & Éclat
                </span>
                <div>
                  <div className="font-serif text-[10.5pt] font-bold text-[#133425] leading-tight">
                    Turgowy
                  </div>
                  <div className="text-[6.2pt] font-semibold text-[#B98C44] uppercase tracking-wider mb-1">
                    Cidre de Pommes Anciennes • Sec
                  </div>
                  <div className="text-[6.6pt] text-[#31473A] leading-snug mb-1.5">
                    <strong>Origine :</strong> Variétés hautes-tiges (Boskoop, Bohnapfel).
                    <br />
                    <strong>Profil :</strong> Vif, cristallin et minéral. Arômes de pomme fraîche
                    croquante, fleurs blanches et tension désaltérante. Bulle fine et aérienne.
                  </div>
                </div>
                <div className="bg-[#B98C44]/10 border-l-2 border-[#B98C44] p-1 text-[6.2pt] text-[#2F4437] leading-snug">
                  <strong className="text-[#8C6A30] uppercase text-[5.6pt] block mb-0.5">
                    Accords & Moments
                  </strong>
                  Parfait pour le toast d’accueil, apéritifs, gougères, poissons du lac et fromages
                  frais.
                </div>
              </div>

              {/* Cuvée 2 */}
              <div className="bg-[#FCFBF7] border border-[#B98C44] rounded p-[3mm_3.2mm] flex flex-col justify-between relative shadow-sm">
                <span className="absolute -top-2 right-2 bg-[#B98C44] text-white text-[5.2pt] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider">
                  Signature & Banquet
                </span>
                <div>
                  <div className="font-serif text-[10.5pt] font-bold text-[#133425] leading-tight">
                    Trois Pépins
                  </div>
                  <div className="text-[6.2pt] font-semibold text-[#B98C44] uppercase tracking-wider mb-1">
                    Pommes • Poires • Coings • Extra-Brut
                  </div>
                  <div className="text-[6.6pt] text-[#31473A] leading-snug mb-1.5">
                    <strong>Origine :</strong> Assemblage signature unique au monde.
                    <br />
                    <strong>Profil :</strong> Profond, vineux et d’une rare distinction. Notes de
                    coing compoté, cire d’abeille et épices douces. Structure racée digne d’un grand
                    cru.
                  </div>
                </div>
                <div className="bg-[#B98C44]/10 border-l-2 border-[#B98C44] p-1 text-[6.2pt] text-[#2F4437] leading-snug">
                  <strong className="text-[#8C6A30] uppercase text-[5.6pt] block mb-0.5">
                    Accords & Moments
                  </strong>
                  Magnifique compagnon de banquet, volailles, charcuteries fines et Gruyère AOP
                  affiné.
                </div>
              </div>
            </div>
          </div>

          {/* 4. SERVICE */}
          <div className="bg-[#133425] text-[#F6EAD0] rounded px-3 py-1.5 flex items-center justify-around text-[6.3pt]">
            <div className="flex items-center gap-1">
              <span>🌡️</span>
              <span>
                Température : <strong className="text-[#E5BE72]">8°C – 10°C</strong>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>🍷</span>
              <span>
                Verre : <strong className="text-[#E5BE72]">Verre à vin blanc tulipe</strong>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>🥂</span>
              <span>
                Ambiance : <strong className="text-[#E5BE72]">Festif, raffiné & digeste</strong>
              </span>
            </div>
          </div>

          {/* PIED DE PAGE */}
          <div className="border-t border-[#DFD2B7] pt-1.5 flex items-center justify-between text-[6pt] text-[#556B5F]">
            <div>
              <strong className="text-[#133425] text-[6.8pt] block">
                Drinkcider.ch — Sélection Officielle des Meilleurs Cidres Suisses
              </strong>
              Cidres & Poirés d’Artisans au Mouret (Fribourg) • Livraison soignée dans toute la
              Suisse
            </div>
            <div className="text-right">
              Cuvées disponibles en ligne :<br />
              <a
                href="https://www.drinkcider.ch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8C6A30] font-bold text-[7pt]"
              >
                www.drinkcider.ch
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
