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
    let domain
    if ($app.stage === 'production') {
      domain = 'production.cidrerie-vulcain.ch' // À terme, on mettra "cidrerie-vulcain.ch"
    } else if ($app.stage === 'sandbox') {
      domain = 'sandbox.cidrerie-vulcain.ch'
    } else if ($app.stage === 'dev') {
      domain = 'dev.cidrerie-vulcain.ch'
    }

    // 3. Application Next.js avec OpenNext
    const site = new sst.aws.Nextjs('CidrerieSite', {
      domain: domain,
      link: [photosBucket], // Lie le bucket au site pour générer l'accès sécurisé
      permissions: [
        {
          actions: ['ses:SendEmail', 'ses:SendRawEmail'],
          resources: ['*'],
        },
      ],
      environment: {
        DATABASE_URL: process.env.DATABASE_URL || '',
        AUTH_SECRET: process.env.AUTH_SECRET || '',
        MAIL_FROM: process.env.MAIL_FROM || 'commandes@cidrerie-vulcain.ch',
        SES_REGION: process.env.SES_REGION || 'eu-central-2',
        ADMIN_BASE_URL: process.env.ADMIN_BASE_URL || '',
        TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
        AUTH_TRUST_HOST: 'true',
        AUTH_URL: domain ? `https://${domain}` : '',
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
