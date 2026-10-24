import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import TechDepartmentDashboardsPage from '@/pages/tech-admin/TechDepartmentDashboardsPage'
import DashboardAccessGuard from '@/components/DashboardAccessGuard'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'
import { filterSidebarGroupsByAccess } from '@/utils/sidebarAccessFilter'
import {
  fetchDepartmentDashboard,
  fetchMonitoredDepartments,
  type DepartmentDashboard,
  type MonitoredDepartment,
} from '@/api/techDepartmentDashboardsApi'
import type { EffectivePageAccessRow } from '@/api/accessControlApi'

vi.mock('@/api/techDepartmentDashboardsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/techDepartmentDashboardsApi')>()
  return { ...actual, fetchMonitoredDepartments: vi.fn(), fetchDepartmentDashboard: vi.fn() }
})

const access = vi.hoisted(() => ({
  state: {
    status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    allowedKeys: new Set<string>(),
    canAccessPath: (_p: string): boolean | null => true,
  },
}))

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({
    status: access.state.status,
    pages: [],
    allowedKeys: access.state.allowedKeys,
    isReady: access.state.status === 'ready',
    canAccessKey: (k: string) => access.state.allowedKeys.has(k),
    canAccessPath: access.state.canAccessPath,
    pageForPath: () => null,
    refresh: async () => {},
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'tech_admin' }, isLoading: false }),
}))

const mockedList = vi.mocked(fetchMonitoredDepartments)
const mockedDash = vi.mocked(fetchDepartmentDashboard)

const DEPTS: MonitoredDepartment[] = [
  { id: 1, name: 'إدارة التقنية', slug: 'tech', status: 'active', leader: { id: 9, name: 'ليلى' } },
  { id: 2, name: 'إدارة الجودة', slug: 'quality', status: 'active', leader: null },
]

function dashboard(over: Partial<DepartmentDashboard> = {}): DepartmentDashboard {
  return {
    departments: DEPTS,
    selectedDepartment: DEPTS[0],
    cards: [
      { key: 'open_items', label: 'إجمالي العناصر المفتوحة', value: 12, tone: 'info' },
      { key: 'pending_tasks', label: 'المهام المعلقة', value: 5, tone: 'warning' },
      { key: 'active_tickets', label: 'البلاغات النشطة', value: 3, tone: 'neutral' },
      { key: 'active_members', label: 'الأعضاء النشطون', value: 8, tone: 'good' },
      { key: 'last_activity', label: 'آخر نشاط', value: '2026-10-01T10:00:00+00:00', tone: 'neutral' },
    ],
    modules: [
      { key: 'overview', label: 'نظرة عامة', available: true },
      { key: 'operations', label: 'العمليات والمهام', available: true },
      { key: 'support', label: 'التذاكر والبلاغات', available: false },
    ],
    sections: [
      { key: 'operations', label: 'العمليات والمهام', available: true, metrics: [{ key: 'overdue_tasks', label: 'مهام متأخرة', value: 2, tone: 'warning' }] },
      { key: 'support', label: 'التذاكر والبلاغات', available: false, metrics: [] },
    ],
    warnings: [
      { code: 'overdue_tasks', severity: 'warning', message: 'توجد مهام متأخرة عن موعدها.' },
      { code: 'section_support_failed', severity: 'critical', message: 'تعذّر تحميل قسم «التذاكر والبلاغات». راجع سجلات النظام.' },
    ],
    links: [{ key: 'department_workspace', label: 'فتح لوحة الإدارة الأصلية', path: '/dashboard/department/1', page_key: 'organizational_departments.department_overview' }],
    diagnostics: { generated_at: '2026-10-13T12:00:00+00:00', last_activity_at: '2026-10-01T10:00:00+00:00', data_source: 'تجميعات مباشرة من قاعدة البيانات (قراءة فقط)', stale: false, sections_failed: 1 },
    capabilities: { can_view: true, can_refresh: true, can_view_sensitive: false, read_only: true },
    ...over,
  }
}

