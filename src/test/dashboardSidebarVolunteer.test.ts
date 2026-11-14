import { describe, it, expect } from 'vitest'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'

function flatten(role: string) {
  return getSidebarByRole(role).flatMap((g) => g.items)
}

function findByHref(role: string, href: string) {
  return flatten(role).filter((i) => i.href === href)
}

describe('Volunteer HR sidebar reorganization', () => {
  it('HR Manager sees المتطوعون pointing to /dashboard/ops/volunteers', () => {
    const items = findByHref('hr_manager', '/dashboard/ops/volunteers')
    expect(items.length).toBeGreaterThan(0) // the super-admin sidebar lists it in two groups
    for (const item of items) expect(item.label).toBe('المتطوعون')
  })

  it('Admin sees المتطوعون pointing to /dashboard/ops/volunteers', () => {
    const items = findByHref('admin', '/dashboard/ops/volunteers')
    expect(items.length).toBeGreaterThan(0) // the super-admin sidebar lists it in two groups
    for (const item of items) expect(item.label).toBe('المتطوعون')
  })

  it('Super Admin sees المتطوعون pointing to /dashboard/ops/volunteers', () => {
    const items = findByHref('super_admin', '/dashboard/ops/volunteers')
    expect(items.length).toBeGreaterThan(0) // the super-admin sidebar lists it in two groups
    for (const item of items) expect(item.label).toBe('المتطوعون')
  })

  it('Tech Admin sees المتطوعون pointing to /dashboard/ops/volunteers', () => {
    const items = findByHref('tech_admin', '/dashboard/ops/volunteers')
    expect(items.length).toBeGreaterThan(0) // the super-admin sidebar lists it in two groups
    for (const item of items) expect(item.label).toBe('المتطوعون')
  })

  it('the old /dashboard/hr/volunteers sidebar entry is gone: المتطوعون now opens the unified command center', () => {
    for (const role of ['hr_manager', 'admin', 'super_admin', 'tech_admin']) {
      expect(findByHref(role, '/dashboard/hr/volunteers'), role).toHaveLength(0)
    }
  })

  it('Ordinary volunteer does not see the HR review link', () => {
    expect(findByHref('volunteer', '/dashboard/hr/volunteers')).toHaveLength(0)
    expect(findByHref('volunteer', '/dashboard/ops/volunteers')).toHaveLength(0)
  })

  // The admin sidebar no longer lists المتطوعون المقبولون (removed together with the points-approval entry in the
  // 2026-11 operations-hub update); the other management sidebars still do.
  const ROLES_WITH_ACCEPTED_VOLUNTEERS = ['hr_manager', 'super_admin', 'tech_admin']

  it('Existing /dashboard/volunteer item is renamed to المتطوعون المقبولون everywhere it appears', () => {
    for (const role of ROLES_WITH_ACCEPTED_VOLUNTEERS) {
      const items = findByHref(role, '/dashboard/volunteer')
      expect(items.length).toBeGreaterThan(0)
      for (const item of items) {
        expect(item.label).toBe('المتطوعون المقبولون')
      }
    }
  })

  it('/dashboard/volunteer route is unchanged (still present, still exactly one canonical accepted-volunteers destination)', () => {
    expect(findByHref('admin', '/dashboard/volunteer')).toHaveLength(0)
    for (const role of ROLES_WITH_ACCEPTED_VOLUNTEERS) {
      const items = findByHref(role, '/dashboard/volunteer')
      expect(items).toHaveLength(1)
    }
  })

  it('Volunteer sees بياناتي التطوعية pointing to /dashboard/volunteer/hr-profile', () => {
    const items = findByHref('volunteer', '/dashboard/volunteer/hr-profile')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('بياناتي التطوعية')
  })

  it('No duplicate hrefs within any single nav group (each item.href unique per group, avoiding duplicate React keys)', () => {
    for (const role of ['hr_manager', 'admin', 'super_admin', 'tech_admin', 'volunteer']) {
      for (const group of getSidebarByRole(role)) {
        const hrefs = group.items.map((i) => i.href)
        const uniqueHrefs = new Set(hrefs)
        expect(uniqueHrefs.size, `role=${role} group="${group.title ?? '(untitled)'}" has duplicate hrefs: ${hrefs.join(', ')}`).toBe(hrefs.length)
      }
    }
  })

  it('The new المتطوعون item never reuses the same href as المتطوعون المقبولون (distinct routes)', () => {
    for (const role of ROLES_WITH_ACCEPTED_VOLUNTEERS) {
      const newItem = findByHref(role, '/dashboard/ops/volunteers')[0]
      const acceptedItem = findByHref(role, '/dashboard/volunteer')[0]
      expect(newItem.href).not.toBe(acceptedItem.href)
    }
  })
})
