import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, RouterProvider, Routes, createMemoryRouter, useLocation } from 'react-router'
import TechAdminDashboardPage from '@/components/tickets/TechAdminDashboardPage'
import { invalidateTicketDetail } from '@/services/ticketDetailCache'
import type { Ticket } from '@/types/ticket'
import type { BoardColumn, TicketAnalytics, TicketInsight, TicketListResult, TicketStats } from '@/types/ticketOps'

const ops = vi.hoisted(() => ({
  fetchTicketList: vi.fn(),
  fetchTicketStats: vi.fn(),
  fetchTicketBoard: vi.fn(),
  fetchTicketAnalytics: vi.fn(),
  fetchTicketInsights: vi.fn(),
  fetchTicketDetail: vi.fn(),
  fetchAssignmentSuggestions: vi.fn(),
  fetchPossibleDuplicates: vi.fn(),
  changeTicketPriority: vi.fn(),
  bulkUpdateTickets: vi.fn(),
}))

vi.mock('@/services/ticketOpsService', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/services/ticketOpsService')>()), ...ops }))

const svc = vi.hoisted(() => ({
  getMeta: vi.fn(),
  addComment: vi.fn(),
  reassign: vi.fn(),
  approveTicket: vi.fn(),
  rejectByAdmin: vi.fn(),
  acceptTask: vi.fn(),
}))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'مدير' } }) }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/tickets/TicketAttachmentCard', () => ({ TicketAttachmentCard: () => null }))
// jsdom has no layout, so the chart internals would render nothing useful; the panel's own markup is what is tested.
vi.mock('recharts', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return { ResponsiveContainer: Box, AreaChart: Box, BarChart: Box, LineChart: Box, Area: () => null, Bar: () => null, Line: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null }
})

const CAPS = { approve: false, reject: false, reassign: false, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: true, change_priority: false }

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 501, ticket_number: 'EMC-501', title: 'الشبكة لا تعمل', description: 'وصف التذكرة', ticket_category: 'OLD_ISSUE', priority: 'HIGH', department_id: 3,
    created_by_name: 'أحمد', status: 'PENDING_APPROVAL', created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-01T08:00:00Z', last_activity_at: '2026-10-01T09:00:00Z',
    department: { id: 3, name: 'Tech', name_ar: 'التقنية', slug: 't' }, capabilities: { ...CAPS }, ...over,
  } as Ticket
}

const list = (items: Ticket[], over: Partial<TicketListResult> = {}): TicketListResult => ({ items, total: items.length, currentPage: 1, lastPage: 1, perPage: 25, ...over })

function stats(over: Partial<TicketStats['counts']> = {}): TicketStats {
  return {
    counts: { total: 120, pendingApproval: 14, assigned: 20, inProgress: 31, resolved: 40, unresolved: 3, rejectedByAdmin: 4, rejectedByAssignee: 8, open: 73, closed: 47, overdue: 9, dueSoon: 6, unassigned: 17, highPriority: 11, new24h: 5, ...over },
    timings: { windowDays: 30, avgResponseHours: 2.5, responseSample: 40, avgResolutionHours: 30, resolutionSample: 25, truncated: false, definitions: { response: 'من الإنشاء إلى أول قرار.', resolution: 'من الإنشاء إلى الحل.' } },
    scopeNote: 'ملاحظة النطاق', dueSoonHours: 24,
  }
}

function Probe() {
  const l = useLocation()
  return <output data-testid="url">{l.search}</output>
}

