import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  canAccessDashboardPath,
  getDashboardPathByRole,
} from '@/utils/dashboardAccess'
import { getSidebarByRole as getSidebar } from '@/layouts/dashboardSidebar'

const srcDir = resolve(process.cwd(), 'src')

/**
 * Verifies the manually-ported Department Structure capability (adapted
 * from feature/dept-structure-and-delegation, NOT merged wholesale — see
 * the branch audit). Frontend visibility here is UX only; the backend
 * (DepartmentAccessService::canManageDepartment) remains the sole
 * authorization authority for every read/write on this page.
 *
 * Also asserts the explicitly-excluded localStorage page-access override
 * system was NOT introduced — that system was audited as a real client-side
 * authorization bypass and must never be ported.
 */

const STRUCTURE_ROUTE = '/dashboard/department/structure'
const ORGANIZATIONAL_MANAGER_ROLES = [
  'department_manager',
  'ai_manager',
  'strategy_planning_manager',
  'digital_ambassadors_manager',
  'advisors_manager',
] as const

describe('Department Structure — route exists and is reachable', () => {
  it('every canonical organizational manager role can access the structure route', () => {
    for (const role of ORGANIZATIONAL_MANAGER_ROLES) {
      expect(canAccessDashboardPath(role, STRUCTURE_ROUTE)).toBe(true)
    }
  })

  it('global admins retain access, consistent with their universal override', () => {
    expect(canAccessDashboardPath('super_admin', STRUCTURE_ROUTE)).toBe(true)
    expect(canAccessDashboardPath('tech_admin', STRUCTURE_ROUTE)).toBe(true)
  })

  it('unrelated roles cannot access the structure route', () => {
    expect(canAccessDashboardPath('student', STRUCTURE_ROUTE)).toBe(false)
    expect(canAccessDashboardPath('volunteer', STRUCTURE_ROUTE)).toBe(false)
    expect(canAccessDashboardPath('partner', STRUCTURE_ROUTE)).toBe(false)
  })

  it('does not change any role\'s dashboard home redirect', () => {
    // Porting the structure page must not alter existing landing routes.
    expect(getDashboardPathByRole('ai_manager')).toBe('/dashboard/ai-department')
    expect(getDashboardPathByRole('strategy_planning_manager')).toBe('/dashboard/department-workspace')
    expect(getDashboardPathByRole('department_manager')).toBe('/dashboard/department')
  })
})

describe('Department Structure — sidebar visibility', () => {
  it('appears in the sidebar for every canonical organizational manager role', () => {
    for (const role of ORGANIZATIONAL_MANAGER_ROLES) {
      const hrefs = getSidebar(role).flatMap((g) => g.items).map((i) => i.href)
      expect(hrefs).toContain(STRUCTURE_ROUTE)
    }
  })

  it('does not appear for unrelated roles', () => {
    const hrefs = getSidebar('student').flatMap((g) => g.items).map((i) => i.href)
    expect(hrefs).not.toContain(STRUCTURE_ROUTE)
  })
})

describe('Department Structure — no technical AI platform regression', () => {
  it('ai_manager still has no technical AI platform navigation', () => {
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai')).toBe(false)
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai/usage')).toBe(false)

    const hrefs = getSidebar('ai_manager').flatMap((g) => g.items).map((i) => i.href)
    expect(hrefs).not.toContain('/dashboard/admin/ai/usage')
    expect(hrefs).not.toContain('/dashboard/admin/ai/automations')
  })

  it('admin/super_admin/tech_admin retain the technical AI Platform, unaffected by this port', () => {
    expect(canAccessDashboardPath('admin', '/dashboard/admin/ai')).toBe(true)
    expect(canAccessDashboardPath('super_admin', '/dashboard/admin/ai')).toBe(true)
    expect(canAccessDashboardPath('tech_admin', '/dashboard/admin/ai')).toBe(true)
  })
})

describe('Department Structure — no parallel client-side authorization system introduced', () => {
  it('does not create the excluded localStorage page-access override files', () => {
    // These files must never exist in this codebase — they were explicitly
    // excluded from the port as a real client-side authorization bypass
    // (localStorage-only, editable via devtools, short-circuits role checks).
    // Checked via the filesystem, not a dynamic import, since Vite resolves
    // static import() paths eagerly at transform time and would fail the
    // whole test file the moment one doesn't exist — which is exactly what
    // we're asserting, so we can't rely on import() to assert it.
    expect(existsSync(`${srcDir}/store/userPageOverridesStore.ts`)).toBe(false)
    expect(existsSync(`${srcDir}/components/super-admin/UserPageAccessModal.tsx`)).toBe(false)
    expect(existsSync(`${srcDir}/data/sitePagesCatalog.ts`)).toBe(false)
  })

  it('canAccessDashboardPath keeps its original 2-argument role/path signature (no override param added)', () => {
    // The excluded branch's dashboardAccess.ts accepted a 3rd `userId`
    // argument to short-circuit into the localStorage override store — that
    // parameter must not exist here.
    expect(canAccessDashboardPath.length).toBe(2)
  })
})

describe('Department Structure — existing dashboard access behavior unchanged', () => {
  it('unrelated existing routes still resolve exactly as before', () => {
    expect(canAccessDashboardPath('department_manager', '/dashboard/department')).toBe(true)
    expect(canAccessDashboardPath('department_manager', '/dashboard/department/permissions')).toBe(true)
    expect(canAccessDashboardPath('department_manager', '/dashboard/department/meeting-lounge')).toBe(true)
    expect(canAccessDashboardPath('ai_manager', '/dashboard/ai-department')).toBe(true)
  })
})
