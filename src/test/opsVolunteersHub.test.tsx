import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import HrVolunteersPage from '@/pages/hr/HrVolunteersPage'
import VolunteerDetailDrawer from '@/components/operations/VolunteerDetailDrawer'
import * as hubApi from '@/api/volunteersHubApi'
import type { VolunteerHubItem, VolunteerHubSummary } from '@/api/volunteersHubApi'
import { withoutAccountMessage } from '@/utils/volunteerMessages'
import { axeCheck } from './axe'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, role: 'hr_manager' } }) }))
vi.mock('@/api/volunteersHubApi', async (importActual) => {
  const actual = await importActual<typeof import('@/api/volunteersHubApi')>()
  return {
    ...actual,
    fetchVolunteersHub: vi.fn(),
    fetchVolunteerPointsLedger: vi.fn(),
    fetchVolunteerStatusLogs: vi.fn(),
    fetchVolunteerWeeklyRatings: vi.fn(),
  }
})

const fetchHub = vi.mocked(hubApi.fetchVolunteersHub)
const fetchLedger = vi.mocked(hubApi.fetchVolunteerPointsLedger)
const fetchLogs = vi.mocked(hubApi.fetchVolunteerStatusLogs)
const fetchRatings = vi.mocked(hubApi.fetchVolunteerWeeklyRatings)

const DEPARTMENTS = [
  { id: 1, name: 'الإعلام والتسويق' },
  { id: 2, name: 'التقنية' },
]

function vol(id: number, over: Partial<VolunteerHubItem> = {}): VolunteerHubItem {
  return {
    id,
    user_id: 100 + id,
    name: `متطوع ${id}`,
    email: `v${id}@example.com`,
    avatar: null,
    department_id: 1,
    department_name: 'الإعلام والتسويق',
    is_leader: false,
    status: 'active',
    hours_logged: 10,
    actual_points: 50,
    used_points: 10,
    balance: 40,
    last_weekly_rating: null,
    created_at: '2026-01-01',
    ...over,
  }
}

function summary(over: Partial<VolunteerHubSummary> = {}): VolunteerHubSummary {
  return {
    total_volunteers: 0,
    total_actual_points: 0,
    total_used_points: 0,
    total_balance: 0,
    status_counts: { active: 0, inactive: 0, on_leave: 0, withdrawn: 0 },
    without_account: 0,
    ...over,
  }
}

function hubResponse(volunteers: VolunteerHubItem[], sum: Partial<VolunteerHubSummary> = {}) {
  return { volunteers, departments: DEPARTMENTS, summary: summary({ total_volunteers: volunteers.length, ...sum }) }
}

