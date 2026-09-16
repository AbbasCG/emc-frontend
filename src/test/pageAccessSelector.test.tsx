import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageAccessSelector, type PageAccessSelectorRow } from '@/components/access-control/PageAccessSelector'
import { buildSelectorRows } from '@/components/access-control/selectorRows'
import type { PageAccessCatalog } from '@/api/pageAccessCatalogApi'
import type { UserPageAccessState } from '@/api/accessControlApi'

beforeEach(() => {
  vi.clearAllMocks()
})

function row(over: Partial<PageAccessSelectorRow> = {}): PageAccessSelectorRow {
  return {
    key: 'operations.weekly_reports',
    labelAr: 'التقارير الأسبوعية',
    category: 'operations',
    categoryLabelAr: 'العمليات',
    riskLevel: 'SAFE_DELEGATABLE',
    primaryRoute: '/dashboard/operations/weekly-reports',
    routePatterns: ['/dashboard/operations/weekly-reports'],
    locked: false,
    ...over,
  }
}

const ROWS: PageAccessSelectorRow[] = [
  row(),
  row({
    key: 'operations.meeting_reports',
    labelAr: 'تقارير الاجتماعات',
    primaryRoute: '/dashboard/operations/meeting-reports',
    routePatterns: ['/dashboard/operations/meeting-reports'],
  }),
  row({
    key: 'finance.dashboard',
    labelAr: 'لوحة المالية',
    category: 'finance',
    categoryLabelAr: 'المالية',
    riskLevel: 'ADMIN_ONLY',
    primaryRoute: '/dashboard/finance',
    routePatterns: ['/dashboard/finance'],
  }),
  row({
    key: 'administration.roles',
    labelAr: 'إدارة الأدوار',
    category: 'administration',
    categoryLabelAr: 'الإدارة العامة',
    riskLevel: 'SYSTEM_PROTECTED',
    primaryRoute: '/dashboard/admin/roles',
    routePatterns: ['/dashboard/admin/roles'],
    locked: true,
    lockedReasonAr: 'محمية من النظام',
  }),
]

/* Controlled harnesses — the selector is a controlled component. */

function ToggleHarness({ initial = [] as string[], onValue }: { initial?: string[]; onValue?: (v: string[]) => void }) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <PageAccessSelector
      mode="toggle"
      rows={ROWS}
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

