import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'
import { filterSidebarGroupsByAccess } from '@/utils/sidebarAccessFilter'
import type { EffectivePageAccessRow } from '@/api/accessControlApi'
import AiDepartmentDashboardPage from '@/pages/manager-dashboards/AiDepartmentDashboardPage'

/**
 * AI Expert Applications (/dashboard/admin/ai/expert-applications) is its own
 * capability, organizational_departments.ai_expert_applications (admin tier +
 * ai_manager). Navigation to it — the sidebar item and the AI department
 * shortcut — follows that backend page-access decision and never leads a user
 * into a redirect.
 */

const EXPERT = '/dashboard/admin/ai/expert-applications'

const access = { isReady: true, denied: new Set<string>() }

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({
    isReady: access.isReady,
    canAccessPath: (path: string) => (access.denied.has(path) ? false : null),
  }),
}))

vi.mock('@/hooks/useDepartmentAccess', () => ({
  useDepartmentAccess: () => ({ manifest: null, loading: false, soleDepartmentId: null }),
}))

vi.mock('@/api/operationsReportsApi', () => ({ fetchDepartmentMembers: () => Promise.resolve([]) }))

function expertApplicationsRow(allowed: boolean): EffectivePageAccessRow {
  return {
    key: 'organizational_departments.ai_expert_applications',
    allowed,
    primarySource: allowed ? 'role' : 'none',
    primarySourceLabelAr: '',
    sources: [],
    overrideState: null,
    protected: false,
    reason: '',
    labelAr: 'طلبات انضمام الخبراء',
    category: 'organizational_departments',
    categoryLabelAr: '',
    riskLevel: 'ADMIN_ONLY',
    primaryRoute: EXPERT,
    routePatterns: [EXPERT],
  } as EffectivePageAccessRow
}

const hrefs = (groups: ReturnType<typeof getSidebarByRole>) => groups.flatMap((g) => g.items.map((i) => i.href))

describe('Expert Applications sidebar item', () => {
  it.each(['super_admin', 'tech_admin', 'admin', 'ai_manager'])('is offered to %s, a role that may open the page', (role) => {
    expect(hrefs(getSidebarByRole(role))).toContain(EXPERT)
  })

  it.each(['student', 'instructor', 'volunteer', 'hr_manager', 'executive_admin'])('is not offered to %s', (role) => {
    expect(hrefs(getSidebarByRole(role))).not.toContain(EXPERT)
  })

  it('ai_manager gets the intake but not the technical AI platform', () => {
    const h = hrefs(getSidebarByRole('ai_manager'))
    expect(h).not.toContain('/dashboard/admin/ai')
    expect(h).not.toContain('/dashboard/admin/ai/usage')
  })

  it('is removed by the page-access manifest when the capability is denied', () => {
    for (const role of ['admin', 'ai_manager']) {
      const groups = getSidebarByRole(role)
      expect(hrefs(filterSidebarGroupsByAccess(groups, [expertApplicationsRow(false)]))).not.toContain(EXPERT)
      expect(hrefs(filterSidebarGroupsByAccess(groups, [expertApplicationsRow(true)]))).toContain(EXPERT)
    }
  })
})

describe('AI department dashboard shortcuts', () => {
  beforeEach(() => {
    access.isReady = true
    access.denied = new Set()
  })

  it('hides the Expert Applications shortcut when page access denies it', () => {
    access.denied = new Set([EXPERT])
    render(<MemoryRouter><AiDepartmentDashboardPage /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'الطلبات الاستشارية' })).not.toBeInTheDocument()
  })

  it('shows the shortcut when the manifest does not deny it', () => {
    render(<MemoryRouter><AiDepartmentDashboardPage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'الطلبات الاستشارية' })).toHaveAttribute('href', EXPERT)
  })
})
