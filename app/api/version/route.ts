import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    commit: process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown',
    stage: process.env.NEXT_PUBLIC_STAGE || process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
  })
}
