import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ImpactPointsPage from '@/pages/operations/ImpactPointsPage'
import ImpactSparkWidget from '@/components/operations/ImpactSparkWidget'

/**
 * Impact Points — the page opens for the roles the backend serves, fails
 * visibly instead of loading forever, and the floating shortcut only appears
 * for users whose page-access manifest actually allows the page.
 */

const allowedKeys = new Set<string>()

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({
    canAccessKey: (key: string) => allowedKeys.has(key),
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, name: 'متطوع', role: 'volunteer' } }),
}))

const mockSummary = vi.fn()
const mockAwards = vi.fn()
const mockBoard = vi.fn()
const mockPolicy = vi.fn()

vi.mock('@/api/volunteerPointsApi', () => ({
  AWARD_CATEGORIES: [{ value: 'task', label: 'مهمة' }],
  fetchMyPointsSummary: () => mockSummary(),
  fetchMyAwards: () => mockAwards(),
  fetchPointsLeaderboard: () => mockBoard(),
  fetchPointsPolicy: () => mockPolicy(),
  awardPoints: vi.fn(),
}))

vi.mock('@/api/adminUsersApi', () => ({ fetchAdminUsersPage: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const level = { id: 'volunteer', title: 'متطوع EMC', months: 0, points: 0, sadeem: 'Open Community' }
const summary = {
  lifetime_points: 120, available_points: 120, redeemed_points: 0, credit_eur: 1.2,
  active_months: 1, eligible_level: level, next_level: null,
}

function resolveAll() {
  mockSummary.mockResolvedValue(summary)
  mockAwards.mockResolvedValue([])
  mockBoard.mockResolvedValue([])
  mockPolicy.mockResolvedValue({ levels: [level], euro_per_1000: 10, monthly_cap: 2500, version: '1.0' })
}

describe('ImpactPointsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveAll()
  })

  it('renders the summary when every endpoint answers', async () => {
    render(<ImpactPointsPage />)
    expect(await screen.findByText('نقاط الأثر التراكمية')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an error with retry instead of an endless skeleton when one request fails', async () => {
    mockBoard.mockRejectedValueOnce(new Error('403'))
    render(<ImpactPointsPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذر تحميل نقاط الأثر')

    await userEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }))
    expect(await screen.findByText('نقاط الأثر التراكمية')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('does not crash on a leaderboard row whose user is missing', async () => {
    mockBoard.mockResolvedValue([
      { user: null, lifetime_points: 900 },
      { user: { id: 3, name: 'سارة', role: 'volunteer' }, lifetime_points: 400 },
    ])
    render(<ImpactPointsPage />)
    expect(await screen.findByText('سارة')).toBeInTheDocument()
  })
})

describe('ImpactSparkWidget', () => {
  beforeEach(() => allowedKeys.clear())

  it('is hidden when the page-access manifest does not allow the page', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><ImpactSparkWidget /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /نقاط أثر EMC/ })).not.toBeInTheDocument()
  })

  it('links to the page when the manifest allows it', () => {
    allowedKeys.add('operations.impact_points')
    render(<MemoryRouter initialEntries={['/dashboard']}><ImpactSparkWidget /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /نقاط أثر EMC/ })).toHaveAttribute('href', '/dashboard/operations/impact-points')
  })
})
