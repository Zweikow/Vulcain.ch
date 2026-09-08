export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!token) return false
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (process.env.NEXT_PUBLIC_STAGE !== 'production') {
      console.warn('TURNSTILE_SECRET_KEY manquant — validation contournée (hors production)')
      return true
    }
    console.error('TURNSTILE_SECRET_KEY is not set')
    return false
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  })

  if (!response.ok) return false
  const data = await response.json()
  return data.success === true
}
