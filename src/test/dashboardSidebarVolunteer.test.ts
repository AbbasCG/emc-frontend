import { describe, it, expect } from 'vitest'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'

function flatten(role: string) {
  return getSidebarByRole(role).flatMap((g) => g.items)
}

function findByHref(role: string, href: string) {
  return flatten(role).filter((i) => i.href === href)
}

describe('Volunteer HR sidebar reorganization', () => {
  it('HR Manager sees المتطوعون pointing to /dashboard/hr/volunteers', () => {
    const items = findByHref('hr_manager', '/dashboard/hr/volunteers')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('المتطوعون')
  })

  it('Admin sees المتطوعون pointing to /dashboard/hr/volunteers', () => {
    const items = findByHref('admin', '/dashboard/hr/volunteers')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('المتطوعون')
  })

  it('Super Admin sees المتطوعون pointing to /dashboard/hr/volunteers', () => {
    const items = findByHref('super_admin', '/dashboard/hr/volunteers')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('المتطوعون')
  })

  it('Tech Admin sees المتطوعون pointing to /dashboard/hr/volunteers', () => {
    const items = findByHref('tech_admin', '/dashboard/hr/volunteers')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('المتطوعون')
  })

  it('Ordinary volunteer does not see the HR review link', () => {
    const items = findByHref('volunteer', '/dashboard/hr/volunteers')
    expect(items).toHaveLength(0)
  })

  it('Existing /dashboard/volunteer item is renamed to المتطوعون المقبولون everywhere it appears', () => {
    for (const role of ['hr_manager', 'admin', 'super_admin', 'tech_admin']) {
      const items = findByHref(role, '/dashboard/volunteer')
      expect(items.length).toBeGreaterThan(0)
      for (const item of items) {
        expect(item.label).toBe('المتطوعون المقبولون')
      }
    }
  })

  it('/dashboard/volunteer route is unchanged (still present, still exactly one canonical accepted-volunteers destination)', () => {
    for (const role of ['hr_manager', 'admin', 'super_admin', 'tech_admin']) {
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
    for (const role of ['hr_manager', 'admin', 'super_admin', 'tech_admin']) {
      const newItem = findByHref(role, '/dashboard/hr/volunteers')[0]
      const acceptedItem = findByHref(role, '/dashboard/volunteer')[0]
      expect(newItem.href).not.toBe(acceptedItem.href)
    }
  })
})
