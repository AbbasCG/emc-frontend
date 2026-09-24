import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import baselineJson from '@/test/fixtures/accessEffectiveBaseline.json'

/**
 * CENTRAL ACCESS CONTROL PAGE — إدارة الوصول والصلاحيات
 *
 * Covers the shell, its catalog/route/sidebar registration, and the guarantees
 * that matter: it introduces no second authorization system, it reuses the
 * existing editors rather than reimplementing them, and it does not displace
 * the contextual panels that already exist.
 */

const PAGE = 'src/pages/super-admin/AccessControlCenterPage.tsx'
const ROUTE = '/dashboard/super-admin/access-control'
const KEY = 'administration.access_control'

const readSrc = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')
const codeOf = (rel: string) =>
  readSrc(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

/* ── 1. Registration ────────────────────────────────────────────────────── */

describe('registration', () => {
  it('the catalog carries exactly one entry for the central page', () => {
    const catalog = (baselineJson as unknown as {
      catalog: { key: string; primary_route: string; risk_level: string; protected: boolean; delegatable: boolean }[]
    }).catalog

    const matches = catalog.filter((c) => c.key === KEY)
    expect(matches).toHaveLength(1)

    const entry = matches[0]
    expect(entry.primary_route).toBe(ROUTE)
    expect(entry.risk_level).toBe('SYSTEM_PROTECTED')
    expect(entry.protected).toBe(true)
    expect(entry.delegatable).toBe(false)
  })

  it('no other catalog entry claims the same route', () => {
    const catalog = (baselineJson as unknown as { catalog: { key: string; primary_route: string }[] }).catalog

    expect(catalog.filter((c) => c.primary_route === ROUTE).map((c) => c.key)).toEqual([KEY])
  })

  it('the route is registered inside the guarded dashboard tree', () => {
    const app = codeOf('src/App.tsx')

    expect(app).toMatch(/path="\/dashboard\/super-admin\/access-control"/)
    expect(app).toMatch(/AccessControlCenterPage/)

    // It must sit inside the DashboardAccessGuard block, not beside it.
    const guardIndex = app.indexOf('<DashboardAccessGuard />')
    const routeIndex = app.indexOf('/dashboard/super-admin/access-control')
    expect(guardIndex).toBeGreaterThan(-1)
    expect(routeIndex).toBeGreaterThan(guardIndex)
  })

  it('the sidebar has exactly one entry for it', () => {
    const sidebar = codeOf('src/layouts/dashboardSidebar.tsx')
    const occurrences = sidebar.split(ROUTE).length - 1

    // One nav item + one exact-match route registration.
    expect(occurrences).toBe(2)
    expect(sidebar).toMatch(/إدارة الوصول والصلاحيات/)
  })

  it('the sidebar entry carries no hardcoded role gate of its own', () => {
    const sidebar = codeOf('src/layouts/dashboardSidebar.tsx')
    const line = sidebar.split('\n').find((l) => l.includes(ROUTE) && l.includes('label'))

    expect(line).toBeDefined()
    // Visibility comes from the effective-access filter, not from an inline check.
    expect(line).not.toMatch(/role\s*===|isSuperAdmin|super_admin/)
  })
})

/* ── 2. No duplicate authorization ──────────────────────────────────────── */

describe('no second authorization system', () => {
  const code = codeOf(PAGE)

  it('does not read or write browser storage', () => {
    expect(code).not.toMatch(/localStorage|sessionStorage|indexedDB/)
  })

  it('does not gate itself on a hardcoded role', () => {
    expect(code).not.toMatch(/role\s*===\s*['"]super_admin['"]/)
    expect(code).not.toMatch(/isSuperAdmin\s*\(/)
  })

  it('does not call the legacy path matrix or recompute effective access', () => {
    expect(code).not.toMatch(/canAccessDashboardPath\s*\(/)
    expect(code).not.toMatch(/getAllowedRolesForPath\s*\(/)
    // Effective access is displayed, never derived here.
    expect(code).not.toMatch(/function\s+resolve(Effective|Access)/)
  })

  it('does not resurrect the rejected local override store', () => {
    expect(code).not.toMatch(/userPageOverridesStore/)
  })

  it('adds no business-permission controls', () => {
    // Page access only — no CRUD/approval checkboxes smuggled in.
    expect(code).not.toMatch(/canCreate|canEdit|canDelete|canApprove/)
    expect(code).not.toMatch(/updateRolePermissions|grantPermission|revokePermission/)
  })
})

/* ── 3. Reuse, not reimplementation ─────────────────────────────────────── */

describe('reuses the existing editors', () => {
  const code = codeOf(PAGE)

  it.each([
    ['DepartmentPageAccessPanel', '@/components/access-control/DepartmentPageAccessPanel'],
    ['RolePageAccessPanel', '@/components/access-control/RolePageAccessPanel'],
    ['UserPageAccessPanel', '@/components/access-control/UserPageAccessPanel'],
    ['EffectiveAccessPreview', '@/components/access-control/EffectiveAccessPreview'],
  ])('imports %s from the shared component', (name, from) => {
    expect(code).toContain(from)
    expect(code).toMatch(new RegExp(`<${name}\\b`))
  })

  it('does not rebuild the page selector or the badges', () => {
    // Those are internal to the reused panels; re-importing them here would
    // mean the shell had started composing its own editor.
    expect(code).not.toMatch(/from '@\/components\/access-control\/PageAccessSelector'/)
    expect(code).not.toMatch(/from '@\/components\/access-control\/AccessBadges'/)
  })

  it('does not call the save endpoints directly', () => {
    // Saving belongs to the panels, atomically. The shell must not add a
    // second write path beside them.
    expect(code).not.toMatch(/saveRolePageAccess|saveDepartmentPageAccess|saveUserPageAccessOverrides/)
  })
})

/* ── 4. Contextual panels remain ────────────────────────────────────────── */

describe('existing contextual entry points still work', () => {
  it.each([
    ['src/components/super-admin/RoleDetailDrawer.tsx', 'RolePageAccessPanel'],
    ['src/pages/super-admin/crud/DepartmentsManagementPage.tsx', 'DepartmentPageAccessDrawer'],
  ])('%s still mounts %s', (file, component) => {
    expect(codeOf(file)).toMatch(new RegExp(`<${component}\\b`))
  })
})

/* ── 5. The rendered shell ──────────────────────────────────────────────── */

vi.mock('@/api/superAdminOpsApi', () => ({
  fetchWorkspaceDepartmentsForSuperAdmin: vi.fn(async () => [
    { id: '1', name_ar: 'إدارة العمليات', leader_name: 'قائد تجريبي' },
    { id: '2', name_ar: 'الإدارة المالية', leader_name: null },
  ]),
}))

vi.mock('@/api/adminUsersApi', () => ({
  searchAdminUsers: vi.fn(async () => [
    { id: 7, name: 'مستخدم تجريبي', email: 'u@emc.test', phone: null, avatar: null },
  ]),
}))

vi.mock('@/api/pageAccessCatalogApi', () => ({
  fetchPageAccessCatalog: vi.fn(async () => ({ pages: new Array(130).fill({}), categories: [] })),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'root', email: 'r@emc.test', role: 'super_admin' } }),
}))

// The editors fetch their own data; the shell test only needs to know WHICH one
// rendered, so each is stubbed with an identifiable marker.
vi.mock('@/components/access-control/DepartmentPageAccessPanel', () => ({
  DepartmentPageAccessPanel: ({ departmentName }: { departmentName: string }) => (
    <p>{`لوحة القسم: ${departmentName}`}</p>
  ),
}))
vi.mock('@/components/access-control/RolePageAccessPanel', () => ({
  RolePageAccessPanel: ({ roleLabelAr }: { roleLabelAr: string }) => <p>{`لوحة الدور: ${roleLabelAr}`}</p>,
}))
vi.mock('@/components/access-control/UserPageAccessPanel', () => ({
  UserPageAccessPanel: ({ userName }: { userName: string }) => <p>{`لوحة المستخدم: ${userName}`}</p>,
}))
vi.mock('@/components/access-control/EffectiveAccessPreview', () => ({
  EffectiveAccessPreview: ({ userName }: { userName: string }) => <p>{`الوصول الفعلي: ${userName}`}</p>,
}))

const { default: AccessControlCenterPage } = await import('@/pages/super-admin/AccessControlCenterPage')

function renderPage(entry = ROUTE) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={ROUTE} element={<AccessControlCenterPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the page shell', () => {
  it('renders the header, subtitle and the page-access warning', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'إدارة الوصول والصلاحيات' })).toBeInTheDocument()
    expect(screen.getByText(/إدارة وصول الأقسام والأدوار والمستخدمين/)).toBeInTheDocument()
    expect(
      screen.getByText(/صلاحية الوصول إلى الصفحة تحدد إمكانية فتح الصفحة/),
    ).toBeInTheDocument()
  })

  it('renders exactly four tabs', async () => {
    renderPage()

    const tabs = await screen.findAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      'الأقسام',
      'الأدوار',
      'المستخدمون',
      'معاينة الوصول الفعلي',
    ])
  })

  it('opens the tab named in the URL', async () => {
    renderPage(`${ROUTE}?tab=roles`)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /الأدوار/ })).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('falls back to the departments tab for an unknown tab value', async () => {
    renderPage(`${ROUTE}?tab=not-a-tab`)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /الأقسام/ })).toHaveAttribute('aria-selected', 'true')
    })
  })
})

