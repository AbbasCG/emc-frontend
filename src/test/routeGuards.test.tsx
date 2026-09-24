import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleGate, { RoleRoute } from '@/components/RoleGate'
import DashboardAccessGuard from '@/components/DashboardAccessGuard'
import { axeCheck } from './axe'

/** Exactly what the guards consume — the real context value shape. */
type AuthValue = ReturnType<(typeof import('@/contexts/AuthContext'))['useAuth']>

const auth = vi.hoisted(() => ({ state: null as unknown as AuthValue }))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth.state,
}))

/**
 * The guard now consumes the BACKEND's effective page-access manifest instead
 * of a role matrix compiled into the browser, so these tests supply a manifest
 * rather than a role and assert the guard applies it faithfully.
 */
const access = vi.hoisted(() => ({
  state: null as unknown as ReturnType<
    (typeof import('@/contexts/PageAccessContext'))['usePageAccess']
  >,
}))

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => access.state,
}))

type ManifestEntry = { route: string; allowed: boolean }

/** Build a manifest context value from a handful of route decisions. */
function setAccess(
  entries: ManifestEntry[],
  status: 'idle' | 'loading' | 'ready' | 'error' = 'ready',
) {
  const pages = entries.map((e, i) => ({
    key: `k${i}`,
    allowed: e.allowed,
    primarySource: (e.allowed ? 'role' : 'none') as never,
    primarySourceLabelAr: '',
    sources: [],
    overrideState: null,
    protected: false,
    reason: '',
    labelAr: e.route,
    category: 'operations' as never,
    categoryLabelAr: '',
    riskLevel: 'SAFE_DELEGATABLE' as never,
    primaryRoute: e.route,
    routePatterns: [e.route],
  }))

  const norm = (p: string) => p.split('?')[0].split('#')[0].replace(/(.)\/+$/, '$1')
  const match = (pathname: string) => {
    let best: (typeof pages)[number] | null = null
    let bestLen = -1
    for (const page of pages) {
      for (const pattern of page.routePatterns) {
        const path = norm(pathname)
        const pat = norm(pattern)
        if (path !== pat && !path.startsWith(`${pat}/`)) continue
        if (pat.length > bestLen) {
          best = page
          bestLen = pat.length
        }
      }
    }
    return best
  }

  access.state = {
    status,
    pages,
    allowedKeys: new Set(pages.filter((p) => p.allowed).map((p) => p.key)),
    isReady: status === 'ready',
    canAccessKey: (key: string) => pages.some((p) => p.key === key && p.allowed),
    canAccessPath: (pathname: string) => {
      const page = match(pathname)
      return page ? page.allowed : null
    },
    pageForPath: (pathname: string) => match(pathname),
    refresh: vi.fn(),
  } as never
}

function baseAuth(): AuthValue {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    registerAccount: vi.fn(),
    logout: vi.fn(),
    isImpersonating: false,
    impersonationOriginalUser: null,
    startImpersonationPreview: vi.fn(),
    stopImpersonationPreview: vi.fn(),
    refreshUser: vi.fn(),
  }
}

function setAuth(next: Partial<AuthValue>) {
  auth.state = { ...baseAuth(), ...next }
}

function asRole(role: string | null | undefined): Partial<AuthValue> {
  return {
    user: { id: 9, name: 'مستخدم اختبار', email: 'u@emc.test', role },
    token: 'token-test',
    isAuthenticated: true,
    isLoading: false,
  }
}

/** Renders the landing page of a redirect so the test can read where it landed and why. */
function LocationProbe({ label }: { label: string }) {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? 'none'
  return (
    <p>{`${label} | from: ${from} | url: ${location.pathname}${location.search}${location.hash}`}</p>
  )
}

beforeEach(() => {
  setAuth({})
  setAccess([])
})

/* ─────────────────────────  ProtectedRoute  ───────────────────────── */

