import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  let dbStatus = 'healthy'
  let dbLatencyMs = 0

  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbStart
  } catch {
    dbStatus = 'unreachable'
  }

  const isHealthy = dbStatus === 'healthy'
  const statusCode = isHealthy ? 200 : 503

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'cidrerie-vulcain',
      stage: process.env.NEXT_PUBLIC_STAGE || process.env.NODE_ENV || 'unknown',
      commit: process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown',
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      uptime: process.uptime(),
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}