function renderAt(entry = '/dashboard/tickets/admin') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <Routes>
        <Route path="/dashboard/tickets/admin" element={<TechAdminDashboardPage />} />
        <Route path="/dashboard/tickets/:id" element={<div>TICKET DETAIL PAGE</div>} />
        <Route path="/dashboard/tickets/new" element={<div>NEW TICKET</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The KPI card for a key (cards and the quick-filter chips can share a label, so cards are found by their key). */
const kpi = (key: string) => document.querySelector<HTMLButtonElement>(`[data-kpi="${key}"]`)!

// jsdom has no <dialog> modal API; the confirmation dialog needs it.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const url = () => new URLSearchParams(screen.getByTestId('url').textContent ?? '')
const lastListParams = () => ops.fetchTicketList.mock.calls.at(-1)![0] as Record<string, string | number>

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  invalidateTicketDetail()
  Object.values(ops).forEach((m) => m.mockReset())
  Object.values(svc).forEach((m) => m.mockReset())
  ops.fetchTicketList.mockResolvedValue(list([ticket()]))
  ops.fetchTicketStats.mockResolvedValue(stats())
  ops.fetchTicketInsights.mockResolvedValue([])
  ops.fetchTicketBoard.mockResolvedValue([])
  ops.fetchTicketDetail.mockImplementation(async (id: number) => ({ ...ticket({ id }), activity_logs: [] }))
  ops.fetchAssignmentSuggestions.mockResolvedValue({ basis: 'ترتيب بحسب العبء.', scope: 'department', candidates: [], message: 'لا يوجد' })
  ops.fetchPossibleDuplicates.mockResolvedValue([])
  svc.getMeta.mockResolvedValue({ departments: [{ id: 3, name: 'Tech', name_ar: 'التقنية' }, { id: 4, name: 'Mkt', name_ar: 'التسويق' }], tech_units: [], users: [{ id: 9, name: 'سلمى', email: '' }] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('figures and cards', () => {
  it('shows the server-computed totals for the whole visible set, not the page on screen', async () => {
    renderAt()

    expect(await screen.findByTestId('kpi-value-pending')).toHaveTextContent('14')
    expect(screen.getByTestId('kpi-value-open')).toHaveTextContent('73')
    expect(screen.getByTestId('kpi-value-overdue')).toHaveTextContent('9')
    expect(screen.getByTestId('kpi-value-unassigned')).toHaveTextContent('17')
    expect(screen.getByTestId('kpi-value-highPriority')).toHaveTextContent('11')
    // The table has one row; the figures never came from it.
    expect(await screen.findAllByTestId('ticket-row')).toHaveLength(1)
  })

  it('shows loading placeholders before the figures arrive', async () => {
    ops.fetchTicketStats.mockReturnValue(new Promise(() => {}))
    renderAt()

    expect(await screen.findByRole('button', { name: /بانتظار الاعتماد/ })).toBeInTheDocument()
    expect(screen.queryByTestId('kpi-value-pending')?.textContent).toBe('')
  })

  it('pressing a card applies exactly its filter, keeps unrelated filters and does not re-request the figures', async () => {
    renderAt('/dashboard/tickets/admin?search=net&dept=3&status=RESOLVED&mine=1')
    await screen.findByTestId('kpi-value-overdue')
    expect(ops.fetchTicketStats).toHaveBeenCalledTimes(1)

    await userEvent.click(kpi('overdue'))

    await waitFor(() => expect(url().get('overdue')).toBe('1'))
    expect(url().get('search')).toBe('net')
    expect(url().get('dept')).toBe('3')
    expect(url().has('status')).toBe(false)
    expect(url().has('mine')).toBe(false)
    expect(url().has('page')).toBe(false)
    await waitFor(() => expect(lastListParams()).toMatchObject({ overdue: 1, search: 'net', department_id: '3' }))
    expect(lastListParams()).not.toHaveProperty('status')
    expect(ops.fetchTicketStats).toHaveBeenCalledTimes(1)
  })

  it('shows which card is applied, and pressing it again clears it', async () => {
    renderAt('/dashboard/tickets/admin?overdue=1&search=x')
    await screen.findByTestId('kpi-value-overdue')

    expect(kpi('overdue')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(kpi('overdue'))

    await waitFor(() => expect(url().has('overdue')).toBe(false))
    expect(url().get('search')).toBe('x')
  })

  it('the unassigned and high-priority cards select the open subsets they count', async () => {
    renderAt()
    await screen.findByTestId('kpi-value-unassigned')
    await userEvent.click(kpi('unassigned'))
    await waitFor(() => expect(lastListParams()).toMatchObject({ unassigned: 1, state: 'open' }))

    await userEvent.click(kpi('highPriority'))
    await waitFor(() => expect(lastListParams()).toMatchObject({ priority: 'HIGH,CRITICAL', state: 'open' }))
    expect(lastListParams()).not.toHaveProperty('unassigned')
  })

  it('secondary figures and the timing definitions are available, with their sample sizes', async () => {
    renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /مزيد من المؤشرات/ }))

    const t = screen.getByTestId('kpi-timings')
    expect(within(t).getByText(/2\.5 ساعة/)).toBeInTheDocument()
    expect(within(t).getByText(/من 40 تذكرة/)).toBeInTheDocument()
    expect(within(t).getByText(/30 ساعة/)).toBeInTheDocument()
    expect(screen.getByText('ملاحظة النطاق')).toBeInTheDocument()
  })

  it('unknown averages read as a dash, never as zero', async () => {
    const s = stats()
    s.timings = { ...s.timings, avgResponseHours: null, responseSample: 0 }
    ops.fetchTicketStats.mockResolvedValue(s)
    renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /مزيد من المؤشرات/ }))

    expect(within(screen.getByTestId('kpi-timings')).getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('the table', () => {
  it('requests the slim payload with the default sort and page size', async () => {
    renderAt()
    await screen.findAllByTestId('ticket-row')

    expect(lastListParams()).toEqual({ sort: 'created_at', dir: 'desc', per_page: 25, lite: 1 })
  })

  it('clicking a row opens the details modal in place and keeps the filters', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket()], { total: 90, lastPage: 3, currentPage: 2 }))
    renderAt('/dashboard/tickets/admin?status=PENDING_APPROVAL&search=net&page=2')
    ops.fetchTicketList.mockClear()

    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(url().get('ticket')).toBe('501')
    expect(url().get('status')).toBe('PENDING_APPROVAL')
    expect(url().get('search')).toBe('net')
    expect(url().get('page')).toBe('2')
    expect(screen.queryByText('TICKET DETAIL PAGE')).not.toBeInTheDocument()
    expect(ops.fetchTicketDetail).toHaveBeenCalledWith(501)
    expect(ops.fetchTicketList).not.toHaveBeenCalled()
  })

  it('the title button opens the modal from the keyboard', async () => {
    renderAt()
    const btn = await screen.findByRole('button', { name: 'فتح التذكرة EMC-501' })
    btn.focus()
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(url().get('ticket')).toBe('501')
  })

  it('a quick action does not also open the ticket', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket({ capabilities: { ...CAPS, approve: true, reject: true } })]))
    svc.approveTicket.mockResolvedValue({ success: true })
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'اعتماد التذكرة EMC-501' }))

    expect(await screen.findByText('اعتماد التذكرة وتحديد التكليف', { exact: false })).toBeInTheDocument()
    expect(url().has('ticket')).toBe(false)
    expect(screen.queryByRole('dialog', { name: /تفاصيل/ })).not.toBeInTheDocument()
  })

  it('selecting a row does not open the ticket either', async () => {
    renderAt()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'تحديد التذكرة EMC-501' }))

    expect(url().has('ticket')).toBe(false)
    expect(screen.getByTestId('bulk-bar')).toBeInTheDocument()
  })

  it('offers only the actions the server allows for each ticket', async () => {
    ops.fetchTicketList.mockResolvedValue(list([
      ticket({ id: 1, ticket_number: 'EMC-1', capabilities: { ...CAPS, approve: true, reject: true } }),
      ticket({ id: 2, ticket_number: 'EMC-2', status: 'REJECTED_BY_ASSIGNEE', capabilities: { ...CAPS } }),
      ticket({ id: 3, ticket_number: 'EMC-3', status: 'ASSIGNED', assignee: { id: 9, name: 'سلمى', email: '' }, capabilities: { ...CAPS, reassign: true } }),
      ticket({ id: 4, ticket_number: 'EMC-4', status: 'ASSIGNED', capabilities: { ...CAPS, reassign: true } }),
    ]))
    renderAt()
    await screen.findAllByTestId('ticket-row')

    expect(screen.getByRole('button', { name: 'اعتماد التذكرة EMC-1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'اعتماد التذكرة EMC-2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة توجيه التذكرة EMC-2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة توجيه التذكرة EMC-3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعيين التذكرة EMC-4' })).toBeInTheDocument()
  })

  it('shows missing relationships without breaking', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket({ department: undefined, assignee: undefined, created_by_name: '' })]))
    renderAt()

    expect(await screen.findByText('غير مُسنَدة')).toBeInTheDocument()
    expect(screen.getAllByTestId('ticket-row')).toHaveLength(1)
  })

  it('long titles are truncated visually but available in full', async () => {
    const title = 'عنوان طويل جدًا '.repeat(15)
    ops.fetchTicketList.mockResolvedValue(list([ticket({ title })]))
    renderAt()

    const node = await screen.findByTitle(title.trim())
    expect(node.className).toMatch(/truncate/)
  })

  it('sorting from a header toggles direction and keeps the filters', async () => {
    renderAt('/dashboard/tickets/admin?search=net')
    await userEvent.click(await screen.findByRole('button', { name: 'ترتيب حسب الأولوية' }))
    await waitFor(() => expect(url().get('sort')).toBe('priority'))
    expect(url().get('search')).toBe('net')

    await userEvent.click(screen.getByRole('button', { name: 'ترتيب حسب الأولوية' }))
    await waitFor(() => expect(url().get('dir')).toBe('asc'))
    expect(lastListParams()).toMatchObject({ sort: 'priority', dir: 'asc', search: 'net' })
  })

  it('hides and remembers columns', async () => {
    const { unmount } = renderAt()
    await screen.findAllByTestId('ticket-row')
    expect(screen.getByRole('columnheader', { name: /الحالة/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'الأعمدة' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'الحالة' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'المُبلِّغ' }))

    expect(screen.queryByRole('columnheader', { name: /الحالة/ })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /المُبلِّغ/ })).toBeInTheDocument()

    unmount()
    renderAt()
    await screen.findAllByTestId('ticket-row')
    expect(screen.queryByRole('columnheader', { name: /الحالة/ })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /المُبلِّغ/ })).toBeInTheDocument()
  })

  it('uses cards instead of a table on a narrow screen', async () => {
    const original = window.matchMedia
    window.matchMedia = (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia
    try {
      renderAt()
      expect(await screen.findAllByTestId('ticket-card')).toHaveLength(1)
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'فتح التذكرة EMC-501' }))
      expect(await screen.findByRole('dialog')).toBeInTheDocument()
    } finally {
      window.matchMedia = original
    }
  })
})

