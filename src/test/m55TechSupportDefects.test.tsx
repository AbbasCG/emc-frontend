import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import TechAdminDashboardPage from '@/pages/tech-admin/TechAdminDashboardPage'
import OpsSupportTicketsPage from '@/pages/operations/admin/OpsSupportTicketsPage'

/**
 * M5.5 regression tests — the API empty-payload contract:
 * any GET may legitimately return `{ success: true, data: [] }` (array!) or
 * `{ success: true, data: {} }`. Pages must render a graceful state, never
 * crash, never show NaN.
 *
 * Both fixes live at the fetch boundary (techAdminApi / supportApi), so these
 * tests mock the axios client — NOT the api modules — to let the real
 * normalization run against the raw empty payloads.
 *
 * Defect 1 (dash-tech-admin.png): TechAdminDashboardPage crashed into the
 * SectionErrorBoundary because `data.system` was undefined
 * (`Object.values(undefined)` in SystemHealthCard) and
 * `data.recent_audit_logs.map` threw on the empty contract.
 *
 * Defect 2 (dash-support-agent.png): OpsSupportTicketsPage rendered literal
 * "NaN" in all five ticket KPI cards — `fetchSupportTickets` returned
 * `stats: {}` (truthy, so the page's `?? EMPTY_STATS` fallback never kicked
 * in) and `useCountUp(undefined)` computed `Math.round(undefined * …)`.
 */

const mockGet = vi.fn()

vi.mock('@/api/axios', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

beforeEach(() => {
  mockGet.mockReset()
})

/** Let the KPI count-up animation tick a few rAF frames — on the old (buggy)
 *  behavior the very first tick computed `Math.round(undefined * …)` and
 *  painted the literal "NaN", so asserting before any frame elapsed would
 *  falsely pass. */
async function letCountUpTick() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 120))
  })
}

describe('TechAdminDashboardPage — empty-payload contract (defect 1)', () => {
  it('renders gracefully when the API returns { success: true, data: {} }', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: {} } })

    render(
      <MemoryRouter>
        <TechAdminDashboardPage />
      </MemoryRouter>,
    )

    // System health card renders (previously: Object.values(undefined) crash)
    expect(await screen.findByText('صحة النظام')).toBeInTheDocument()
    // Audit log list renders its empty state (previously: .map of undefined crash)
    expect(screen.getByText('لا توجد سجلات بعد.')).toBeInTheDocument()
    // Security + platform KPIs show zeros, never NaN
    expect(screen.getByText('مركز الأمن')).toBeInTheDocument()
    expect(screen.getByText('نظرة عامة على المنصة')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    // 3 security KPIs + 8 platform KPIs, all defaulted to 0
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(11)
    // No full-page error state
    expect(screen.queryByText(/تعذّر تحميل بيانات اللوحة/)).not.toBeInTheDocument()
  })

  it('renders gracefully when the API returns { success: true, data: [] }', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } })

    render(
      <MemoryRouter>
        <TechAdminDashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('صحة النظام')).toBeInTheDocument()
    expect(screen.getByText('لا توجد سجلات بعد.')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.queryByText(/تعذّر تحميل بيانات اللوحة/)).not.toBeInTheDocument()
  })
})

describe('OpsSupportTicketsPage — KPI cards on empty payload (defect 2)', () => {
  it('shows 0 (not NaN) in all five KPI cards when the API returns { success: true, data: [] } without stats', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } })

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/support-tickets']}>
        <OpsSupportTicketsPage />
      </MemoryRouter>,
    )

    // Loading finished — the empty state is shown
    expect(await screen.findByText('لا توجد تذاكر حالياً')).toBeInTheDocument()
    await letCountUpTick()

    // All five KPI labels are present…
    for (const label of ['إجمالي التذاكر', 'قيد المعالجة', 'غير معينة', 'تم حلها', 'أولوية عالية']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // …their values are 0, and the literal 'NaN' never appears anywhere
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(5)
  })

  it('shows 0 (not NaN) when stats arrives as a partial/empty object ({ success: true, data: {}, stats: {} })', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: {}, stats: {} } })

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/support-tickets']}>
        <OpsSupportTicketsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('لا توجد تذاكر حالياً')).toBeInTheDocument()
    await letCountUpTick()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(5)
  })
})
