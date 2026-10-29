import { describe, expect, it } from 'vitest'
import { EMC_DASHBOARD_ROLES, canAccessDashboardPath, getAllowedRolesForPath, isLearnerPath } from '@/utils/dashboardAccess'
import { LEARNER_COURSES_HREF, getSidebarByRole } from '@/layouts/dashboardSidebar'
import { resolveCourseEnrollCta } from '@/utils/publicCourseDetailCta'
import { getInstructorConflictMessage } from '@/api/apiErrors'
import { AxiosError } from 'axios'

/**
 * Learning is not a role. The role list below is the platform's own (EMC_DASHBOARD_ROLES, the same list the backend seeds), plus
 * the legacy `teacher` alias, plus a role that exists nowhere — so a role added later is covered by the rule, not by this file.
 */
const ROLES = [...EMC_DASHBOARD_ROLES, 'teacher', 'a_role_added_next_year'] as const

const items = (role: string) => getSidebarByRole(role).flatMap((g) => g.items)

describe('«دوراتي» in every role\'s sidebar', () => {
  it.each(ROLES)('%s has exactly one entry to the learner courses page', (role) => {
    const mine = items(role).filter((i) => i.href === LEARNER_COURSES_HREF)

    expect(mine).toHaveLength(1)
    expect(mine[0].label).toContain('دوراتي')
  })

  it('a role with no menu of its own still gets it, beside the minimal shell', () => {
    expect(items('a_role_added_next_year').map((i) => i.href)).toEqual(expect.arrayContaining(['/dashboard/profile', LEARNER_COURSES_HREF]))
    expect(items(null as unknown as string).map((i) => i.href)).toContain(LEARNER_COURSES_HREF)
  })

  it('the student\'s own menu is untouched (its entry is not duplicated)', () => {
    expect(items('student').filter((i) => i.href === LEARNER_COURSES_HREF)).toHaveLength(1)
    expect(items('student').map((i) => i.href)).toContain('/dashboard/student')
  })

  it('does not replace a role\'s own menu: the administrative and instructor entries are all still there', () => {
    expect(items('admin').map((i) => i.href)).toContain('/dashboard/admin')
    expect(items('super_admin').map((i) => i.href)).toContain('/dashboard/super-admin')
    expect(items('tech_admin').map((i) => i.href)).toContain('/dashboard/tech-admin')
    expect(items('finance_manager').map((i) => i.href)).toContain('/dashboard/finance')
    expect(items('volunteer').length).toBeGreaterThan(1)
  })

  it('an instructor keeps the courses they TEACH and gets the courses they ATTEND as a separate, clearly named entry', () => {
    const list = items('instructor')
    const teaching = list.find((i) => i.href === '/dashboard/instructor/courses')
    const attending = list.find((i) => i.href === LEARNER_COURSES_HREF)

    expect(teaching?.label).toBe('دوراتي')
    expect(attending?.label).toBe('دوراتي كمتعلّم')
    expect(attending?.label).not.toBe(teaching?.label)
  })

  it('the entry never exposes a management route', () => {
    for (const role of ROLES) {
      const learnerGroup = getSidebarByRole(role).find((g) => g.items.some((i) => i.href === LEARNER_COURSES_HREF))
      expect(learnerGroup).toBeDefined()
      if (role !== 'student') expect(learnerGroup?.items.map((i) => i.href)).toEqual([LEARNER_COURSES_HREF])
    }
  })

  it('goes above a trailing «الحساب» group, never below it', () => {
    for (const role of ROLES) {
      const groups = getSidebarByRole(role)
      const last = groups[groups.length - 1]
      // If the learner group ended up last, no «الحساب» group may sit right above it: that group would have been pushed up.
      if (last.title === 'التعلّم') expect(groups[groups.length - 2]?.title).not.toBe('الحساب')
    }
  })
})

describe('the learner space opens for every signed-in role', () => {
  it.each(ROLES)('%s may open the learner pages', (role) => {
    for (const path of ['/dashboard/student', '/dashboard/student/courses', '/dashboard/student/learn/12', '/dashboard/certificates', '/dashboard/student/attendance']) {
      expect(canAccessDashboardPath(role, path)).toBe(true)
    }
  })

  it('still needs a signed-in account', () => {
    expect(canAccessDashboardPath(null, '/dashboard/student/courses')).toBe(false)
    expect(getAllowedRolesForPath('/dashboard/student/courses')).toBe('authenticated')
  })

  it('does not widen anything else: management and staff namespaces keep their roles', () => {
    expect(canAccessDashboardPath('volunteer', '/dashboard/admin')).toBe(false)
    expect(canAccessDashboardPath('partner', '/dashboard/instructor/courses')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/finance')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/students')).toBe(false)
  })

  it('recognises learner paths without matching look-alikes', () => {
    expect(isLearnerPath('/dashboard/student/courses')).toBe(true)
    expect(isLearnerPath('/dashboard/students')).toBe(false)
    expect(isLearnerPath('/dashboard/instructor/students')).toBe(false)
  })
})

describe('the enroll call to action does not depend on a role', () => {
  const base = { registrationOpen: true, seatsFull: false, alreadyEnrolled: false, isAuthenticated: true, courseSlug: 'english-101', courseId: 7 }

  it('offers registration to a signed-in account whatever it is', () => {
    expect(resolveCourseEnrollCta({ ...base })).toMatchObject({ label: 'الالتحاق بالدورة', href: '/courses/english-101/register', disabled: false })
    expect(resolveCourseEnrollCta({ ...base, isPaid: true, price: 40 })).toMatchObject({ checkout: true, checkoutCourseId: 7 })
    expect(resolveCourseEnrollCta({ ...base })).not.toHaveProperty('denyNonStudent')
  })

  it('shows the enrollment status when the account is already enrolled', () => {
    expect(resolveCourseEnrollCta({ ...base, alreadyEnrolled: true })).toMatchObject({ label: 'متابعة التعلم' })
  })

  it('asks a visitor who is not signed in to join or log in', () => {
    expect(resolveCourseEnrollCta({ ...base, isAuthenticated: false })).toMatchObject({ label: 'انضم والتحق الآن' })
  })
})

describe('the instructor conflict answer', () => {
  const error = (status: number, data: unknown) => {
    const e = new AxiosError('x', 'ERR_BAD_REQUEST')
    e.response = { status, data, statusText: '', headers: {}, config: { headers: {} } } as never

    return e
  }

  it('is read from the server code and shows the Arabic text as it is', () => {
    const message = 'لا يمكنك التسجيل في ورشة أنت المدرّب المسؤول عنها.'
    expect(getInstructorConflictMessage(error(403, { code: 'instructor_teaches_program', message, message_ar: message }))).toBe(message)
  })

  it('is not mistaken for any other failure', () => {
    expect(getInstructorConflictMessage(error(403, { message: 'Forbidden' }))).toBeNull()
    expect(getInstructorConflictMessage(error(422, { code: 'instructor_teaches_program' }))).toBeNull()
    expect(getInstructorConflictMessage(new Error('offline'))).toBeNull()
  })
})