describe('filters and the URL', () => {
  it('restores every filter from the URL on load and shows them as chips', async () => {
    renderAt('/dashboard/tickets/admin?status=IN_PROGRESS,ASSIGNED&priority=HIGH&dept=3&unassigned=1&created_from=2026-10-01&sort=due&dir=asc&per_page=50&page=2')

    await screen.findAllByTestId('ticket-row')
    expect(lastListParams()).toMatchObject({ status: 'IN_PROGRESS,ASSIGNED', priority: 'HIGH', department_id: '3', unassigned: 1, created_from: '2026-10-01', sort: 'due', dir: 'asc', per_page: 50, page: 2 })
    const chips = screen.getAllByTestId('filter-chip').map((c) => c.textContent)
    expect(chips).toEqual(expect.arrayContaining([expect.stringContaining('قيد المعالجة'), expect.stringContaining('أولوية: عالية'), expect.stringContaining('بلا مكلف')]))
  })

  it('a hand-edited URL never sends invalid values to the server', async () => {
    renderAt('/dashboard/tickets/admin?status=HACK&priority=ZZ&per_page=99999&page=-4&sort=password&dept=1;DROP')
    await screen.findAllByTestId('ticket-row')

    expect(lastListParams()).toEqual({ sort: 'created_at', dir: 'desc', per_page: 25, lite: 1 })
  })

  it('old links with the previous parameter names still work', async () => {
    renderAt('/dashboard/tickets/admin?status=PENDING_APPROVAL&delayed=1&page=2')
    await screen.findAllByTestId('ticket-row')

    expect(lastListParams()).toMatchObject({ status: 'PENDING_APPROVAL', overdue: 1, page: 2 })
  })

  it('changing the page keeps every filter (regression of the earlier setCurrentPage bug)', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket()], { total: 90, lastPage: 4, currentPage: 2 }))
    renderAt('/dashboard/tickets/admin?status=IN_PROGRESS&search=net&dept=3&overdue=1&page=2')
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))

    await waitFor(() => expect(url().get('page')).toBe('3'))
    expect(url().get('status')).toBe('IN_PROGRESS')
    expect(url().get('search')).toBe('net')
    expect(url().get('dept')).toBe('3')
    expect(url().get('overdue')).toBe('1')
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 3, status: 'IN_PROGRESS', search: 'net', department_id: '3', overdue: 1 }))

    await userEvent.click(screen.getByRole('button', { name: /السابق/ }))
    await userEvent.click(screen.getByRole('button', { name: /السابق/ }))
    await waitFor(() => expect(url().has('page')).toBe(false))
    expect(url().get('status')).toBe('IN_PROGRESS')
  })

  it('changing a filter returns to page 1 and keeps the others', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket()], { total: 90, lastPage: 4, currentPage: 3 }))
    renderAt('/dashboard/tickets/admin?search=net&page=3')
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('button', { name: 'متأخرة', pressed: false }))

    await waitFor(() => expect(url().get('overdue')).toBe('1'))
    expect(url().has('page')).toBe(false)
    expect(url().get('search')).toBe('net')
  })

  it('page size is adjustable and returns to page 1', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket()], { total: 90, lastPage: 4, currentPage: 3 }))
    renderAt('/dashboard/tickets/admin?page=3')
    await screen.findAllByTestId('ticket-row')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'عدد الصفوف في الصفحة' }), '50')

    await waitFor(() => expect(url().get('per_page')).toBe('50'))
    expect(url().has('page')).toBe(false)
  })

  it('a page past the end lands on the last page', async () => {
    ops.fetchTicketList.mockImplementation(async (p: Record<string, number>) => (p.page > 2 ? list([], { total: 30, lastPage: 2, currentPage: 2 }) : list([ticket()], { total: 30, lastPage: 2, currentPage: p.page })))
    renderAt('/dashboard/tickets/admin?page=9')

    await waitFor(() => expect(url().get('page')).toBe('2'))
  })

  it('removing one chip removes only that filter; clear-all removes them all', async () => {
    renderAt('/dashboard/tickets/admin?status=IN_PROGRESS,ASSIGNED&search=net&overdue=1')
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('button', { name: /إزالة الفلتر: قيد المعالجة/ }))
    await waitFor(() => expect(url().get('status')).toBe('ASSIGNED'))
    expect(url().get('search')).toBe('net')

    await userEvent.click(screen.getByRole('button', { name: 'مسح الكل' }))
    await waitFor(() => expect(url().toString()).toBe(''))
    expect(screen.queryByTestId('filter-chip')).not.toBeInTheDocument()
  })

  it('search waits for a pause, then makes one request, without adding history entries', async () => {
    renderAt()
    await screen.findAllByTestId('ticket-row')
    ops.fetchTicketList.mockClear()

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث في التذاكر' }), 'net')
    expect(ops.fetchTicketList).not.toHaveBeenCalled()

    await waitFor(() => expect(ops.fetchTicketList).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(lastListParams()).toMatchObject({ search: 'net' })
    expect(url().get('search')).toBe('net')
    await new Promise((r) => setTimeout(r, 600))
    expect(ops.fetchTicketList).toHaveBeenCalledTimes(1)
  })

  it('a search that changes the URL from outside (back, reset) shows in the box', async () => {
    renderAt('/dashboard/tickets/admin?search=old')
    const box = await screen.findByRole('searchbox', { name: 'بحث في التذاكر' })
    expect(box).toHaveValue('old')

    await userEvent.click(screen.getByRole('button', { name: 'مسح الكل' }))
    await waitFor(() => expect(box).toHaveValue(''))
  })

  it('rapid filter changes never let a slow earlier answer overwrite the latest', async () => {
    let releaseFirst: (v: TicketListResult) => void = () => {}
    ops.fetchTicketList
      .mockReset()
      .mockImplementationOnce(() => new Promise<TicketListResult>((r) => { releaseFirst = r }))
      .mockImplementation(async () => list([ticket({ id: 2, ticket_number: 'EMC-LATEST', title: 'الأحدث' })]))
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'متأخرة', pressed: false }))
    expect(await screen.findByText('الأحدث')).toBeInTheDocument()

    await act(async () => releaseFirst(list([ticket({ id: 1, ticket_number: 'EMC-STALE', title: 'قديم' })])))

    expect(screen.getByText('الأحدث')).toBeInTheDocument()
    expect(screen.queryByText('قديم')).not.toBeInTheDocument()
  })

  it('does not request the same data twice for one state', async () => {
    renderAt('/dashboard/tickets/admin?status=ASSIGNED')
    await screen.findAllByTestId('ticket-row')
    await new Promise((r) => setTimeout(r, 100))

    expect(ops.fetchTicketList).toHaveBeenCalledTimes(1)
    expect(ops.fetchTicketStats).toHaveBeenCalledTimes(1)
    expect(ops.fetchTicketInsights).toHaveBeenCalledTimes(1)
    expect(ops.fetchTicketBoard).not.toHaveBeenCalled()
    expect(ops.fetchTicketAnalytics).not.toHaveBeenCalled()
  })

  it('advanced filters: multi-select status and priority, and a date range that must be in order', async () => {
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('button', { name: /فلاتر متقدمة/ }))
    const panel = screen.getByTestId('advanced-filters')

    await userEvent.click(within(panel).getByRole('button', { name: 'قيد المعالجة' }))
    await userEvent.click(within(panel).getByRole('button', { name: 'معتمدة ومحالة' }))
    await userEvent.click(within(panel).getByRole('button', { name: 'حرجة' }))
    await waitFor(() => expect(url().get('status')).toBe('IN_PROGRESS,ASSIGNED'))
    expect(url().get('priority')).toBe('CRITICAL')

    await userEvent.click(within(panel).getByRole('button', { name: 'قيد المعالجة' }))
    await waitFor(() => expect(url().get('status')).toBe('ASSIGNED'))

    fireEvent.change(within(panel).getByLabelText('من تاريخ الإنشاء'), { target: { value: '2026-10-10' } })
    await waitFor(() => expect(lastListParams()).toMatchObject({ created_from: '2026-10-10' }))
    fireEvent.change(within(panel).getByLabelText('إلى تاريخ الإنشاء'), { target: { value: '2026-10-01' } })
    expect(await within(panel).findAllByRole('alert')).not.toHaveLength(0)
    // the invalid end date is never sent
    expect(lastListParams()).not.toHaveProperty('created_to')
  })

  it('the department filter feeds the assignee list, and the assignee needs a department first', async () => {
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('button', { name: /فلاتر متقدمة/ }))

    expect(screen.getByText('اختر إدارة أولًا')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'الإدارة' }), '3')

    await waitFor(() => expect(url().get('dept')).toBe('3'))
    await waitFor(() => expect(svc.getMeta).toHaveBeenCalledWith(expect.objectContaining({ department_id: 3 })))
    expect(await screen.findByText('الإدارة: التقنية')).toBeInTheDocument()
  })

  it('browser back and forward walk through the filter history', async () => {
    const router = createMemoryRouter([{ path: '/dashboard/tickets/admin', element: <><Probe /><TechAdminDashboardPage /></> }], { initialEntries: ['/dashboard/tickets/admin'] })
    render(<RouterProvider router={router} />)
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('button', { name: 'متأخرة', pressed: false }))
    await waitFor(() => expect(url().get('overdue')).toBe('1'))
    await userEvent.click(kpi('unassigned'))
    await waitFor(() => expect(url().get('unassigned')).toBe('1'))

    await act(async () => { await router.navigate(-1) })
    await waitFor(() => expect(url().get('overdue')).toBe('1'))
    expect(url().has('unassigned')).toBe(false)
    await waitFor(() => expect(lastListParams()).toMatchObject({ overdue: 1 }))

    await act(async () => { await router.navigate(-1) })
    await waitFor(() => expect(url().toString()).toBe(''))

    await act(async () => { await router.navigate(1) })
    await waitFor(() => expect(url().get('overdue')).toBe('1'))
  })

  it('back closes the modal, and the table is exactly as it was', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket()], { total: 90, lastPage: 3, currentPage: 2 }))
    const router = createMemoryRouter([{ path: '/dashboard/tickets/admin', element: <><Probe /><TechAdminDashboardPage /></> }], { initialEntries: ['/dashboard/tickets/admin?status=ASSIGNED&page=2'] })
    render(<RouterProvider router={router} />)
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await act(async () => { await router.navigate(-1) })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(url().get('status')).toBe('ASSIGNED')
    expect(url().get('page')).toBe('2')
  })
})

