import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { globalSearch, type GlobalSearchResponse } from '@/api/endpoints/search'
import { STORAGE_KEYS } from '@/lib/storage'

const DEBOUNCE_MS = 300
const MAX_RECENT_SEARCHES = 5

export function useGlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounce the query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  // React Query for search results
  const { data, isLoading, isFetching } = useQuery<GlobalSearchResponse>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Recent searches
  const getRecentSearches = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }, [])

  const addRecentSearch = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim()
      if (!trimmed || trimmed.length < 2) return
      const recent = getRecentSearches().filter((s) => s !== trimmed)
      recent.unshift(trimmed)
      localStorage.setItem(
        STORAGE_KEYS.RECENT_SEARCHES,
        JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES))
      )
    },
    [getRecentSearches]
  )

  const clearRecentSearches = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES)
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [open])

  return {
    open,
    setOpen,
    query,
    setQuery,
    isLoading: isLoading && debouncedQuery.length >= 2,
    isFetching,
    results: data?.groups || [],
    totalResults: data?.totalResults || 0,
    recentSearches: getRecentSearches(),
    addRecentSearch,
    clearRecentSearches,
  }
}
