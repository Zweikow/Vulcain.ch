/**
 * Anti-brute force protection module
 * Tracks failed login attempts and blocks IPs/accounts after too many failures
 */

interface AttemptRecord {
  count: number
  firstAttempt: number
  lastAttempt: number
  blocked: boolean
  blockedUntil?: number
}

// In-memory store (use Redis in production for multi-instance deployments)
const ipAttempts = new Map<string, AttemptRecord>()
const accountAttempts = new Map<string, AttemptRecord>()

// Configuration
const config = {
  maxAttemptsBeforeBlock: 10,        // Block after 10 failed attempts
  blockDurationMs: 30 * 60 * 1000,   // Block for 30 minutes
  attemptWindowMs: 60 * 60 * 1000,   // Reset attempts after 1 hour of no attempts
  ipMaxAttempts: 20,                 // IP blocked after 20 attempts (regardless of account)
}

function getRecord(store: Map<string, AttemptRecord>, key: string): AttemptRecord {
  const now = Date.now()
  let record = store.get(key)
  
  if (!record) {
    record = { count: 0, firstAttempt: now, lastAttempt: now, blocked: false }
    store.set(key, record)
    return record
  }
  
  // Check if block has expired
  if (record.blocked && record.blockedUntil && now > record.blockedUntil) {
    record.blocked = false
    record.blockedUntil = undefined
    record.count = 0
    record.firstAttempt = now
  }
  
  // Reset if last attempt was too long ago
  if (now - record.lastAttempt > config.attemptWindowMs) {
    record.count = 0
    record.firstAttempt = now
    record.blocked = false
    record.blockedUntil = undefined
  }
  
  return record
}

export function checkBruteForce(ip: string, identifier: string): { 
  allowed: boolean
  reason?: string
  remainingAttempts?: number
  blockedUntil?: Date
} {
  const now = Date.now()
  
  // Check IP-based blocking
  const ipRecord = getRecord(ipAttempts, ip)
  if (ipRecord.blocked) {
    return {
      allowed: false,
      reason: 'Trop de tentatives depuis cette adresse IP',
      blockedUntil: ipRecord.blockedUntil ? new Date(ipRecord.blockedUntil) : undefined,
    }
  }
  
  // Check account-based blocking
  const accountRecord = getRecord(accountAttempts, identifier.toLowerCase())
  if (accountRecord.blocked) {
    return {
      allowed: false,
      reason: 'Ce compte est temporairement bloqué suite à trop de tentatives échouées',
      blockedUntil: accountRecord.blockedUntil ? new Date(accountRecord.blockedUntil) : undefined,
    }
  }
  
  const remainingAccount = config.maxAttemptsBeforeBlock - accountRecord.count
  const remainingIp = config.ipMaxAttempts - ipRecord.count
  
  return {
    allowed: true,
    remainingAttempts: Math.min(remainingAccount, remainingIp),
  }
}

export function recordFailedAttempt(ip: string, identifier: string): {
  accountBlocked: boolean
  ipBlocked: boolean
  remainingAttempts: number
} {
  const now = Date.now()
  
  // Update IP record
  const ipRecord = getRecord(ipAttempts, ip)
  ipRecord.count++
  ipRecord.lastAttempt = now
  
  if (ipRecord.count >= config.ipMaxAttempts) {
    ipRecord.blocked = true
    ipRecord.blockedUntil = now + config.blockDurationMs
  }
  
  // Update account record
  const accountRecord = getRecord(accountAttempts, identifier.toLowerCase())
  accountRecord.count++
  accountRecord.lastAttempt = now
  
  if (accountRecord.count >= config.maxAttemptsBeforeBlock) {
    accountRecord.blocked = true
    accountRecord.blockedUntil = now + config.blockDurationMs
  }
  
  const remainingAccount = Math.max(0, config.maxAttemptsBeforeBlock - accountRecord.count)
  const remainingIp = Math.max(0, config.ipMaxAttempts - ipRecord.count)
  
  return {
    accountBlocked: accountRecord.blocked,
    ipBlocked: ipRecord.blocked,
    remainingAttempts: Math.min(remainingAccount, remainingIp),
  }
}

export function recordSuccessfulLogin(ip: string, identifier: string): void {
  // Reset both IP and account attempts on successful login
  ipAttempts.delete(ip)
  accountAttempts.delete(identifier.toLowerCase())
}

export function getBlockStatus(identifier: string): {
  blocked: boolean
  attempts: number
  blockedUntil?: Date
} {
  const record = accountAttempts.get(identifier.toLowerCase())
  if (!record) {
    return { blocked: false, attempts: 0 }
  }
  
  return {
    blocked: record.blocked,
    attempts: record.count,
    blockedUntil: record.blockedUntil ? new Date(record.blockedUntil) : undefined,
  }
}
