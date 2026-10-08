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
import { ArrowLeft, Sparkles } from 'lucide-react'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true, archived: false },
        orderBy: [{ year: 'desc' }, { name: 'asc' }],
        include: {
          producer: true,
        },
      },
    },
  })
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    return {
      title: 'Catégorie non trouvée',
      robots: { index: false, follow: false },
    }
  }

  // Règle SEO : "Offre spéciale été" et les catégories sans description sont exclues de l'indexation
  const isIndexable = Boolean(
    category.slug !== 'offre-speciale-ete' &&
    category.description &&
    category.description.trim().length > 0
  )

  if (!isIndexable) {
    return {
      title: `${category.name} | Drinkcider`,
      robots: { index: false, follow: false },
    }
  }

  const siteUrl = getSiteUrl()
  const title = `${category.name} - Cidres artisanaux suisses | Drinkcider`
  const description = category.description!.trim()

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/categories/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/categories/${category.slug}`,
      siteName: SITE_CONFIG.name,
      locale: 'fr_CH',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const siteUrl = getSiteUrl()
  const isIndexable = Boolean(
    category.slug !== 'offre-speciale-ete' &&
    category.description &&
    category.description.trim().length > 0
  )

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
            name: category.name,
            item: `${siteUrl}/categories/${category.slug}`,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${category.name} - Cidres artisanaux suisses`,
        description:
          category.description || `Sélection de ${category.name.toLowerCase()} artisanaux suisses.`,
        url: `${siteUrl}/categories/${category.slug}`,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: category.products.map((p, idx) => {
            const img = getMainImageUrl(p.imageUrl, p.articleNumber)
            return {
              '@type': 'ListItem',
              position: idx + 1,
              item: {
                '@type': 'Product',
                name: p.name,
                url: `${siteUrl}/produits/${p.slug}`,
                sku: `DC-${p.articleNumber}`,
                ...(img ? { image: img.startsWith('http') ? img : `${siteUrl}${img}` } : {}),
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'CHF',
                  price: (p.priceCents / 100).toFixed(2),
                  availability:
                    p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                },
              },
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
            <li className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
              {category.name}
            </li>
          </ol>
        </nav>

        {/* Bouton retour */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs">
            <Link href="/#catalogue">
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la boutique</span>
            </Link>
          </Button>
        </div>

        {/* Hero Section Catégorie */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-10 mb-12 shadow-xs">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge
                variant="default"
                className="gap-1.5 py-1 px-3 bg-primary text-text-on-primary font-semibold text-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sélection par catégorie</span>
              </Badge>
              {!isIndexable && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Sélection temporaire
                </Badge>
              )}
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground tracking-tight">
              {category.name}
            </h1>

            {category.description ? (
              <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line max-w-2xl">
                {category.description}
              </p>
            ) : (
              <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                Découvrez toutes les cuvées de la catégorie {category.name}, élaborées par des
                producteurs artisanaux indépendants en Suisse.
              </p>
            )}

            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground font-medium">
              <span>
                {category.products.length} cuvée{category.products.length > 1 ? 's' : ''} disponible
                {category.products.length > 1 ? 's' : ''}
              </span>
              <span>·</span>
              <span>Livraison rapide en Suisse</span>
            </div>
          </div>
        </div>

        {/* Grille des produits de la catégorie */}
        <section aria-label={`Cuvées de la catégorie ${category.name}`}>
          {category.products.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border text-muted-foreground">
              <p className="text-sm">Aucune cuvée actuellement disponible dans cette catégorie.</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/#catalogue">Voir tout le catalogue</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {category.products.map((product) => {
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
                            alt={`${product.name} - ${product.producer?.name || 'Drinkcider'}`}
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
                          <span className="truncate">
                            {product.producer?.name || 'Artisan suisse'}
                          </span>
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
