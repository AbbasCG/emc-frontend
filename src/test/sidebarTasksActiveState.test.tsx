import { describe, it, expect, vi, beforeAll } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { EffectivePageAccessRow } from '@/api/accessControlApi'
import DashboardLayout from '@/layouts/DashboardLayout'
import { getSidebarByRole, isSidebarItemActive } from '@/layouts/dashboardSidebar'
import { TASK_ROLES_WITH_BOTH_ENTRIES } from './fixtures/tasksSidebarRoles'
import baseline from '@/test/fixtures/accessEffectiveBaseline.json'

const MANAGEMENT = '/dashboard/admin/tasks'
const MINE = '/dashboard/admin/tasks/my'

type Fixture = { key: string; primary_route: string; route_patterns: string[]; label_ar: string; category: string }
const auth = vi.hoisted(() => ({ role: 'admin' }))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'مدير', email: 'a@emc.test', role: auth.role, permissions: [] }, isAuthenticated: true, isLoading: false, isImpersonating: false, logout: vi.fn() }),
}))
const access = vi.hoisted(() => ({ pages: [] as unknown[] }))
vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ status: 'ready', pages: access.pages, refresh: async () => {}, canAccessPath: () => true, canAccessKey: () => true, isReady: true, allowedKeys: new Set(), pageForPath: () => null }),
}))
vi.mock('@/contexts/FinancialRequestContext', () => ({
  useFinancialRequestContext: () => ({ canCreate: false }),
  FinancialRequestProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {}
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

function row(key: string): EffectivePageAccessRow {
  const f = (baseline.catalog as Fixture[]).find((c) => c.key === key)
  if (!f) throw new Error(`unknown fixture key ${key}`)

  return {
    key, allowed: true, primarySource: 'role', primarySourceLabelAr: '', sources: ['role'], overrideState: null, protected: false, reason: '',
    labelAr: f.label_ar, category: f.category as never, categoryLabelAr: 'العمليات', riskLevel: 'SAFE_DELEGATABLE' as never,
    primaryRoute: f.primary_route, routePatterns: f.route_patterns,
  }
}

function renderAt(role: string, path: string) {
  auth.role = role
  access.pages = [row('operations.tasks'), row('operations.my_tasks')]

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="*" element={<p>الصفحة</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

function expandAll() {
  for (const toggle of document.querySelectorAll('button[aria-expanded="false"]')) fireEvent.click(toggle)
}

/** href -> is the sidebar link marked as the current page */
function marks(): Record<string, boolean[]> {
  const out: Record<string, boolean[]> = {}
  for (const a of screen.getAllByRole('link')) {
    const href = a.getAttribute('href') ?? ''
    ;(out[href] ??= []).push(a.getAttribute('aria-current') === 'page')
  }

  return out
}

describe('isSidebarItemActive', () => {
  it('«مهامي ومسؤولياتي» selects only itself', () => {
    expect(isSidebarItemActive(MINE, MINE)).toBe(true)
    expect(isSidebarItemActive(MINE, MANAGEMENT)).toBe(false)
  })

  it('«إدارة المهام» keeps its own tabs selected (list, kanban, overdue) but not «مهامي»', () => {
    expect(isSidebarItemActive(MANAGEMENT, MANAGEMENT)).toBe(true)
    expect(isSidebarItemActive(`${MANAGEMENT}/kanban`, MANAGEMENT)).toBe(true)
    expect(isSidebarItemActive(`${MANAGEMENT}/overdue`, MANAGEMENT)).toBe(true)
    expect(isSidebarItemActive(`${MANAGEMENT}/kanban`, MINE)).toBe(false)
    expect(isSidebarItemActive(`${MANAGEMENT}/overdue`, MINE)).toBe(false)
  })
})

describe('the sidebar config of every role that has the two entries', () => {
  it('lists each entry with its own label, never the old «المهام» / «مهامي»', () => {
    expect(TASK_ROLES_WITH_BOTH_ENTRIES.length).toBeGreaterThan(5)
    for (const role of TASK_ROLES_WITH_BOTH_ENTRIES) {
      const items = getSidebarByRole(role).flatMap((g) => g.items)
      for (const i of items.filter((x) => x.href === MANAGEMENT)) expect(i.label, role).toBe('إدارة المهام')
      for (const i of items.filter((x) => x.href === MINE)) expect(i.label, role).toBe('مهامي ومسؤولياتي')
      expect(items.some((x) => x.href === MANAGEMENT), role).toBe(true)
      expect(items.some((x) => x.href === MINE), role).toBe(true)
    }
  })
})

describe.each(TASK_ROLES_WITH_BOTH_ENTRIES)('sidebar selected state: %s', (role) => {
  it('on /dashboard/admin/tasks/my only «مهامي ومسؤولياتي» is selected, also on a direct open', () => {
    renderAt(role, MINE)
    expandAll()
    const m = marks()
    expect(m[MINE]?.length, 'my entry present').toBeGreaterThan(0)
    expect(m[MINE].every(Boolean)).toBe(true)
    expect(m[MANAGEMENT]?.length, 'management entry present').toBeGreaterThan(0)
    expect(m[MANAGEMENT].some(Boolean)).toBe(false)
  })

  it('on /dashboard/admin/tasks only «إدارة المهام» is selected', () => {
    renderAt(role, MANAGEMENT)
    expandAll()
    const m = marks()
    expect(m[MANAGEMENT].every(Boolean)).toBe(true)
    expect(m[MINE].some(Boolean)).toBe(false)
  })

  it('on the management kanban «إدارة المهام» stays selected and «مهامي» does not', () => {
    renderAt(role, `${MANAGEMENT}/kanban`)
    expandAll()
    const m = marks()
    expect(m[MANAGEMENT].every(Boolean)).toBe(true)
    expect(m[MINE].some(Boolean)).toBe(false)
  })
})

describe('page titles', () => {
  it('the top bar names each page', () => {
    renderAt('admin', MINE)
    expect(screen.getAllByText('مهامي ومسؤولياتي').length).toBeGreaterThan(0)
    expect(document.querySelector('header h1, header [data-page-title]')?.textContent ?? '').toBeDefined()
  })

  it('the management page and the tickets operations page have their own titles', () => {
    const { unmount } = renderAt('admin', MANAGEMENT)
    expect(screen.getAllByText('إدارة المهام').length).toBeGreaterThan(0)
    unmount()
    renderAt('admin', '/dashboard/tickets/admin')
    expect(screen.getAllByText('إدارة تذاكر العمليات').length).toBeGreaterThan(0)
  })
})
