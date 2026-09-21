import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { HeroUIProviderWrapper } from '@/components/HeroUIProviderWrapper'

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
  authors: [
    { name: SITE_CONFIG.producer },
    { name: SITE_CONFIG.distributor },
    { name: SITE_CONFIG.legalName },
  ],
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
        url: '/facture/logo-drinkcider.png',
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
    images: ['/facture/logo-drinkcider.png'],
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
    icon: '/facture/logo-drinkcider.png',
    apple: '/facture/logo-drinkcider.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" content="darkreader-lock" />
        <meta name="color-scheme" content="light" id="meta-color-scheme" />
        <meta name="supported-color-schemes" content="light dark" />
        <meta name="theme-color" content="#F7F6F0" id="meta-theme-color" />
        <script
          id="theme-init-inline"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var t=s||p;var r=document.documentElement;var m=document.getElementById('meta-color-scheme');var tc=document.getElementById('meta-theme-color');if(t==='dark'){r.classList.add('dark');r.style.colorScheme='dark';if(m)m.content='dark';if(tc)tc.content='#0D1B2A';}else{r.classList.remove('dark');r.style.colorScheme='light';if(m)m.content='light';if(tc)tc.content='#F7F6F0';}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <HeroUIProviderWrapper>{children}</HeroUIProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
