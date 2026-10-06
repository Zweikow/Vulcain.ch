import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { formatCHF } from '@/lib/money'
import { getCuveeGallery } from '@/lib/cuvees-gallery'
import { getProducerProfile } from '@/lib/producers-data'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { OriginBadge } from '@/components/OriginBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  TreePine,
  Wine,
  MapPin,
  Calendar,
  Quote,
  Mail,
  CheckCircle2,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: 'Nos Producteurs & Artisans Cidriers | Drinkcider',
  description:
    'Découvrez les artisans d’exception sélectionnés par Drinkcider : Jacques Perritaz (Cidrerie du Vulcain, Fribourg) et nos partenaires indépendants de cidres et poirés pur jus en Suisse.',
  alternates: {
    canonical: `${siteUrl}/producteurs`,
  },
  openGraph: {
    title: 'Nos Producteurs & Artisans Cidriers | Drinkcider',
    description:
      'Rencontrez Jacques Perritaz (Cidrerie du Vulcain) et les artisans du cidre d’auteur sélectionnés par Drinkcider en Suisse.',
    url: `${siteUrl}/producteurs`,
    siteName: 'Drinkcider',
    locale: 'fr_CH',
    type: 'website',
    images: [
      {
        url: '/images/histoire/jacques-perritaz.jpg',
        width: 1200,
        height: 800,
        alt: 'Jacques Perritaz — Cidrerie du Vulcain',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nos Producteurs & Artisans Cidriers | Drinkcider',
    description:
      'Rencontrez Jacques Perritaz (Cidrerie du Vulcain) et les artisans du cidre d’auteur sélectionnés par Drinkcider en Suisse.',
    images: ['/images/histoire/jacques-perritaz.jpg'],
  },
}

export default async function ProducteursPage() {
  const dbProducers = await prisma.producer.findMany({
    orderBy: { name: 'asc' },
    include: {
      products: {
        where: { active: true, archived: false },
        include: {
          category: { select: { name: true } },
        },
        orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
      },
    },
  })

  // Préparation du balisage Schema.org JSON-LD pour le SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Accueil',
            item: `${siteUrl}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Les Producteurs',
            item: `${siteUrl}/producteurs`,
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'Producteurs et artisans sélectionnés par Drinkcider',
        description:
          'Sélection de cidriers et artisans indépendants élaborant des cidres et poirés pur jus de terroir en Suisse.',
        itemListElement: dbProducers.map((prod, index) => {
          const profile = getProducerProfile(prod.name)
          return {
            '@type': 'Winery',
            position: index + 1,
            name: profile?.estateName ? `${prod.name} (${profile.estateName})` : prod.name,
            description: profile?.shortBio ?? `Artisan producteur chez Drinkcider`,
            image: profile?.portraitImage ? `${siteUrl}${profile.portraitImage}` : undefined,
            address: {
              '@type': 'PostalAddress',
              addressLocality: profile?.cantonOrDept ?? 'Fribourg',
              addressCountry: profile?.country ?? 'CH',
            },
            url: `${siteUrl}/producteurs#${profile?.slug ?? 'producteur'}`,
          }
        }),
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Script JSON-LD SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="flex-1 w-full">
        {/* Fil d'Ariane & En-tête */}
        <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-card/60 via-background to-background py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Lien retour boutique */}
            <div className="mb-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Retour à la boutique
              </Link>
            </div>

            {/* Titre et Manifeste */}
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary-text text-xs font-semibold mb-4 tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                Artisans du terroir &amp; Vins de fruits
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight sm:leading-none mb-6">
                Les Producteurs d’Exception
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
                Chez <strong className="text-foreground font-semibold">Drinkcider</strong>, nous
                sélectionnons exclusivement des créateurs indépendants qui réinventent le cidre et
                le poiré comme de véritables vins d’auteur : arbres hautes-tiges centenaires,
                variétés sauvages non traitées, fermentations spontanées sur levures indigènes et
                respect absolu du vivant.
              </p>

              {/* Piliers en badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-medium shadow-xs">
                  <TreePine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Vergers traditionnels hautes-tiges
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-medium shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Fermentation spontanée (levures indigènes)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-medium shadow-xs">
                  <Wine className="w-4 h-4 text-primary-text" />
                  100% Pur jus &amp; Prise de mousse naturelle
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Fiche Producteur : Jacques Perritaz (Cidrerie du Vulcain) */}
        {dbProducers.map((producer) => {
          const profile = getProducerProfile(producer.name)
          if (!profile) return null

          return (
            <article
              key={producer.id}
              id={profile.slug}
              className="py-16 sm:py-20 border-b border-border/70 scroll-mt-20"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                {/* Bloc Identité & Portrait */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  {/* Photo & Repères visuels */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-border shadow-xl bg-card">
                      <Image
                        src={profile.portraitImage}
                        alt={`${profile.name} — ${profile.estateName}`}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 text-white">
                        <span className="text-xs uppercase tracking-widest font-mono text-white/80">
                          Cidriculteur
                        </span>
                        <h3 className="font-display text-2xl font-bold mt-1 text-white">
                          {profile.name}
                        </h3>
                        <p className="text-sm text-white/90 font-medium">{profile.estateName}</p>
                      </div>
                    </div>

                    {/* Fiche d'identité rapide */}
                    <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3 text-xs sm:text-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-primary-text" />
                          Terroir &amp; Domaine
                        </span>
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <OriginBadge origin={profile.country} className="w-3.5 h-3.5" />
                          {profile.region}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-primary-text" />
                          Année de création
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          Depuis {profile.sinceYear}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Wine className="w-4 h-4 text-primary-text" />
                          Cuvées au catalogue
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          {producer.products.length} cuvées disponibles
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Histoire & Philosophie */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {profile.badges.map((badge) => (
                        <Badge
                          key={badge}
                          variant="secondary"
                          className="text-xs font-semibold px-2.5 py-1 rounded-md"
                        >
                          {badge}
                        </Badge>
                      ))}
                    </div>

                    <div>
                      <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                        {profile.name}
                      </h2>
                      <p className="text-primary-text font-medium text-base sm:text-lg mt-1">
                        {profile.estateName} · {profile.tagline}
                      </p>
                    </div>

                    {/* Citation */}
                    <blockquote className="relative p-5 sm:p-6 rounded-2xl bg-accent/30 border-l-4 border-primary text-foreground italic text-sm sm:text-base leading-relaxed">
                      <Quote className="w-6 h-6 text-primary-text/40 mb-2" />
                      {profile.quote}
                    </blockquote>

                    {/* Récit éditorial */}
                    <div className="space-y-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {profile.storyParagraphs.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>

                    {/* Bouton vers ses cuvées */}
                    <div className="pt-2">
                      <Button asChild size="lg" className="rounded-xl font-medium gap-2 shadow-sm">
                        <Link href="/#catalogue">
                          Découvrir les cuvées de {profile.name}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 4 Piliers du Savoir-Faire */}
                <div className="space-y-6 pt-6">
                  <div className="border-t border-border/70 pt-10">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      Les Piliers de son Savoir-Faire
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Une méthode d’artisan intransigeante, de l’arbre à la bouteille.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {profile.philosophies.map((phil, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors shadow-xs space-y-2.5 flex flex-col"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary-text flex items-center justify-center font-mono font-bold text-sm">
                          0{idx + 1}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm leading-snug">
                          {phil.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                          {phil.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vitrine des Cuvées Disponibles en Cave */}
                {producer.products.length > 0 && (
                  <div className="space-y-6 pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-border/70 pt-10">
                      <div>
                        <h3 className="font-display text-2xl font-bold text-foreground">
                          Les Cuvées de {profile.name} disponibles en ligne
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Expédition soignée partout en Suisse directement depuis notre cave.
                        </p>
                      </div>

                      <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
                        <Link href="/#catalogue">
                          Voir tout le catalogue
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {producer.products.slice(0, 8).map((prod) => {
                        const fallbackImage =
                          prod.imageUrl ?? getCuveeGallery(null, prod.articleNumber)[0]?.url
                        return (
                          <div
                            key={prod.id}
                            className="group p-4 rounded-2xl bg-card border border-border hover:border-primary/60 transition-all shadow-xs flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Packshot */}
                              <div className="relative aspect-square w-full rounded-xl bg-background/50 border border-border/60 overflow-hidden flex items-center justify-center p-3 group-hover:scale-[1.02] transition-transform">
                                {fallbackImage ? (
                                  <Image
                                    src={fallbackImage}
                                    alt={prod.name}
                                    fill
                                    className="object-contain p-2"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                  />
                                ) : (
                                  <Wine className="w-10 h-10 text-muted-foreground/40" />
                                )}
                              </div>

                              {/* Infos */}
                              <div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                                  <span>{prod.category.name}</span>
                                  {prod.year && <span>· {prod.year}</span>}
                                </div>
                                <h4 className="font-display font-semibold text-base text-foreground leading-snug group-hover:text-primary-text transition-colors mt-0.5 line-clamp-1">
                                  {prod.name}
                                </h4>
                                {prod.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {prod.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Prix & Action */}
                            <div className="pt-4 mt-3 border-t border-border/60 flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-foreground">
                                {formatCHF(prod.priceCents)}
                              </span>
                              <Link
                                href="/#catalogue"
                                className="text-xs font-semibold text-primary-text hover:underline inline-flex items-center gap-1"
                              >
                                Découvrir
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </article>
          )
        })}

        {/* Charte Drinkcider & Appel aux futurs producteurs */}
        <section className="py-16 sm:py-20 bg-card/40 border-b border-border/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground font-semibold">
                La Charte Drinkcider
              </span>

              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Notre Engagement envers les Artisans
              </h2>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Drinkcider n’est pas une simple plateforme de vente : c’est un espace d’expression
                dédié aux producteurs engagés qui refusent l’uniformisation du goût. Nous défendons
                une juste rémunération, le respect des millésimes et la valorisation du patrimoine
                fruitier suisse.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-left">
                <div className="p-4 rounded-xl bg-background border border-border/70 space-y-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-semibold text-sm text-foreground">Sélection Pur Jus</h4>
                  <p className="text-xs text-muted-foreground">
                    Aucun jus à base de concentré, aucun arôme artificiel, aucune concession.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border/70 space-y-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-semibold text-sm text-foreground">Terroirs Vivants</h4>
                  <p className="text-xs text-muted-foreground">
                    Soutien aux vergers non traités et aux fermentations naturelles respectueuses.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border/70 space-y-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-semibold text-sm text-foreground">Partenariat Direct</h4>
                  <p className="text-xs text-muted-foreground">
                    Lien direct avec l’artisan et stockage soigné en conditions idéales de cave.
                  </p>
                </div>
              </div>

              {/* Contact producteur */}
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="rounded-xl">
                  <Link href="/#catalogue">Accéder à la boutique</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-xl gap-2">
                  <a href="mailto:info@drinkcider.ch">
                    <Mail className="w-4 h-4" />
                    Vous êtes cidriculteur ou producteur ? Contactez-nous
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