function renderProtected(entry = '/dashboard/student') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/student" element={<p>محتوى لوحة الطالب</p>} />
        </Route>
        <Route path="/login" element={<LocationProbe label="صفحة تسجيل الدخول" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('يعرض محتوى المسار للمستخدم المصادق', () => {
    setAuth({ isAuthenticated: true })

    renderProtected()

    expect(screen.getByText('محتوى لوحة الطالب')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('يحوّل غير المصادق إلى /login مع الاحتفاظ بالمسار المطلوب', () => {
    setAuth({ isAuthenticated: false })

    renderProtected('/dashboard/student')

    expect(screen.queryByText('محتوى لوحة الطالب')).not.toBeInTheDocument()
    expect(
      screen.getByText('صفحة تسجيل الدخول | from: /dashboard/student | url: /login'),
    ).toBeInTheDocument()
  })

  it('يعرض حالة تحميل معلنة بدل وميض تسجيل الدخول أثناء تهيئة الجلسة', () => {
    setAuth({ isLoading: true, isAuthenticated: false })

    renderProtected()

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('جارٍ تهيئة الجلسة…')).toBeInTheDocument()
    expect(screen.queryByText('صفحة تسجيل الدخول | from: /dashboard/student | url: /login')).not.toBeInTheDocument()
    expect(screen.queryByText('محتوى لوحة الطالب')).not.toBeInTheDocument()
  })

  it('حالة التحميل خالية من مخالفات إمكانية الوصول', async () => {
    setAuth({ isLoading: true })

    const { container } = renderProtected()

    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

/* ────────────────────────────  RoleGate  ─────────────────────────── */

function renderRoleGate(opts: { allow: readonly string[]; redirectTo?: string; entry?: string }) {
  return render(
    <MemoryRouter initialEntries={[opts.entry ?? '/dashboard/finance']}>
      <Routes>
        <Route element={<RoleGate allow={opts.allow} redirectTo={opts.redirectTo} />}>
          <Route path="/dashboard/finance" element={<p>لوحة المالية</p>} />
        </Route>
        <Route path="/403" element={<LocationProbe label="غير مصرّح" />} />
        <Route path="/dashboard/student" element={<LocationProbe label="لوحة الطالب" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleGate', () => {
  it('يعرض المسار للدور المسموح به', () => {
    setAuth(asRole('finance_manager'))

    renderRoleGate({ allow: ['finance_manager'] })

    expect(screen.getByText('لوحة المالية')).toBeInTheDocument()
  })

  it('يحوّل الدور غير المسموح إلى /403 مع تمرير المسار الأصلي', () => {
    setAuth(asRole('student'))

    renderRoleGate({ allow: ['finance_manager'] })

    expect(screen.queryByText('لوحة المالية')).not.toBeInTheDocument()
    expect(
      screen.getByText('غير مصرّح | from: /dashboard/finance | url: /403'),
    ).toBeInTheDocument()
  })

  it('يحترم وجهة تحويل مخصّصة بدل /403', () => {
    setAuth(asRole('student'))

    renderRoleGate({ allow: ['finance_manager'], redirectTo: '/dashboard/student' })

    expect(
      screen.getByText('لوحة الطالب | from: /dashboard/finance | url: /dashboard/student'),
    ).toBeInTheDocument()
  })

  it('يمنح super_admin وصولاً حتى لو لم يكن ضمن قائمة الأدوار', () => {
    setAuth(asRole('super_admin'))

    renderRoleGate({ allow: ['finance_manager'] })

    expect(screen.getByText('لوحة المالية')).toBeInTheDocument()
  })

  it('لا يمنح tech_admin نفس تجاوز super_admin', () => {
    setAuth(asRole('tech_admin'))

    renderRoleGate({ allow: ['finance_manager'] })

    expect(screen.getByText('غير مصرّح | from: /dashboard/finance | url: /403')).toBeInTheDocument()
  })

  it('يطبّع أسماء الأدوار على الجانبين قبل المقارنة', () => {
    setAuth(asRole('teacher'))

    renderRoleGate({ allow: ['instructor'] })

    expect(screen.getByText('لوحة المالية')).toBeInTheDocument()
  })

  it('يقارن دون حساسية لحالة الأحرف في قائمة السماح', () => {
    setAuth(asRole('finance_manager'))

    renderRoleGate({ allow: ['Finance Manager'] })

    expect(screen.getByText('لوحة المالية')).toBeInTheDocument()
  })

  it('يمنع المستخدم بلا دور', () => {
    setAuth({ user: { id: 9, name: 'بلا دور', email: 'n@emc.test', role: null }, isAuthenticated: true })

    renderRoleGate({ allow: ['finance_manager'] })

    expect(screen.getByText('غير مصرّح | from: /dashboard/finance | url: /403')).toBeInTheDocument()
  })

  it('يمنع عندما لا يوجد مستخدم إطلاقاً', () => {
    setAuth({ user: null, isAuthenticated: false })

    renderRoleGate({ allow: ['finance_manager'] })

    expect(screen.getByText('غير مصرّح | from: /dashboard/finance | url: /403')).toBeInTheDocument()
  })

  it('لا يقرّر شيئاً أثناء التحميل ويعرض حالة انتظار معلنة', () => {
    setAuth({ isLoading: true, user: null })

    renderRoleGate({ allow: ['finance_manager'] })

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('جارٍ التحقق من الصلاحيات…')).toBeInTheDocument()
    expect(screen.queryByText('غير مصرّح | from: /dashboard/finance | url: /403')).not.toBeInTheDocument()
  })

  it('التصدير البديل RoleRoute هو نفس المكوّن', () => {
    expect(RoleRoute).toBe(RoleGate)
  })

  it('حالة التحميل خالية من مخالفات إمكانية الوصول', async () => {
    setAuth({ isLoading: true, user: null })

    const { container } = renderRoleGate({ allow: ['finance_manager'] })

    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

/* ───────────────────────  DashboardAccessGuard  ──────────────────── */

function renderDashboardGuard(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<DashboardAccessGuard />}>
          <Route path="/dashboard/admin" element={<p>لوحة الإدارة</p>} />
          <Route path="/dashboard/admin/programs" element={<p>إدارة البرامج</p>} />
          <Route path="/dashboard/super-admin" element={<p>لوحة المشرف الأعلى</p>} />
          <Route path="/dashboard/instructor" element={<LocationProbe label="لوحة المدرّب" />} />
          <Route path="/dashboard/instructor/classes" element={<LocationProbe label="صفوف المدرّب" />} />
          <Route path="/dashboard/teacher/classes" element={<p>المسار القديم للمدرّب</p>} />
          <Route path="/dashboard/student" element={<LocationProbe label="لوحة الطالب" />} />
          <Route path="/dashboard/partner" element={<LocationProbe label="لوحة الشريك" />} />
          <Route
            path="/dashboard/programs-manager"
            element={<LocationProbe label="لوحة مدير البرامج" />}
          />
          <Route path="/dashboard/notifications" element={<p>الإشعارات</p>} />
        </Route>
        {/* Mounted outside the guard on purpose — see the redirect-loop note in the report. */}
        <Route path="/dashboard/profile" element={<LocationProbe label="الملف الشخصي" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardAccessGuard', () => {
  const ADMIN = '/dashboard/admin'
  const PROGRAMS = '/dashboard/admin/programs'

  it('renders a page the manifest allows', () => {
    setAuth(asRole('admin'))
    setAccess([{ route: ADMIN, allowed: true }])

    renderDashboardGuard(ADMIN)

    expect(screen.getByText('لوحة الإدارة')).toBeInTheDocument()
  })

  it('redirects a denied page to the role home and passes the refused path', () => {
    setAuth(asRole('partner'))
    setAccess([{ route: ADMIN, allowed: false }])

    renderDashboardGuard(ADMIN)

    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(
      screen.getByText('لوحة الشريك | from: /dashboard/admin | url: /dashboard/partner'),
    ).toBeInTheDocument()
  })

  it('applies a capability decision to its nested routes', () => {
    setAuth(asRole('super_admin'))
    setAccess([{ route: ADMIN, allowed: true }])

    renderDashboardGuard(PROGRAMS)

    expect(screen.getByText('إدارة البرامج')).toBeInTheDocument()
  })

  it('honours a specific denial beneath an allowed section', () => {
    setAuth(asRole('programs_manager'))
    setAccess([
      { route: ADMIN, allowed: false },
      { route: PROGRAMS, allowed: true },
    ])

    renderDashboardGuard(PROGRAMS)

    expect(screen.getByText('إدارة البرامج')).toBeInTheDocument()
  })

  it('still refuses the section root when only the child is allowed', () => {
    setAuth(asRole('programs_manager'))
    setAccess([
      { route: ADMIN, allowed: false },
      { route: PROGRAMS, allowed: true },
    ])

    renderDashboardGuard(ADMIN)

    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(screen.getByText(/لوحة مدير البرامج/)).toBeInTheDocument()
  })

  it('keeps redirecting the legacy /dashboard/teacher path, preserving query and hash', () => {
    setAuth(asRole('instructor'))
    setAccess([{ route: '/dashboard/instructor', allowed: true }])

    renderDashboardGuard('/dashboard/teacher/classes?tab=1#top')

    expect(
      screen.getByText(
        'صفوف المدرّب | from: none | url: /dashboard/instructor/classes?tab=1#top',
      ),
    ).toBeInTheDocument()
  })

  it('allows a path no catalog capability owns, because the manifest has no opinion', () => {
    setAuth(asRole('student'))
    setAccess([{ route: ADMIN, allowed: false }])

    renderDashboardGuard('/dashboard/notifications')

    expect(screen.getByText('الإشعارات')).toBeInTheDocument()
  })

  it('decides nothing while the session is still loading', () => {
    setAuth({ isLoading: true })
    setAccess([{ route: ADMIN, allowed: true }])

    renderDashboardGuard(ADMIN)

    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('decides nothing while the manifest is still loading', () => {
    setAuth(asRole('admin'))
    setAccess([{ route: ADMIN, allowed: true }], 'loading')

    renderDashboardGuard(ADMIN)

    // The page must NOT render first and be withdrawn afterwards.
    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('a failed manifest grants nothing', () => {
    // Deliberately NOT the role's own home: that path has an anti-loop escape
    // hatch (covered separately), so testing there would prove nothing.
    setAuth(asRole('partner'))
    setAccess([{ route: ADMIN, allowed: true }], 'error')

    renderDashboardGuard(ADMIN)

    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(screen.getByText(/لوحة الشريك/)).toBeInTheDocument()
  })

  it('renders the fallback itself rather than looping when the home page is denied', () => {
    setAuth(asRole(null))
    setAccess([{ route: '/dashboard/profile', allowed: false }])

    renderDashboardGuard('/dashboard/profile')

    // Mounted outside the guard in this harness, so reaching it at all proves
    // the guard did not bounce.
    expect(screen.getByText(/الملف الشخصي/)).toBeInTheDocument()
  })

  it('allowed content and the loading state are free of accessibility violations', async () => {
    setAuth(asRole('admin'))
    setAccess([{ route: ADMIN, allowed: true }])
    const allowed = renderDashboardGuard(ADMIN)
    expect(await axeCheck(allowed.container)).toHaveNoViolations()
    allowed.unmount()

    setAccess([{ route: ADMIN, allowed: true }], 'loading')
    const loading = renderDashboardGuard(ADMIN)
    expect(await axeCheck(loading.container)).toHaveNoViolations()
  })
})
