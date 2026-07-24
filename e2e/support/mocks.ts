/**
 * M1.5 — serverless API mocks for the EMC frontend E2E harness.
 *
 * The real Laravel API (http://127.0.0.1:8000/api) is NOT available in tests.
 * `mockApi(page)` intercepts BOTH the absolute baked-in origin and any
 * same-origin `/api/**` request (belt + braces) and fulfills from fixtures
 * whose shapes mirror what the frontend normalizers actually accept:
 *
 *  - auth:        src/api/authApi.ts + src/utils/userIdentity.ts
 *                 (login → { data: { token, user } }, me → { data: { user } })
 *  - courses:     src/api/coursesApi.public.ts (+ mapApiCourseToCourseItem)
 *  - student:     src/api/studentApi.ts (registrations/dashboard/progress …)
 *  - notifications: src/api/notificationsApi.ts (list + unread_count + meta —
 *                 polling fallback; realtime stays OFF because VITE_REVERB_*
 *                 is unset, see src/lib/echo.ts isRealtimeConfigured()).
 *  - enrollment:  POST /courses/{id}/register (src/api/registrationsApi.ts)
 *  - workshops:   POST /workshop-requests (src/api/workshopRequestsApi.ts)
 *  - admin stats: GET /admin/stats (src/api/adminUsersApi.ts fetchSuperAdminStats
 *                 — needs the full SuperAdminStats shape; `{ data: [] }` crashes
 *                 SuperAdminOverviewPage, see SUPER_ADMIN_STATS below)
 *
 * Unmatched /api routes are fulfilled with 200 { success:true, data: [] } and
 * recorded in `state.warnings` (also console.warn'ed in the runner output).
 */

import type { Page, Route } from '@playwright/test'

// ─── roles / users ───────────────────────────────────────────────────────────

export type MockRole = 'student' | 'instructor' | 'super_admin'

export const PASSWORD = 'Password!123' // accepted for every fixture account

export const USERS: Record<MockRole, Record<string, unknown>> = {
  student: {
    id: 1101,
    name: 'طالب الاختبار',
    email: 'student@emc.test',
    phone: '+31612345678',
    city: 'أمستردام',
    country: 'NL',
    gender: 'male',
    role: 'student',
    is_active: true,
    email_verified_at: '2026-01-01T10:00:00Z',
    created_at: '2026-01-01T10:00:00Z',
    permissions: [],
  },
  instructor: {
    id: 1102,
    name: 'مدرب الاختبار',
    email: 'instructor@emc.test',
    phone: '+31612345679',
    city: 'روتردام',
    country: 'NL',
    gender: 'male',
    role: 'instructor',
    is_active: true,
    email_verified_at: '2026-01-01T10:00:00Z',
    created_at: '2026-01-01T10:00:00Z',
    permissions: [],
  },
  super_admin: {
    id: 1103,
    name: 'مشرف الاختبار',
    email: 'super@emc.test',
    phone: '+31612345680',
    city: 'لاهاي',
    country: 'NL',
    gender: 'female',
    role: 'super_admin',
    is_active: true,
    email_verified_at: '2026-01-01T10:00:00Z',
    created_at: '2026-01-01T10:00:00Z',
    permissions: [],
  },
}

const EMAIL_TO_ROLE: Record<string, MockRole> = {
  'student@emc.test': 'student',
  'instructor@emc.test': 'instructor',
  'super@emc.test': 'super_admin',
}

export function tokenFor(role: MockRole): string {
  return `e2e-token-${role}`
}

// ─── date helpers (relative so fixtures never rot) ───────────────────────────

function isoDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoDateTime(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

// ─── course fixtures ─────────────────────────────────────────────────────────

/** Free, open-for-registration course used by the browse→enroll journey. */
export const COURSE_MAIN = {
  id: 101,
  title: 'أساسيات الذكاء الاصطناعي',
  slug: 'ai-fundamentals',
  description:
    'دورة تمهيدية عملية في الذكاء الاصطناعي تغطي المفاهيم الأساسية والتطبيقات العملية خطوة بخطوة.',
  short_description: 'دورة تمهيدية عملية في الذكاء الاصطناعي.',
  type: 'free',
  is_free: true,
  is_paid: false,
  price: 0,
  currency: 'EUR',
  level: 'beginner',
  language: 'العربية',
  status: 'published',
  is_published: true,
  registration_open: true,
  requires_registration_code: false,
  capacity: 30,
  seats_count: 30,
  registrations_count: 25,
  effective_enrollment_count: 25,
  start_date: isoDate(14),
  end_date: isoDate(60),
  start_time: '18:00',
  end_time: '20:00',
  duration: '6 أسابيع',
  training_hours: 24,
  is_online: true,
  location_type: 'online',
  program_kind: 'course',
  instructor: { id: 7, name: 'م. سارة الأحمد', image: null },
  instructor_name: 'م. سارة الأحمد',
  whatsapp_community_url: null,
  computed_status: 'active',
  is_ended: false,
}

/** Second course — the student fixture is ALREADY enrolled in this one. */
export const COURSE_ENROLLED = {
  ...COURSE_MAIN,
  id: 202,
  title: 'أساسيات تحليل البيانات',
  slug: 'data-analysis-basics',
  description: 'دورة عملية في تحليل البيانات باستخدام أدوات حديثة.',
  short_description: 'دورة عملية في تحليل البيانات.',
  registrations_count: 12,
  effective_enrollment_count: 12,
  start_date: isoDate(-7),
  end_date: isoDate(45),
  instructor: { id: 8, name: 'د. ليان الخطيب', image: null },
  instructor_name: 'د. ليان الخطيب',
}

const ACCESS_ALLOWED = {
  is_paid_course: false,
  payment_required: false,
  payment_status: null,
  payment_completed: true,
  payment_url: null,
  enrollment_active: true,
  can_start_placement_test: false,
  placement_test_required: false,
  can_access_learning: true,
  block_reason: 'access_allowed',
  registration_id: 5202,
}

const REG_ROW_ENROLLED = {
  id: 5202,
  course_id: COURSE_ENROLLED.id,
  course_title: COURSE_ENROLLED.title,
  slug: COURSE_ENROLLED.slug,
  status: 'active',
  enrolled_at: isoDateTime(-10),
  start_date: COURSE_ENROLLED.start_date,
  start_time: COURSE_ENROLLED.start_time,
  end_date: COURSE_ENROLLED.end_date,
  is_ended: false,
  computed_status: 'active',
  meeting_link: null,
  instructor_name: COURSE_ENROLLED.instructor_name,
  access: ACCESS_ALLOWED,
}

const REG_ROW_MAIN = {
  id: 5101,
  course_id: COURSE_MAIN.id,
  course_title: COURSE_MAIN.title,
  slug: COURSE_MAIN.slug,
  status: 'active',
  enrolled_at: isoDateTime(0),
  start_date: COURSE_MAIN.start_date,
  start_time: COURSE_MAIN.start_time,
  end_date: COURSE_MAIN.end_date,
  is_ended: false,
  computed_status: 'active',
  meeting_link: null,
  instructor_name: COURSE_MAIN.instructor_name,
  access: { ...ACCESS_ALLOWED, registration_id: 5101 },
}

const STUDENT_COURSE_ROW = {
  id: COURSE_ENROLLED.id,
  title: COURSE_ENROLLED.title,
  slug: COURSE_ENROLLED.slug,
  instructor_name: COURSE_ENROLLED.instructor_name,
  progress_percent: 35,
  status: 'active',
  start_date: COURSE_ENROLLED.start_date,
  start_time: COURSE_ENROLLED.start_time,
  end_date: COURSE_ENROLLED.end_date,
  is_ended: false,
  computed_status: 'active',
  meeting_link: null,
  cover_url: null,
  requires_placement_test: false,
  placement_status: null,
  can_start_learning: true,
  class_assignment: null,
}

// ─── notifications (polling fallback — no websocket) ─────────────────────────

export const NOTIFICATIONS = [
  {
    id: 9001,
    type: 'course_update',
    title: 'تحديث في الدورة',
    body: 'تمت إضافة مادة تعليمية جديدة إلى دورتك.',
    is_read: false,
    read_at: null,
    created_at: isoDateTime(0),
    action_url: null,
    meta_url: null,
    pinned: false,
    archived_at: null,
  },
  {
    id: 9002,
    type: 'session_reminder',
    title: 'تذكير بجلسة قادمة',
    body: 'لديك جلسة مباشرة غداً.',
    is_read: false,
    read_at: null,
    created_at: isoDateTime(-1),
    action_url: null,
    meta_url: null,
    pinned: false,
    archived_at: null,
  },
  {
    id: 9003,
    type: 'registration',
    title: 'تم تأكيد تسجيلك',
    body: 'تم تأكيد تسجيلك في الدورة بنجاح.',
    is_read: true,
    read_at: isoDateTime(-2),
    created_at: isoDateTime(-3),
    action_url: null,
    meta_url: null,
    pinned: false,
    archived_at: null,
  },
]

export const UNREAD_COUNT = NOTIFICATIONS.filter((n) => !n.is_read).length // 2

// ─── super-admin overview stats (GET /admin/stats) ───────────────────────────
// Shape mirrors SuperAdminStats in src/api/adminUsersApi.ts. The catch-all
// `{ success:true, data: [] }` is NOT safe for this endpoint:
// fetchSuperAdminStats() returns `data` as-is (an empty array is truthy) and
// SuperAdminOverviewPage then reads `stats?.users.total`, which throws and
// sends the whole dashboard into the ErrorBoundary.

function statsChartMonth(monthsAgo: number, i: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return {
    key,
    label: d.toLocaleDateString('ar-SA', { month: 'short' }),
    students: 3 + i,
    registrations: 4 + i,
  }
}

export const SUPER_ADMIN_STATS = {
  users: {
    total: 42,
    active: 40,
    inactive: 2,
    new_this_month: 6,
    new_last_month: 5,
    change_percentage: 20,
  },
  students: {
    total: 30,
    active: 28,
    new_this_month: 4,
    new_last_month: 4,
    change_percentage: 0,
  },
  registrations: {
    total: 37,
    pending: 2,
    new_this_month: 9,
    new_last_month: 6,
    change_percentage: 50,
  },
  courses: { total: 2 },
  chart: [5, 4, 3, 2, 1, 0].map((monthsAgo, i) => statsChartMonth(monthsAgo, i)),
}

// ─── shared UI text constants (from the real app code) ───────────────────────

/** src/components/ErrorBoundary.tsx heading */
export const ERROR_BOUNDARY_TEXT = 'حدث خطأ غير متوقع'
/** src/pages/Dashboard.tsx error widget title */
export const STUDENT_DASH_ERROR_TEXT = 'تعذّر تحميل لوحة الطالب'

// ─── mock state / registry ───────────────────────────────────────────────────

export type MockState = {
  /** Role returned by GET /auth/me and POST-login user payloads. */
  role: MockRole
  /** Flips true after POST /courses/{id}/register for COURSE_MAIN. */
  enrolled: boolean
  /** Pathnames of /api requests that hit the catch-all. */
  warnings: string[]
}

const stateByPage = new WeakMap<Page, MockState>()

export function getMockState(page: Page): MockState {
  const s = stateByPage.get(page)
  if (!s) throw new Error('mockApi(page) must be called before getMockState/loginAs')
  return s
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, accept, x-requested-with',
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** 1×1 transparent PNG for stubbed external images. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

// ─── the mock installer ──────────────────────────────────────────────────────

export async function mockApi(
  page: Page,
  opts: { role?: MockRole } = {},
): Promise<{ state: MockState }> {
  const state: MockState = {
    role: opts.role ?? 'student',
    enrolled: false,
    warnings: [],
  }
  stateByPage.set(page, state)

  // ── external assets: keep tests hermetic (no internet needed) ──
  await page.route('https://images.unsplash.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG }),
  )
  await page.route('https://fonts.googleapis.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/css', body: '/* e2e stub */' }),
  )
  await page.route('https://fonts.gstatic.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'font/woff2', body: Buffer.alloc(0) }),
  )

  const handler = async (route: Route): Promise<void> => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const url = new URL(request.url())
    const apiIdx = url.pathname.indexOf('/api/')
    const path = apiIdx >= 0 ? url.pathname.slice(apiIdx + 4) : url.pathname // → '/courses'

    // CORS preflight (axios sends Authorization + application/json)
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' })
    }

    const user = () => USERS[state.role]

    // ── auth ──
    if (method === 'POST' && path === '/auth/login') {
      let email = ''
      try {
        email = String((request.postDataJSON() as { email?: string })?.email ?? '')
      } catch {
        /* non-JSON body */
      }
      const role = EMAIL_TO_ROLE[email.toLowerCase()] ?? 'student'
      state.role = role
      return json(route, {
        success: true,
        data: { token: tokenFor(role), user: USERS[role], permissions: [] },
      })
    }
    if (method === 'GET' && path === '/auth/me') {
      return json(route, { success: true, data: { user: user(), permissions: [] } })
    }
    if (method === 'POST' && path === '/auth/logout') {
      return json(route, { success: true })
    }

    // ── profile (EnrollmentForm prefill + updateProfile) ──
    if (path === '/profile' && (method === 'GET' || method === 'PATCH' || method === 'PUT')) {
      return json(route, { success: true, data: { user: user() } })
    }

    // ── public catalog ──
    if (method === 'GET' && path === '/courses') {
      return json(route, { success: true, data: [COURSE_MAIN, COURSE_ENROLLED] })
    }
    const detailMatch = method === 'GET' ? /^\/courses\/([^/]+)$/.exec(path) : null
    if (detailMatch) {
      const slug = decodeURIComponent(detailMatch[1])
      const course = [COURSE_MAIN, COURSE_ENROLLED].find((c) => c.slug === slug)
      if (!course) return json(route, { success: false, message: 'Not found' }, 404)
      return json(route, { success: true, data: course })
    }
    if (method === 'GET' && (path === '/workshops' || path === '/tracks')) {
      return json(route, { success: true, data: [] })
    }

    // ── enrollment ──
    if (method === 'POST' && (/^\/courses\/\d+\/register$/.test(path) || path === '/register')) {
      state.enrolled = true
      return json(route, {
        success: true,
        data: { id: 5101, checkout_url: null, payment_id: null },
      })
    }

    // ── student scope ──
    if (method === 'GET' && path === '/student/registrations') {
      const rows = [REG_ROW_ENROLLED, ...(state.enrolled ? [REG_ROW_MAIN] : [])]
      return json(route, { success: true, data: rows })
    }
    if (method === 'GET' && path === '/student/courses') {
      return json(route, { success: true, data: [STUDENT_COURSE_ROW] })
    }
    if (method === 'GET' && path === '/student/dashboard') {
      return json(route, {
        success: true,
        data: {
          stats: {
            enrolled_courses_count: 1,
            active_courses_count: 1,
            completed_courses_count: 0,
            pending_assignments_count: 0,
            upcoming_sessions_count: 0,
            unread_notifications_count: UNREAD_COUNT,
            certificates_count: 0,
            learning_paths_count: 0,
            training_hours: 24,
          },
          progress_percent: 35,
          attendance_percent: 80,
          current_courses: [STUDENT_COURSE_ROW],
          active_courses: [STUDENT_COURSE_ROW],
          recent_courses: [STUDENT_COURSE_ROW],
          upcoming_sessions: [],
          live_sessions: [],
          ended_sessions: [],
          pending_assignments: [],
          notifications: NOTIFICATIONS,
          certificates: [],
        },
      })
    }
    if (method === 'GET' && path === '/student/progress') {
      return json(route, {
        success: true,
        data: {
          course_progress: [
            {
              course_id: COURSE_ENROLLED.id,
              course_title: COURSE_ENROLLED.title,
              slug: COURSE_ENROLLED.slug,
              progress_percent: 35,
              sessions_completed: 3,
              sessions_total: 8,
              assignments_done: 1,
              assignments_total: 2,
            },
          ],
          attendance_percent: 80,
          overall_assignment_completion: 50,
        },
      })
    }
    if (method === 'GET' && path === '/student/sessions') {
      return json(route, { success: true, data: { upcoming: [], completed: [] } })
    }
    if (method === 'GET' && path === '/student/attendance/summary') {
      return json(route, {
        success: true,
        data: {
          total: 0,
          present_count: 0,
          absent_count: 0,
          late_count: 0,
          excused_count: 0,
          attendance_percentage: 0,
          current_attendance_streak: 0,
          current_absence_streak: 0,
          current_late_streak: 0,
          longest_attendance_streak: 0,
          longest_absence_streak: 0,
          risk_level: 'low',
        },
      })
    }

    // ── notifications (REST polling fallback — realtime is disabled) ──
    if (method === 'GET' && path === '/notifications') {
      return json(route, {
        success: true,
        unread_count: UNREAD_COUNT,
        data: NOTIFICATIONS,
        meta: { total: NOTIFICATIONS.length, current_page: 1, last_page: 1, per_page: 20 },
      })
    }
    if (
      (method === 'PUT' && /^\/notifications\/\d+\/(read|pin|unpin|archive|unarchive)$/.test(path)) ||
      (method === 'POST' && (path === '/notifications/read-all' || path === '/notifications/bulk')) ||
      (method === 'DELETE' && /^\/notifications\/\d+$/.test(path))
    ) {
      return json(route, { success: true, affected: 1 })
    }

    // ── workshop request wizard ──
    if (method === 'POST' && path === '/workshop-requests') {
      return json(route, { success: true, data: { id: 3001, status: 'pending' } })
    }

    // ── super-admin overview KPIs (SuperAdminOverviewPage) ──
    // Must NOT fall through to the catch-all — see SUPER_ADMIN_STATS note above.
    if (method === 'GET' && path === '/admin/stats') {
      return json(route, { success: true, data: SUPER_ADMIN_STATS })
    }

    // ── catch-all: valid-but-empty payload + warning for debugging ──
    const key = `${method} ${path}`
    if (!state.warnings.includes(key)) {
      state.warnings.push(key)
      // eslint-disable-next-line no-console
      console.warn(`[e2e mock] unmatched API route → ${key} (fulfilled with { data: [] })`)
    }
    return json(route, { success: true, data: [] })
  }

  // Belt + braces: absolute baked-in origin AND any same-origin /api path.
  await page.route('**/api/**', handler)
  await page.route('http://127.0.0.1:8000/api/**', handler)

  return { state }
}

