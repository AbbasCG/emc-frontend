import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import apiClient from '@/api/axios'
import { fetchPageAccessCatalog, type PageAccessCatalog } from '@/api/pageAccessCatalogApi'
import { buildSelectorRows } from '@/components/access-control/selectorRows'
import { AccessSourceBadge } from '@/components/access-control/AccessBadges'
import { EffectiveAccessPreview } from '@/components/access-control/EffectiveAccessPreview'
import type { EligiblePageEntry } from '@/api/accessControlApi'

/**
 * Phase 2G.2 — AUTHENTICATED BASELINE, frontend side.
 *
 * The UI must consume backend metadata, never a hardcoded list of page keys:
 * these tests deliberately use invented capability keys so any hardcoding in
 * the components would fail here.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const mockedApi = vi.mocked(apiClient, true)

const mockFetchEffective = vi.fn()
vi.mock('@/api/accessControlApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/accessControlApi')>('@/api/accessControlApi')
  return { ...actual, fetchUserEffectivePageAccess: (...a: unknown[]) => mockFetchEffective(...a) }
})

beforeEach(() => {
  vi.clearAllMocks()
})

/* ── Catalog client ────────────────────────────────────────────────────── */

describe('catalog client — authenticated_baseline metadata', () => {
  it('parses authenticated_baseline from the backend payload', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pages: [
            {
              key: 'personal.profile',
              primary_route: '/dashboard/profile',
              route_patterns: ['/dashboard/profile'],
              label_ar: 'الملف الشخصي',
              category: 'personal',
              category_label_ar: 'شخصي',
              risk_level: 'SAFE_DELEGATABLE',
              protected: false,
              delegatable: false,
              required_permission: null,
              department_scoped: false,
              authenticated_baseline: true,
            },
            {
              key: 'finance.dashboard',
              primary_route: '/dashboard/finance',
              route_patterns: ['/dashboard/finance'],
              label_ar: 'لوحة المالية',
              category: 'finance',
              category_label_ar: 'المالية',
              risk_level: 'ADMIN_ONLY',
              protected: false,
              delegatable: false,
              required_permission: null,
              department_scoped: false,
              authenticated_baseline: false,
            },
          ],
          categories: [],
        },
      },
    })

    const catalog = await fetchPageAccessCatalog()

    expect(catalog.pages[0].authenticatedBaseline).toBe(true)
    expect(catalog.pages[1].authenticatedBaseline).toBe(false)
  })

  it('defaults to false when the backend omits the field', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          pages: [
            {
              key: 'legacy.entry',
              primary_route: '/dashboard/legacy',
              route_patterns: ['/dashboard/legacy'],
              label_ar: 'قديم',
              category: 'operations',
              category_label_ar: 'العمليات',
              risk_level: 'SAFE_DELEGATABLE',
              protected: false,
              delegatable: false,
              required_permission: null,
              department_scoped: false,
            },
          ],
          categories: [],
        },
      },
    })

    const catalog = await fetchPageAccessCatalog()

    expect(catalog.pages[0].authenticatedBaseline).toBe(false)
  })
})

/* ── Role / Department selector rows ───────────────────────────────────── */

function catalogWith(baselineKey: string): PageAccessCatalog {
  const base = {
    routePatterns: [] as string[],
    labelAr: 'صفحة',
    category: 'operations' as const,
    categoryLabelAr: 'العمليات',
    riskLevel: 'SAFE_DELEGATABLE' as const,
    protected: false,
    delegatable: true,
    requiredPermission: null,
    departmentScoped: false,
    authenticatedBaseline: false,
  }
  return {
    pages: [
      { ...base, key: baselineKey, primaryRoute: '/dashboard/x', labelAr: 'صفحة أساسية', authenticatedBaseline: true },
      { ...base, key: 'ordinary.page', primaryRoute: '/dashboard/y', labelAr: 'صفحة عادية' },
      {
        ...base,
        key: 'blocked.page',
        primaryRoute: '/dashboard/z',
        labelAr: 'صفحة محجوبة',
        riskLevel: 'SYSTEM_PROTECTED' as const,
        protected: true,
        delegatable: false,
      },
    ],
    categories: [],
  }
}

const eligible: EligiblePageEntry[] = [
  { key: 'made.up.baseline', labelAr: 'صفحة أساسية', category: 'operations', categoryLabelAr: 'العمليات', riskLevel: 'SAFE_DELEGATABLE', departmentScoped: false, delegatable: true },
  { key: 'ordinary.page', labelAr: 'صفحة عادية', category: 'operations', categoryLabelAr: 'العمليات', riskLevel: 'SAFE_DELEGATABLE', departmentScoped: false, delegatable: true },
]

