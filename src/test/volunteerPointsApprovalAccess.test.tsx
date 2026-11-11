import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import DashboardAccessGuard from '@/components/DashboardAccessGuard'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'
import { filterSidebarGroupsByAccess } from '@/utils/sidebarAccessFilter'
import { isPathAllowed } from '@/utils/pageAccessMatch'
import type { EffectivePageAccessRow } from '@/api/accessControlApi'
import baselineJson from '@/test/fixtures/accessEffectiveBaseline.json'

/**
 * /dashboard/hr/volunteer-points-approval — allow / deny on the frontend.
 *
 * The page now has its own registry key (hr.volunteer_points_approval). Before, the HR home entry (`/dashboard/hr`)
 * owned it by prefix, so "can open the HR home" and "can open the approval queue" were one decision. These tests pin
 * that they are two decisions, and that the guard and the sidebar follow the backend's verdict for the new key.
 */

const KEY = 'hr.volunteer_points_approval'
const HREF = '/dashboard/hr/volunteer-points-approval'
const HR_HOME = '/dashboard/hr'

const state = vi.hoisted(() => ({
  role: 'hr_manager',
  status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
  rows: [] as EffectivePageAccessRow[],
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: state.role }, isLoading: false }),
}))

vi.mock('@/contexts/PageAccessContext', async () => {
  const match = await import('@/utils/pageAccessMatch')
  return {
    usePageAccess: () => ({
      status: state.status,
      pages: state.rows,
      allowedKeys: new Set(state.rows.filter((r) => r.allowed).map((r) => r.key)),
      isReady: state.status === 'ready',
      canAccessKey: (k: string) => state.rows.some((r) => r.key === k && r.allowed),
      canAccessPath: (p: string) => match.isPathAllowed(state.rows, p),
      pageForPath: () => null,
      refresh: async () => {},
    }),
  }
})

/** The manifest rows come from the committed catalog, so the real route patterns (not hand-written ones) are tested. */
function manifest(allowed: Record<string, boolean>): EffectivePageAccessRow[] {
  return (baselineJson.catalog as Array<Record<string, unknown>>)
    .filter((c) => (c.key as string) in allowed)
    .map((c) => ({
      key: c.key as string,
      allowed: allowed[c.key as string],
      primarySource: (allowed[c.key as string] ? 'role' : 'none') as never,
      primarySourceLabelAr: '',
      sources: [],
      overrideState: null,
      protected: false,
      reason: '',
      labelAr: c.label_ar as string,
      category: c.category as never,
      categoryLabelAr: '',
      riskLevel: c.risk_level as never,
      primaryRoute: c.primary_route as string,
      routePatterns: c.route_patterns as string[],
    }))
}

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={[HREF]}>
      <Routes>
        <Route element={<DashboardAccessGuard />}>
          <Route path={HREF} element={<div>قائمة اعتماد النقاط</div>} />
          <Route path="/dashboard/hr-manager" element={<div>الرئيسية</div>} />
          <Route path="/dashboard/student" element={<div>لوحة الطالب</div>} />
          <Route path="/dashboard/volunteer" element={<div>لوحة المتطوع</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const hrefs = (role: string) => getSidebarByRole(role).flatMap((g) => g.items.map((i) => i.href))

beforeEach(() => {
  state.role = 'hr_manager'
  state.status = 'ready'
  state.rows = []
})

describe('route resolution', () => {
  it('maps the page to its own key and the HR home to the HR home key', () => {
    state.rows = manifest({ [KEY]: false, 'hr.dashboard': true })

    expect(isPathAllowed(state.rows, HREF)).toBe(false)
    expect(isPathAllowed(state.rows, HR_HOME)).toBe(true)
  })

  it('allowing the page does not open the HR home, and vice versa', () => {
    state.rows = manifest({ [KEY]: true, 'hr.dashboard': false })

    expect(isPathAllowed(state.rows, HREF)).toBe(true)
    expect(isPathAllowed(state.rows, HR_HOME)).toBe(false)
  })
})

describe('the route guard', () => {
  it('opens the page when the manifest allows the key (hr_manager / root)', () => {
    state.rows = manifest({ [KEY]: true, 'hr.dashboard': true })
    renderGuarded()

    expect(screen.getByText('قائمة اعتماد النقاط')).toBeTruthy()
  })

  it('blocks the page when the key is denied, even if the HR home is allowed', () => {
    state.rows = manifest({ [KEY]: false, 'hr.dashboard': true })
    renderGuarded()

    expect(screen.queryByText('قائمة اعتماد النقاط')).toBeNull()
  })

  it('blocks a role without the key and sends it to its own home', () => {
    state.role = 'student'
    state.rows = manifest({ [KEY]: false })
    renderGuarded()

    expect(screen.queryByText('قائمة اعتماد النقاط')).toBeNull()
    expect(screen.getByText('لوحة الطالب')).toBeTruthy()
  })

  it('holds the page back while the manifest is loading, and a failed manifest grants nothing', () => {
    state.rows = manifest({ [KEY]: true })

    state.status = 'loading'
    const first = renderGuarded()
    expect(screen.queryByText('قائمة اعتماد النقاط')).toBeNull()
    first.unmount()

    state.status = 'error'
    renderGuarded()
    expect(screen.queryByText('قائمة اعتماد النقاط')).toBeNull()
  })
})

describe('the sidebar', () => {
  it('shows «اعتماد نقاط المتطوعين» to hr_manager only when the manifest allows the key', () => {
    const groups = getSidebarByRole('hr_manager')
    const items = (rows: EffectivePageAccessRow[]) =>
      filterSidebarGroupsByAccess(groups, rows).flatMap((g) => g.items.map((i) => i.href))

    expect(hrefs('hr_manager')).toContain(HREF)
    expect(items(manifest({ [KEY]: true }))).toContain(HREF)
    expect(items(manifest({ [KEY]: false }))).not.toContain(HREF)
  })

  it('does not add the entry to the sidebar of roles that never had it', () => {
    for (const role of ['student', 'instructor', 'finance_manager', 'marketing_manager']) {
      expect(hrefs(role)).not.toContain(HREF)
    }
  })
})
