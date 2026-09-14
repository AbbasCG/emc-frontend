import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DepartmentPageAccessPanel } from '@/components/access-control/DepartmentPageAccessPanel'
import { EffectiveAccessPreview } from '@/components/access-control/EffectiveAccessPreview'
import { RolePageAccessPanel } from '@/components/access-control/RolePageAccessPanel'
import { UserPageAccessPanel } from '@/components/access-control/UserPageAccessPanel'

/* ── Mocks ─────────────────────────────────────────────────────────────── */

const mockFetchRole = vi.fn()
const mockSaveRole = vi.fn()
const mockFetchDept = vi.fn()
const mockSaveDept = vi.fn()
const mockFetchUser = vi.fn()
const mockSaveUser = vi.fn()
const mockFetchEffective = vi.fn()

vi.mock('@/api/accessControlApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/accessControlApi')>('@/api/accessControlApi')
  return {
    ...actual,
    fetchRolePageAccess: (...a: unknown[]) => mockFetchRole(...a),
    saveRolePageAccess: (...a: unknown[]) => mockSaveRole(...a),
    fetchDepartmentPageAccess: (...a: unknown[]) => mockFetchDept(...a),
    saveDepartmentPageAccess: (...a: unknown[]) => mockSaveDept(...a),
    fetchUserPageAccessOverrides: (...a: unknown[]) => mockFetchUser(...a),
    saveUserPageAccessOverrides: (...a: unknown[]) => mockSaveUser(...a),
    fetchUserEffectivePageAccess: (...a: unknown[]) => mockFetchEffective(...a),
  }
})

const mockFetchCatalog = vi.fn()
vi.mock('@/api/pageAccessCatalogApi', () => ({
  fetchPageAccessCatalog: (...a: unknown[]) => mockFetchCatalog(...a),
}))

const successToast = vi.fn()
const errorToast = vi.fn()
vi.mock('@/lib/toast', () => ({
  successToast: (...a: unknown[]) => successToast(...a),
  errorToast: (...a: unknown[]) => errorToast(...a),
  warningToast: vi.fn(),
  infoToast: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'super_admin' } }),
}))

/* ── Fixtures ──────────────────────────────────────────────────────────── */

const WEEKLY = {
  key: 'operations.weekly_reports',
  labelAr: 'التقارير الأسبوعية',
  category: 'operations' as const,
  categoryLabelAr: 'العمليات',
  riskLevel: 'SAFE_DELEGATABLE' as const,
  departmentScoped: true,
  delegatable: true,
}

const STRUCTURE = {
  key: 'organizational_departments.structure',
  labelAr: 'هيكل الإدارة',
  category: 'organizational_departments' as const,
  categoryLabelAr: 'الإدارات',
  riskLevel: 'ADMIN_ONLY' as const,
  departmentScoped: true,
  delegatable: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  // The catalog is optional context; the endpoints' own eligible sets drive the editors.
  mockFetchCatalog.mockResolvedValue({ pages: [], categories: [] })
})

/* ── Role ──────────────────────────────────────────────────────────────── */

describe('RolePageAccessPanel', () => {
  it('loads the role defaults and sends the exact replace payload on save', async () => {
    const u = userEvent.setup()
    mockFetchRole.mockResolvedValue({
      role: { id: 6, name: 'finance_manager', displayName: 'مدير المالية', isSystem: false },
      pageDefaults: [],
      eligible: [WEEKLY],
    })
    mockSaveRole.mockResolvedValue(['operations.weekly_reports'])

    render(<RolePageAccessPanel roleId="finance_manager" roleLabelAr="مدير المالية" />)

    await waitFor(() => expect(screen.getByText('التقارير الأسبوعية')).toBeInTheDocument())
    expect(mockFetchRole).toHaveBeenCalledWith('finance_manager')

    // Save is inert until something actually changes.
    expect(screen.getByRole('button', { name: /حفظ/ })).toBeDisabled()

    await u.click(screen.getByRole('checkbox'))
    expect(screen.getByText('لديك تغييرات غير محفوظة')).toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: /حفظ/ }))

    await waitFor(() => expect(mockSaveRole).toHaveBeenCalledWith('finance_manager', ['operations.weekly_reports']))
    expect(successToast).toHaveBeenCalled()
  })

  it('shows a safe Arabic message when the backend rejects the load', async () => {
    mockFetchRole.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: 'Only super_admin may …' } },
    })

    render(<RolePageAccessPanel roleId="super_admin" roleLabelAr="المشرف العام" />)

    await waitFor(() => expect(screen.getByText('تعذر تحميل الوصول الافتراضي للصفحات')).toBeInTheDocument())
  })

  it('renders the "page access is not business authorization" notice', async () => {
    mockFetchRole.mockResolvedValue({
      role: { id: 1, name: 'x', displayName: 'x', isSystem: false },
      pageDefaults: [],
      eligible: [WEEKLY],
    })

    render(<RolePageAccessPanel roleId={1} roleLabelAr="x" />)

    await waitFor(() => expect(screen.getByText(/ظهور الصفحات والوصول إليها/)).toBeInTheDocument())
  })
})

