import { describe, it, expect } from 'vitest'
import appSource from '../App.tsx?raw'
import sidebarSource from '../layouts/dashboardSidebar.tsx?raw'

/**
 * "Path B" (the volunteer HR-profile form + its HR review) is cancelled. The only way into the team is
 * a public volunteer request -> HR accepts -> converts to member. These tests pin the router and the sidebar.
 */
/** Every one-line `<Route path="…" element={…} />` declaration of the router, by exact path. */
type Declared = { path: string; element: string; component: string | null; redirect: boolean; underGuard: boolean }
const guardAt = appSource.search(/<DashboardAccessGuard\s*\/>/)
const ROUTES: Declared[] = [...appSource.matchAll(/<Route path="([^"]+)" element=\{(.*)\} \/>/g)].map((m) => {
  const element = m[2]
  return {
    path: m[1],
    element,
    component: /<([A-Z][A-Za-z0-9]*)/.exec(element.replace('<Suspense fallback={<RouteFallback />}>', ''))?.[1] ?? null,
    redirect: element.startsWith('<Navigate'),
    underGuard: (m.index ?? 0) > guardAt,
  }
})
const at = (path: string) => ROUTES.filter((r) => r.path === path)

describe('Path B routes are redirects', () => {
  // Where each one LANDS is proven by volunteerPathBRouting.test.tsx (the real router, rendered). This pins the shape.
  it.each(['/dashboard/volunteer/hr-profile', '/dashboard/hr/volunteers', '/dashboard/hr/volunteers/:id'])('%s is declared once, as a redirect, under the access guard', (path) => {
    const declared = at(path)
    expect(declared).toHaveLength(1) // /dashboard/hr/volunteers used to be declared twice (the first one won)
    expect(declared[0].redirect).toBe(true)
    expect(declared[0].underGuard).toBe(true)
  })

  it('the HR-profile pages are no longer mounted by the router', () => {
    expect(appSource).not.toContain('HrVolunteerProfilesPage')
    expect(appSource).not.toContain('VolunteerHrProfilePage')
  })

  it('keeps the operations hub reachable at /dashboard/ops/volunteers and /dashboard/admin/volunteers', () => {
    for (const path of ['/dashboard/ops/volunteers', '/dashboard/admin/volunteers']) {
      expect(at(path)).toHaveLength(1)
      expect(at(path)[0].component).toBe('OpsVolunteersPage')
    }
    expect(at('/dashboard/hr/volunteer-requests')[0].component).toBe('VolunteerRequestsPage')
  })
})

describe('Path B has no navigation left', () => {
  it('no sidebar item points at the HR-profile form or its HR review', () => {
    expect(sidebarSource).not.toContain('/dashboard/volunteer/hr-profile')
    expect(sidebarSource).not.toContain('/dashboard/hr/volunteers')
    expect(sidebarSource).not.toContain('بياناتي التطوعية')
  })
})
