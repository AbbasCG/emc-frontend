import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ImpactPointsPage from '@/pages/operations/ImpactPointsPage'
import ImpactSparkWidget from '@/components/operations/ImpactSparkWidget'

/**
 * Impact Points — volunteers see their own score and history; the award form
 * appears only when the SERVER reports award authority (summary.can_award),
 * and its picker lists only the eligible team members the server returns,
 * labelled with name + department + title. Failures never leave an endless
 * skeleton, and the floating shortcut follows page access.
 */

const allowedKeys = new Set<string>()

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ canAccessKey: (key: string) => allowedKeys.has(key) }),
}))

const mockSummary = vi.fn()
const mockAwards = vi.fn()
const mockBoard = vi.fn()
const mockPolicy = vi.fn()
const mockRecipients = vi.fn()
const mockAward = vi.fn()

vi.mock('@/api/volunteerPointsApi', () => ({
  AWARD_CATEGORIES: [{ value: 'task', label: 'مهمة' }],
  fetchMyPointsSummary: () => mockSummary(),
  fetchMyAwards: () => mockAwards(),
  fetchPointsLeaderboard: () => mockBoard(),
  fetchPointsPolicy: () => mockPolicy(),
  fetchPointRecipients: () => mockRecipients(),
  awardPoints: (input: unknown) => mockAward(input),
}))

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const level = { id: 'volunteer', title: 'متطوع EMC', months: 0, points: 0, sadeem: 'Open Community' }
const summary = (canAward: boolean) => ({
  lifetime_points: 120, available_points: 120, redeemed_points: 0, credit_eur: 1.2,
  active_months: 1, eligible_level: level, next_level: null, can_award: canAward, monthly_cap: 2500,
})

const recipients = [
  { user_id: 11, name: 'سارة', department_id: 2, department: 'إدارة البرامج', role_title: 'منسقة', month_points: 400, lifetime_points: 900 },
  { user_id: 12, name: 'خالد', department_id: 3, department: null, role_title: null, month_points: 0, lifetime_points: 0 },
]

function resolveAll(canAward = false) {
  mockSummary.mockResolvedValue(summary(canAward))
  mockAwards.mockResolvedValue([])
  mockBoard.mockResolvedValue([])
  mockPolicy.mockResolvedValue({ levels: [level], euro_per_1000: 10, monthly_cap: 2500, version: '1.0' })
  mockRecipients.mockResolvedValue(recipients)
}

describe('ImpactPointsPage — volunteer self view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveAll(false)
  })

  it('shows own score and history, and no award form without server authority', async () => {
    render(<ImpactPointsPage />)
    expect(await screen.findByText('نقاط الأثر التراكمية')).toBeInTheDocument()
    expect(screen.getByText('سجل نقاطي')).toBeInTheDocument()
    expect(screen.queryByText('منح نقاط لأعضاء الفريق')).not.toBeInTheDocument()
    expect(mockRecipients).not.toHaveBeenCalled()
  })

  it('shows an error with retry instead of an endless skeleton when one request fails', async () => {
    mockBoard.mockRejectedValueOnce(new Error('403'))
    render(<ImpactPointsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل نقاط الأثر')
    await userEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }))
    expect(await screen.findByText('نقاط الأثر التراكمية')).toBeInTheDocument()
  })

  it('does not crash on a leaderboard row whose user is missing', async () => {
    mockBoard.mockResolvedValue([
      { user: null, lifetime_points: 900 },
      { user: { id: 3, name: 'منى', role: 'volunteer' }, lifetime_points: 400 },
    ])
    render(<ImpactPointsPage />)
    expect(await screen.findByText('منى')).toBeInTheDocument()
  })
})

describe('ImpactPointsPage — management view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveAll(true)
  })

  it('lists only the server-provided recipients, with name, department and title', async () => {
    render(<ImpactPointsPage />)
    const picker = await screen.findByRole('combobox', { name: 'العضو المستحق' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3))

    const labels = within(picker).getAllByRole('option').map((o) => o.textContent)
    expect(labels).toContain('سارة — إدارة البرامج — منسقة')
    expect(labels).toContain('خالد — بدون إدارة')
  })

  it('shows the remaining monthly cap for the chosen member', async () => {
    render(<ImpactPointsPage />)
    const picker = await screen.findByRole('combobox', { name: 'العضو المستحق' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3))
    await userEvent.selectOptions(picker, '11')

    expect(screen.getByText(/المتبقي من سقف هذا الشهر/)).toHaveTextContent('2,100')
  })

  it('submits an award for the chosen recipient', async () => {
    mockAward.mockResolvedValue({ id: 1 })
    render(<ImpactPointsPage />)
    const picker = await screen.findByRole('combobox', { name: 'العضو المستحق' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3))

    await userEvent.selectOptions(picker, '11')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'عدد النقاط' }), '150')
    await userEvent.type(screen.getByRole('textbox', { name: 'سبب المنح' }), 'تنظيم ورشة')
    await userEvent.click(screen.getByRole('button', { name: /امنح النقاط/ }))

    await waitFor(() => expect(mockAward).toHaveBeenCalledWith({ user_id: 11, category: 'task', points: 150, reason: 'تنظيم ورشة' }))
  })

  it('explains an empty scope instead of offering an unusable form', async () => {
    mockRecipients.mockResolvedValue([])
    render(<ImpactPointsPage />)
    expect(await screen.findByText('لا يوجد أعضاء فريق ضمن نطاق صلاحيتك حالياً.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /امنح النقاط/ })).toBeDisabled()
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