function TriHarness({
  initial = {},
  onValue,
}: {
  initial?: Record<string, UserPageAccessState>
  onValue?: (v: Record<string, UserPageAccessState>) => void
}) {
  const [value, setValue] = useState<Record<string, UserPageAccessState>>(initial)
  return (
    <PageAccessSelector
      mode="tristate"
      rows={ROWS}
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

describe('PageAccessSelector — catalog rendering and categories', () => {
  it('groups rows under the backend category labels', () => {
    render(<ToggleHarness />)

    expect(screen.getByText('العمليات')).toBeInTheDocument()
    expect(screen.getByText('المالية')).toBeInTheDocument()
    expect(screen.getByText('الإدارة العامة')).toBeInTheDocument()
    expect(screen.getByText('التقارير الأسبوعية')).toBeInTheDocument()
  })

  it('renders an empty state when the backend returns no rows', () => {
    render(
      <PageAccessSelector mode="toggle" rows={[]} value={[]} onChange={() => {}} emptyTitle="لا توجد صفحات" />,
    )
    expect(screen.getByText('لا توجد صفحات')).toBeInTheDocument()
  })

  it('renders a loading state instead of the list while loading', () => {
    render(<PageAccessSelector mode="toggle" rows={ROWS} value={[]} onChange={() => {}} loading />)
    expect(screen.getByText('جارٍ تحميل صفحات النظام…')).toBeInTheDocument()
    expect(screen.queryByText('التقارير الأسبوعية')).not.toBeInTheDocument()
  })
})

describe('PageAccessSelector — search', () => {
  it('filters by Arabic label', async () => {
    const u = userEvent.setup()
    render(<ToggleHarness />)

    await u.type(screen.getByRole('searchbox'), 'المالية')

    expect(screen.getByText('لوحة المالية')).toBeInTheDocument()
    expect(screen.queryByText('التقارير الأسبوعية')).not.toBeInTheDocument()
  })

  it('filters by catalog key', async () => {
    const u = userEvent.setup()
    render(<ToggleHarness />)

    await u.type(screen.getByRole('searchbox'), 'operations.meeting_reports')

    expect(screen.getByText('تقارير الاجتماعات')).toBeInTheDocument()
    expect(screen.queryByText('لوحة المالية')).not.toBeInTheDocument()
  })

  it('filters by route path', async () => {
    const u = userEvent.setup()
    render(<ToggleHarness />)

    await u.type(screen.getByRole('searchbox'), '/dashboard/finance')

    expect(screen.getByText('لوحة المالية')).toBeInTheDocument()
    expect(screen.queryByText('التقارير الأسبوعية')).not.toBeInTheDocument()
  })
})

describe('PageAccessSelector — protected rows are locked', () => {
  it('disables the control for a SYSTEM_PROTECTED row and explains why in text', () => {
    render(<ToggleHarness />)

    const protectedRow = screen.getByText('إدارة الأدوار').closest('li')
    expect(protectedRow).not.toBeNull()
    const checkbox = within(protectedRow as HTMLElement).getByRole('checkbox')
    expect(checkbox).toBeDisabled()
    // Not conveyed by colour alone — the lock is stated in text (risk badge
    // plus the explicit locked reason).
    expect(within(protectedRow as HTMLElement).getAllByText('محمية من النظام').length).toBeGreaterThan(0)
  })

  it('never includes a locked row in a bulk action', async () => {
    const u = userEvent.setup()
    const seen = vi.fn()
    render(<ToggleHarness onValue={seen} />)

    await u.click(screen.getByRole('button', { name: 'تفعيل الكل' }))

    const next = seen.mock.calls.at(-1)?.[0] as string[]
    expect(next).toContain('operations.weekly_reports')
    expect(next).toContain('finance.dashboard')
    expect(next).not.toContain('administration.roles')
  })

  it('locks a tristate row too, so a protected page cannot be allowed or denied', () => {
    render(<TriHarness />)

    const protectedRow = screen.getByText('إدارة الأدوار').closest('li') as HTMLElement
    for (const radio of within(protectedRow).getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })
})

describe('PageAccessSelector — toggle mode (role / department: positive only)', () => {
  it('adds a key when checked and removes it when unchecked — never a negative state', async () => {
    const u = userEvent.setup()
    const seen = vi.fn()
    render(<ToggleHarness onValue={seen} />)

    const target = screen.getByText('التقارير الأسبوعية').closest('li') as HTMLElement
    const box = within(target).getByRole('checkbox')

    await u.click(box)
    expect(seen.mock.calls.at(-1)?.[0]).toEqual(['operations.weekly_reports'])

    await u.click(box)
    expect(seen.mock.calls.at(-1)?.[0]).toEqual([])
  })

  it('category bulk "إلغاء" clears only that category', async () => {
    const u = userEvent.setup()
    const seen = vi.fn()
    render(
      <ToggleHarness
        initial={['operations.weekly_reports', 'operations.meeting_reports', 'finance.dashboard']}
        onValue={seen}
      />,
    )

    const opsHeader = screen.getByText('العمليات').closest('div') as HTMLElement
    await u.click(within(opsHeader).getByRole('button', { name: 'إلغاء' }))

    const next = seen.mock.calls.at(-1)?.[0] as string[]
    expect(next).toEqual(['finance.dashboard'])
  })
})

describe('PageAccessSelector — tristate mode (user overrides)', () => {
  it('stores ALLOW and DENY, and stores DEFAULT as the ABSENCE of the key', async () => {
    const u = userEvent.setup()
    const seen = vi.fn()
    render(<TriHarness onValue={seen} />)

    const target = screen.getByText('التقارير الأسبوعية').closest('li') as HTMLElement

    await u.click(within(target).getByRole('radio', { name: 'مسموح' }))
    expect(seen.mock.calls.at(-1)?.[0]).toEqual({ 'operations.weekly_reports': 'allow' })

    await u.click(within(target).getByRole('radio', { name: 'محجوب' }))
    expect(seen.mock.calls.at(-1)?.[0]).toEqual({ 'operations.weekly_reports': 'deny' })

    await u.click(within(target).getByRole('radio', { name: 'افتراضي' }))
    const next = seen.mock.calls.at(-1)?.[0] as Record<string, string>
    expect(next).toEqual({})
    expect(Object.values(next)).not.toContain('default')
  })

  it('offers ALLOW ALL / DENY ALL / RESET ALL as category bulk actions', () => {
    render(<TriHarness />)
    const opsHeader = screen.getByText('العمليات').closest('div') as HTMLElement

    expect(within(opsHeader).getByRole('button', { name: 'سماح' })).toBeInTheDocument()
    expect(within(opsHeader).getByRole('button', { name: 'حجب' })).toBeInTheDocument()
    expect(within(opsHeader).getByRole('button', { name: 'إعادة' })).toBeInTheDocument()
  })

  it('RESET ALL removes every key rather than writing a default state', async () => {
    const u = userEvent.setup()
    const seen = vi.fn()
    render(
      <TriHarness
        initial={{ 'operations.weekly_reports': 'allow', 'operations.meeting_reports': 'deny' }}
        onValue={seen}
      />,
    )

    await u.click(screen.getByRole('button', { name: 'إعادة الكل' }))

    expect(seen.mock.calls.at(-1)?.[0]).toEqual({})
  })
})

describe('buildSelectorRows — locked state comes from backend metadata only', () => {
  const catalog: PageAccessCatalog = {
    pages: [
      {
        key: 'operations.weekly_reports',
        primaryRoute: '/dashboard/operations/weekly-reports',
        routePatterns: ['/dashboard/operations/weekly-reports'],
        labelAr: 'التقارير الأسبوعية',
        category: 'operations',
        categoryLabelAr: 'العمليات',
        riskLevel: 'SAFE_DELEGATABLE',
        protected: false,
        delegatable: true,
        requiredPermission: null,
        departmentScoped: true,
        authenticatedBaseline: false,
      },
      {
        key: 'administration.roles',
        primaryRoute: '/dashboard/admin/roles',
        routePatterns: ['/dashboard/admin/roles'],
        labelAr: 'إدارة الأدوار',
        category: 'administration',
        categoryLabelAr: 'الإدارة العامة',
        riskLevel: 'SYSTEM_PROTECTED',
        protected: true,
        delegatable: false,
        requiredPermission: 'manage_roles',
        departmentScoped: false,
        authenticatedBaseline: false,
      },
    ],
    categories: [],
  }

  const eligible = [
    {
      key: 'operations.weekly_reports',
      labelAr: 'التقارير الأسبوعية',
      category: 'operations' as const,
      categoryLabelAr: 'العمليات',
      riskLevel: 'SAFE_DELEGATABLE' as const,
      departmentScoped: true,
      authenticatedBaseline: false,
      delegatable: true,
    },
  ]

  it('locks exactly the rows the backend left out of the eligible set', () => {
    const rows = buildSelectorRows(catalog, eligible, 'محمية')

    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.key === 'operations.weekly_reports')?.locked).toBe(false)
    expect(rows.find((r) => r.key === 'administration.roles')?.locked).toBe(true)
  })

  it('falls back to the eligible set alone when the catalog is unavailable', () => {
    const rows = buildSelectorRows(null, eligible, 'محمية')

    expect(rows).toHaveLength(1)
    expect(rows[0].locked).toBe(false)
  })
})
