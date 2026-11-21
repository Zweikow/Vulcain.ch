import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { matchFeaturedCuvees, type FeaturedProducer } from '@/lib/producers-data'

interface ProducerFeatureProps {
  feature: FeaturedProducer
  /** Cuvées actives du producteur en base, pour lier chaque packshot à sa fiche. */
  products: { slug: string; name: string; imageUrl: string | null }[]
}

/** Bloc court qui met un producteur partenaire en avant sur /producteurs. */
export function ProducerFeature({ feature, products }: ProducerFeatureProps) {
  const cuvees = matchFeaturedCuvees(feature.cuvees, products)
  const titleId = `${feature.slug}-titre`

  return (
    <section
      id={feature.slug}
      aria-labelledby={titleId}
      className="py-12 sm:py-16 border-b border-border/70 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center rounded-2xl border border-border bg-card p-5 sm:p-8 lg:p-10">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-primary-text">
              Producteur partenaire · {feature.place}
            </p>
            <h2
              id={titleId}
              className="font-display text-3xl sm:text-4xl font-semibold text-foreground"
            >
              {feature.name}
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              {feature.intro.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild size="lg" className="rounded-[10px] gap-2">
                <Link href={`/producteurs/${feature.slug}`}>
                  Découvrir {feature.shopQuery}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              {products.length > 0 && (
                <Button asChild variant="outline" size="lg" className="rounded-[10px]">
                  <Link href={`/?q=${encodeURIComponent(feature.shopQuery)}#catalogue`}>
                    Voir ses cuvées en boutique
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <ul className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {cuvees.map(({ cuvee, product }) => {
              const inner = (
                <>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-border/60">
                    <Image
                      src={cuvee.image}
                      alt={`${cuvee.name} - ${feature.name}`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 50vw, 20vw"
                    />
                  </div>
                  <p className="font-display font-semibold text-[15px] text-foreground mt-2 leading-snug">
                    {cuvee.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{cuvee.origin}</p>
                </>
              )
              return (
                <li key={cuvee.image}>
                  {product ? (
                    <Link
                      href={`/produits/${product.slug}`}
                      className="block rounded-xl hover:opacity-90 transition-opacity"
                    >
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
