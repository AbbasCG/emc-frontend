import { describe, it, expect } from 'vitest'
import { normalizeNotificationInternalPath } from '@/utils/notificationRoutes'

const norm = normalizeNotificationInternalPath

describe('normalizeNotificationInternalPath', () => {
  it('returns notification center for empty/blank input', () => {
    expect(norm('')).toBe('/dashboard/notifications')
    expect(norm('   ')).toBe('/dashboard/notifications')
  })

  it('returns notification center for /api paths', () => {
    expect(norm('/api/courses/5')).toBe('/dashboard/notifications')
    expect(norm('/api/registrations/3')).toBe('/dashboard/notifications')
  })

  it('returns notification center for external URLs', () => {
    expect(norm('https://evil.com/steal')).toBe('/dashboard/notifications')
    expect(norm('http://other.domain.com/path')).toBe('/dashboard/notifications')
  })

  it('returns notification center for relative paths without leading slash', () => {
    expect(norm('dashboard/student')).toBe('/dashboard/notifications')
    expect(norm('courses')).toBe('/dashboard/notifications')
  })

  it('passes through valid dashboard paths', () => {
    expect(norm('/dashboard/student/sessions')).toBe('/dashboard/student/sessions')
    expect(norm('/dashboard/notifications')).toBe('/dashboard/notifications')
    expect(norm('/dashboard/profile')).toBe('/dashboard/profile')
  })

  it('passes through valid course paths', () => {
    expect(norm('/courses/my-course')).toBe('/courses/my-course')
    expect(norm('/courses')).toBe('/courses')
  })

  it('rewrites legacy /student/* → /dashboard/student/*', () => {
    expect(norm('/student/sessions')).toBe('/dashboard/student/sessions')
    expect(norm('/student/assignments')).toBe('/dashboard/student/assignments')
  })

  it('rewrites legacy /instructor/* → /dashboard/instructor/*', () => {
    expect(norm('/instructor/courses')).toBe('/dashboard/instructor/courses')
  })

  it('rewrites /student/registrations with id → list (no detail page)', () => {
    expect(norm('/student/registrations/42')).toBe('/dashboard/student/registrations')
  })

  it('rewrites /admin/registrations → super-admin CRUD list', () => {
    expect(norm('/admin/registrations')).toBe('/dashboard/super-admin/crud/registrations')
    expect(norm('/admin/registrations/7')).toBe('/dashboard/super-admin/crud/registrations')
  })

  it('strips trailing slashes', () => {
    expect(norm('/dashboard/student/')).toBe('/dashboard/student')
    expect(norm('/dashboard/notifications/')).toBe('/dashboard/notifications')
  })

  it('rewrites assignment and submission detail paths to query deep links', () => {
    expect(norm('/dashboard/student/assignments/42')).toBe('/dashboard/student/assignments?submission=42')
    expect(norm('/dashboard/instructor/submissions/7')).toBe('/dashboard/instructor/submissions?submission=7')
  })

  it('rewrites certificate and attendance paths', () => {
    expect(norm('/dashboard/student/certificates')).toBe('/dashboard/certificates')
    expect(norm('/dashboard/student/attendance')).toBe('/dashboard/student/attendance')
    expect(norm('/student/attendance')).toBe('/dashboard/student/attendance')
  })

  it('preserves query strings', () => {
    expect(norm('/dashboard/student/sessions?date=2025-01-01')).toBe(
      '/dashboard/student/sessions?date=2025-01-01',
    )
  })

  it('rejects non-dashboard non-course paths', () => {
    expect(norm('/settings/account')).toBe('/dashboard/notifications')
    expect(norm('/profile')).toBe('/dashboard/notifications')
  })
})
