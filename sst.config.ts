/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'cidrerie-vulcain',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          region: 'eu-central-1', // Francfort (eu-central-2 Zurich n'est pas encore 100% supporté par SST/Next.js)
        },
      },
    }
  },
  async run() {
    const photosBucket = new sst.aws.Bucket('PhotosBucket', {
      access: 'public', // Permet la lecture publique des images
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        allowHeaders: ['*'],
      },
    })

    // 2. Configuration du domaine selon l'environnement (Stage)
    let domain: { name: string; redirects?: string[] } | undefined
    if ($app.stage === 'production') {
      domain = {
        name: 'drinkcider.ch',
        redirects: ['www.drinkcider.ch'],
      }
    } else if ($app.stage === 'sandbox') {
      domain = {
        name: 'sandbox.drinkcider.ch',
        redirects: ['www.sandbox.drinkcider.ch'],
      }
    } else if ($app.stage === 'dev') {
      domain = {
        name: 'dev.drinkcider.ch',
        redirects: ['www.dev.drinkcider.ch'],
      }
    }

    // 3. Application Next.js avec OpenNext
    const site = new sst.aws.Nextjs('CidrerieSite', {
      domain: domain,
      link: [photosBucket], // Lie le bucket au site pour générer l'accès sécurisé
      assets: {
        fileOptions: [
          {
            files: [
              '**/*.png',
              '**/*.jpg',
              '**/*.jpeg',
              '**/*.webp',
              '**/*.avif',
              '**/*.svg',
              '**/*.ico',
              '**/*.gif',
              '**/*.woff',
              '**/*.woff2',
            ],
            cacheControl: 'public,max-age=31536000,immutable',
          },
        ],
      },
      permissions: [
        {
          actions: ['ses:SendEmail', 'ses:SendRawEmail'],
          resources: ['*'],
        },
      ],
      environment: {
        DATABASE_URL: process.env.DATABASE_URL || '',
        AUTH_SECRET: process.env.AUTH_SECRET || '',
        INSTAGRAM_RENDER_SECRET: process.env.INSTAGRAM_RENDER_SECRET || '',
        MAIL_FROM: process.env.MAIL_FROM || 'commandes@drinkcider.ch',
        SES_REGION: process.env.SES_REGION || 'eu-central-2',
        ADMIN_BASE_URL: process.env.ADMIN_BASE_URL || '',
        TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
        AUTH_TRUST_HOST: 'true',
        AUTH_URL: domain ? `https://${domain.name}` : '',
        NEXT_PUBLIC_COMMIT_SHA:
          process.env.CI_COMMIT_SHORT_SHA || process.env.NEXT_PUBLIC_COMMIT_SHA || '',
        NEXT_PUBLIC_STAGE: $app.stage,
      },
    })

    return {
      bucketName: photosBucket.name,
      siteUrl: site.url,
    }
  },
})