describe('departments tab', () => {
  it('lists departments and mounts the shared department panel on selection', async () => {
    const user = userEvent.setup()
    renderPage()

    const option = await screen.findByRole('option', { name: /إدارة العمليات/ })
    await user.click(option)

    expect(await screen.findByText('لوحة القسم: إدارة العمليات')).toBeInTheDocument()
  })

  it('explains leader inheritance without duplicating member rows', async () => {
    renderPage()

    expect(
      await screen.findByText(/قائد القسم يرث صلاحيات أعضاء القسم بالإضافة إلى صلاحيات القيادة/),
    ).toBeInTheDocument()
  })
})

describe('roles tab', () => {
  it('mounts the shared role panel on selection and states the positive-only rule', async () => {
    const user = userEvent.setup()
    renderPage(`${ROUTE}?tab=roles`)

    expect(
      await screen.findByText(/هذه الصفحات تُمنح افتراضيًا لجميع المستخدمين الذين يحملون هذا الدور/),
    ).toBeInTheDocument()

    const options = await screen.findAllByRole('option')
    await user.click(options[0])

    expect(await screen.findByText(/^لوحة الدور: /)).toBeInTheDocument()
  })
})

describe('users tab', () => {
  it('explains the three override states in Arabic', async () => {
    renderPage(`${ROUTE}?tab=users`)

    expect(await screen.findByText(/افتراضي:/)).toBeInTheDocument()
    expect(screen.getByText(/سماح:/)).toBeInTheDocument()
    expect(screen.getByText(/منع:/)).toBeInTheDocument()
  })

  it('searches server-side and mounts the shared user panel on selection', async () => {
    const user = userEvent.setup()
    const { searchAdminUsers } = await import('@/api/adminUsersApi')
    renderPage(`${ROUTE}?tab=users`)

    await user.type(await screen.findByLabelText('البحث عن مستخدم'), 'مست')

    const option = await screen.findByRole('option', { name: /مستخدم تجريبي/ }, { timeout: 3000 })
    expect(searchAdminUsers).toHaveBeenCalled()

    await user.click(option)
    expect(await screen.findByText('لوحة المستخدم: مستخدم تجريبي')).toBeInTheDocument()
  })
})

describe('effective access tab', () => {
  it('mounts the shared preview for the selected user', async () => {
    const user = userEvent.setup()
    renderPage(`${ROUTE}?tab=effective`)

    expect(
      await screen.findByText(/هذه النتيجة محسوبة في الخادم/),
    ).toBeInTheDocument()

    await user.type(await screen.findByLabelText('البحث عن مستخدم'), 'مست')
    await user.click(await screen.findByRole('option', { name: /مستخدم تجريبي/ }, { timeout: 3000 }))

    expect(await screen.findByText('الوصول الفعلي: مستخدم تجريبي')).toBeInTheDocument()
  })
})