function httpError(status: number): unknown {
  return { isAxiosError: true, name: 'AxiosError', message: 'x', config: {}, response: { status, data: {} } }
}

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/tech-admin/department-dashboards${search}`]}>
      <TechDepartmentDashboardsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  access.state.status = 'ready'
  access.state.allowedKeys = new Set()
  access.state.canAccessPath = () => true
  mockedList.mockResolvedValue({ departments: DEPTS, capabilities: { can_view: true, can_refresh: true, can_view_sensitive: false, read_only: true } })
  mockedDash.mockResolvedValue(dashboard())
})

describe('page shell', () => {
  it('renders the Arabic title, subtitle and the read-only badge for an authorized user', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'لوحات الإدارات' })).toBeTruthy()
    expect(screen.getByText('متابعة لوحات التحكم الخاصة بالإدارات من مكان واحد لأغراض الفحص والدعم التقني.')).toBeTruthy()
    expect(screen.getByText('عرض للقراءة فقط')).toBeTruthy()
  })

  it('shows the empty state until a department is chosen, and loads no dashboard', async () => {
    renderPage()

    expect(await screen.findByText('اختر إدارة')).toBeTruthy()
    expect(mockedDash).not.toHaveBeenCalled()
  })

  it('renders right-to-left', async () => {
    const { container } = renderPage()
    await screen.findByText('اختر إدارة')
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})

describe('department selector', () => {
  it('loads the departments into a searchable select', async () => {
    renderPage()
    await screen.findByText('اختر إدارة')

    await userEvent.click(screen.getByRole('button', { name: 'اختيار الإدارة' }))

    const list = await screen.findByRole('listbox')
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('إدارة التقنية'), expect.stringContaining('إدارة الجودة')]),
    )
    expect(screen.getByRole('searchbox')).toBeTruthy()

    await userEvent.type(screen.getByRole('searchbox'), 'الجودة')
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
  })

  it('selecting a department loads its summary', async () => {
    renderPage()
    await screen.findByText('اختر إدارة')

    await userEvent.click(screen.getByRole('button', { name: 'اختيار الإدارة' }))
    await userEvent.click(await screen.findByRole('option', { name: /إدارة الجودة/ }))

    await waitFor(() => expect(mockedDash).toHaveBeenCalledWith(2))
    expect(await screen.findByTestId('metric-open_items')).toBeTruthy()
  })

  it('opens straight onto a department named in the URL', async () => {
    renderPage('?department=1')

    await waitFor(() => expect(mockedDash).toHaveBeenCalledWith(1))
    expect(await screen.findByTestId('metric-open_items')).toBeTruthy()
  })

  it('says so when there are no active departments', async () => {
    mockedList.mockResolvedValue({ departments: [], capabilities: { can_view: true, can_refresh: true, can_view_sensitive: false, read_only: true } })
    renderPage()

    expect(await screen.findByText('لا توجد إدارات نشطة لعرضها.')).toBeTruthy()
  })
})

describe('dashboard summary', () => {
  it('renders the KPI cards with their values', async () => {
    renderPage('?department=1')

    expect(within(await screen.findByTestId('metric-open_items')).getByText('12')).toBeTruthy()
    expect(within(screen.getByTestId('metric-pending_tasks')).getByText('5')).toBeTruthy()
    expect(screen.getByText('البلاغات النشطة')).toBeTruthy()
    expect(screen.getByText('الأعضاء النشطون')).toBeTruthy()
    expect(screen.getByTestId('metric-last_activity')).toBeTruthy()
  })

  it('renders the diagnostics and the warnings', async () => {
    renderPage('?department=1')
    await screen.findByTestId('metric-open_items')

    const diag = screen.getByRole('complementary', { name: 'التشخيص' })
    expect(within(diag).getByText('تجميعات مباشرة من قاعدة البيانات (قراءة فقط)')).toBeTruthy()
    expect(within(diag).getByText('آخر تحديث للبيانات')).toBeTruthy()
    expect(screen.getByText('توجد مهام متأخرة عن موعدها.')).toBeTruthy()
    expect(screen.getByText(/تعذّر تحميل قسم/)).toBeTruthy()
    expect(screen.getByText(/لا تظهر أسماء أو مبالغ أو محتوى خاص/)).toBeTruthy()
  })

  it('marks an unavailable section instead of hiding the failure', async () => {
    renderPage('?department=1')
    await screen.findByTestId('metric-open_items')

    expect(screen.getByText('تعذّر تحميل هذا القسم.')).toBeTruthy()
  })

  it('filters sections by module', async () => {
    renderPage('?department=1')
    await screen.findByTestId('metric-open_items')

    await userEvent.click(screen.getByRole('button', { name: 'العمليات والمهام' }))

    expect(screen.queryByText('تعذّر تحميل هذا القسم.')).toBeNull()
    expect(screen.getByTestId('metric-overdue_tasks')).toBeTruthy()
  })

  it('handles a department with no leader, no data and no warnings without crashing', async () => {
    mockedDash.mockResolvedValue(dashboard({
      selectedDepartment: DEPTS[1], cards: [], modules: [{ key: 'overview', label: 'نظرة عامة', available: true }], sections: [], warnings: [], links: [],
      diagnostics: { generated_at: null, last_activity_at: null, data_source: '', stale: false, sections_failed: 0 },
    }))
    renderPage('?department=2')

    expect(await screen.findByText('لا توجد مؤشرات متاحة لهذه الإدارة.')).toBeTruthy()
    expect(screen.getByText('غير معيَّن')).toBeTruthy()
    expect(screen.getByText('لا توجد تنبيهات لهذه الإدارة.')).toBeTruthy()
    expect(screen.getByText('لا توجد بيانات تفصيلية لهذه الإدارة بعد.')).toBeTruthy()
  })

  it('warns when a department has been silent for 30 days', async () => {
    mockedDash.mockResolvedValue(dashboard({ diagnostics: { ...dashboard().diagnostics, stale: true } }))
    renderPage('?department=1')

    expect(await screen.findByText(/منذ أكثر من 30 يومًا/)).toBeTruthy()
  })
})

describe('links to the real dashboard', () => {
  it('is a link only when the viewer has page access to it', async () => {
    access.state.allowedKeys = new Set(['organizational_departments.department_overview'])
    renderPage('?department=1')

    const link = await screen.findByRole('link', { name: 'فتح لوحة الإدارة الأصلية' })
    expect(link.getAttribute('href')).toBe('/dashboard/department/1')
  })

  it('is disabled with an explanation otherwise', async () => {
    renderPage('?department=1')
    await screen.findByTestId('metric-open_items')

    expect(screen.queryByRole('link', { name: 'فتح لوحة الإدارة الأصلية' })).toBeNull()
    expect(screen.getByText('هذه اللوحة تتطلب صلاحية إضافية.')).toBeTruthy()
  })
})

describe('error and unauthorized states', () => {
  it('shows an error with a retry button when the dashboard fails, and recovers', async () => {
    mockedDash.mockRejectedValueOnce(httpError(500))
    renderPage('?department=1')

    expect(await screen.findByText('تعذّر تحميل لوحة الإدارة')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByTestId('metric-open_items')).toBeTruthy()
    expect(mockedDash).toHaveBeenCalledTimes(2)
  })

  it('shows an error with a retry button when the department list fails', async () => {
    mockedList.mockRejectedValueOnce(httpError(500))
    renderPage()

    expect(await screen.findByText('تعذّر تحميل قائمة الإدارات')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('اختر إدارة')).toBeTruthy()
  })

  it('renders the unauthorized state on a 403 from the API, with no data and refresh disabled', async () => {
    mockedList.mockRejectedValue(httpError(403))
    renderPage()

    expect(await screen.findByText('لا تملك صلاحية عرض هذه الصفحة')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'اختيار الإدارة' })).toBeNull()
    expect((screen.getByRole('button', { name: 'تحديث' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('treats a 403 on the dashboard itself as unauthorized too', async () => {
    mockedDash.mockRejectedValue(httpError(403))
    renderPage('?department=1')

    expect(await screen.findByText('لا تملك صلاحية عرض هذه الصفحة')).toBeTruthy()
  })

  it('explains an archived or unknown department (404)', async () => {
    mockedDash.mockRejectedValue(httpError(404))
    renderPage('?department=99')

    expect(await screen.findByText('الإدارة غير متاحة')).toBeTruthy()
  })

  it('refresh re-fetches the list and the selected dashboard', async () => {
    renderPage('?department=1')
    await screen.findByTestId('metric-open_items')

    await userEvent.click(screen.getByRole('button', { name: 'تحديث' }))

    await waitFor(() => expect(mockedDash).toHaveBeenCalledTimes(2))
    expect(mockedList).toHaveBeenCalledTimes(2)
  })
})

describe('v1 is strictly read-only', () => {
  it('renders no edit, approve, delete or workflow control anywhere', async () => {
    access.state.allowedKeys = new Set(['organizational_departments.department_overview'])
    const { container } = renderPage('?department=1')
    await screen.findByTestId('metric-open_items')

    const names = screen.getAllByRole('button').map((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim())
    for (const name of names) {
      expect(name).not.toMatch(/تعديل|تحرير|حذف|اعتماد|موافقة|رفض|حفظ|إرسال|إنشاء|إضافة|إلغاء|تغيير|دخول كمستخدم/)
    }
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('textarea')).toBeNull()
    expect(container.querySelector('input:not([type="search"])')).toBeNull()
  })

  it('never offers impersonation or a role switch', async () => {
    renderPage('?department=1')
    await screen.findByTestId('metric-open_items')

    expect(document.body.textContent).not.toMatch(/الدخول كمستخدم|تبديل الدور|انتحال/)
  })
})

describe('sidebar and route guard follow page access', () => {
  const KEY = 'technical_system.department_dashboards'
  const HREF = '/dashboard/tech-admin/department-dashboards'

  const row = (allowed: boolean): EffectivePageAccessRow => ({
    key: KEY, allowed, primarySource: (allowed ? 'role' : 'none') as never, primarySourceLabelAr: '', sources: [], overrideState: null,
    protected: false, reason: '', labelAr: 'لوحات الإدارات', category: 'technical_system' as never, categoryLabelAr: '',
    riskLevel: 'ADMIN_ONLY' as never, primaryRoute: HREF, routePatterns: [HREF],
  })

  const hrefs = (groups: ReturnType<typeof getSidebarByRole>) => groups.flatMap((g) => g.items.map((i) => i.href))

  it('the entry exists in the sidebars of the roles that may be given the page', () => {
    for (const role of ['tech_admin', 'super_admin', 'admin', 'executive_admin']) {
      expect(hrefs(getSidebarByRole(role))).toContain(HREF)
    }
  })

  it('the entry is absent from every other role\'s sidebar', () => {
    for (const role of ['student', 'instructor', 'volunteer', 'finance_manager', 'quality_manager', 'support_agent', 'hr_manager', 'department_manager']) {
      expect(hrefs(getSidebarByRole(role))).not.toContain(HREF)
    }
  })

  it('shows the entry only when the manifest allows it, whatever the role', () => {
    const groups = getSidebarByRole('tech_admin')

    expect(hrefs(filterSidebarGroupsByAccess(groups, [row(true)]))).toContain(HREF)
    expect(hrefs(filterSidebarGroupsByAccess(groups, [row(false)]))).not.toContain(HREF)
  })

  function renderGuarded(allowed: boolean) {
    access.state.canAccessPath = (p) => (p.startsWith(HREF) ? allowed : true)
    return render(
      <MemoryRouter initialEntries={[HREF]}>
        <Routes>
          <Route element={<DashboardAccessGuard />}>
            <Route path={HREF} element={<div>صفحة لوحات الإدارات</div>} />
            <Route path="/dashboard/tech-admin" element={<div>الصفحة الرئيسية للتقنية</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
  }

  it('opens the route when the manifest allows it', () => {
    renderGuarded(true)
    expect(screen.getByText('صفحة لوحات الإدارات')).toBeTruthy()
  })

  it('blocks direct navigation to the route when the manifest does not allow it', () => {
    renderGuarded(false)

    expect(screen.queryByText('صفحة لوحات الإدارات')).toBeNull()
    expect(screen.getByText('الصفحة الرئيسية للتقنية')).toBeTruthy()
  })

  it('holds the page back while the manifest is still loading', () => {
    access.state.status = 'loading'
    renderGuarded(true)

    expect(screen.queryByText('صفحة لوحات الإدارات')).toBeNull()
  })

  it('a failed manifest grants nothing', () => {
    access.state.status = 'error'
    renderGuarded(true)

    expect(screen.queryByText('صفحة لوحات الإدارات')).toBeNull()
  })
})

describe('api normalization', () => {
  it('never widens capabilities: anything but an explicit true is not sensitive', async () => {
    const { default: apiClient } = await import('@/api/axios')
    const actual = await vi.importActual<typeof import('@/api/techDepartmentDashboardsApi')>('@/api/techDepartmentDashboardsApi')
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { selected_department: { id: 1, name: 'x' }, capabilities: { can_view_sensitive: 'yes' } } } } as never)

    const d = await actual.fetchDepartmentDashboard(1)

    expect(d.capabilities.can_view_sensitive).toBe(false)
    expect(d.cards).toEqual([])
    expect(d.sections).toEqual([])
    expect(d.selectedDepartment.leader).toBeNull()
    spy.mockRestore()
  })
})
