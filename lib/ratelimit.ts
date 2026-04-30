import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Lazy initialization to avoid build-time errors when env vars are not set
let _ratelimit: Ratelimit | null = null

export function getOrderRatelimit(): Ratelimit {
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'ratelimit:order',
      analytics: false,
    })
  }
  return _ratelimit
}