// ─── auth seeding ────────────────────────────────────────────────────────────

/**
 * Fast-path login: seeds localStorage with emc_token + emc_user BEFORE any
 * document loads (AuthContext hydrates from these keys, then re-validates via
 * the mocked GET /auth/me). Call AFTER mockApi(page) and BEFORE page.goto().
 *
 * The UI-driven login path is exercised separately in login-learn.spec.ts.
 */
export async function loginAs(page: Page, role: MockRole): Promise<void> {
  const state = getMockState(page)
  state.role = role
  await page.addInitScript(
    ({ token, userJson }) => {
      window.localStorage.setItem('emc_token', token)
      window.localStorage.setItem('emc_user', userJson)
    },
    { token: tokenFor(role), userJson: JSON.stringify(USERS[role]) },
  )
}

// ─── console error collection (smoke) ────────────────────────────────────────

/** Known-noise patterns that must NOT fail the smoke suite. */
export const CONSOLE_ERROR_WHITELIST: RegExp[] = [
  /Failed to load resource/i, // fonts/images 404s — assets, not app errors
  /net::ERR/i,
  /ERR_(CONNECTION|NAME|INTERNET|NETWORK)/i,
  /reverb|VITE_REVERB/i, // realtime intentionally disabled in tests
  /WebSocket/i,
  /service.?worker|sw\.js/i,
  /manifest/i,
  /preload/i,
  /React DevTools/i,
  /Third-party cookie/i,
]

/**
 * Starts collecting page console.error output + uncaught page errors,
 * filtered through the whitelist. Attach BEFORE page.goto().
 */
export function collectConsoleErrors(
  page: Page,
  whitelist: RegExp[] = CONSOLE_ERROR_WHITELIST,
): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (whitelist.some((re) => re.test(text))) return
    errors.push(text)
  })
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`)
  })
  return errors
}
