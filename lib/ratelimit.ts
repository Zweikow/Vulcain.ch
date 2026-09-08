import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type OrderLimiter = { limit: (id: string) => Promise<{ success: boolean }> }

// Lazy initialization to avoid build-time errors when env vars are not set
let _ratelimit: OrderLimiter | null = null

export function getOrderRatelimit(): OrderLimiter {
  if (!_ratelimit) {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      // Sans Upstash : bloquant en production uniquement, permissif en dev/sandbox.
      if (process.env.NEXT_PUBLIC_STAGE === 'production') {
        throw new Error(
          'UPSTASH_REDIS_REST_URL manquant : le rate limiting est obligatoire en production.'
        )
      }
      console.warn('Upstash non configuré — rate limiting désactivé (hors production).')
      _ratelimit = { limit: async () => ({ success: true }) }
    } else {
      _ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, '10 m'),
        prefix: 'ratelimit:order',
        analytics: false,
      })
    }
  }
  return _ratelimit
}
