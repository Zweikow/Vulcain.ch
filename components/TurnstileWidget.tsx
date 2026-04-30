'use client'

import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile: {
      render: (el: HTMLElement, opts: object) => string
      remove: (id: string) => void
      reset: (id: string) => void
    }
    onTurnstileLoad: () => void
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      callback: onToken,
      size: 'invisible',
    })
  }, [onToken])

  useEffect(() => {
    if (window.turnstile) {
      renderWidget()
      return
    }

    window.onTurnstileLoad = renderWidget
    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    document.head.appendChild(script)

    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
    }
  }, [renderWidget])

  return <div ref={containerRef} />
}
