import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma, isBuildWithoutDatabase } from '@/lib/prisma'
import { getSiteUrl, SITE_CONFIG } from '@/lib/site'
import { formatCHF } from '@/lib/money'
import { getMainImageUrl, getCuveeGallery } from '@/lib/cuvees-gallery'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductGallery from '@/components/ProductGallery'
import { OriginBadge } from '@/components/OriginBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Wine,
  Leaf,
  Sprout,
  Package,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react'

export const revalidate = 3600

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  if (isBuildWithoutDatabase()) {
    return []
  }

  const products = await prisma.product.findMany({
    where: {
      active: true,
      archived: false,
    },
    select: { slug: true },
  })
  return products.map((p) => ({ slug: p.slug }))
}

async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, slug: true, description: true } },
      producer: { select: { id: true, name: true, slug: true, description: true } },
    },
  })
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  // Règle SEO : Seuls les produits actifs et non archivés sont indexables. Les archivés font office de corbeille (404).
  if (!product || !product.active || product.archived) {
    return {
      title: 'Produit non trouvé',
      robots: { index: false, follow: false },
    }
  }

  const siteUrl = getSiteUrl()
  const title = `${product.name}${product.year ? ` (${product.year})` : ''} - ${product.producer?.name || 'Artisan suisse'} | Drinkcider`

  const producerPart = product.producer?.name ? ` par ${product.producer.name}` : ''
  const baseDesc = product.description
    ? product.description.trim()
    : `Cidre artisanal suisse de terroir, pur jus et fermentation naturelle.`
  const fullDesc = `${product.name}${product.year ? ` ${product.year}` : ''}${producerPart}. ${baseDesc} Livraison en Suisse.`
  const description = fullDesc.length > 155 ? fullDesc.slice(0, 152).trim() + '...' : fullDesc

  const mainImageRel = getMainImageUrl(product.imageUrl, product.articleNumber)
  const imageUrl = mainImageRel
    ? mainImageRel.startsWith('http')
      ? mainImageRel
      : `${siteUrl}${mainImageRel}`
    : null

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/produits/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/produits/${product.slug}`,
      siteName: SITE_CONFIG.name,
      locale: 'fr_CH',
      type: 'website',
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: `${product.name} - ${product.producer?.name || 'Drinkcider'}`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  }

  return metadata
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  // Règle SEO : Seuls les produits actifs et non archivés restent en ligne.
  if (!product || !product.active || product.archived) {
    notFound()
  }

  const siteUrl = getSiteUrl()
  const isOutOfStock = product.stock <= 0
  const bottlesCount = product.bottlesPerUnit || 1
  const isCarton = bottlesCount > 1
  const bottleSizeLabel = product.bottleSize === '27.5cl' ? '27.5 cl' : '75 cl'
  const packagingLabel = isCarton
    ? `Carton de ${bottlesCount} bouteilles (${bottleSizeLabel})`
    : `Bouteille ${bottleSizeLabel}`

  const gallery = getCuveeGallery(product.imageUrl, product.articleNumber)
  const mainImage = gallery[0]?.url || product.imageUrl || null
  const fullImageUrl = mainImage
    ? mainImage.startsWith('http')
      ? mainImage
      : `${siteUrl}${mainImage}`
    : null

  // Règle SEO : Le niveau catégorie n'apparaît que si la page catégorie est indexable
  const isCategoryIndexable = Boolean(
    product.category.slug !== 'offre-speciale-ete' &&
    product.category.description &&
    product.category.description.trim().length > 0
  )

  const breadcrumbElements = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Accueil',
      item: `${siteUrl}`,
    },
  ]

  if (isCategoryIndexable) {
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 2,
      name: product.category.name,
      item: `${siteUrl}/categories/${product.category.slug}`,
    })
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 3,
      name: product.name,
      item: `${siteUrl}/produits/${product.slug}`,
    })
  } else {
    breadcrumbElements.push({
      '@type': 'ListItem',
      position: 2,
      name: product.name,
      item: `${siteUrl}/produits/${product.slug}`,
    })
  }

  // Schema.org JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbElements,
      },
      {
        '@type': 'Product',
        name: product.name,
        description: product.description || product.name,
        ...(fullImageUrl ? { image: fullImageUrl } : {}),
        sku: `DC-${product.articleNumber}`,
        brand: {
          '@type': 'Brand',
          name: product.producer?.name || SITE_CONFIG.name,
        },
        offers: {
          '@type': 'Offer',
          url: `${siteUrl}/produits/${product.slug}`,
          priceCurrency: 'CHF',
          price: (product.priceCents / 100).toFixed(2),
          availability: isOutOfStock
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: SITE_CONFIG.legalName,
          },
        },
      },
    ],
  }

  const altText = `${product.name} - ${product.producer?.name || 'Drinkcider'}${product.year ? ` (${product.year})` : ''}`

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
            {isCategoryIndexable && (
              <>
                <li>/</li>
                <li>
                  <Link
                    href={`/categories/${product.category.slug}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li>/</li>
            <li className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
              {product.name}
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

        {/* Fiche produit détaillée */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Galerie photos interactive */}
          <ProductGallery
            gallery={gallery}
            productName={product.name}
            altText={altText}
            isOutOfStock={isOutOfStock}
            fallbackImageUrl={product.imageUrl}
          />

          {/* Informations produit */}
          <div className="flex flex-col gap-6">
            <div>
              {/* Producteur et millésime */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {product.producer && (
                  <Link
                    href={`/producteurs/${product.producer.slug}`}
                    className="text-xs font-semibold text-primary-text hover:underline inline-flex items-center gap-1"
                  >
                    <Wine className="w-3.5 h-3.5" />
                    <span>{product.producer.name}</span>
                  </Link>
                )}
                {product.year && (
                  <Badge variant="outline" className="text-xs font-mono">
                    Millésime {product.year}
                  </Badge>
                )}
                <OriginBadge origin={product.origin} className="w-4 h-4" />
              </div>

              {/* H1 unique et court */}
              <h1 className="font-display font-bold text-3xl sm:text-4xl text-foreground tracking-tight">
                {product.name}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">{packagingLabel}</p>
            </div>

            {/* Prix et disponibilité */}
            <div className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-3xl text-foreground font-mono tabular">
                    {formatCHF(product.priceCents)}
                  </span>
                  <span className="text-xs text-muted-foreground">TTC</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {isOutOfStock ? (
                    <span className="text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Indisponible à la vente
                    </span>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      En stock ({product.stock} disponible{product.stock > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              </div>

              {/* Bouton d'action */}
              <div>
                {isOutOfStock ? (
                  <Button disabled size="lg" className="w-full sm:w-auto font-semibold">
                    Cuvée épuisée
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-text-on-primary font-semibold shadow-xs"
                  >
                    <Link href={`/#catalogue`}>
                      <Package className="w-4 h-4 mr-2" />
                      Commander à la boutique
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Caractéristiques */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border/50 text-xs">
                <span className="text-muted-foreground block text-[11px]">Format</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {bottleSizeLabel}
                </span>
              </div>
              {product.alcoholVolume && (
                <div className="p-3 rounded-xl bg-card border border-border/50 text-xs">
                  <span className="text-muted-foreground block text-[11px]">Alcool</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {product.alcoholVolume}% vol.
                  </span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-card border border-border/50 text-xs">
                <span className="text-muted-foreground block text-[11px]">Origine</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {product.origin === 'CH' ? 'Suisse' : 'France'}
                </span>
              </div>
            </div>

            {/* Badges écologiques */}
            {(product.isBio || product.isVegan) && (
              <div className="flex flex-wrap gap-2">
                {product.isBio && (
                  <Badge variant="outline" className="gap-1.5 text-xs py-1 px-3">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Agriculture biologique</span>
                  </Badge>
                )}
                {product.isVegan && (
                  <Badge variant="outline" className="gap-1.5 text-xs py-1 px-3">
                    <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Vegan</span>
                  </Badge>
                )}
              </div>
            )}

            {/* Description du produit */}
            <div className="border-t border-border/60 pt-6">
              <h2 className="font-display font-semibold text-lg text-foreground mb-3">
                À propos de cette cuvée
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description ||
                  'Cidre artisanal d’auteur élaboré dans le respect du fruit et des traditions cidricoles suisses.'}
              </p>
            </div>

            {/* Informations livraison */}
            <div className="border-t border-border/60 pt-6 flex items-start gap-3 text-xs text-muted-foreground">
              <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Expédition rapide en Suisse</p>
                <p className="mt-0.5 leading-relaxed">
                  Colis sécurisé spécial bouteilles. Livraison par transporteur suisse sous 2 à 4
                  jours ouvrés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
