import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type OrderLimiter = { limit: (id: string) => Promise<{ success: boolean }> }

function createLimiter(
  prefix: string,
  tokens: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1]
): OrderLimiter {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    // Sans Upstash : bloquant en production uniquement, permissif en dev/sandbox.
    if (process.env.NEXT_PUBLIC_STAGE === 'production') {
      throw new Error(
        'UPSTASH_REDIS_REST_URL manquant : le rate limiting est obligatoire en production.'
      )
    }
    console.warn('Upstash non configuré : rate limiting désactivé (hors production).')
    return { limit: async () => ({ success: true }) }
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
    analytics: false,
  })
}

// Lazy initialization to avoid build-time errors when env vars are not set
let _ratelimit: OrderLimiter | null = null
let _paymentRatelimit: OrderLimiter | null = null

export function getOrderRatelimit(): OrderLimiter {
  if (!_ratelimit) _ratelimit = createLimiter('ratelimit:order', 5, '10 m')
  return _ratelimit
}

/** Nouvelles tentatives de paiement en ligne : budget distinct de la prise de commande. */
export function getPaymentRatelimit(): OrderLimiter {
  if (!_paymentRatelimit) _paymentRatelimit = createLimiter('ratelimit:payment', 10, '10 m')
  return _paymentRatelimit
}
