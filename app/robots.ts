import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  const isDev = process.env.NEXT_PUBLIC_STAGE === 'dev'

  // Sur l'environnement de développement (dev.cidrerie-vulcain.ch), on interdit totalement l'indexation
  if (isDev) {
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
