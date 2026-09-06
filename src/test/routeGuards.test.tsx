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
  it('يسمح للدور المطابق لمساحة اسم اللوحة', () => {
    setAuth(asRole('admin'))

    renderDashboardGuard('/dashboard/admin')

    expect(screen.getByText('لوحة الإدارة')).toBeInTheDocument()
  })

  it('يحوّل الدور غير المصرّح إلى لوحته الرئيسية مع تمرير المسار المرفوض', () => {
    setAuth(asRole('partner'))

    renderDashboardGuard('/dashboard/admin')

    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(
      screen.getByText('لوحة الشريك | from: /dashboard/admin | url: /dashboard/partner'),
    ).toBeInTheDocument()
  })

  it('يمنح super_admin وصولاً لكامل مساحة اللوحة', () => {
    setAuth(asRole('super_admin'))

    renderDashboardGuard('/dashboard/admin/programs')

    expect(screen.getByText('إدارة البرامج')).toBeInTheDocument()
  })

  it('يسمح لمدير البرامج بمسار البرامج الدقيق داخل مساحة الإدارة', () => {
    setAuth(asRole('programs_manager'))

    renderDashboardGuard('/dashboard/admin/programs')

    expect(screen.getByText('إدارة البرامج')).toBeInTheDocument()
  })

  it('يمنع مدير البرامج من جذر مساحة الإدارة', () => {
    setAuth(asRole('programs_manager'))

    renderDashboardGuard('/dashboard/admin')

    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'لوحة مدير البرامج | from: /dashboard/admin | url: /dashboard/programs-manager',
      ),
    ).toBeInTheDocument()
  })

  it('يحوّل المدرّب من المسار القديم /dashboard/teacher مع الحفاظ على الاستعلام والمرساة', () => {
    setAuth(asRole('instructor'))

    renderDashboardGuard('/dashboard/teacher/classes?tab=active#top')

    expect(screen.queryByText('المسار القديم للمدرّب')).not.toBeInTheDocument()
    expect(
      screen.getByText('صفوف المدرّب | from: none | url: /dashboard/instructor/classes?tab=active#top'),
    ).toBeInTheDocument()
  })

  it('لا يعيد توجيه غير المدرّب من مسار /dashboard/teacher بل يمنعه', () => {
    setAuth(asRole('student'))

    renderDashboardGuard('/dashboard/teacher/classes')

    expect(screen.queryByText('المسار القديم للمدرّب')).not.toBeInTheDocument()
    expect(
      screen.getByText('لوحة الطالب | from: /dashboard/teacher/classes | url: /dashboard/student'),
    ).toBeInTheDocument()
  })

  it('يسمح لأي دور بالمسارات المشتركة مثل الإشعارات', () => {
    setAuth(asRole('student'))

    renderDashboardGuard('/dashboard/notifications')

    expect(screen.getByText('الإشعارات')).toBeInTheDocument()
  })

  it('يحوّل المستخدم بلا دور إلى الملف الشخصي المحايد', () => {
    setAuth({ user: { id: 9, name: 'بلا دور', email: 'n@emc.test', role: null }, isAuthenticated: true })

    renderDashboardGuard('/dashboard/admin')

    expect(
      screen.getByText('الملف الشخصي | from: /dashboard/admin | url: /dashboard/profile'),
    ).toBeInTheDocument()
  })

  it('لا يقرّر شيئاً أثناء تحميل الجلسة', () => {
    setAuth({ isLoading: true, user: null })

    renderDashboardGuard('/dashboard/admin')

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('لوحة الإدارة')).not.toBeInTheDocument()
    expect(screen.queryByText(/الملف الشخصي/)).not.toBeInTheDocument()
  })

  it('المحتوى المسموح وحالة التحميل خاليان من مخالفات إمكانية الوصول', async () => {
    setAuth({ isLoading: true, user: null })
    const loadingView = renderDashboardGuard('/dashboard/admin')
    expect(await axeCheck(loadingView.container)).toHaveNoViolations()
    loadingView.unmount()

    setAuth(asRole('admin'))
    const { container } = renderDashboardGuard('/dashboard/admin')
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