/* ── Department ────────────────────────────────────────────────────────── */

describe('DepartmentPageAccessPanel', () => {
  function mountDept() {
    mockFetchDept.mockResolvedValue({
      department: { id: 3, name: 'العمليات', status: 'active' },
      memberDefaults: ['operations.weekly_reports'],
      leaderDefaults: [],
      eligible: { member: [WEEKLY], leader: [WEEKLY, STRUCTURE] },
    })
    return render(<DepartmentPageAccessPanel departmentId={3} departmentName="العمليات" />)
  }

  it('loads member defaults by default', async () => {
    mountDept()
    await waitFor(() => expect(screen.getByText('افتراضي للأعضاء')).toBeInTheDocument())
    expect(mockFetchDept).toHaveBeenCalledWith(3)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('communicates that a leader gets MEMBER + LEADER defaults, not a replacement set', async () => {
    const u = userEvent.setup()
    mountDept()

    await waitFor(() => expect(screen.getByText('إضافي للقائد')).toBeInTheDocument())
    await u.click(screen.getByRole('button', { name: /إضافي للقائد/ }))

    expect(screen.getByText(/القائد يرث أولاً كل صفحات الأعضاء/)).toBeInTheDocument()
    expect(screen.getByText(/موروث: التقارير الأسبوعية/)).toBeInTheDocument()
  })

  it('exposes leader-only eligible pages in the leader audience but not the member one', async () => {
    const u = userEvent.setup()
    mountDept()

    await waitFor(() => expect(screen.getByText('التقارير الأسبوعية')).toBeInTheDocument())
    expect(screen.queryByText('هيكل الإدارة')).not.toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: /إضافي للقائد/ }))
    expect(screen.getByText('هيكل الإدارة')).toBeInTheDocument()
  })

  it('saves BOTH audiences in one request', async () => {
    const u = userEvent.setup()
    mockSaveDept.mockResolvedValue({ memberDefaults: [], leaderDefaults: [] })
    mountDept()

    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked())
    await u.click(screen.getByRole('checkbox'))
    await u.click(screen.getByRole('button', { name: /حفظ الاثنين معاً/ }))

    await waitFor(() => expect(mockSaveDept).toHaveBeenCalledTimes(1))
    expect(mockSaveDept).toHaveBeenCalledWith(3, [], [])
  })

  it('warns that an inactive department grants no new effective access', async () => {
    mockFetchDept.mockResolvedValue({
      department: { id: 4, name: 'قديمة', status: 'archived' },
      memberDefaults: [],
      leaderDefaults: [],
      eligible: { member: [WEEKLY], leader: [WEEKLY] },
    })

    render(<DepartmentPageAccessPanel departmentId={4} departmentName="قديمة" />)

    await waitFor(() => expect(screen.getByText(/لا يمنح وصولاً/)).toBeInTheDocument())
  })
})

/* ── User overrides ────────────────────────────────────────────────────── */

