import { describe, it, expect } from 'vitest'
import {
  canAccessDashboardPath,
  getDashboardPathByRole,
  EMC_DASHBOARD_ROLES,
} from '@/utils/dashboardAccess'
import { getSidebarByRole as getSidebar } from '@/layouts/dashboardSidebar'

/**
 * Verifies the 3 newly-added official department manager roles
 * (strategy_planning_manager, digital_ambassadors_manager, advisors_manager)
 * share ONE generic workspace route/page/sidebar block, exactly mirroring
 * the ai_manager pattern established in aiDepartmentPlatformSeparation.test.ts —
 * a role never implies leadership, only actual departments.leader_id does.
 */

const NEW_ROLES = ['strategy_planning_manager', 'digital_ambassadors_manager', 'advisors_manager'] as const

describe('new official department manager roles — registry', () => {
  it('are present in EMC_DASHBOARD_ROLES', () => {
    for (const role of NEW_ROLES) {
      expect(EMC_DASHBOARD_ROLES as readonly string[]).toContain(role)
    }
  })
})

describe('new official department manager roles — routing', () => {
  it('all route home to the shared generic department workspace', () => {
    for (const role of NEW_ROLES) {
      expect(getDashboardPathByRole(role)).toBe('/dashboard/department-workspace')
    }
  })

  it('each role can access the shared workspace route', () => {
    for (const role of NEW_ROLES) {
      expect(canAccessDashboardPath(role, '/dashboard/department-workspace')).toBe(true)
    }
  })

  it('none of them can access the technical AI Platform or super-admin', () => {
    for (const role of NEW_ROLES) {
      expect(canAccessDashboardPath(role, '/dashboard/admin/ai')).toBe(false)
      expect(canAccessDashboardPath(role, '/dashboard/admin/ai/usage')).toBe(false)
      expect(canAccessDashboardPath(role, '/dashboard/super-admin')).toBe(false)
    }
  })

  it('each role can access the shared operations surface (Weekly/Meeting Reports)', () => {
    for (const role of NEW_ROLES) {
      expect(canAccessDashboardPath(role, '/dashboard/operations/weekly-reports')).toBe(true)
      expect(canAccessDashboardPath(role, '/dashboard/operations/meeting-reports')).toBe(true)
    }
  })

  it('an unrelated role cannot access the new workspace route', () => {
    expect(canAccessDashboardPath('student', '/dashboard/department-workspace')).toBe(false)
  })

  it('admin/super_admin retain unrestricted dashboard access', () => {
    expect(canAccessDashboardPath('super_admin', '/dashboard/department-workspace')).toBe(true)
  })
})

describe('new official department manager roles — sidebar', () => {
  it('each role gets the generic organizational workspace entry, not admin/system pages', () => {
    for (const role of NEW_ROLES) {
      const groups = getSidebar(role)
      const allItems = groups.flatMap((g) => g.items)
      const hrefs = allItems.map((i) => i.href)

      expect(hrefs).toContain('/dashboard/department-workspace')
      expect(hrefs).toContain('/dashboard/members')
      expect(hrefs).toContain('/dashboard/operations/weekly-reports')
      expect(hrefs).toContain('/dashboard/operations/meeting-reports')
      expect(hrefs).toContain('/dashboard/department/meeting-lounge')
      expect(hrefs).toContain('/dashboard/department/hr-requests')

      // No technical AI Platform or unrelated admin/system pages.
      expect(hrefs).not.toContain('/dashboard/admin/ai/usage')
      expect(hrefs).not.toContain('/dashboard/admin/ai/automations')
      expect(hrefs.some((h) => h.startsWith('/dashboard/super-admin'))).toBe(false)
    }
  })
})
