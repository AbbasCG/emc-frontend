import { describe, it, expect, vi, beforeAll } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { EffectivePageAccessRow, PageAccessSource } from '@/api/accessControlApi'
import DashboardLayout from '@/layouts/DashboardLayout'
import baseline from '@/test/fixtures/accessEffectiveBaseline.json'

/**
 * The LIVE sidebar is built from the backend page-access manifest. The backend catalog still registers the retired
 * Path-B pages (hr.volunteers, personal.volunteer_hr_profile), so a manifest that allows them must still not
 * produce menu entries: their URLs only redirect now. The other volunteer destinations must stay.
 */

type Fixture = { key: string; primary_route: string; route_patterns: string[]; label_ar: string; category: string }

function row(key: string, sources: PageAccessSource[] = ['role']): EffectivePageAccessRow {
  const f = (baseline.catalog as Fixture[]).find((c) => c.key === key)
  if (!f) throw new Error(`unknown fixture key ${key}`)

  return {
    key, allowed: true, primarySource: sources[0], primarySourceLabelAr: '', sources, overrideState: null, protected: false, reason: '',
    labelAr: f.label_ar, category: f.category as never, categoryLabelAr: 'الموارد البشرية', riskLevel: 'SAFE_DELEGATABLE' as never,
    primaryRoute: f.primary_route, routePatterns: f.route_patterns,
  }
}

const access = vi.hoisted(() => ({ pages: [] as unknown[] }))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'مدير الموارد', email: 'hr@emc.test', role: 'hr_manager', permissions: [] }, isAuthenticated: true, isLoading: false, isImpersonating: false, logout: vi.fn() }),
}))
vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ status: 'ready', pages: access.pages, refresh: async () => {}, canAccessPath: () => true, canAccessKey: () => true, isReady: true, allowedKeys: new Set(), pageForPath: () => null }),
}))
vi.mock('@/contexts/FinancialRequestContext', () => ({
  useFinancialRequestContext: () => ({ canCreate: false }),
  FinancialRequestProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/hr']}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard/hr" element={<p>الصفحة</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

/** Open every collapsed group, so nothing hides behind a closed heading. */
function expandAll() {
  for (const toggle of document.querySelectorAll('button[aria-expanded="false"]')) fireEvent.click(toggle)
}

const hrefsOnScreen = () => screen.getAllByRole('link').map((a) => a.getAttribute('href'))

describe('manifest-driven sidebar: retired Path-B destinations', () => {
  it('never shows /dashboard/hr/volunteers or /dashboard/volunteer/hr-profile, even when the manifest allows them', () => {
    access.pages = [
      row('hr.volunteers'),
      row('personal.volunteer_hr_profile', ['authenticated_baseline']),
      row('hr.volunteer_requests'),
      row('operations.volunteers'),
      row('operations.accepted_volunteers'),
      row('hr.volunteer_points_approval'),
    ]
    renderSidebar()
    expandAll()

    const hrefs = hrefsOnScreen()
    expect(hrefs).not.toContain('/dashboard/hr/volunteers')
    expect(hrefs).not.toContain('/dashboard/volunteer/hr-profile')
    expect(hrefs.some((h) => h?.startsWith('/dashboard/hr/volunteers/') || h?.startsWith('/dashboard/volunteer/hr-profile'))).toBe(false)
    // the live volunteer destinations stay
    expect(hrefs).toContain('/dashboard/hr/volunteer-requests')
    expect(hrefs).toContain('/dashboard/ops/volunteers')
    expect(hrefs).toContain('/dashboard/volunteer')
    expect(hrefs).toContain('/dashboard/hr/volunteer-points-approval')
  })
})
