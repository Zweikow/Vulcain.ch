import { Product } from '@/types'
import { getSiteUrl, SITE_CONFIG } from '@/lib/site'

interface JsonLdProps {
  products?: Product[]
}

export default function JsonLd({ products }: JsonLdProps) {
  const siteUrl = getSiteUrl()

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Winery',
    '@id': `${siteUrl}/#winery`,
    name: SITE_CONFIG.name,
    alternateName: [SITE_CONFIG.legalName, 'Drinkcider.ch'],
    description: SITE_CONFIG.description,
    url: siteUrl,
    logo: `${siteUrl}/facture/logo-drinkcider.png`,
    image: `${siteUrl}/facture/logo-drinkcider.png`,
    priceRange: '$$',
    currenciesAccepted: 'CHF',
    paymentAccepted: 'QR-Facture, Virement bancaire',
    founder: {
      '@type': 'Person',
      name: SITE_CONFIG.producer,
    },
    parentOrganization: {
      '@type': 'Organization',
      name: SITE_CONFIG.legalName,
      description: SITE_CONFIG.distributorDescription,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.address.street,
      postalCode: SITE_CONFIG.address.postalCode,
      addressLocality: SITE_CONFIG.address.city,
      addressRegion: SITE_CONFIG.address.region,
      addressCountry: SITE_CONFIG.address.country,
    },
  }

  const productListSchema =
    products && products.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              name: product.name,
              description: product.description || product.name,
              image: product.image
                ? product.image.startsWith('http')
                  ? product.image
                  : `${siteUrl}${product.image}`
                : `${siteUrl}/facture/logo-drinkcider.png`,
              brand: {
                '@type': 'Brand',
                name: product.producerName || SITE_CONFIG.name,
              },
              offers: {
                '@type': 'Offer',
                priceCurrency: 'CHF',
                price: (product.priceCents / 100).toFixed(2),
                availability:
                  product.stock > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
                seller: {
                  '@type': 'Organization',
                  name: SITE_CONFIG.legalName,
                },
              },
            },
          })),
        }
      : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {productListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productListSchema) }}
        />
      )}
    </>
  )
}