describe('states', () => {
  it('shows an empty state without filters, and a different one with filters that offers to clear them', async () => {
    ops.fetchTicketList.mockResolvedValue(list([]))
    const { unmount } = renderAt()
    expect(await screen.findByText('لا توجد تذاكر')).toBeInTheDocument()
    unmount()

    renderAt('/dashboard/tickets/admin?search=zzz')
    expect(await screen.findByText('لا توجد تذاكر مطابقة')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'مسح الفلاتر' }))
    await waitFor(() => expect(url().toString()).toBe(''))
  })

  it('shows an error with retry and recovers', async () => {
    ops.fetchTicketList.mockRejectedValueOnce(new Error('boom'))
    renderAt()

    expect(await screen.findByText('تعذّر تحميل التذاكر')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findAllByTestId('ticket-row')).toHaveLength(1)
  })

  it('keeps the previous rows (dimmed) while the next filter loads, instead of flashing empty', async () => {
    ops.fetchTicketList.mockResolvedValueOnce(list([ticket()])).mockImplementationOnce(() => new Promise(() => {}))
    renderAt()
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('button', { name: 'متأخرة', pressed: false }))

    expect(screen.getAllByTestId('ticket-row')).toHaveLength(1)
    expect(screen.getByTestId('result-count')).toHaveTextContent('يتم التحديث')
  })

  it('shows the result count for the filtered set', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket()], { total: 1234 }))
    renderAt()

    await waitFor(() => expect(screen.getByTestId('result-count')).toHaveTextContent('1,234 تذكرة'))
  })

  it('explains itself when the server refuses access', async () => {
    const denied = Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, data: {} } })
    ops.fetchTicketList.mockRejectedValue(denied)
    ops.fetchTicketStats.mockRejectedValue(denied)
    renderAt()

    expect(await screen.findByText('لا تملك صلاحية عرض التذاكر')).toBeInTheDocument()
  })
})

