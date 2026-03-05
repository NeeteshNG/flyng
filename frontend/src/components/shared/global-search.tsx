import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Plane,
  Package,
  ShoppingCart,
  Briefcase,
  Battery,
  Layers,
  Box,
  Search,
  Clock,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { useGlobalSearch } from '@/hooks/use-global-search'

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Plane,
  Package,
  ShoppingCart,
  Briefcase,
  Battery,
  Layers,
  Box,
}

const QUICK_NAV = [
  { label: 'Warehouses', icon: Building2, route: '/dashboard/warehouses' },
  { label: 'Drones', icon: Plane, route: '/dashboard/drones' },
  { label: 'Inventory Items', icon: Package, route: '/dashboard/items' },
  { label: 'Orders', icon: ShoppingCart, route: '/dashboard/orders' },
  { label: 'Jobs', icon: Briefcase, route: '/dashboard/jobs' },
  { label: 'Batteries', icon: Battery, route: '/dashboard/batteries' },
]

export function GlobalSearch() {
  const navigate = useNavigate()
  const {
    open,
    setOpen,
    query,
    setQuery,
    isLoading,
    isFetching,
    results,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useGlobalSearch()

  const handleSelect = (route: string) => {
    if (query) addRecentSearch(query)
    setOpen(false)
    navigate(route)
  }

  const handleViewAll = (route: string) => {
    addRecentSearch(query)
    setOpen(false)
    navigate(`${route}?search=${encodeURIComponent(query)}`)
  }

  const showEmptyState = query.length < 2 && !isLoading
  const showResults = !isLoading && query.length >= 2 && results.length > 0
  const showNoResults = !isLoading && query.length >= 2 && results.length === 0

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-64 sm:w-80 lg:w-96 flex items-center gap-2 h-10 rounded-md border-0 bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Palette */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search warehouses, drones, items, orders..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {/* Empty query: recent searches + quick nav */}
          {showEmptyState && (
            <>
              {recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((recent) => (
                    <CommandItem
                      key={recent}
                      value={`recent-${recent}`}
                      onSelect={() => setQuery(recent)}
                    >
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{recent}</span>
                    </CommandItem>
                  ))}
                  <CommandItem
                    value="clear-recent-searches"
                    onSelect={clearRecentSearches}
                    className="text-muted-foreground"
                  >
                    <X className="mr-2 h-4 w-4" />
                    <span>Clear recent searches</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {recentSearches.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Quick Navigation">
                {QUICK_NAV.map((item) => (
                  <CommandItem
                    key={item.route}
                    value={`nav-${item.label}`}
                    onSelect={() => handleSelect(item.route)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* No results */}
          {showNoResults && (
            <CommandEmpty>
              No results found for &ldquo;{query}&rdquo;. Try a different search term.
            </CommandEmpty>
          )}

          {/* Search results grouped by type */}
          {showResults &&
            results.map((group) => {
              const IconComponent = ICON_MAP[group.icon] || Package
              return (
                <CommandGroup
                  key={group.label}
                  heading={
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="h-3.5 w-3.5" />
                        <span>{group.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        {group.totalCount} result{group.totalCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  }
                >
                  {group.results.map((result) => (
                    <CommandItem
                      key={`${result.resourceType}-${result.uuid}`}
                      value={`${result.resourceType}-${result.title}-${result.subtitle}`}
                      onSelect={() => handleSelect(result.route)}
                    >
                      <IconComponent className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{result.title}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                  {group.totalCount > group.results.length && (
                    <CommandItem
                      value={`view-all-${group.label}`}
                      onSelect={() => handleViewAll(group.route)}
                      className="text-primary"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      <span>
                        View all {group.totalCount} {group.label.toLowerCase()}
                      </span>
                    </CommandItem>
                  )}
                </CommandGroup>
              )
            })}

          {/* Subtle refetch indicator */}
          {isFetching && !isLoading && query.length >= 2 && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="ml-1 text-xs text-muted-foreground">Updating...</span>
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
