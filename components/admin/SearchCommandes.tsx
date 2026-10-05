'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function SearchCommandes() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) {
      params.set('q', debouncedSearch)
    } else {
      params.delete('q')
    }
    router.push(`/admin/commandes?${params.toString()}`)
  }, [debouncedSearch, router])

  return (
    <input
      type="text"
      placeholder="Rechercher (N°, client, email)..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="input-field w-64 text-sm"
    />
  )
}