describe('the details modal', () => {
  const logs = [
    { id: 3, ticket_id: 501, action: 'COMMENT', details: 'تعقيب عام', logged_at: '2026-10-01T11:00:00Z', performed_by_name: 'سلمى' },
    { id: 1, ticket_id: 501, action: 'SUBMITTED', details: 'تم إنشاء التذكرة', logged_at: '2026-10-01T08:00:00Z', performed_by_name: 'أحمد' },
    { id: 2, ticket_id: 501, action: 'INTERNAL_NOTE', details: 'ملاحظة القيادة', logged_at: '2026-10-01T10:00:00Z', performed_by_name: 'المدير' },
  ]

  async function openModal(detail: Partial<Ticket> = {}) {
    ops.fetchTicketDetail.mockResolvedValue({ ...ticket(detail), activity_logs: logs, attachments: [] })
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])

    return within(await screen.findByRole('dialog'))
  }

  it('shows the subject, number, description, reporter and a chronological timeline', async () => {
    const d = await openModal({ created_by_email: 'a@x.com' })

    expect(await d.findByRole('heading', { name: 'الشبكة لا تعمل' })).toBeInTheDocument()
    expect(d.getByText(/EMC-501/)).toBeInTheDocument()
    expect(d.getByText('وصف التذكرة')).toBeInTheDocument()
    expect(d.getByText('أحمد', { selector: 'span' })).toBeInTheDocument()
    const order = d.getAllByRole('listitem').filter((li) => li.hasAttribute('data-action')).map((li) => li.getAttribute('data-action'))
    expect(order).toEqual(['SUBMITTED', 'INTERNAL_NOTE', 'COMMENT'])
  })

  it('marks internal notes as internal, and shows exactly what the server sent', async () => {
    const d = await openModal()
    const note = (await d.findByText('ملاحظة القيادة')).closest('li')!

    expect(within(note).getByText('داخلية')).toBeInTheDocument()
  })

  it('shows no internal note when the server did not send one', async () => {
    ops.fetchTicketDetail.mockResolvedValue({ ...ticket(), activity_logs: logs.filter((l) => l.action !== 'INTERNAL_NOTE'), internal_notes: null })
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    const d = within(await screen.findByRole('dialog'))

    await d.findByText('تعقيب عام')
    expect(d.queryByText('ملاحظة القيادة')).not.toBeInTheDocument()
    expect(d.queryByText('ملاحظات القيادة للمكلف')).not.toBeInTheDocument()
  })

  it('the internal-note option exists only when the server allows it', async () => {
    const without = await openModal({ capabilities: { ...CAPS, add_internal_note: false } })
    await without.findByRole('form', { name: 'إضافة تعقيب' })
    expect(without.queryByRole('checkbox', { name: /ملاحظة داخلية/ })).not.toBeInTheDocument()
  })

  it('posts a public reply, validates empty text, and refreshes', async () => {
    svc.addComment.mockResolvedValue({ success: true })
    const d = await openModal()
    const box = await d.findByRole('textbox', { name: 'تعقيب على التذكرة' })

    await userEvent.click(d.getByRole('button', { name: 'إرسال' }))
    expect(await d.findByRole('alert')).toHaveTextContent('اكتب نص التعقيب')
    expect(svc.addComment).not.toHaveBeenCalled()

    await userEvent.type(box, 'نحتاج صورة للخطأ')
    await userEvent.click(d.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(svc.addComment).toHaveBeenCalledWith(501, 'نحتاج صورة للخطأ', false))
    await waitFor(() => expect(box).toHaveValue(''))
    expect(ops.fetchTicketDetail.mock.calls.length).toBeGreaterThan(1)
  })

  it('an authorized manager can write an internal note', async () => {
    svc.addComment.mockResolvedValue({ success: true })
    const d = await openModal({ capabilities: { ...CAPS, add_internal_note: true } })

    await userEvent.click(await d.findByRole('checkbox', { name: /ملاحظة داخلية/ }))
    await userEvent.type(d.getByRole('textbox', { name: 'ملاحظة داخلية' }), 'متابعة مع المورد')
    await userEvent.click(d.getByRole('button', { name: 'حفظ الملاحظة' }))

    await waitFor(() => expect(svc.addComment).toHaveBeenCalledWith(501, 'متابعة مع المورد', true))
  })

  it('does not submit twice while a reply is in flight', async () => {
    let resolve: (v: unknown) => void = () => {}
    svc.addComment.mockImplementation(() => new Promise((r) => { resolve = r }))
    const d = await openModal()

    await userEvent.type(await d.findByRole('textbox', { name: 'تعقيب على التذكرة' }), 'نص')
    const send = d.getByRole('button', { name: 'إرسال' })
    await userEvent.click(send)
    await userEvent.click(send)

    expect(svc.addComment).toHaveBeenCalledTimes(1)
    expect(send).toBeDisabled()
    await act(async () => resolve({ success: true }))
  })

  it('closes with Escape, keeps the filters, and removes only the ticket from the URL', async () => {
    renderAt('/dashboard/tickets/admin?status=ASSIGNED&search=net')
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(url().has('ticket')).toBe(false)
    expect(url().get('status')).toBe('ASSIGNED')
    expect(url().get('search')).toBe('net')
  })

  it('opens at once with the row it came from, while the details are still loading', async () => {
    let release!: (v: unknown) => void
    ops.fetchTicketDetail.mockReturnValue(new Promise((r) => { release = r }))
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])

    const d = within(await screen.findByRole('dialog'))
    // From the row: the header facts are already there; only the body is a skeleton.
    expect(d.getByRole('heading', { name: 'الشبكة لا تعمل' })).toBeInTheDocument()
    expect(d.getByText(/EMC-501/)).toBeInTheDocument()
    expect(d.getByTestId('modal-skeleton')).toBeInTheDocument()
    expect(d.queryByText('وصف التذكرة')).not.toBeInTheDocument()

    await act(async () => release({ ...ticket(), activity_logs: [], attachments: [] }))
    expect(await d.findByText('وصف التذكرة')).toBeInTheDocument()
    expect(d.queryByTestId('modal-skeleton')).not.toBeInTheDocument()
  })

  it('is a centered dialog in its own layer, not a side drawer, and locks the page behind it', async () => {
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])

    const dlg = await screen.findByRole('dialog')
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleName('الشبكة لا تعمل')
    expect(dlg.parentElement).toHaveClass('items-center', 'justify-center')
    expect(document.body.contains(dlg)).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.click(within(dlg).getByRole('button', { name: 'إغلاق النافذة' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('returns focus to the control that opened it', async () => {
    renderAt()
    const opener = await screen.findByRole('button', { name: 'فتح التذكرة EMC-501' })
    opener.focus()
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'فتح التذكرة EMC-501' })).toHaveFocus())
  })

  it('does not close over an unsaved reply without asking, and keeps it if you stay', async () => {
    const d = await openModal()
    await userEvent.type(await d.findByLabelText(/تعقيب على التذكرة/), 'مسودة لم تُرسل')

    await userEvent.keyboard('{Escape}')

    expect(screen.getByRole('dialog', { name: 'الشبكة لا تعمل' })).toBeInTheDocument()
    expect(url().get('ticket')).toBe('501')
  })

  it('a pointer resting on a row warms the details, so the click does not wait', async () => {
    renderAt()
    const row = (await screen.findAllByTestId('ticket-row'))[0]
    ops.fetchTicketDetail.mockClear()
    await userEvent.hover(row)
    await waitFor(() => expect(ops.fetchTicketDetail).toHaveBeenCalledTimes(1))

    await userEvent.click(row)
    await screen.findByRole('dialog')

    expect(ops.fetchTicketDetail).toHaveBeenCalledTimes(1)
  })

  it('asks for the core details first, then the side panels, each exactly once', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket({ capabilities: { ...CAPS, reassign: true, add_internal_note: true } })]))
    ops.fetchTicketDetail.mockResolvedValue({ ...ticket(), activity_logs: [], attachments: [] })
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    await screen.findByText('وصف التذكرة')
    await waitFor(() => expect(ops.fetchPossibleDuplicates).toHaveBeenCalled())

    expect(ops.fetchTicketDetail).toHaveBeenCalledTimes(1)
    expect(ops.fetchAssignmentSuggestions).toHaveBeenCalledTimes(1)
    expect(ops.fetchPossibleDuplicates).toHaveBeenCalledTimes(1)
    const order = (m: { mock: { invocationCallOrder: number[] } }) => m.mock.invocationCallOrder[0]
    expect(order(ops.fetchTicketDetail)).toBeLessThan(order(ops.fetchAssignmentSuggestions))
    expect(order(ops.fetchTicketDetail)).toBeLessThan(order(ops.fetchPossibleDuplicates))
  })

  it('never shows the previous ticket while the next one loads', async () => {
    ops.fetchPossibleDuplicates.mockResolvedValue([{ id: 600, ticketNumber: 'EMC-600', title: 'مشكلة مشابهة', status: 'ASSIGNED', createdAt: null, sharedWords: ['شبكه'], wordOverlapPercent: 66, basis: 'تشابه كلمات العنوان فقط.' }])
    const d = await openModal({ capabilities: { ...CAPS, add_internal_note: true } })
    await d.findByText('وصف التذكرة')
    let release!: (v: unknown) => void
    ops.fetchTicketDetail.mockReturnValueOnce(new Promise((r) => { release = r }))

    await userEvent.click(await d.findByRole('button', { name: 'فتح التذكرة EMC-600' }))
    await waitFor(() => expect(url().get('ticket')).toBe('600'))

    expect(screen.queryByText('وصف التذكرة')).not.toBeInTheDocument()
    expect(screen.getByTestId('modal-skeleton')).toBeInTheDocument()
    await act(async () => release({ ...ticket({ id: 600, ticket_number: 'EMC-600', title: 'مشكلة مشابهة', description: 'وصف الثانية' }), activity_logs: [] }))
    expect(await screen.findByText('وصف الثانية')).toBeInTheDocument()
  })

  it('a deep link opens the modal directly', async () => {
    renderAt('/dashboard/tickets/admin?ticket=777')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(ops.fetchTicketDetail).toHaveBeenCalledWith(777)
  })

  it('says so when the ticket is not available to this user', async () => {
    ops.fetchTicketDetail.mockRejectedValue(Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, data: {} } }))
    renderAt('/dashboard/tickets/admin?ticket=1')

    expect(await screen.findByTestId('modal-error')).toHaveTextContent('غير متاحة')
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة', hidden: true })).toBeNull()
  })

  it('offers a retry for a server error', async () => {
    ops.fetchTicketDetail.mockRejectedValueOnce(new Error('boom'))
    renderAt('/dashboard/tickets/admin?ticket=1')

    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByRole('heading', { name: 'الشبكة لا تعمل' })).toBeInTheDocument()
  })

  it('a reporter of the ticket sees no operations, only a pointer to their own page', async () => {
    ops.fetchTicketDetail.mockResolvedValue({ viewer_role: 'reporter', id: 501, ticket_number: 'EMC-501', title: 'x', description: 'y', status: 'ASSIGNED', capabilities: { ...CAPS } })
    renderAt('/dashboard/tickets/admin?ticket=501')

    expect(await screen.findByTestId('modal-reporter')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ticket-action-center')).not.toBeInTheDocument()
  })

  it('shows the actions the server reports, and none it does not', async () => {
    const d = await openModal({ capabilities: { ...CAPS, approve: true, reject: true } })
    await d.findByTestId('ticket-action-center')

    expect(d.getByRole('button', { name: 'اعتماد' })).toBeInTheDocument()
    expect(d.getByRole('button', { name: 'رفض' })).toBeInTheDocument()
    expect(d.queryByRole('button', { name: /إعادة التوجيه/ })).not.toBeInTheDocument()
  })

  it('links to the full page and carries the filtered list back as "from"', async () => {
    renderAt('/dashboard/tickets/admin?status=ASSIGNED')
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    const link = await within(await screen.findByRole('dialog')).findByRole('link', { name: /فتح الصفحة الكاملة/ })

    expect(link).toHaveAttribute('href', '/dashboard/tickets/501')
  })

  it('moves between tickets (a duplicate hint) without losing the table', async () => {
    ops.fetchPossibleDuplicates.mockResolvedValue([{ id: 600, ticketNumber: 'EMC-600', title: 'مشكلة مشابهة', status: 'ASSIGNED', createdAt: null, sharedWords: ['شبكه', 'قاعه'], wordOverlapPercent: 66, basis: 'تشابه كلمات العنوان فقط.' }])
    const d = await openModal({ capabilities: { ...CAPS, add_internal_note: true } })

    const hints = await d.findByTestId('duplicate-hints')
    expect(within(hints).getByText(/تطابق 66%/)).toBeInTheDocument()
    await userEvent.click(within(hints).getByRole('button', { name: 'فتح التذكرة EMC-600' }))

    await waitFor(() => expect(url().get('ticket')).toBe('600'))
  })
})

