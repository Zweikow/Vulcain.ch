import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

import { getSiteUrl, SITE_CONFIG } from '@/lib/site'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_CONFIG.title,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: SITE_CONFIG.keywords,
  authors: [{ name: SITE_CONFIG.producer }, { name: SITE_CONFIG.legalName }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.legalName,
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CH',
    url: siteUrl,
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: [
      {
        url: '/facture/logo-vulcain.png',
        width: 800,
        height: 600,
        alt: `${SITE_CONFIG.name} — ${SITE_CONFIG.legalName}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: ['/facture/logo-vulcain.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: '/facture/logo-vulcain.png',
    apple: '/facture/logo-vulcain.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F7F6F0" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0D1B2A" />
        <meta name="theme-color" content="#F7F6F0" />
        <Script id="theme-init" strategy="beforeInteractive" src="/scripts/theme-init.js" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
