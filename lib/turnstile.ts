export async function verifyTurnstileToken(token: string): Promise<boolean> {
  // 1. En environnement hors production (sandbox / dev / local) :
  // Si c'est le token de simulation sandbox, on valide immédiatement !
  if (process.env.NEXT_PUBLIC_STAGE !== 'production') {
    if (token === 'sandbox-dummy-token' || !process.env.TURNSTILE_SECRET_KEY) {
      console.info('[SANDBOX] Validation Turnstile acceptée automatiquement pour le test.')
      return true
    }
  }

  if (!token) return false
  if (!process.env.TURNSTILE_SECRET_KEY) {
    console.error('TURNSTILE_SECRET_KEY is not set')
    return false
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })

    if (!response.ok) {
      if (process.env.NEXT_PUBLIC_STAGE !== 'production') return true
      return false
    }
    const data = await response.json()
    if (!data.success && process.env.NEXT_PUBLIC_STAGE !== 'production') {
      console.warn('[SANDBOX] Cloudflare rejeté sur token, mais accepté car en sandbox:', data)
      return true
    }
    return data.success === true
  } catch (err) {
    console.error('Erreur appel Turnstile:', err)
    if (process.env.NEXT_PUBLIC_STAGE !== 'production') return true
    return false
  }
}