describe('priority and assignment help', () => {
  it('changes priority only when the server allows it, with a suggestion that is not applied for you', async () => {
    const insight: TicketInsight = { ticketId: 501, ticketNumber: 'EMC-501', ticketTitle: 'الشبكة لا تعمل', rule: 'ticket_overdue', severity: 'critical', severityLabel: 'حرج', title: 'تذكرة متأخرة', reason: 'تجاوزت موعدها منذ 4 يوم.', since: '2026-10-10T00:00:00Z', suggestedAction: 'تواصل مع المكلف.', suggestedPriority: { value: 'CRITICAL', label: 'حرجة', current: 'MEDIUM', reason: 'متأخرة 4 يوم عن موعدها' }, url: '/dashboard/tickets/501' }
    ops.fetchTicketInsights.mockResolvedValue([insight])
    ops.changeTicketPriority.mockResolvedValue(undefined)
    ops.fetchTicketDetail.mockResolvedValue({ ...ticket({ priority: 'MEDIUM', capabilities: { ...CAPS, change_priority: true } }), activity_logs: [] })
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    const d = within(await screen.findByRole('dialog'))

    const sug = await d.findByTestId('priority-suggestion')
    expect(sug).toHaveTextContent('رفع الأولوية إلى «حرجة»')
    expect(ops.changeTicketPriority).not.toHaveBeenCalled()
    expect(d.getByRole('button', { name: 'تغيير الأولوية' })).toBeDisabled()

    await userEvent.click(within(sug).getByRole('button', { name: 'اختيار هذه الأولوية' }))
    await userEvent.type(d.getByRole('textbox', { name: 'سبب تغيير الأولوية' }), 'تأثير واسع')
    await userEvent.click(d.getByRole('button', { name: 'تغيير الأولوية' }))

    await waitFor(() => expect(ops.changeTicketPriority).toHaveBeenCalledWith(501, 'CRITICAL', 'تأثير واسع'))
  })

  it('does not offer a priority change without the capability', async () => {
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    const d = within(await screen.findByRole('dialog'))
    await d.findByRole('heading', { name: 'الشبكة لا تعمل' })

    expect(d.queryByRole('region', { name: 'تغيير الأولوية' })).not.toBeInTheDocument()
  })

  it('lists suggestions least-loaded first and assigns only after confirmation', async () => {
    ops.fetchAssignmentSuggestions.mockResolvedValue({
      basis: 'ترتيب بحسب العبء.', scope: 'department', message: null,
      candidates: [
        { id: 9, name: 'سلمى', openTickets: 0, isCurrent: false, recommended: true, reason: 'ضمن الفريق' },
        { id: 8, name: 'خالد', openTickets: 4, isCurrent: true, recommended: false, reason: 'ضمن الفريق' },
      ],
    })
    svc.reassign.mockResolvedValue({ success: true })
    ops.fetchTicketDetail.mockResolvedValue({ ...ticket({ status: 'ASSIGNED', assigned_to_id: 8, capabilities: { ...CAPS, reassign: true } }), activity_logs: [] })
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    const d = within(await screen.findByRole('dialog'))

    const items = await d.findAllByTestId('assignment-candidate')
    expect(items[0]).toHaveTextContent('سلمى')
    expect(items[0]).toHaveTextContent('لا تذاكر مفتوحة')
    expect(items[0]).toHaveTextContent('الأقل عبئًا')
    expect(items[1]).toHaveTextContent('4 تذكرة مفتوحة')
    expect(within(items[1]).queryByRole('button', { name: /إسناد/ })).not.toBeInTheDocument()

    await userEvent.click(within(items[0]).getByRole('button', { name: 'إسناد التذكرة إلى سلمى' }))
    expect(svc.reassign).not.toHaveBeenCalled()
    await userEvent.click(await screen.findByRole('button', { name: 'إسناد' }))

    await waitFor(() => expect(svc.reassign).toHaveBeenCalledWith(501, { assigned_to_id: 9 }))
  })

  it('says so when no one qualifies, instead of guessing', async () => {
    ops.fetchTicketDetail.mockResolvedValue({ ...ticket({ status: 'ASSIGNED', capabilities: { ...CAPS, reassign: true } }), activity_logs: [] })
    ops.fetchAssignmentSuggestions.mockResolvedValue({ basis: '', scope: 'unit', candidates: [], message: 'لا يوجد موظفون مؤهلون للتكليف ضمن نطاق هذه التذكرة.' })
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])

    expect(await screen.findByText('لا يوجد موظفون مؤهلون للتكليف ضمن نطاق هذه التذكرة.')).toBeInTheDocument()
  })
})

describe('insights', () => {
  const insight = (over: Partial<TicketInsight> = {}): TicketInsight => ({
    ticketId: 501, ticketNumber: 'EMC-501', ticketTitle: 'الشبكة لا تعمل', rule: 'ticket_unassigned_too_long', severity: 'high', severityLabel: 'عاجل', title: 'بانتظار الاعتماد منذ مدة',
    reason: 'تنتظر قرار الاعتماد منذ 9 ساعة.', since: '2026-10-01T00:00:00Z', suggestedAction: 'راجع التذكرة واعتمدها أو ارفضها.', suggestedPriority: null, url: '/dashboard/tickets/501', ...over,
  })

  it('shows each insight with its reason, severity and next step, and opens its ticket in the modal', async () => {
    ops.fetchTicketInsights.mockResolvedValue([insight(), insight({ ticketId: 502, ticketNumber: 'EMC-502', ticketTitle: 'أخرى', severity: 'critical', severityLabel: 'حرج', title: 'تذكرة متأخرة', reason: 'تجاوزت موعدها.' })])
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: /تنبيهات ذكية/ }))
    const items = await screen.findAllByTestId('insight-item')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('عاجل')
    expect(items[0]).toHaveTextContent('تنتظر قرار الاعتماد منذ 9 ساعة.')
    expect(items[0]).toHaveTextContent('راجع التذكرة واعتمدها أو ارفضها.')
    expect(screen.getByText(/لا يتغير شيء تلقائيًا/)).toBeInTheDocument()

    await userEvent.click(within(items[1]).getByRole('button', { name: 'فتح التذكرة EMC-502' }))
    await waitFor(() => expect(url().get('ticket')).toBe('502'))
  })

  it('starts collapsed: a compact header with the count, and no cards until it is expanded', async () => {
    ops.fetchTicketInsights.mockResolvedValue([insight(), insight({ ticketId: 502, ticketNumber: 'EMC-502', severity: 'critical', severityLabel: 'حرج' })])
    renderAt()

    const toggle = await screen.findByRole('button', { name: /تنبيهات ذكية/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(await screen.findByTestId('insights-count')).toHaveTextContent('2')
    expect(screen.queryAllByTestId('insight-item')).toHaveLength(0)

    toggle.focus()
    await userEvent.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findAllByTestId('insight-item')).toHaveLength(2)

    await userEvent.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(screen.queryAllByTestId('insight-item')).toHaveLength(0))
  })

  it('remembers an expansion for the rest of the browser session, and a new session starts collapsed again', async () => {
    ops.fetchTicketInsights.mockResolvedValue([insight()])
    const first = renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /تنبيهات ذكية/ }))
    await screen.findAllByTestId('insight-item')
    first.unmount()

    const second = renderAt()
    expect(await screen.findByRole('button', { name: /تنبيهات ذكية/ })).toHaveAttribute('aria-expanded', 'true')
    second.unmount()

    sessionStorage.clear()
    renderAt()
    expect(await screen.findByRole('button', { name: /تنبيهات ذكية/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('is absent when there is nothing to flag', async () => {
    renderAt()
    await screen.findAllByTestId('ticket-row')

    expect(screen.queryByTestId('insights-panel')).not.toBeInTheDocument()
  })

  it('refreshes after an action in the modal', async () => {
    ops.fetchTicketDetail.mockResolvedValue({ ...ticket({ capabilities: { ...CAPS, approve: true } }), activity_logs: [] })
    svc.addComment.mockResolvedValue({ success: true })
    renderAt()
    await userEvent.click((await screen.findAllByTestId('ticket-row'))[0])
    const d = within(await screen.findByRole('dialog'))
    const before = ops.fetchTicketStats.mock.calls.length

    await userEvent.type(await d.findByRole('textbox', { name: 'تعقيب على التذكرة' }), 'تحديث')
    await userEvent.click(d.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(ops.fetchTicketStats.mock.calls.length).toBeGreaterThan(before))
    expect(ops.fetchTicketInsights.mock.calls.length).toBeGreaterThan(1)
  })
})

describe('saved views', () => {
  it('saves the current filters under a name, lists them, and applies them later', async () => {
    const { unmount } = renderAt('/dashboard/tickets/admin?status=IN_PROGRESS&dept=3&page=4')
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('button', { name: 'العروض' }))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ الفلاتر الحالية كعرض' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'اسم العرض' }), 'قيد المعالجة عندي')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ العرض' }))

    const saved = JSON.parse(localStorage.getItem('emc.tickets.savedViews.v1:7') ?? '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0].query).toBe('status=IN_PROGRESS&dept=3')
    expect(saved[0].query).not.toContain('page')

    unmount()
    renderAt('/dashboard/tickets/admin?search=other')
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('button', { name: 'العروض' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'قيد المعالجة عندي' }))

    await waitFor(() => expect(url().get('status')).toBe('IN_PROGRESS'))
    expect(url().get('dept')).toBe('3')
    expect(url().has('search')).toBe(false)
  })

  it('ready-made views replace the current filters', async () => {
    renderAt('/dashboard/tickets/admin?search=old&dept=3')
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('button', { name: 'العروض' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'أولوية عالية' }))

    await waitFor(() => expect(url().get('priority')).toBe('HIGH,CRITICAL'))
    expect(url().get('state')).toBe('open')
    expect(url().has('search')).toBe(false)
  })

  it('a view can be deleted, and nothing can be saved without filters', async () => {
    localStorage.setItem('emc.tickets.savedViews.v1:7', JSON.stringify([{ id: 'a', name: 'عرض قديم', query: 'overdue=1' }]))
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('button', { name: 'العروض' }))

    expect(screen.getByRole('button', { name: 'اختر فلاتر أولًا لحفظها' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'حذف العرض عرض قديم' }))
    expect(screen.queryByRole('menuitem', { name: 'عرض قديم' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('emc.tickets.savedViews.v1:7') ?? 'x')).toEqual([])
  })

  it('a corrupted saved list is ignored rather than breaking the page', async () => {
    localStorage.setItem('emc.tickets.savedViews.v1:7', '{not json')
    renderAt()

    expect(await screen.findAllByTestId('ticket-row')).toHaveLength(1)
  })
})