const renderPage = () => render(<MemoryRouter><HrVolunteersPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('withoutAccountMessage', () => {
  it('agrees with the number in Arabic', () => {
    expect(withoutAccountMessage(1)).toBe('متطوع قديم واحد بلا حساب لا يمكن منحه نقاطًا حتى يُحوَّل بحساب.')
    expect(withoutAccountMessage(2)).toContain('متطوعان قديمان')
    expect(withoutAccountMessage(5)).toBe('5 متطوعين قدامى بلا حساب لا يمكن منحهم نقاطًا حتى يُحوَّلوا بحساب.')
    expect(withoutAccountMessage(14)).toContain('14 متطوعًا قديمًا')
  })
})

describe('Ops volunteers hub page', () => {
  it('shows EVERY row the server returned (no client-side truncation) with its department', async () => {
    fetchHub.mockResolvedValue(hubResponse(Array.from({ length: 73 }, (_, i) => vol(i + 1, i % 2 ? { department_id: 2, department_name: 'التقنية' } : {}))))
    renderPage()

    expect(await screen.findByText('متطوع 73')).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(1 + 73) // header + every volunteer
    expect(screen.getAllByText('التقنية').length).toBeGreaterThan(0)
  })

  it('renders a muted «غير محدد» chip only when the department is truly missing', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1), vol(2, { department_id: null, department_name: '' })]))
    renderPage()

    await screen.findByText('متطوع 2')
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(within(rows[1]).getByText('الإعلام والتسويق')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('غير محدد')).not.toBeInTheDocument()
    expect(within(rows[2]).getByText('غير محدد')).toBeInTheDocument()
  })

  it('shows the no-account notice when summary.without_account > 0, and nothing when it is 0', async () => {
    fetchHub.mockResolvedValueOnce(hubResponse([vol(1)], { without_account: 4 }))
    const { unmount } = renderPage()

    const banner = await screen.findByTestId('without-account-banner')
    expect(banner).toHaveTextContent('4 متطوعين قدامى بلا حساب لا يمكن منحهم نقاطًا حتى يُحوَّلوا بحساب.')
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument() // no dead links
    unmount()

    fetchHub.mockResolvedValueOnce(hubResponse([vol(1)], { without_account: 0 }))
    renderPage()
    await screen.findByText('متطوع 1')
    expect(screen.queryByTestId('without-account-banner')).not.toBeInTheDocument()
  })

  it('the department filter is sent to the server AND never shows another department in the table', async () => {
    const all = [vol(1), vol(2, { department_id: 2, department_name: 'التقنية' }), vol(3, { department_id: 2, department_name: 'التقنية' })]
    // a server that ignored the filter would still return everyone
    fetchHub.mockResolvedValue(hubResponse(all))
    renderPage()
    await screen.findByText('متطوع 3')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'تصفية حسب الإدارة' }), '2')

    await waitFor(() => expect(fetchHub).toHaveBeenLastCalledWith(expect.objectContaining({ department_id: '2' })))
    await waitFor(() => expect(screen.queryByText('متطوع 1')).not.toBeInTheDocument())
    expect(screen.getByText('متطوع 2')).toBeInTheDocument()
    expect(screen.getByText('متطوع 3')).toBeInTheDocument()
  })

  it('a department that only appears on a row is still selectable', async () => {
    fetchHub.mockResolvedValue({ ...hubResponse([vol(1, { department_id: 9, department_name: 'الجودة' })]), departments: [] })
    renderPage()
    await screen.findByText('متطوع 1')

    expect(within(screen.getByRole('combobox', { name: 'تصفية حسب الإدارة' })).getByRole('option', { name: 'الجودة' })).toBeInTheDocument()
  })

  it('a failed load is an error with a retry, never the «no volunteers» empty state', async () => {
    fetchHub.mockRejectedValueOnce(new Error('500'))
    renderPage()

    const error = await screen.findByTestId('hub-load-error')
    expect(error).toHaveTextContent('تعذّر تحميل قائمة المتطوعين')
    expect(screen.queryByText('لا يوجد متطوعون مسجَّلون بعد')).not.toBeInTheDocument()
    expect(screen.queryByText('لا يوجد متطوعون يطابقون خيارات البحث والفلترة')).not.toBeInTheDocument()

    fetchHub.mockResolvedValueOnce(hubResponse([vol(1)]))
    await userEvent.click(within(error).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('متطوع 1')).toBeInTheDocument()
    expect(screen.queryByTestId('hub-load-error')).not.toBeInTheDocument()
  })

  it('the empty state is accurate: no filters = nobody registered; with a search = nothing matches', async () => {
    fetchHub.mockResolvedValue(hubResponse([]))
    renderPage()
    expect(await screen.findByText('لا يوجد متطوعون مسجَّلون بعد')).toBeInTheDocument()
    expect(screen.queryByText('إعادة ضبط الفلاتر')).not.toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث باسم المتطوع أو بريده' }), 'xyz')

    expect(await screen.findByText('لا يوجد متطوعون يطابقون خيارات البحث والفلترة')).toBeInTheDocument()
    expect(screen.getByText('إعادة ضبط الفلاتر')).toBeInTheDocument()
  })

  it('one request per pause in typing, not one per keystroke', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1)]))
    renderPage()
    await screen.findByText('متطوع 1')
    fetchHub.mockClear()

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث باسم المتطوع أو بريده' }), 'علي')

    await waitFor(() => expect(fetchHub).toHaveBeenCalledWith(expect.objectContaining({ search: 'علي' })))
    expect(fetchHub.mock.calls.every(([p]) => p?.search === undefined || p.search === 'علي')).toBe(true)
  })

  it('has no accessibility violations', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1)], { without_account: 2 }))
    const { container } = renderPage()
    await screen.findByText('متطوع 1')

    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('Volunteer detail drawer: no silent failures', () => {
  const v = vol(7)
  const renderDrawer = (onClose = vi.fn()) => render(<MemoryRouter><VolunteerDetailDrawer volunteer={v} onClose={onClose} onOpenStatusModal={vi.fn()} /></MemoryRouter>)

  it('the personal tab no longer links to the cancelled HR-profile form', () => {
    renderDrawer()

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain('hr-profile')
    expect(screen.getByText('مصدر بيانات المتطوع')).toBeInTheDocument()
  })

  it('points: an API failure shows an explicit error with retry; retry loads the ledger', async () => {
    fetchLedger.mockRejectedValueOnce(new Error('500'))
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل سجل حركات النقاط')
    expect(screen.queryByText(/لا توجد حركات نقاط/)).not.toBeInTheDocument()

    fetchLedger.mockResolvedValueOnce({
      ledger: [{ id: 'a1', date: '2026-10-01', category: 'task', reason: 'مهمة منجزة', points: 5, type: 'earn', source: 'tasks', creator: 'المدير' }],
      actual_points: 5, used_points: 0, balance: 5,
    })
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('مهمة منجزة')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchLedger).toHaveBeenCalledTimes(2)
  })

  it('points: an empty ledger is the honest empty state, not an error', async () => {
    fetchLedger.mockResolvedValueOnce({ ledger: [], actual_points: 0, used_points: 0, balance: 0 })
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))

    expect(await screen.findByText(/لا توجد حركات نقاط مسجلة/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('status logs: error + retry', async () => {
    fetchLogs.mockRejectedValueOnce(new Error('500'))
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل سجل النشاط')

    fetchLogs.mockResolvedValueOnce([
      { id: 1, old_status: 'active', new_status: 'on_leave', reason: 'سفر', changed_by_name: 'المدير', changed_by_id: 1, created_at: '2026-10-01', date_formatted: '2026-10-01' },
    ])
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('سفر')).toBeInTheDocument()
  })

  it('weekly ratings: error + retry', async () => {
    fetchRatings.mockRejectedValueOnce(new Error('500'))
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'التقييمات الأسبوعية' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل التقييمات الأسبوعية')
    expect(screen.queryByText(/لم يُسجل أي تقييم/)).not.toBeInTheDocument()

    fetchRatings.mockResolvedValueOnce({ ratings: [], monthly_averages: [], criteria_averages: {}, overall_avg: null })
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText(/لم يُسجل أي تقييم أسبوعي/)).toBeInTheDocument()
  })

  it('each tab is requested once, on first open, and not again when switching back', async () => {
    fetchLedger.mockResolvedValue({ ledger: [], actual_points: 0, used_points: 0, balance: 0 })
    fetchLogs.mockResolvedValue([])
    renderDrawer()
    expect(fetchLedger).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))
    await screen.findByText(/لا توجد حركات نقاط/)
    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))
    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))

    expect(fetchLedger).toHaveBeenCalledTimes(1)
    expect(fetchRatings).not.toHaveBeenCalled()
  })

  it('Escape closes the status modal first and leaves the drawer open; a second Escape closes the drawer', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1)]))
    renderPage()
    await userEvent.click(await screen.findByText('متطوع 1'))
    const drawer = await screen.findByRole('dialog', { name: 'متطوع 1' })

    await userEvent.click(within(drawer).getByRole('button', { name: 'تعديل الحالة الآن' }))
    expect(await screen.findByRole('dialog', { name: 'تعديل حالة المتطوع' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'تعديل حالة المتطوع' })).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'متطوع 1' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'متطوع 1' })).not.toBeInTheDocument())
  })

  it('the drawer ignores an Escape another layer already handled', async () => {
    const onClose = vi.fn()
    renderDrawer(onClose)

    const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true })
    handled.preventDefault()
    document.dispatchEvent(handled)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('is a labelled dialog that Escape closes', async () => {
    const onClose = vi.fn()
    renderDrawer(onClose)

    expect(screen.getByRole('dialog', { name: 'متطوع 7' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
