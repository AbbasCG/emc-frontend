import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { fetchPageAccessCatalog, findPageAccessEntry, findPageAccessEntryByRoute } from '@/api/pageAccessCatalogApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchPageAccessCatalog', () => {
  it('calls GET /admin/access-control/pages', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: { pages: [], categories: [] } } })
    await fetchPageAccessCatalog()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/access-control/pages', { skipErrorToast: true })
  })

  it('parses the Laravel { success, data: { pages, categories } } envelope into typed entries, including route_patterns', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pages: [
            {
              key: 'finance.payments',
              primary_route: '/dashboard/finance/payments',
              route_patterns: ['/dashboard/finance/payments', '/dashboard/admin/finance/payments'],
              label_ar: 'المدفوعات',
              category: 'finance',
              category_label_ar: 'المالية',
              risk_level: 'ADMIN_ONLY',
              protected: false,
              delegatable: false,
              required_permission: 'view_payments',
              department_scoped: false,
            },
          ],
          categories: [{ key: 'finance', label_ar: 'المالية' }],
        },
      },
    })

    const catalog = await fetchPageAccessCatalog()

    expect(catalog.pages).toHaveLength(1)
    expect(catalog.pages[0]).toEqual({
      key: 'finance.payments',
      primaryRoute: '/dashboard/finance/payments',
      routePatterns: ['/dashboard/finance/payments', '/dashboard/admin/finance/payments'],
      labelAr: 'المدفوعات',
      category: 'finance',
      categoryLabelAr: 'المالية',
      riskLevel: 'ADMIN_ONLY',
      protected: false,
      delegatable: false,
      requiredPermission: 'view_payments',
      departmentScoped: false,
      authenticatedBaseline: false,
    })
    expect(catalog.categories).toEqual([{ key: 'finance', labelAr: 'المالية' }])
  })

  it('always includes primaryRoute inside routePatterns even if the server omitted it there', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          pages: [
            {
              key: 'x.y',
              primary_route: '/dashboard/x',
              route_patterns: ['/dashboard/x/extra'],
              label_ar: 'x',
              category: 'operations',
              risk_level: 'ADMIN_ONLY',
            },
          ],
          categories: [],
        },
      },
    })

    const catalog = await fetchPageAccessCatalog()

    expect(catalog.pages[0]?.routePatterns).toEqual(['/dashboard/x', '/dashboard/x/extra'])
  })

  it('drops entries missing a key or primary_route instead of throwing', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          pages: [
            { key: '', primary_route: '/dashboard/x', label_ar: 'x', category: 'operations', risk_level: 'ADMIN_ONLY' },
            { key: 'x.y', primary_route: '', label_ar: 'x', category: 'operations', risk_level: 'ADMIN_ONLY' },
            null,
            'not-an-object',
          ],
          categories: [],
        },
      },
    })

    const catalog = await fetchPageAccessCatalog()

    expect(catalog.pages).toEqual([])
  })

  it('falls back to ADMIN_ONLY for an unrecognized risk_level rather than accepting an arbitrary string', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          pages: [
            {
              key: 'x.y',
              primary_route: '/dashboard/x',
              label_ar: 'x',
              category: 'operations',
              risk_level: 'NOT_A_REAL_LEVEL',
            },
          ],
          categories: [],
        },
      },
    })

    const catalog = await fetchPageAccessCatalog()

    expect(catalog.pages[0]?.riskLevel).toBe('ADMIN_ONLY')
  })

  it('returns empty pages/categories arrays (never undefined) when the payload has no data', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })

    const catalog = await fetchPageAccessCatalog()

    expect(Array.isArray(catalog.pages)).toBe(true)
    expect(Array.isArray(catalog.categories)).toBe(true)
  })
})

describe('findPageAccessEntry', () => {
  const catalog = {
    pages: [
      {
        key: 'finance.payments',
        primaryRoute: '/dashboard/finance/payments',
        routePatterns: ['/dashboard/finance/payments', '/dashboard/admin/finance/payments'],
        labelAr: 'المدفوعات',
        category: 'finance' as const,
        categoryLabelAr: 'المالية',
        riskLevel: 'ADMIN_ONLY' as const,
        protected: false,
        delegatable: false,
        requiredPermission: 'view_payments',
        departmentScoped: false,
        authenticatedBaseline: false,
      },
    ],
    categories: [],
  }

  it('looks up an entry by its stable key, not by route', () => {
    expect(findPageAccessEntry(catalog, 'finance.payments')).toBe(catalog.pages[0])
    expect(findPageAccessEntry(catalog, '/dashboard/finance/payments')).toBeUndefined()
  })
})

describe('findPageAccessEntryByRoute', () => {
  const catalog = {
    pages: [
      {
        key: 'finance.payments',
        primaryRoute: '/dashboard/finance/payments',
        routePatterns: ['/dashboard/finance/payments', '/dashboard/admin/finance/payments'],
        labelAr: 'المدفوعات',
        category: 'finance' as const,
        categoryLabelAr: 'المالية',
        riskLevel: 'ADMIN_ONLY' as const,
        protected: false,
        delegatable: false,
        requiredPermission: 'view_payments',
        departmentScoped: false,
        authenticatedBaseline: false,
      },
    ],
    categories: [],
  }

  it('resolves an alternate mount point to the owning capability', () => {
    expect(findPageAccessEntryByRoute(catalog, '/dashboard/admin/finance/payments')).toBe(catalog.pages[0])
    expect(findPageAccessEntryByRoute(catalog, '/dashboard/finance/payments')).toBe(catalog.pages[0])
    expect(findPageAccessEntryByRoute(catalog, '/dashboard/unknown')).toBeUndefined()
  })
})
