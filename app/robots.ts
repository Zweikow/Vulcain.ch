import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  const stage = process.env.NEXT_PUBLIC_STAGE || 'dev'
  const isProd = stage === 'production' || stage === 'prod'

  // Tout environnement qui n'est pas explicitement la production reste en Disallow: /
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
        disallow: ['/admin', '/admin/*', '/api', '/api/*', '/login'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