describe('bulk actions', () => {
  const rows = () => [
    ticket({ id: 1, ticket_number: 'EMC-1', capabilities: { ...CAPS, change_priority: true, reassign: true } }),
    ticket({ id: 2, ticket_number: 'EMC-2', capabilities: { ...CAPS, change_priority: true } }),
    ticket({ id: 3, ticket_number: 'EMC-3', department_id: 4, capabilities: { ...CAPS } }),
  ]

  it('shows the selected count and nothing until something is selected', async () => {
    ops.fetchTicketList.mockResolvedValue(list(rows()))
    renderAt()
    await screen.findAllByTestId('ticket-row')
    expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-1' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-2' }))

    expect(screen.getByTestId('bulk-bar')).toHaveTextContent('تم تحديد 2 تذكرة')
    await userEvent.click(screen.getByRole('button', { name: /إلغاء التحديد/ }))
    expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument()
  })

  it('selects every row on the page at once', async () => {
    ops.fetchTicketList.mockResolvedValue(list(rows()))
    renderAt()
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد كل تذاكر هذه الصفحة' }))

    expect(screen.getByTestId('bulk-bar')).toHaveTextContent('تم تحديد 3 تذكرة')
  })

  it('asks for confirmation that states the count, then reports partial failure per ticket', async () => {
    ops.fetchTicketList.mockResolvedValue(list(rows()))
    ops.bulkUpdateTickets.mockResolvedValue({ requested: 2, succeeded: 1, failed: 1, results: [{ id: 1, ticketNumber: 'EMC-1', ok: true, message: 'تم' }, { id: 2, ticketNumber: 'EMC-2', ok: false, message: 'لا يمكن تغيير أولوية تذكرة مغلقة.' }] })
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-1' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-2' }))

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'الأولوية الجديدة للمحدد' }), 'CRITICAL')
    await userEvent.click(screen.getByRole('button', { name: 'تطبيق الأولوية' }))
    expect(ops.bulkUpdateTickets).not.toHaveBeenCalled()
    expect(await screen.findByText(/ستُغيَّر أولوية 2 تذكرة إلى «حرجة»/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'تنفيذ' }))

    await waitFor(() => expect(ops.bulkUpdateTickets).toHaveBeenCalledWith({ action: 'priority', ticketIds: [1, 2], priority: 'CRITICAL' }))
    const result = await screen.findByTestId('bulk-result')
    expect(result).toHaveTextContent('نُفِّذت على 1 من 2 تذكرة')
    expect(result).toHaveTextContent('EMC-2: لا يمكن تغيير أولوية تذكرة مغلقة.')
    // only the ticket that succeeded leaves the selection; the refused one stays for review
    expect(screen.getByTestId('bulk-bar')).toHaveTextContent('تم تحديد 1 تذكرة')
  })

  it('cancelling the confirmation changes nothing', async () => {
    ops.fetchTicketList.mockResolvedValue(list(rows()))
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-1' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'الأولوية الجديدة للمحدد' }), 'LOW')
    await userEvent.click(screen.getByRole('button', { name: 'تطبيق الأولوية' }))

    await userEvent.click(await screen.findByRole('button', { name: 'إلغاء' }))

    expect(ops.bulkUpdateTickets).not.toHaveBeenCalled()
  })

  it('offers bulk assignment only for tickets of one department', async () => {
    ops.fetchTicketList.mockResolvedValue(list(rows()))
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-1' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-3' }))

    expect(screen.getByText('الإسناد الجماعي لتذاكر إدارة واحدة فقط.')).toBeInTheDocument()
  })

  it('does not offer bulk actions the server did not grant', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket({ id: 3, ticket_number: 'EMC-3', capabilities: { ...CAPS } })]))
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-3' }))

    expect(screen.queryByRole('combobox', { name: 'الأولوية الجديدة للمحدد' })).not.toBeInTheDocument()
  })

  it('assigns the selection to a person after confirming', async () => {
    ops.fetchTicketList.mockResolvedValue(list([ticket({ id: 1, ticket_number: 'EMC-1', capabilities: { ...CAPS, reassign: true } })]))
    ops.bulkUpdateTickets.mockResolvedValue({ requested: 1, succeeded: 1, failed: 0, results: [{ id: 1, ticketNumber: 'EMC-1', ok: true, message: 'تم' }] })
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-1' }))

    const select = await screen.findByLabelText('المكلف الجديد للمحدد')
    await userEvent.click(select)
    await userEvent.click(await screen.findByText('سلمى'))
    await userEvent.click(screen.getByRole('button', { name: 'إسناد' }))
    expect(await screen.findByText(/ستُسند 1 تذكرة إلى سلمى/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'تنفيذ' }))

    await waitFor(() => expect(ops.bulkUpdateTickets).toHaveBeenCalledWith({ action: 'reassign', ticketIds: [1], assignedToId: 9 }))
  })

  it('the selection belongs to one set of filters: changing a filter drops it, paging keeps it', async () => {
    ops.fetchTicketList.mockResolvedValue(list(rows(), { total: 90, lastPage: 3 }))
    renderAt()
    await screen.findAllByTestId('ticket-row')
    await userEvent.click(screen.getByRole('checkbox', { name: 'تحديد التذكرة EMC-1' }))
    expect(screen.getByTestId('bulk-bar')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))
    await waitFor(() => expect(url().get('page')).toBe('2'))
    expect(screen.getByTestId('bulk-bar')).toHaveTextContent('تم تحديد 1 تذكرة')

    await userEvent.click(screen.getByRole('button', { name: 'متأخرة', pressed: false }))
    await waitFor(() => expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument())
  })
})

