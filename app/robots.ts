import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  const stage = process.env.NEXT_PUBLIC_STAGE || 'dev'
  const isProd = stage === 'production' || stage === 'prod'

  // Sur les environnements hors production (dev.drinkcider.ch, sandbox.drinkcider.ch, etc.), on interdit totalement l'indexation
  if (!isProd) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api', '/api/*'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
