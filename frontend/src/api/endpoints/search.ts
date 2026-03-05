import apiClient from '../client'

export interface SearchResultItem {
  uuid: string
  title: string
  subtitle: string
  route: string
  resourceType: string
}

export interface SearchResourceGroup {
  label: string
  icon: string
  results: SearchResultItem[]
  totalCount: number
  route: string
}

export interface GlobalSearchResponse {
  groups: SearchResourceGroup[]
  totalResults: number
  query: string
}

interface SearchableResource {
  key: string
  label: string
  icon: string
  endpoint: string
  route: string
  mapResult: (item: any) => Pick<SearchResultItem, 'uuid' | 'title' | 'subtitle'>
}

const SEARCHABLE_RESOURCES: SearchableResource[] = [
  {
    key: 'warehouses',
    label: 'Warehouses',
    icon: 'Building2',
    endpoint: '/warehouses/',
    route: '/dashboard/warehouses',
    mapResult: (w) => ({
      uuid: w.uuid,
      title: w.name,
      subtitle: [w.code, w.city, w.state].filter(Boolean).join(' - '),
    }),
  },
  {
    key: 'drones',
    label: 'Drones',
    icon: 'Plane',
    endpoint: '/drones/',
    route: '/dashboard/drones',
    mapResult: (d) => ({
      uuid: d.uuid,
      title: d.name,
      subtitle: [d.serial_number, d.manufacturer, d.model].filter(Boolean).join(' - '),
    }),
  },
  {
    key: 'items',
    label: 'Inventory Items',
    icon: 'Package',
    endpoint: '/items/',
    route: '/dashboard/items',
    mapResult: (i) => ({
      uuid: i.uuid,
      title: i.name,
      subtitle: `SKU: ${i.sku}${i.barcode ? ` | ${i.barcode}` : ''}`,
    }),
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: 'ShoppingCart',
    endpoint: '/orders/',
    route: '/dashboard/orders',
    mapResult: (o) => ({
      uuid: o.uuid,
      title: `Order ${o.order_number}`,
      subtitle: [o.customer_name, o.status_display].filter(Boolean).join(' - '),
    }),
  },
  {
    key: 'jobs',
    label: 'Jobs',
    icon: 'Briefcase',
    endpoint: '/jobs/',
    route: '/dashboard/jobs',
    mapResult: (j) => ({
      uuid: j.uuid,
      title: `Job ${j.job_number}`,
      subtitle: [j.drone_name || 'Unassigned', j.status_display].filter(Boolean).join(' - '),
    }),
  },
  {
    key: 'batteries',
    label: 'Batteries',
    icon: 'Battery',
    endpoint: '/batteries/',
    route: '/dashboard/batteries',
    mapResult: (b) => ({
      uuid: b.uuid,
      title: b.name,
      subtitle: [b.serial_number, b.manufacturer].filter(Boolean).join(' - '),
    }),
  },
  {
    key: 'zones',
    label: 'Zones',
    icon: 'Layers',
    endpoint: '/zones/',
    route: '/dashboard/zones',
    mapResult: (z) => ({
      uuid: z.uuid,
      title: z.name,
      subtitle: [z.code, z.warehouse_name].filter(Boolean).join(' - '),
    }),
  },
  {
    key: 'bins',
    label: 'Storage Bins',
    icon: 'Box',
    endpoint: '/storage-bins/',
    route: '/dashboard/bins',
    mapResult: (b) => ({
      uuid: b.uuid,
      title: b.code,
      subtitle: [b.label_value, b.warehouse_name].filter(Boolean).join(' - '),
    }),
  },
]

const SEARCH_PAGE_SIZE = 5

export async function globalSearch(query: string): Promise<GlobalSearchResponse> {
  if (!query || query.trim().length < 2) {
    return { groups: [], totalResults: 0, query }
  }

  const promises = SEARCHABLE_RESOURCES.map(async (resource) => {
    try {
      const response = await apiClient.get(resource.endpoint, {
        params: { search: query.trim(), page_size: SEARCH_PAGE_SIZE, page: 1 },
      })
      const data = response.data
      return {
        label: resource.label,
        icon: resource.icon,
        route: resource.route,
        totalCount: data.count || 0,
        results: (data.results || []).map((item: any) => ({
          ...resource.mapResult(item),
          route: resource.route,
          resourceType: resource.key,
        })),
      } as SearchResourceGroup
    } catch {
      return {
        label: resource.label,
        icon: resource.icon,
        route: resource.route,
        totalCount: 0,
        results: [],
      } as SearchResourceGroup
    }
  })

  const settled = await Promise.allSettled(promises)
  const groups = settled
    .filter((r): r is PromiseFulfilledResult<SearchResourceGroup> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((g) => g.results.length > 0)

  const totalResults = groups.reduce((sum, g) => sum + g.totalCount, 0)

  return { groups, totalResults, query }
}
