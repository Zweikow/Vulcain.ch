const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

// Date d'expiration HTTP/1.0 1 an dans le futur pour les en-têtes Expires exigés par les analyseurs SEO
const expiresHeader = new Date(Date.now() + 31536000 * 1000).toUTCString()

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.cidrerie-vulcain.ch' }],
        destination: 'https://cidrerie-vulcain.ch/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.sandbox.cidrerie-vulcain.ch' }],
        destination: 'https://sandbox.cidrerie-vulcain.ch/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.production.cidrerie-vulcain.ch' }],
        destination: 'https://production.cidrerie-vulcain.ch/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.dev.cidrerie-vulcain.ch' }],
        destination: 'https://dev.cidrerie-vulcain.ch/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.vulcain.ch' }],
        destination: 'https://vulcain.ch/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|gif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Expires',
            value: expiresHeader,
          },
        ],
      },
      {
        source: '/facture/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Expires',
            value: expiresHeader,
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Expires',
            value: expiresHeader,
          },
        ],
      },
    ]
  },
  images: {
    unoptimized: true,
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.eu-central-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.eu-central-2.amazonaws.com',
      },
    ],
  },
}

module.exports = nextConfig
