import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'
import { getSiteUrl, SITE_CONFIG } from '@/lib/site'
import { getMainImageUrl } from '@/lib/cuvees-gallery'
import { formatCHF } from '@/lib/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Wine } from 'lucide-react'

interface ProducerPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

async function getProducerBySlug(slug: string) {
  return prisma.producer.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true, archived: false },
        orderBy: [{ year: 'desc' }, { name: 'asc' }],
        include: {
          category: true,
        },
      },
    },
  })
}

export async function generateMetadata({ params }: ProducerPageProps): Promise<Metadata> {
  const { slug } = await params
  const producer = await getProducerBySlug(slug)

  if (!producer) {
    return {
      title: 'Producteur non trouvé',
      robots: { index: false, follow: false },
    }
  }

  // Règle SEO : Un producteur dont la description est vide reste en noindex
  const isIndexable = Boolean(producer.description && producer.description.trim().length > 0)

  if (!isIndexable) {
    return {
      title: `${producer.name} | Drinkcider`,
      robots: { index: false, follow: false },
    }
  }

  const siteUrl = getSiteUrl()
  const title = `${producer.name} - Cidres et poirés d'auteur suisse | Drinkcider`
  const description = producer.description!.trim()
  const photo = producer.photoUrl
    ? producer.photoUrl.startsWith('http')
      ? producer.photoUrl
      : `${siteUrl}${producer.photoUrl}`
    : null

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/producteurs/${producer.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/producteurs/${producer.slug}`,
      siteName: SITE_CONFIG.name,
      locale: 'fr_CH',
      type: 'profile',
      ...(photo
        ? {
            images: [
              {
                url: photo,
                width: 1200,
                height: 630,
                alt: `${producer.name} - Artisan cidrier`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: photo ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  }
}

export default async function ProducerDetailPage({ params }: ProducerPageProps) {
  const { slug } = await params
  const producer = await getProducerBySlug(slug)

  if (!producer) {
    notFound()
  }

  const siteUrl = getSiteUrl()
  const photo = producer.photoUrl
    ? producer.photoUrl.startsWith('http')
      ? producer.photoUrl
      : `${siteUrl}${producer.photoUrl}`
    : null

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
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Producteurs',
            item: `${siteUrl}/producteurs`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: producer.name,
            item: `${siteUrl}/producteurs/${producer.slug}`,
          },
        ],
      },
      {
        '@type': 'Winery',
        name: producer.name,
        description:
          producer.description || `Artisan cidriculteur partenaire de Drinkcider en Suisse.`,
        url: `${siteUrl}/producteurs/${producer.slug}`,
        ...(photo ? { image: photo } : {}),
        ...(producer.region
          ? {
              address: {
                '@type': 'PostalAddress',
                addressRegion: producer.region,
                addressCountry: 'CH',
              },
            }
          : {}),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `Cuvées de ${producer.name}`,
          itemListElement: producer.products.map((p) => {
            const img = getMainImageUrl(p.imageUrl, p.articleNumber)
            return {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Product',
                name: p.name,
                url: `${siteUrl}/produits/${p.slug}`,
                sku: `DC-${p.articleNumber}`,
                ...(img ? { image: img.startsWith('http') ? img : `${siteUrl}${img}` } : {}),
              },
              priceCurrency: 'CHF',
              price: (p.priceCents / 100).toFixed(2),
              availability:
                p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            }
          }),
        },
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Fil d'Ariane SEO */}
        <nav aria-label="Fil d'Ariane" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Accueil
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/producteurs" className="hover:text-foreground transition-colors">
                Producteurs
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
              {producer.name}
            </li>
          </ol>
        </nav>

        {/* Bouton retour */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs">
            <Link href="/producteurs">
              <ArrowLeft className="w-4 h-4" />
              <span>Tous les producteurs</span>
            </Link>
          </Button>
        </div>

        {/* Hero Section Producteur */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-12 mb-12 shadow-xs">
          <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge
                  variant="default"
                  className="gap-1.5 py-1 px-3 bg-primary text-text-on-primary font-semibold text-xs"
                >
                  <Wine className="w-3.5 h-3.5" />
                  <span>Artisan partenaire</span>
                </Badge>
                {producer.region && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span>{producer.region}</span>
                  </Badge>
                )}
              </div>

              <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground tracking-tight">
                {producer.name}
              </h1>

              {producer.description ? (
                <p className="mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                  {producer.description}
                </p>
              ) : (
                <p className="mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Artisan cidrier indépendant sélectionné par Drinkcider pour l’excellence de ses
                  méthodes et le respect des fruits de terroir.
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
                <span>
                  {producer.products.length} cuvée{producer.products.length > 1 ? 's' : ''}{' '}
                  référencée{producer.products.length > 1 ? 's' : ''}
                </span>
                <span>·</span>
                <span>Fermentations spontanées</span>
                <span>·</span>
                <span>Livraison en Suisse</span>
              </div>
            </div>

            {/* Photo ou visuel producteur */}
            {photo ? (
              <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border border-border/70 shrink-0 shadow-sm">
                <Image src={photo} alt={producer.name} fill unoptimized className="object-cover" />
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Wine className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

        {/* Section Cuvées du producteur */}
        <section aria-label={`Cuvées de ${producer.name}`}>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display font-bold text-2xl text-foreground">
              Les cuvées de {producer.name}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {producer.products.length} référence{producer.products.length > 1 ? 's' : ''}
            </span>
          </div>

          {producer.products.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border text-muted-foreground">
              <p className="text-sm">Aucune cuvée active pour ce producteur actuellement.</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/#catalogue">Voir tout le catalogue</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {producer.products.map((product) => {
                const img = getMainImageUrl(product.imageUrl, product.articleNumber)
                const isOutOfStock = product.stock <= 0
                const bottlesCount = product.bottlesPerUnit || 1
                const isCarton = bottlesCount > 1
                const bottleSizeLabel = product.bottleSize === '27.5cl' ? '27.5 cl' : '75 cl'
                const packagingLabel = isCarton
                  ? `Carton ${bottlesCount}x${bottleSizeLabel}`
                  : `Bouteille ${bottleSizeLabel}`

                return (
                  <div
                    key={product.id}
                    className="card h-full flex flex-col justify-between overflow-hidden group p-0 bg-card border border-border rounded-xl shadow-xs hover:shadow-md transition-shadow relative"
                  >
                    <div className="p-3.5 flex flex-col gap-2.5 text-left w-full flex-1">
                      {/* Photo produit avec vrai lien HTML */}
                      <Link
                        href={`/produits/${product.slug}`}
                        className="relative w-full aspect-square rounded-xl overflow-hidden bg-bg-page dark:bg-bg-page-dark border border-border/50 block group/img"
                      >
                        {img ? (
                          <Image
                            src={img}
                            alt={`${product.name} - ${producer.name}`}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-500 ease-out group-hover/img:scale-105"
                            sizes="(max-width: 768px) 100vw, 300px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-serif italic text-xs text-muted-foreground">
                            Cuvée artisanale
                          </div>
                        )}

                        {isOutOfStock && (
                          <div className="absolute right-2 top-2 z-10 pointer-events-none">
                            <Badge
                              variant="destructive"
                              className="text-[10px] py-0 px-2 shadow-xs"
                            >
                              Épuisé
                            </Badge>
                          </div>
                        )}
                      </Link>

                      {/* Informations produit */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground gap-1">
                          <span className="truncate">{product.category.name}</span>
                          {product.year && (
                            <span className="font-mono shrink-0">{product.year}</span>
                          )}
                        </div>

                        <Link
                          href={`/produits/${product.slug}`}
                          className="font-display font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1"
                        >
                          {product.name}
                        </Link>

                        <p className="text-[11px] text-muted-foreground">{packagingLabel}</p>
                      </div>
                    </div>

                    {/* Prix et bouton */}
                    <div className="p-3.5 pt-0 flex items-center justify-between border-t border-border/40 mt-auto">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-base text-foreground font-mono tabular">
                          {formatCHF(product.priceCents)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">TTC</span>
                      </div>

                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link href={`/produits/${product.slug}`}>Voir la cuvée</Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
