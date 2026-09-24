import { describe, it, expect } from 'vitest'
import { isSafeTicketOrigin, resolveTicketBackDestination } from '@/utils/ticketNavigation'

describe('isSafeTicketOrigin', () => {
  it('accepts a path under /dashboard/tickets', () => {
    expect(isSafeTicketOrigin('/dashboard/tickets/admin?status=ASSIGNED&page=2')).toBe(true)
  })

  it('rejects a path outside the tickets feature', () => {
    expect(isSafeTicketOrigin('/dashboard/admin/users')).toBe(false)
  })

  it('rejects an absolute external URL', () => {
    expect(isSafeTicketOrigin('https://evil.example.com/dashboard/tickets')).toBe(false)
  })

  it('rejects non-string values (a crafted or stale location.state)', () => {
    expect(isSafeTicketOrigin(undefined)).toBe(false)
    expect(isSafeTicketOrigin(null)).toBe(false)
    expect(isSafeTicketOrigin(42)).toBe(false)
    expect(isSafeTicketOrigin({ from: '/dashboard/tickets/admin' })).toBe(false)
  })
})

describe('resolveTicketBackDestination', () => {
  it('prefers a valid state.from, preserving the exact query string', () => {
    const dest = resolveTicketBackDestination({
      locationState: { from: '/dashboard/tickets/admin?status=PENDING_APPROVAL&page=3' },
      canAccessAdmin: true,
      canAccessWorkspace: false,
    })
    expect(dest).toBe('/dashboard/tickets/admin?status=PENDING_APPROVAL&page=3')
  })

  it('ignores an unsafe state.from and falls back to the admin queue when accessible', () => {
    const dest = resolveTicketBackDestination({
      locationState: { from: '/dashboard/admin/users' },
      canAccessAdmin: true,
      canAccessWorkspace: false,
    })
    expect(dest).toBe('/dashboard/tickets/admin')
  })

  it('falls back to the assignee workspace when admin access is denied', () => {
    const dest = resolveTicketBackDestination({
      locationState: null,
      canAccessAdmin: false,
      canAccessWorkspace: true,
    })
    expect(dest).toBe('/dashboard/tickets/workspace')
  })

  it('never sends a normal user (no admin/workspace access) to the admin page', () => {
    const dest = resolveTicketBackDestination({
      locationState: undefined,
      canAccessAdmin: false,
      canAccessWorkspace: false,
    })
    expect(dest).toBe('/dashboard/tickets/new')
    expect(dest).not.toContain('/admin')
  })

  it('treats null (still loading) page-access the same as false, never granting access speculatively', () => {
    const dest = resolveTicketBackDestination({
      locationState: undefined,
      canAccessAdmin: null,
      canAccessWorkspace: null,
    })
    expect(dest).toBe('/dashboard/tickets/new')
  })
})
