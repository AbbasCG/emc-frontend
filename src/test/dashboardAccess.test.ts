import { describe, it, expect } from 'vitest'
import {
  normalizeRole,
  getDashboardPathByRole,
  canAccessDashboardPath,
  getPostLoginRedirect,
  getAllowedRolesForPath,
} from '@/utils/dashboardAccess'

describe('normalizeRole', () => {
  it('lowercases and trims input', () => {
    expect(normalizeRole('Admin')).toBe('admin')
    expect(normalizeRole('  STUDENT  ')).toBe('student')
  })

  it('maps teacher alias → instructor', () => {
    expect(normalizeRole('teacher')).toBe('instructor')
  })

  it('returns null for empty/null', () => {
    expect(normalizeRole(null)).toBeNull()
    expect(normalizeRole(undefined)).toBeNull()
    expect(normalizeRole('')).toBeNull()
    expect(normalizeRole('   ')).toBeNull()
  })
})

describe('getDashboardPathByRole', () => {
  it('returns correct home path for each role', () => {
    expect(getDashboardPathByRole('student')).toBe('/dashboard/student')
    expect(getDashboardPathByRole('admin')).toBe('/dashboard/admin')
    expect(getDashboardPathByRole('instructor')).toBe('/dashboard/instructor')
    expect(getDashboardPathByRole('super_admin')).toBe('/dashboard/super-admin')
    expect(getDashboardPathByRole('finance_manager')).toBe('/dashboard/finance')
    expect(getDashboardPathByRole('hr_manager')).toBe('/dashboard/hr')
    expect(getDashboardPathByRole('partner')).toBe('/dashboard/partner')
  })

  it('returns /dashboard/profile as fallback for unknown role', () => {
    expect(getDashboardPathByRole('unknown_role')).toBe('/dashboard/profile')
    expect(getDashboardPathByRole(null)).toBe('/dashboard/profile')
  })

  it('resolves teacher alias', () => {
    expect(getDashboardPathByRole('teacher')).toBe('/dashboard/instructor')
  })
})

describe('canAccessDashboardPath', () => {
  it('super_admin can access any dashboard path', () => {
    expect(canAccessDashboardPath('super_admin', '/dashboard/admin')).toBe(true)
    expect(canAccessDashboardPath('super_admin', '/dashboard/student')).toBe(true)
    expect(canAccessDashboardPath('super_admin', '/dashboard/finance')).toBe(true)
    expect(canAccessDashboardPath('super_admin', '/dashboard/super-admin')).toBe(true)
  })

  it('student can access student namespace', () => {
    expect(canAccessDashboardPath('student', '/dashboard/student')).toBe(true)
    expect(canAccessDashboardPath('student', '/dashboard/student/sessions')).toBe(true)
    expect(canAccessDashboardPath('student', '/dashboard/certificates')).toBe(true)
  })

  it('student cannot access admin namespace', () => {
    expect(canAccessDashboardPath('student', '/dashboard/admin')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/super-admin')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/finance')).toBe(false)
  })

  it('any authenticated user can access profile and notifications', () => {
    for (const role of ['student', 'admin', 'instructor', 'partner'] as const) {
      expect(canAccessDashboardPath(role, '/dashboard/profile')).toBe(true)
      expect(canAccessDashboardPath(role, '/dashboard/notifications')).toBe(true)
      expect(canAccessDashboardPath(role, '/dashboard/settings/notifications')).toBe(true)
    }
  })

  it('unauthenticated (null role) cannot access dashboard', () => {
    expect(canAccessDashboardPath(null, '/dashboard/admin')).toBe(false)
    expect(canAccessDashboardPath(null, '/dashboard/student')).toBe(false)
  })

  it('instructor cannot access admin namespace', () => {
    expect(canAccessDashboardPath('instructor', '/dashboard/admin')).toBe(false)
  })

  it('teacher alias resolves to instructor access', () => {
    expect(canAccessDashboardPath('teacher', '/dashboard/instructor')).toBe(true)
    expect(canAccessDashboardPath('teacher', '/dashboard/admin')).toBe(false)
  })

  it('any authenticated user (including "volunteer" and "student") can reach their own volunteer HR profile form', () => {
    // Regression: /dashboard/volunteer/hr-profile was previously captured by
    // the generic /dashboard/volunteer prefix rule (admin-ish roles only),
    // so the actual applicant could never load their own submission form.
    for (const role of ['volunteer', 'student', 'instructor'] as const) {
      expect(canAccessDashboardPath(role, '/dashboard/volunteer/hr-profile')).toBe(true)
    }
  })

  it('the bare accepted-volunteers list at /dashboard/volunteer stays restricted to admin-ish roles', () => {
    expect(canAccessDashboardPath('super_admin', '/dashboard/volunteer')).toBe(true)
    expect(canAccessDashboardPath('hr_manager', '/dashboard/volunteer')).toBe(true)
    expect(canAccessDashboardPath('volunteer', '/dashboard/volunteer')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/volunteer')).toBe(false)
  })
})

describe('getAllowedRolesForPath', () => {
  it('returns "authenticated" for shared paths', () => {
    expect(getAllowedRolesForPath('/dashboard/profile')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/notifications')).toBe('authenticated')
    expect(getAllowedRolesForPath('/calendar')).toBe('authenticated')
    expect(getAllowedRolesForPath('/documents')).toBe('authenticated')
  })

  it('returns role array for namespaced paths', () => {
    expect(getAllowedRolesForPath('/dashboard/admin')).toContain('admin')
    expect(getAllowedRolesForPath('/dashboard/student/sessions')).toContain('student')
    expect(getAllowedRolesForPath('/dashboard/finance')).toContain('finance_manager')
  })
})

describe('getPostLoginRedirect', () => {
  it('returns role home when no preferred path', () => {
    expect(getPostLoginRedirect('student', null)).toBe('/dashboard/student')
    expect(getPostLoginRedirect('admin', null)).toBe('/dashboard/admin')
  })

  it('honours preferred path when role can access it', () => {
    expect(getPostLoginRedirect('student', '/dashboard/student/sessions'))
      .toBe('/dashboard/student/sessions')
  })

  it('falls back to role home when preferred path is inaccessible', () => {
    expect(getPostLoginRedirect('student', '/dashboard/admin'))
      .toBe('/dashboard/student')
  })

  it('reads role from object payload', () => {
    expect(getPostLoginRedirect({ role: 'admin' }, null)).toBe('/dashboard/admin')
  })
})
