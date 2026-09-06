import { describe, expect, it } from 'vitest'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'
import {
  RESOURCE_CENTER_ROLES,
  canAccessDashboardPath,
  canAccessResourceCenter,
} from '@/utils/dashboardAccess'

const COURSE_LIBRARY_HREF = '/dashboard/resources/courses'

function findCourseLibrary(role: string) {
  return getSidebarByRole(role)
    .flatMap((g) => g.items)
    .filter((i) => i.href === COURSE_LIBRARY_HREF)
}

describe('Resource Center / Course Library staff access', () => {
  it('exposes مكتبة الدورات in the sidebar for every RESOURCE_CENTER_ROLES member', () => {
    for (const role of RESOURCE_CENTER_ROLES) {
      const items = findCourseLibrary(role)
      expect(items, `sidebar missing for ${role}`).toHaveLength(1)
      expect(items[0].label).toBe('مكتبة الدورات')
      expect(canAccessResourceCenter(role)).toBe(true)
      expect(canAccessDashboardPath(role, COURSE_LIBRARY_HREF)).toBe(true)
    }
  })

  it('programs_manager (Program Manager) can see and open the Course Library', () => {
    expect(findCourseLibrary('programs_manager')).toHaveLength(1)
    expect(canAccessDashboardPath('programs_manager', COURSE_LIBRARY_HREF)).toBe(true)
  })

  it('hides the Course Library from students and partners', () => {
    expect(findCourseLibrary('student')).toHaveLength(0)
    expect(findCourseLibrary('partner')).toHaveLength(0)
    expect(canAccessResourceCenter('student')).toBe(false)
    expect(canAccessDashboardPath('student', COURSE_LIBRARY_HREF)).toBe(false)
  })
})
