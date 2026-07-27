import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import PartnerDashboardPage from '@/pages/platform/partner/PartnerDashboardPage'
import FinanceDashboardPage from '@/pages/intelligence/admin/FinanceDashboardPage'
import apiClient from '@/api/axios'

// M5.5 regression — the API empty-payload contract: any GET may return
// {success:true, data:[]} (array!) or {success:true, data:{}}. Both dashboards
// crashed on `.map` of missing arrays (SectionErrorBoundary card in
// dash-partner.png / dash-finance-manager.png). The fix normalizes at the API
// boundary (partnerPortalApi.fetchPartnerDashboard / financeApi.fetchFinanceDashboard),
// so these tests mock the axios layer and run the real API modules.

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: '' },
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/components/intelligence', () => ({
  FinanceSubnav: () => <nav data-testid="finance-subnav" />,
}))

// The lazy chart sections use recharts' ResponsiveContainer (ResizeObserver),
// which jsdom lacks — the crash under test lives in the data hook, not the charts.
vi.mock('@/components/finance/command-center/ChartsRow', () => ({
  default: () => <div data-testid="charts-row" />,
}))
vi.mock('@/components/finance/command-center/CashFlowChart', () => ({
  default: () => <div data-testid="cashflow-chart" />,
}))

const mockedApi = vi.mocked(apiClient, true)
const mockedGet = mockedApi.get

const emptyArrayPayload = { data: { success: true, data: [] } }
const emptyObjectPayload = { data: { success: true, data: {} } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PartnerDashboardPage — empty payload contract', () => {
  it('renders a zero state instead of crashing when /partner/dashboard returns data:[]', async () => {
    mockedGet.mockResolvedValue(emptyArrayPayload)
    render(<PartnerDashboardPage />)

    expect(await screen.findByText('الاجتماعات القادمة')).toBeInTheDocument()
    expect(screen.getByText('تقارير حديثة')).toBeInTheDocument()

    // Metric cards show sane zeros: two count cards at 0 and the impact score at 0%.
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN/)
  })

  it('renders a zero state when /partner/dashboard returns data:{}', async () => {
    mockedGet.mockResolvedValue(emptyObjectPayload)
    render(<PartnerDashboardPage />)

    expect(await screen.findByText('الاجتماعات القادمة')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN/)
  })

  it('passes real payloads through untouched', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          partnership_status: 'نشطة',
          joint_programs_count: 4,
          participants_total: 120,
          impact_score: 87,
          upcoming_meetings: [{ id: 1, title: 'اجتماع المتابعة', at: '2026-08-01' }],
          recent_reports: [{ id: 2, title: 'تقرير الربع الثاني', at: '2026-07-15' }],
        },
      },
    })
    render(<PartnerDashboardPage />)

    expect(await screen.findByText('نشطة')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
    expect(screen.getByText('اجتماع المتابعة')).toBeInTheDocument()
    expect(screen.getByText('تقرير الربع الثاني')).toBeInTheDocument()
  })
})

describe('FinanceDashboardPage — empty payload contract', () => {
  function renderFinancePage() {
    return render(
      <MemoryRouter initialEntries={['/dashboard/admin/finance']}>
        <FinanceDashboardPage />
      </MemoryRouter>,
    )
  }

  it('renders the command center with zeros instead of the error card when every GET returns data:[]', async () => {
    mockedGet.mockResolvedValue(emptyArrayPayload)
    renderFinancePage()

    // KPI labels appear only when the derivations survived the empty payload.
    expect(await screen.findByText('إجمالي الإيرادات')).toBeInTheDocument()
    expect(screen.getByText('صافي الربح')).toBeInTheDocument()

    // Neither the hook's load error nor the boundary card is shown.
    expect(screen.queryByText(/تعذّر تحميل/)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN/)
  })

  it('renders the command center when every GET returns data:{}', async () => {
    mockedGet.mockResolvedValue(emptyObjectPayload)
    renderFinancePage()

    expect(await screen.findByText('إجمالي الإيرادات')).toBeInTheDocument()
    expect(screen.queryByText(/تعذّر تحميل/)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN/)
  })
})