describe('UserPageAccessPanel', () => {
  it('sends ALLOW in allow[] and nothing for DEFAULT', async () => {
    const u = userEvent.setup()
    mockFetchUser.mockResolvedValue({
      user: { id: 42, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      overrides: {},
      grantable: [WEEKLY],
    })
    mockSaveUser.mockResolvedValue({ 'operations.weekly_reports': 'allow' })

    render(<UserPageAccessPanel userId={42} userName="سارة" userRole="volunteer" viewerRole="super_admin" />)

    await waitFor(() => expect(screen.getByText('التقارير الأسبوعية')).toBeInTheDocument())
    await u.click(screen.getByRole('radio', { name: 'مسموح' }))
    await u.click(screen.getByRole('button', { name: /حفظ/ }))

    await waitFor(() => expect(mockSaveUser).toHaveBeenCalledWith(42, ['operations.weekly_reports'], []))
  })

  it('sends DENY in deny[]', async () => {
    const u = userEvent.setup()
    mockFetchUser.mockResolvedValue({
      user: { id: 42, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      overrides: {},
      grantable: [WEEKLY],
    })
    mockSaveUser.mockResolvedValue({ 'operations.weekly_reports': 'deny' })

    render(<UserPageAccessPanel userId={42} userName="سارة" userRole="volunteer" viewerRole="super_admin" />)

    await waitFor(() => expect(screen.getByText('التقارير الأسبوعية')).toBeInTheDocument())
    await u.click(screen.getByRole('radio', { name: 'محجوب' }))
    await u.click(screen.getByRole('button', { name: /حفظ/ }))

    await waitFor(() => expect(mockSaveUser).toHaveBeenCalledWith(42, [], ['operations.weekly_reports']))
  })

  it('resetting to DEFAULT drops the key entirely from the payload', async () => {
    const u = userEvent.setup()
    mockFetchUser.mockResolvedValue({
      user: { id: 42, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      overrides: { 'operations.weekly_reports': 'allow' },
      grantable: [WEEKLY],
    })
    mockSaveUser.mockResolvedValue({})

    render(<UserPageAccessPanel userId={42} userName="سارة" userRole="volunteer" viewerRole="super_admin" />)

    await waitFor(() => expect(screen.getByRole('radio', { name: 'مسموح' })).toBeChecked())
    await u.click(screen.getByRole('radio', { name: 'افتراضي' }))
    await u.click(screen.getByRole('button', { name: /حفظ/ }))

    await waitFor(() => expect(mockSaveUser).toHaveBeenCalledWith(42, [], []))
  })

  it('shows a protected-authority notice for a super_admin target instead of pretending to manage root access', async () => {
    mockFetchUser.mockResolvedValue({
      user: { id: 1, name: 'root', email: 'r@e.com', role: 'super_admin' },
      overrides: {},
      grantable: [WEEKLY],
    })

    render(<UserPageAccessPanel userId={1} userName="root" userRole="super_admin" viewerRole="super_admin" />)

    await waitFor(() => expect(screen.getByText(/صلاحية النظام الكاملة/)).toBeInTheDocument())
  })

  it('renders a safe Arabic 403 message and no editor when the backend forbids the actor', async () => {
    mockFetchUser.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: 'You are not authorized …' } },
    })

    render(<UserPageAccessPanel userId={1} userName="root" userRole="super_admin" viewerRole="tech_admin" />)

    await waitFor(() => expect(screen.getByText(/لا تملك صلاحية تعديل وصول هذا المستخدم/)).toBeInTheDocument())
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    // Raw backend exception text is never surfaced.
    expect(screen.queryByText(/not authorized/i)).not.toBeInTheDocument()
  })
})

/* ── Effective access preview ──────────────────────────────────────────── */