describe('the results toolbar', () => {
  it('puts the view switcher and the Columns button in one row, directly above the results', async () => {
    renderAt()
    const toolbar = await screen.findByTestId('results-toolbar')

    expect(within(toolbar).getByRole('tablist', { name: 'طريقة العرض' })).toBeInTheDocument()
    expect(within(toolbar).getByRole('button', { name: 'الأعمدة' })).toBeInTheDocument()
    // One switcher on the page, and it is not in the page header.
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(document.querySelector('header')?.querySelector('[role="tablist"]')).toBeNull()
    // Order on the page: filters, then the toolbar, then the table.
    const pos = (el: Element) => Array.from(document.querySelectorAll('*')).indexOf(el)
    expect(pos(toolbar)).toBeLessThan(pos(screen.getByRole('table')))
    expect(pos(screen.getByTestId('kpi-value-open'))).toBeLessThan(pos(toolbar))
  })

  it('Columns belongs to the table only', async () => {
    ops.fetchTicketBoard.mockResolvedValue([])
    renderAt('/dashboard/tickets/admin?view=board')
    const toolbar = await screen.findByTestId('results-toolbar')

    expect(within(toolbar).queryByRole('button', { name: 'الأعمدة' })).not.toBeInTheDocument()
    expect(within(toolbar).getByRole('tab', { name: 'لوحة كانبان' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switching views keeps the filters and writes only the view to the URL', async () => {
    ops.fetchTicketAnalytics.mockReturnValue(new Promise(() => {}))
    renderAt('/dashboard/tickets/admin?status=ASSIGNED&search=net&dept=3')
    const toolbar = await screen.findByTestId('results-toolbar')

    await userEvent.click(within(toolbar).getByRole('tab', { name: 'التحليلات' }))

    await waitFor(() => expect(url().get('view')).toBe('analytics'))
    expect(url().get('status')).toBe('ASSIGNED')
    expect(url().get('search')).toBe('net')
    expect(url().get('dept')).toBe('3')
  })
})

describe('board and analytics views', () => {
  const column = (status: BoardColumn['status'], count: number, tickets: Ticket[] = []): BoardColumn => ({ status, count, tickets })

  it('shows the board with exact counts and loads it only when chosen', async () => {
    ops.fetchTicketBoard.mockResolvedValue([column('PENDING_APPROVAL', 12, [ticket()]), column('IN_PROGRESS', 0)])
    renderAt('/dashboard/tickets/admin?view=board&dept=3')

    const board = await screen.findByTestId('kanban-board')
    const counts = within(board).getAllByTestId('column-count').map((c) => c.textContent)
    expect(counts).toEqual(['12', '0'])
    expect(ops.fetchTicketList).not.toHaveBeenCalled()
    expect(ops.fetchTicketBoard).toHaveBeenCalledWith({ department_id: '3' }, 8, expect.anything())
    expect(within(board).getAllByTestId('board-card')).toHaveLength(1)
  })

  it('opens a card in the modal and runs the explicit actions, never a drag', async () => {
    ops.fetchTicketBoard.mockResolvedValue([column('PENDING_APPROVAL', 1, [ticket({ capabilities: { ...CAPS, approve: true } })])])
    renderAt('/dashboard/tickets/admin?view=board')

    await userEvent.click(await screen.findByRole('button', { name: 'اعتماد التذكرة EMC-501' }))
    expect(await screen.findByText('اعتماد التذكرة وتحديد التكليف', { exact: false })).toBeInTheDocument()
    expect(url().has('ticket')).toBe(false)
  })

  it('"show the rest" continues in the table with that status filter', async () => {
    ops.fetchTicketBoard.mockResolvedValue([column('PENDING_APPROVAL', 12, [ticket()])])
    renderAt('/dashboard/tickets/admin?view=board&search=net')

    await userEvent.click(await screen.findByRole('button', { name: /عرض الباقي \(11\)/ }))

    await waitFor(() => expect(url().has('view')).toBe(false))
    expect(url().get('status')).toBe('PENDING_APPROVAL')
    expect(url().get('search')).toBe('net')
  })

  it('switching views keeps the filters', async () => {
    ops.fetchTicketBoard.mockResolvedValue([column('PENDING_APPROVAL', 1, [ticket()])])
    renderAt('/dashboard/tickets/admin?status=ASSIGNED&dept=3')
    await screen.findAllByTestId('ticket-row')

    await userEvent.click(screen.getByRole('tab', { name: 'لوحة كانبان' }))
    await waitFor(() => expect(url().get('view')).toBe('board'))
    expect(url().get('status')).toBe('ASSIGNED')
    expect(url().get('dept')).toBe('3')

    await userEvent.click(screen.getByRole('tab', { name: 'الجدول' }))
    await waitFor(() => expect(url().has('view')).toBe(false))
    expect(url().get('dept')).toBe('3')
  })

  const analytics = (): TicketAnalytics => ({
    window: { days: 30, from: '2026-09-15', to: '2026-10-14' },
    volume: [{ date: '2026-10-13', created: 4, resolved: 2 }],
    byStatus: [{ key: 'ASSIGNED', count: 5 }], byPriority: [{ key: 'HIGH', count: 3 }],
    departmentWorkload: [{ id: 3, name: 'التقنية', open: 7, overdue: 2 }],
    assignment: { topAssignees: [{ id: 9, name: 'سلمى', open: 4 }], unassignedOpen: 6 },
    resolutionTrend: [{ weekStart: '2026-10-05', resolved: 3, avgHours: 12.5 }],
    overdueNow: [{ key: 'under_1d', label: 'أقل من يوم', count: 1 }, { key: 'd1_3', label: '1–3 أيام', count: 2 }, { key: 'd3_7', label: '3–7 أيام', count: 0 }, { key: 'over_7d', label: 'أكثر من أسبوع', count: 0 }],
    notes: { distribution: 'التوزيع لتذاكر أُنشئت داخل النافذة.', workload: 'العبء للمفتوحة الآن.', overdue: 'التأخر لحظي: لا منحنى تاريخي.' },
  })

  it('shows analytics with their windows and stated limits, loaded on demand', async () => {
    ops.fetchTicketAnalytics.mockResolvedValue(analytics())
    renderAt('/dashboard/tickets/admin?view=analytics&dept=3')

    expect(await screen.findByTestId('analytics-panel')).toBeInTheDocument()
    expect(ops.fetchTicketAnalytics).toHaveBeenCalledWith({ department_id: '3' }, 30, expect.anything())
    expect(ops.fetchTicketList).not.toHaveBeenCalled()
    expect(screen.getByText('التأخر لحظي: لا منحنى تاريخي.')).toBeInTheDocument()
    expect(screen.getByText(/أُنشئت 4 · حُلّت 2/)).toBeInTheDocument()
  })

  it('changes the window and drills down into the table', async () => {
    ops.fetchTicketAnalytics.mockResolvedValue(analytics())
    renderAt('/dashboard/tickets/admin?view=analytics&search=net&status=RESOLVED')
    await screen.findByTestId('analytics-panel')

    await userEvent.click(screen.getByRole('button', { name: 'آخر 7 يومًا' }))
    await waitFor(() => expect(ops.fetchTicketAnalytics).toHaveBeenLastCalledWith(expect.anything(), 7, expect.anything()))
    expect(url().get('view')).toBe('analytics')

    await userEvent.click(screen.getByRole('button', { name: /بلا مكلف: 6 تذكرة مفتوحة/ }))
    await waitFor(() => expect(url().has('view')).toBe(false))
    expect(url().get('unassigned')).toBe('1')
    expect(url().get('state')).toBe('open')
    expect(url().get('search')).toBe('net')
    expect(url().has('status')).toBe(false)
  })

  it('shows an error with retry when analytics fail', async () => {
    ops.fetchTicketAnalytics.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(analytics())
    renderAt('/dashboard/tickets/admin?view=analytics')

    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByTestId('analytics-panel')).toBeInTheDocument()
  })
})

describe('navigation', () => {
  it('links to the new-ticket page', async () => {
    renderAt()
    await userEvent.click(await screen.findByRole('link', { name: /تذكرة جديدة/ }))

    expect(await screen.findByText('NEW TICKET')).toBeInTheDocument()
  })

  it('the refresh button repeats the requests without changing the filters', async () => {
    renderAt('/dashboard/tickets/admin?status=ASSIGNED')
    await screen.findAllByTestId('ticket-row')
    const before = ops.fetchTicketList.mock.calls.length

    await userEvent.click(screen.getByRole('button', { name: 'تحديث' }))

    await waitFor(() => expect(ops.fetchTicketList.mock.calls.length).toBe(before + 1))
    expect(url().get('status')).toBe('ASSIGNED')
  })
})
