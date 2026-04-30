import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const orderRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'ratelimit:order',
  analytics: false,
})
