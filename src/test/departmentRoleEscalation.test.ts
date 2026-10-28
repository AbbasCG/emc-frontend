import { describe, it, expect } from 'vitest'
import { canAccessDashboardPath, getAllowedRolesForPath, getDashboardPathByRole } from '@/utils/dashboardAccess'

/**
 * A department manager never becomes a technical or executive administrator on the client either: not through the
 * department they belong to, nor through a specialised role the server reports for them.
 */
describe('department manager role escalation (client)', () => {
  it('lands on the department workspace unless the server reports a non-privileged specialised role', () => {
    expect(getDashboardPathByRole('department_manager')).toBe('/dashboard/department')
    expect(getDashboardPathByRole('department_manager', 'finance_manager')).toBe('/dashboard/finance')
  })

  it.each(['tech_admin', 'executive_admin', 'admin', 'super_admin'])('ignores a privileged specialised role (%s)', (privileged) => {
    expect(getDashboardPathByRole('department_manager', privileged)).toBe('/dashboard/department')
  })

  it.each(['technology', 'executive-management', 'finance'])('does not derive a role from the department slug "%s"', (slug) => {
    expect(getDashboardPathByRole('department_manager', slug)).toBe('/dashboard/department')
  })

  it.each([
    '/dashboard/super-admin',
    '/dashboard/tech-admin',
    '/dashboard/executive',
    '/dashboard/admin/trainers/applications',
    '/dashboard/finance',
    '/dashboard/hr',
    '/dashboard/quality',
    '/dashboard/marketing',
  ])('a plain department manager cannot open %s', (path) => {
    expect(canAccessDashboardPath('department_manager', path)).toBe(false)
  })

  it('the department management workspace stays manager-only; a member lands on the open meeting lounge', () => {
    expect(getAllowedRolesForPath('/dashboard/department/teams')).toEqual(['department_manager'])
    expect(getDashboardPathByRole('department_member')).toBe('/dashboard/department/meeting-lounge')
    expect(getAllowedRolesForPath('/dashboard/department/meeting-lounge')).toBe('authenticated')
  })
})
