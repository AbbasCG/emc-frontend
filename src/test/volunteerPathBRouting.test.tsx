import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { Outlet } from 'react-router'
import App from '@/App'
import { LanguageProvider } from '@/i18n/LanguageProvider'

/**
 * The REAL router (App.tsx), rendered: the cancelled Path B URLs must land on their targets, not just look like
 * redirects in the source. Heavy pages are stubbed; the router, the auth gate and the access guard are real.
 */

vi.mock('@/layouts/DashboardLayout', () => ({ default: () => <Outlet /> }))
vi.mock('@/pages/super-admin/VolunteerRequestsPage', () => ({ default: () => <p>صفحة طلبات التطوع</p> }))
vi.mock('@/pages/Volunteer', () => ({ default: () => <p>صفحة التطوع العامة</p> }))
vi.mock('@/pages/operations/admin/OpsVolunteersPage', () => ({ default: () => <p>مركز المتطوعين</p> }))
vi.mock('@/pages/dashboard/HrVolunteerProfilesPage', () => ({ default: () => <p>HR PROFILES (must not render)</p> }))
vi.mock('@/pages/dashboard/VolunteerHrProfilePage', () => ({ default: () => <p>HR PROFILE FORM (must not render)</p> }))
vi.mock('@/contexts/PageAccessContext', () => ({
  PageAccessProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePageAccess: () => ({ status: 'ready', canAccessPath: () => true, pages: [], allowedKeys: new Set(), isReady: true, canAccessKey: () => true, pageForPath: () => null, refresh: async () => {} }),
}))
vi.mock('@/api/authApi', async (importActual) => {
  const actual = await importActual<typeof import('@/api/authApi')>()
  return { ...actual, fetchMe: vi.fn(), logoutRemote: vi.fn() }
})

import * as authApi from '@/api/authApi'

const user = { id: 1, name: 'مشرف', email: 'a@emc.test', role: 'super_admin' }

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  localStorage.setItem('emc_token', 't')
  localStorage.setItem('emc_user', JSON.stringify(user))

  return render(<HelmetProvider><LanguageProvider><App /></LanguageProvider></HelmetProvider>)
}

beforeEach(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  localStorage.clear()
  vi.mocked(authApi.fetchMe).mockResolvedValue(user as never)
})

describe('Path B URLs, in the real router', () => {
  it('/dashboard/hr/volunteers lands on the volunteer requests page', async () => {
    renderAt('/dashboard/hr/volunteers')

    expect(await screen.findByText('صفحة طلبات التطوع')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard/hr/volunteer-requests')
    expect(screen.queryByText(/must not render/)).not.toBeInTheDocument()
  })

  it('/dashboard/hr/volunteers/:id lands on the volunteer requests page too', async () => {
    renderAt('/dashboard/hr/volunteers/42')

    expect(await screen.findByText('صفحة طلبات التطوع')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard/hr/volunteer-requests')
  })

  it('/dashboard/volunteer/hr-profile lands on the public volunteer page', async () => {
    renderAt('/dashboard/volunteer/hr-profile')

    expect(await screen.findByText('صفحة التطوع العامة')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/volunteer')
    expect(screen.queryByText(/must not render/)).not.toBeInTheDocument()
  })

  it('/dashboard/admin/volunteer-requests (the old alias) reaches the requests page, not the operations hub', async () => {
    renderAt('/dashboard/admin/volunteer-requests')

    expect(await screen.findByText('صفحة طلبات التطوع')).toBeInTheDocument()
    expect(screen.queryByText('مركز المتطوعين')).not.toBeInTheDocument()
  })

  it('the operations hub is still served at /dashboard/ops/volunteers and /dashboard/admin/volunteers', async () => {
    const first = renderAt('/dashboard/ops/volunteers')
    expect(await screen.findByText('مركز المتطوعين')).toBeInTheDocument()
    first.unmount()

    renderAt('/dashboard/admin/volunteers')
    expect(await screen.findByText('مركز المتطوعين')).toBeInTheDocument()
  })
})