describe('EffectiveAccessPreview', () => {
  const rows = [
    {
      key: 'operations.weekly_reports',
      allowed: true,
      primarySource: 'department_leader' as const,
      primarySourceLabelAr: 'لأنه قائد الإدارة',
      sources: ['role', 'department_member', 'department_leader'] as const,
      overrideState: null,
      protected: false,
      reason: 'department_leader',
      labelAr: 'التقارير الأسبوعية',
      category: 'operations' as const,
      categoryLabelAr: 'العمليات',
      riskLevel: 'SAFE_DELEGATABLE' as const,
    },
    {
      key: 'knowledge.base',
      allowed: false,
      primarySource: 'user_deny' as const,
      primarySourceLabelAr: 'محجوبة بشكل خاص',
      sources: ['department_member'] as const,
      overrideState: 'deny' as const,
      protected: false,
      reason: 'user_deny',
      labelAr: 'قاعدة المعرفة',
      category: 'operations' as const,
      categoryLabelAr: 'العمليات',
      riskLevel: 'SAFE_DELEGATABLE' as const,
    },
    {
      key: 'finance.dashboard',
      allowed: true,
      primarySource: 'user_allow' as const,
      primarySourceLabelAr: 'إضافة خاصة',
      sources: ['user_allow'] as const,
      overrideState: 'allow' as const,
      protected: false,
      reason: 'user_allow',
      labelAr: 'لوحة المالية',
      category: 'finance' as const,
      categoryLabelAr: 'المالية',
      riskLevel: 'ADMIN_ONLY' as const,
    },
  ]

  it('renders the backend provenance wording verbatim, including all positive sources', async () => {
    mockFetchEffective.mockResolvedValue({
      user: { id: 42, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      allowedKeys: ['operations.weekly_reports', 'finance.dashboard'],
      pages: rows,
    })

    render(<EffectiveAccessPreview userId={42} userName="سارة" />)

    await waitFor(() => expect(screen.getByText('التقارير الأسبوعية')).toBeInTheDocument())
    expect(screen.getAllByText('لأنه قائد الإدارة').length).toBeGreaterThan(0)
    expect(screen.getByText('كل المصادر:')).toBeInTheDocument()
    expect(screen.getAllByText('من الدور').length).toBeGreaterThan(0)
    expect(screen.getAllByText('من الإدارة').length).toBeGreaterThan(0)
  })

  it('shows a user DENY as not allowed and a user ALLOW as a custom addition', async () => {
    mockFetchEffective.mockResolvedValue({
      user: { id: 42, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      allowedKeys: ['operations.weekly_reports', 'finance.dashboard'],
      pages: rows,
    })

    render(<EffectiveAccessPreview userId={42} userName="سارة" />)

    await waitFor(() => expect(screen.getByText('قاعدة المعرفة')).toBeInTheDocument())

    const denied = screen.getByText('قاعدة المعرفة').closest('li') as HTMLElement
    expect(within(denied).getByText('غير مسموحة')).toBeInTheDocument()
    expect(within(denied).getByText('استثناء: محجوب')).toBeInTheDocument()

    const allowed = screen.getByText('لوحة المالية').closest('li') as HTMLElement
    expect(within(allowed).getAllByText('إضافة خاصة').length).toBeGreaterThan(0)
    expect(within(allowed).getByText('مسموحة')).toBeInTheDocument()
  })

  it('is READ-ONLY — it renders no checkbox, radio or save control', async () => {
    mockFetchEffective.mockResolvedValue({
      user: { id: 42, name: 'سارة', email: 's@e.com', role: 'volunteer' },
      allowedKeys: [],
      pages: rows,
    })

    render(<EffectiveAccessPreview userId={42} userName="سارة" />)

    await waitFor(() => expect(screen.getByText('التقارير الأسبوعية')).toBeInTheDocument())
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /حفظ/ })).not.toBeInTheDocument()
  })

  it('shows a safe Arabic message on 403 rather than raw backend text', async () => {
    mockFetchEffective.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: 'You are not authorized to configure …' } },
    })

    render(<EffectiveAccessPreview userId={9} userName="x" />)

    await waitFor(() =>
      expect(screen.getByText('لا تملك صلاحية عرض الوصول الفعلي لهذا المستخدم.')).toBeInTheDocument(),
    )
    expect(screen.queryByText(/not authorized/i)).not.toBeInTheDocument()
  })
})

/* ── No-cutover guarantees ─────────────────────────────────────────────── */

describe('Phase 2E introduces NO production access cutover', () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

  it('does not introduce any localStorage-based authorization', () => {
    for (const f of [
      'src/api/accessControlApi.ts',
      'src/components/access-control/PageAccessSelector.tsx',
      'src/components/access-control/RolePageAccessPanel.tsx',
      'src/components/access-control/DepartmentPageAccessPanel.tsx',
      'src/components/access-control/UserPageAccessPanel.tsx',
      'src/components/access-control/EffectiveAccessPreview.tsx',
      'src/components/access-control/selectorRows.ts',
      'src/components/access-control/AccessBadges.tsx',
    ]) {
      const src = read(f)
      expect(src, `${f} must not touch localStorage`).not.toMatch(/localStorage|sessionStorage/)
    }
  })

  it('leaves dashboardAccess.ts free of any effective-page-access dependency', () => {
    const src = read('src/utils/dashboardAccess.ts')
    expect(src).not.toMatch(/accessControlApi|effective-page-access|EffectivePageAccess|allowed_keys/)
    // The canonical root bypass the resolver mirrors is still the production rule here.
    expect(src).toMatch(/role === 'super_admin' \|\| role === 'tech_admin'/)
  })

  it('leaves the dashboard route guard free of any effective-page-access dependency', () => {
    const src = read('src/App.tsx')
    expect(src).not.toMatch(/accessControlApi|effective-page-access|fetchMyPageAccess/)
  })

  it('keeps the sidebar free of any effective-page-access dependency', () => {
    const src = read('src/layouts/dashboardSidebar.tsx')
    expect(src).not.toMatch(/accessControlApi|effective-page-access|fetchMyPageAccess/)
  })

  it('keeps the management UI on the existing URLs (no new access-control routes)', () => {
    const src = read('src/App.tsx')
    expect(src).toMatch(/\/dashboard\/super-admin\/crud\/roles/)
    expect(src).toMatch(/\/dashboard\/super-admin\/crud\/departments/)
    expect(src).not.toMatch(/\/dashboard\/access-control/)
  })
})