describe('buildSelectorRows — baseline is inherited, not editable', () => {
  it('locks a baseline row when a baseline reason is supplied (Role / Department editors)', () => {
    const rows = buildSelectorRows(
      catalogWith('made.up.baseline'),
      eligible,
      'غير مؤهلة',
      'متاح لجميع المستخدمين المسجلين — لا يُدار من هنا.',
    )

    const baseline = rows.find((r) => r.key === 'made.up.baseline')!
    expect(baseline.locked).toBe(true)
    expect(baseline.lockedReasonAr).toBe('متاح لجميع المستخدمين المسجلين — لا يُدار من هنا.')
  })

  it('leaves the baseline row EDITABLE when no baseline reason is supplied (User override editor)', () => {
    const rows = buildSelectorRows(catalogWith('made.up.baseline'), eligible, 'غير مؤهلة')

    const baseline = rows.find((r) => r.key === 'made.up.baseline')!
    // Phase 2G.2 did not change per-user ALLOW/DENY semantics.
    expect(baseline.locked).toBe(false)
    expect(baseline.lockedReasonAr).toBeUndefined()
  })

  it('does not affect ordinary eligible rows', () => {
    const rows = buildSelectorRows(catalogWith('made.up.baseline'), eligible, 'غير مؤهلة', 'أساسية')

    const ordinary = rows.find((r) => r.key === 'ordinary.page')!
    expect(ordinary.locked).toBe(false)
  })

  it('still reports an ineligible row with the ineligibility reason, not the baseline one', () => {
    const rows = buildSelectorRows(catalogWith('made.up.baseline'), eligible, 'غير مؤهلة', 'أساسية')

    const blocked = rows.find((r) => r.key === 'blocked.page')!
    expect(blocked.locked).toBe(true)
    expect(blocked.lockedReasonAr).toBe('غير مؤهلة')
  })

  it('reads baseline from metadata, not from a hardcoded key list', () => {
    // A completely invented key: if the component hardcoded the six real keys,
    // this row would not be locked.
    const rows = buildSelectorRows(catalogWith('totally.invented.key'), [], 'غير مؤهلة', 'أساسية')

    expect(rows.find((r) => r.key === 'totally.invented.key')!.locked).toBe(true)
  })
})

/* ── Provenance badge ──────────────────────────────────────────────────── */

describe('AccessSourceBadge — authenticated baseline provenance', () => {
  it('renders the Arabic baseline label from its own source style', () => {
    render(<AccessSourceBadge source="authenticated_baseline" />)
    expect(screen.getByText('متاح لجميع المستخدمين المسجلين')).toBeInTheDocument()
  })

  it('prefers the backend-supplied label', () => {
    render(<AccessSourceBadge source="authenticated_baseline" labelAr="من الخادم" />)
    expect(screen.getByText('من الخادم')).toBeInTheDocument()
  })

  it('does not render it as a role or department source', () => {
    render(<AccessSourceBadge source="authenticated_baseline" />)
    expect(screen.queryByText('من الدور')).not.toBeInTheDocument()
    expect(screen.queryByText('من الإدارة')).not.toBeInTheDocument()
  })
})

/* ── Effective preview ─────────────────────────────────────────────────── */

describe('EffectiveAccessPreview — authenticated baseline row', () => {
  it('shows the baseline page as allowed with authenticated provenance', async () => {
    mockFetchEffective.mockResolvedValue({
      user: { id: 7, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      allowedKeys: ['personal.profile'],
      pages: [
        {
          key: 'personal.profile',
          allowed: true,
          primarySource: 'authenticated_baseline' as const,
          primarySourceLabelAr: 'متاح لجميع المستخدمين المسجلين',
          sources: ['authenticated_baseline' as const],
          overrideState: null,
          protected: false,
          reason: 'authenticated_baseline',
          labelAr: 'الملف الشخصي',
          category: 'personal' as const,
          categoryLabelAr: 'شخصي',
          riskLevel: 'SAFE_DELEGATABLE' as const,
        },
      ],
    })

    render(<EffectiveAccessPreview userId={7} userName="سارة" />)

    await waitFor(() => expect(screen.getByText('الملف الشخصي')).toBeInTheDocument())

    const row = screen.getByText('الملف الشخصي').closest('li') as HTMLElement
    expect(within(row).getByText('مسموحة')).toBeInTheDocument()
    expect(within(row).getAllByText('متاح لجميع المستخدمين المسجلين').length).toBeGreaterThan(0)
  })

  it('shows a user DENY overriding a baseline page, with the baseline still visible as inherited', async () => {
    mockFetchEffective.mockResolvedValue({
      user: { id: 7, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      allowedKeys: [],
      pages: [
        {
          key: 'operations.tickets',
          allowed: false,
          primarySource: 'user_deny' as const,
          primarySourceLabelAr: 'محجوبة بشكل خاص',
          sources: ['authenticated_baseline' as const],
          overrideState: 'deny' as const,
          protected: false,
          reason: 'user_deny',
          labelAr: 'تذاكر EMC',
          category: 'operations' as const,
          categoryLabelAr: 'العمليات',
          riskLevel: 'SAFE_DELEGATABLE' as const,
        },
      ],
    })

    render(<EffectiveAccessPreview userId={7} userName="سارة" />)

    await waitFor(() => expect(screen.getByText('تذاكر EMC')).toBeInTheDocument())

    const row = screen.getByText('تذاكر EMC').closest('li') as HTMLElement
    expect(within(row).getByText('غير مسموحة')).toBeInTheDocument()
    expect(within(row).getByText('استثناء: محجوب')).toBeInTheDocument()
  })
})
