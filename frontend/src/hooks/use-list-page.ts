/**
 * useListPage hook for FlyNG.
 *
 * Provides reusable state management for list pages with:
 * - Search
 * - Filters
 * - Pagination
 * - Form sheet (add/edit)
 * - Detail sheet (view)
 *
 * Reduces 50+ lines of boilerplate in each list page.
 */

import { useState, useCallback, useMemo } from 'react'

interface UseListPageOptions {
  /**
   * Default page size
   */
  pageSize?: number

  /**
   * Initial filter values
   */
  initialFilters?: Record<string, string>
}

interface UseListPageReturn<T> {
  // Search
  search: string
  setSearch: (value: string) => void

  // Pagination
  page: number
  setPage: (page: number) => void
  pageSize: number

  // Filters
  filters: Record<string, string>
  setFilter: (key: string, value: string) => void
  clearFilters: () => void
  hasActiveFilters: boolean

  // Form sheet (add/edit)
  formOpen: boolean
  setFormOpen: (open: boolean) => void
  selectedItem: T | null
  handleAdd: () => void
  handleEdit: (item: T) => void

  // Detail sheet (view)
  detailOpen: boolean
  setDetailOpen: (open: boolean) => void
  handleView: (item: T) => void

  // Query params builder
  getQueryParams: () => Record<string, unknown>
}

/**
 * Hook for managing list page state.
 *
 * @example
 * ```tsx
 * const {
 *   search,
 *   setSearch,
 *   page,
 *   setPage,
 *   filters,
 *   setFilter,
 *   clearFilters,
 *   hasActiveFilters,
 *   formOpen,
 *   setFormOpen,
 *   selectedItem,
 *   handleAdd,
 *   handleEdit,
 *   detailOpen,
 *   setDetailOpen,
 *   handleView,
 *   getQueryParams,
 * } = useListPage<Warehouse>({ pageSize: 20 })
 *
 * const { data, isLoading } = useQuery({
 *   queryKey: ['warehouses', search, filters, page],
 *   queryFn: () => api.getWarehouses(getQueryParams()),
 * })
 * ```
 */
export function useListPage<T>({
  pageSize = 20,
  initialFilters = {},
}: UseListPageOptions = {}): UseListPageReturn<T> {
  // Search
  const [search, setSearchState] = useState('')

  // Pagination
  const [page, setPage] = useState(1)

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters)

  // Form sheet state
  const [formOpen, setFormOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)

  // Detail sheet state
  const [detailOpen, setDetailOpen] = useState(false)

  // Reset page when search changes
  const setSearch = useCallback((value: string) => {
    setSearchState(value)
    setPage(1)
  }, [])

  // Set a single filter
  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  // Clear all filters and search
  const clearFilters = useCallback(() => {
    setSearchState('')
    setFilters(initialFilters)
    setPage(1)
  }, [initialFilters])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    if (search) return true
    return Object.entries(filters).some(
      ([key, value]) => value !== 'all' && value !== '' && value !== initialFilters[key]
    )
  }, [search, filters, initialFilters])

  // Form handlers
  const handleAdd = useCallback(() => {
    setSelectedItem(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((item: T) => {
    setSelectedItem(item)
    setFormOpen(true)
  }, [])

  // Detail handlers
  const handleView = useCallback((item: T) => {
    setSelectedItem(item)
    setDetailOpen(true)
  }, [])

  // Build query params for API call
  const getQueryParams = useCallback(() => {
    const params: Record<string, unknown> = {
      page,
      page_size: pageSize,
    }

    if (search) {
      params.search = search
    }

    // Add filters, excluding 'all' values
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params[key] = value
      }
    })

    return params
  }, [page, pageSize, search, filters])

  return {
    // Search
    search,
    setSearch,

    // Pagination
    page,
    setPage,
    pageSize,

    // Filters
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,

    // Form sheet
    formOpen,
    setFormOpen,
    selectedItem,
    handleAdd,
    handleEdit,

    // Detail sheet
    detailOpen,
    setDetailOpen,
    handleView,

    // Query params
    getQueryParams,
  }
}
