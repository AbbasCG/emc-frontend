import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { MyWorkTicket } from '@/types/ticket'
import type { OpsTask } from '@/types/operations'

const mocks = vi.hoisted(() => ({
  getMyWork: vi.fn(),
  acceptTicket: vi.fn(),
  rejectTicket: vi.fn(),
  fetchMyTasks: vi.fn(),
  acceptTask: vi.fn(),
  rejectTask: vi.fn(),
  canAccess: vi.fn(),
}))
vi.mock('@/services/ticketService', () => ({
  ticketService: { getMyWork: mocks.getMyWork, acceptTask: mocks.acceptTicket, rejectTask: mocks.rejectTicket },
}))
vi.mock('@/api/tasksApi', () => ({
  fetchMyTasks: mocks.fetchMyTasks,
  acceptMyTask: mocks.acceptTask,
  rejectMyTask: mocks.rejectTask,
  fetchTasks: vi.fn(),
  fetchTask: vi.fn(),
  updateTask: vi.fn(),
  addTaskComment: vi.fn(),
}))
vi.mock('@/contexts/PageAccessContext', () => ({ usePageAccess: () => ({ canAccessPath: mocks.canAccess }) }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'سلمى' } }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

import toast from 'react-hot-toast'
import { formatDue } from '@/lib/dueDate'
import { normalizeOpsTask } from '@/api/normalizers/opsTask'
import OpsTasksMyPage from '@/pages/operations/admin/OpsTasksMyPage'

const ticket = (over: Partial<MyWorkTicket> = {}): MyWorkTicket => ({
  id: 5, ticket_number: 'EMC-5', title: 'الشبكة لا تعمل', description: 'تعطل', status: 'ASSIGNED', priority: 'HIGH',
  department: { id: 1, name: 'التقنية' }, expected_resolution_time: '2099-01-01T00:00:00Z', is_delayed: false,
  task_scope: 'medium', task_points: 120, estimated_hours: 2.5,
  capabilities: { can_accept: true, can_reject: true, can_complete: false, can_open: true },
  ...over,
})
const task = (over: Partial<OpsTask> = {}): OpsTask => ({
  id: 12, title: 'تصميم منشور', department_id: '3', department_name: 'الإعلام', assignee_id: 7, assignee_name: 'سلمى',
  status: 'planning', priority: 'medium', acceptance_status: 'accepted', due_at: '2099-01-01', ...over,
})
const meta = (over = {}) => ({ open_total: 1, closed_total: 0, truncated: false, ...over })
const tickets = (rows: MyWorkTicket[], m = {}) => ({ tickets: rows, meta: meta(m) })
const tasks = (rows: OpsTask[], over = {}) => ({ tasks: rows, total: rows.length, truncated: false, ...over })

function LocationProbe() {
  const loc = useLocation()

  return <p data-testid="loc">{loc.pathname}</p>
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/tasks/my']}>
      <Routes>
        <Route path="/dashboard/admin/tasks/my" element={<OpsTasksMyPage />} />
        <Route path="/dashboard/tickets/:id" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const column = (label: string) => screen.getByRole('region', { name: new RegExp(`^${label}:`) })
const itemsIn = (label: string) => within(column(label)).queryAllByTestId('work-item')

function setNarrow(narrow: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: narrow && query.includes('max-width: 768px'), media: query, onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  setNarrow(false)
  mocks.canAccess.mockReturnValue(false)
  mocks.fetchMyTasks.mockResolvedValue(tasks([]))
  mocks.getMyWork.mockResolvedValue(tickets([]))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('«مهامي ومسؤولياتي»: one board for tasks and tickets', () => {
  it('has its own heading and no management tabs', async () => {
    mount()
    expect(await screen.findByRole('heading', { level: 1, name: 'مهامي ومسؤولياتي' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'عروض إدارة المهام' })).not.toBeInTheDocument()
  })

  it('renders every column even with nothing assigned', async () => {
    mount()
    await screen.findByTestId('my-work-board')
    for (const label of ['أفكار', 'بانتظار الاستلام', 'قيد المراجعة والتخطيط', 'قيد التنفيذ', 'بانتظار الاعتماد والتقييم', 'مكتملة', 'مؤجلة / ملغاة', 'متعذّر / معتذر عنه']) {
      expect(column(label)).toBeInTheDocument()
    }
    expect(await screen.findByTestId('nothing-assigned')).toBeInTheDocument()
  })

  it('puts each task and ticket in the column of the shared mapping, tickets badged «تذكرة»', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([
      task({ id: 1, title: 'فكرة', status: 'idea' }),
      task({ id: 2, title: 'تنتظر قبولي', acceptance_status: 'pending', status: 'planning' }),
      task({ id: 3, title: 'جارية', status: 'in_progress' }),
      task({ id: 4, title: 'معتذر', acceptance_status: 'rejected' }),
    ]))
    mocks.getMyWork.mockResolvedValue(tickets([
      ticket({ id: 10, title: 'تذكرة جديدة', status: 'ASSIGNED' }),
      ticket({ id: 11, title: 'تذكرة جارية', status: 'IN_PROGRESS', capabilities: { can_complete: true, can_open: true } }),
      ticket({ id: 12, title: 'تذكرة محلولة', status: 'RESOLVED', capabilities: { can_open: true } }),
      ticket({ id: 13, title: 'تذكرة متعذرة', status: 'UNRESOLVED', capabilities: { can_open: true } }),
      ticket({ id: 14, title: 'تذكرة اعتُذر عنها', status: 'REJECTED_BY_ASSIGNEE', capabilities: { can_open: true } }),
    ]))
    mount()
    await screen.findByText('تذكرة جديدة')

    expect(itemsIn('أفكار').map((e) => e.getAttribute('data-key'))).toEqual(['task:1'])
    expect(itemsIn('بانتظار الاستلام').map((e) => e.getAttribute('data-key')).sort()).toEqual(['task:2', 'ticket:10'])
    expect(itemsIn('قيد التنفيذ').map((e) => e.getAttribute('data-key')).sort()).toEqual(['task:3', 'ticket:11'])
    expect(itemsIn('مكتملة').map((e) => e.getAttribute('data-key'))).toEqual(['ticket:12'])
    expect(itemsIn('متعذّر / معتذر عنه').map((e) => e.getAttribute('data-key')).sort()).toEqual(['task:4', 'ticket:13', 'ticket:14'])

    const badges = screen.getAllByTestId('kind-badge').map((b) => b.textContent)
    expect(badges.filter((b) => b === 'تذكرة')).toHaveLength(5)
    expect(badges.filter((b) => b === 'مهمة')).toHaveLength(4)
  })

  it('a ticket appears once, even if the server repeats it', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5 }), ticket({ id: 5 })]))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    expect(screen.getAllByText('الشبكة لا تعمل')).toHaveLength(1)
  })

  it('shows priority, due date, assignee and the points/duration on a ticket card; «لم تُحدَّد» when unset; «غير متاح لك» when hidden', async () => {
    const { task_scope: _a, task_points: _b, estimated_hours: _c, ...hidden } = ticket({ id: 7, title: 'مخفية' })
    void _a; void _b; void _c
    mocks.getMyWork.mockResolvedValue(tickets([
      ticket({ id: 5 }),
      ticket({ id: 6, title: 'قديمة', task_scope: null, task_points: null, estimated_hours: null }),
      hidden as MyWorkTicket,
    ]))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    const card = screen.getByText('الشبكة لا تعمل').closest('[data-testid="work-item"]') as HTMLElement
    expect(within(card).getByTestId('estimate')).toHaveTextContent('120 نقطة · 2.5 ساعة')
    expect(within(card).getByTestId('assignee')).toHaveTextContent('المكلّف: سلمى')
    expect(within(card).getByTestId('due')).toHaveTextContent(`الموعد: ${formatDue('2099-01-01T00:00:00Z')}`)
    expect(within(card).getByText('مرتفعة')).toBeInTheDocument()
    const legacy = screen.getByText('قديمة').closest('[data-testid="work-item"]') as HTMLElement
    expect(within(legacy).getByTestId('estimate')).toHaveTextContent('— لم تُحدَّد')
    const hiddenCard = screen.getByText('مخفية').closest('[data-testid="work-item"]') as HTMLElement
    expect(within(hiddenCard).getByTestId('estimate')).toHaveTextContent('غير متاح لك')
  })

  it('«الكل / المهام / التذاكر» filter, with counts', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([task({ id: 1, title: 'مهمتي' })]))
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 2, title: 'تذكرتي' })]))
    mount()
    await screen.findByText('تذكرتي')
    const group = screen.getByRole('group', { name: 'نوع العناصر' })
    expect(within(group).getByRole('button', { name: /الكل/ })).toHaveTextContent('2')
    expect(within(group).getByRole('button', { name: /المهام/ })).toHaveTextContent('1')

    await userEvent.click(within(group).getByRole('button', { name: /المهام/ }))
    expect(screen.getByText('مهمتي')).toBeInTheDocument()
    expect(screen.queryByText('تذكرتي')).not.toBeInTheDocument()

    await userEvent.click(within(group).getByRole('button', { name: /التذاكر/ }))
    expect(screen.getByText('تذكرتي')).toBeInTheDocument()
    expect(screen.queryByText('مهمتي')).not.toBeInTheDocument()
    // every column is still there
    expect(column('مكتملة')).toBeInTheDocument()

    await userEvent.click(within(group).getByRole('button', { name: /الكل/ }))
    expect(screen.getByText('مهمتي')).toBeInTheDocument()
    expect(screen.getByText('تذكرتي')).toBeInTheDocument()
  })

  it('one search box filters tasks and tickets alike', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([task({ id: 1, title: 'تقرير الشبكة' }), task({ id: 3, title: 'مراجعة' })]))
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 2, title: 'الشبكة لا تعمل' }), ticket({ id: 4, title: 'طابعة', ticket_number: 'EMC-9' })]))
    mount()
    await screen.findByText('طابعة')
    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث في مهامي وتذاكري' }), 'الشبكة')
    expect(screen.getByText('تقرير الشبكة')).toBeInTheDocument()
    expect(screen.getByText('الشبكة لا تعمل')).toBeInTheDocument()
    expect(screen.queryByText('طابعة')).not.toBeInTheDocument()
    expect(screen.queryByText('مراجعة')).not.toBeInTheDocument()
  })

  it('clicking a ticket opens the original ticket', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5 })]))
    mount()
    await userEvent.click(await screen.findByRole('link', { name: /فتح التذكرة EMC-5/ }))
    expect(await screen.findByTestId('loc')).toHaveTextContent('/dashboard/tickets/5')
  })

  it('a ticket the server does not let me open is not a link', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5, capabilities: { can_open: false } })]))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    expect(screen.queryByRole('link', { name: /فتح التذكرة/ })).not.toBeInTheDocument()
  })
})

describe('accepting', () => {
  it('a ticket moves to «قيد التنفيذ» AT ONCE, before the re-read answers, and stays after it', async () => {
    mocks.getMyWork.mockResolvedValueOnce(tickets([ticket({ id: 5 })]))
    let release!: (v: ReturnType<typeof tickets>) => void
    mocks.getMyWork.mockImplementationOnce(() => new Promise((res) => { release = res }))
    mocks.acceptTicket.mockResolvedValue({ success: true })
    mount()
    await screen.findByText('الشبكة لا تعمل')
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: /قبول التذكرة/ }))
    expect(mocks.acceptTicket).toHaveBeenCalledWith(5)
    await waitFor(() => expect(itemsIn('قيد التنفيذ')).toHaveLength(1))
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(0)
    // the buttons are gone: it cannot be accepted twice
    expect(screen.queryByRole('button', { name: /قبول التذكرة/ })).not.toBeInTheDocument()

    await act(async () => release(tickets([ticket({ id: 5, status: 'IN_PROGRESS', capabilities: { can_complete: true, can_open: true } })])))
    expect(itemsIn('قيد التنفيذ')).toHaveLength(1)
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(0)
  })

  it('after a page refresh the server status decides: it is in «قيد التنفيذ»', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5, status: 'IN_PROGRESS', capabilities: { can_complete: true, can_open: true } })]))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    expect(itemsIn('قيد التنفيذ')).toHaveLength(1)
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(0)
  })

  it('if the server refuses, the card stays pending and the re-read corrects the board', async () => {
    mocks.getMyWork.mockResolvedValueOnce(tickets([ticket({ id: 5 })])).mockResolvedValueOnce(tickets([]))
    mocks.acceptTicket.mockRejectedValue(new Error('conflict'))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    await userEvent.click(screen.getByRole('button', { name: /قبول التذكرة/ }))
    // someone reassigned it meanwhile: the re-read removes the stale card
    await waitFor(() => expect(screen.queryByText('الشبكة لا تعمل')).not.toBeInTheDocument())
  })

  it('a task is accepted with the task endpoint and moves out of «بانتظار الاستلام»', async () => {
    mocks.fetchMyTasks
      .mockResolvedValueOnce(tasks([task({ id: 12, acceptance_status: 'pending', status: 'idea' })]))
      .mockResolvedValue(tasks([task({ id: 12, acceptance_status: 'accepted', status: 'planning' })]))
    mocks.acceptTask.mockResolvedValue(undefined)
    mount()
    await screen.findByText('تصميم منشور')
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: /قبول المهمة/ }))
    expect(mocks.acceptTask).toHaveBeenCalledWith(12)
    await waitFor(() => expect(itemsIn('بانتظار الاستلام')).toHaveLength(0))
    expect(itemsIn('قيد المراجعة والتخطيط')).toHaveLength(1)
  })
})

describe('declining', () => {
  it('a ticket decline needs a reason of at least 5 characters, then reads the board again', async () => {
    mocks.getMyWork.mockResolvedValueOnce(tickets([ticket({ id: 5 })])).mockResolvedValue(tickets([ticket({ id: 5, status: 'REJECTED_BY_ASSIGNEE', capabilities: { can_open: true } })]))
    mocks.rejectTicket.mockResolvedValue({ success: true })
    mount()
    await screen.findByText('الشبكة لا تعمل')
    await userEvent.click(screen.getByRole('button', { name: /الاعتذار عن التذكرة/ }))

    const dialog = await screen.findByRole('dialog', { name: 'الاعتذار عن استلام المهمة' })
    const confirm = within(dialog).getByRole('button', { name: 'تأكيد الاعتذار' })
    expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByRole('textbox'), 'تعا')
    expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByRole('textbox'), 'رض مواعيد')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)

    await waitFor(() => expect(mocks.rejectTicket).toHaveBeenCalledWith(5, 'تعارض مواعيد'))
    await waitFor(() => expect(itemsIn('متعذّر / معتذر عنه')).toHaveLength(1))
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(0)
  })

  it('a task decline also needs a reason', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([task({ id: 12, acceptance_status: 'pending' })]))
    mocks.rejectTask.mockResolvedValue(undefined)
    mount()
    await screen.findByText('تصميم منشور')
    await userEvent.click(screen.getByRole('button', { name: /الاعتذار عن المهمة/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد الاعتذار' }))
    expect(mocks.rejectTask).not.toHaveBeenCalled()
    expect(await within(dialog).findByText(/سبب الاعتذار إجباري/)).toBeInTheDocument()
    await userEvent.type(within(dialog).getByRole('textbox'), 'ضغط مهام')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد الاعتذار' }))
    await waitFor(() => expect(mocks.rejectTask).toHaveBeenCalledWith(12, 'ضغط مهام'))
  })
})

describe('never silently empty', () => {
  it('a failed ticket read says so, with a retry that works', async () => {
    mocks.getMyWork.mockRejectedValueOnce(new Error('down')).mockResolvedValue(tickets([ticket({ id: 5 })]))
    mocks.fetchMyTasks.mockResolvedValue(tasks([task({ id: 1, title: 'مهمتي' })]))
    mount()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل تذاكرك')
    // the tasks that did load are still shown
    expect(screen.getByText('مهمتي')).toBeInTheDocument()
    expect(screen.queryByTestId('nothing-assigned')).not.toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('الشبكة لا تعمل')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a failed task read says so, with a retry', async () => {
    mocks.fetchMyTasks.mockRejectedValueOnce(new Error('down')).mockResolvedValue(tasks([task({ id: 1, title: 'مهمتي' })]))
    mount()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل مهامك')
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('مهمتي')).toBeInTheDocument()
  })

  it('both failing is two alerts, not an empty page', async () => {
    mocks.fetchMyTasks.mockRejectedValue(new Error('down'))
    mocks.getMyWork.mockRejectedValue(new Error('down'))
    mount()
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2))
    expect(screen.queryByTestId('nothing-assigned')).not.toBeInTheDocument()
  })

  it('says when the server cut the ticket list short, and links only to a page this user can open', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5 })], { truncated: true, open_total: 400 }))
    mocks.canAccess.mockImplementation((p: string) => p === '/dashboard/tickets/admin')
    mount()
    const note = await screen.findByTestId('truncated-note')
    expect(note).toHaveTextContent('يوجد المزيد من التذاكر')
    expect(within(note).getByTestId('all-tickets-link')).toHaveAttribute('href', '/dashboard/tickets/admin')
  })

  it('falls back to the assignee workspace, and to plain text when neither page is open to the user', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5 })], { truncated: true }))
    mocks.canAccess.mockImplementation((p: string) => p === '/dashboard/tickets/workspace')
    const first = mount()
    expect(await screen.findByTestId('all-tickets-link')).toHaveAttribute('href', '/dashboard/tickets/workspace')
    first.unmount()
    mocks.canAccess.mockReturnValue(false)
    mount()
    expect(await screen.findByTestId('truncated-note')).toBeInTheDocument()
    expect(screen.queryByTestId('all-tickets-link')).not.toBeInTheDocument()
  })

  it('says when the server cut the task list short', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([task()], { truncated: true, total: 450 }))
    mount()
    expect(await screen.findByTestId('tasks-truncated-note')).toHaveTextContent('يوجد المزيد من المهام')
  })

  it('a member role gets tasks AND tickets from the own-only endpoints', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([task({ id: 1, title: 'مهمتي' })]))
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 2, title: 'تذكرتي' })]))
    mount()
    expect(await screen.findByText('مهمتي')).toBeInTheDocument()
    expect(screen.getByText('تذكرتي')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a 403 on the tasks is an error with a retry, not a quiet fallback', async () => {
    const denied = Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403 } })
    mocks.fetchMyTasks.mockRejectedValueOnce(denied).mockResolvedValue(tasks([task({ title: 'وصلت' })]))
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 2, title: 'تذكرتي' })]))
    mount()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل مهامك')
    expect(screen.getByText('تذكرتي')).toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('وصلت')).toBeInTheDocument()
  })
})

describe('no stale cards', () => {
  it('a ticket the admin reassigned away disappears on the next read (refresh button)', async () => {
    mocks.getMyWork.mockResolvedValueOnce(tickets([ticket({ id: 5 })])).mockResolvedValue(tickets([]))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    await userEvent.click(screen.getByRole('button', { name: 'تحديث' }))
    await waitFor(() => expect(screen.queryByText('الشبكة لا تعمل')).not.toBeInTheDocument())
  })

  it('reads again when the tab regains focus', async () => {
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1_000_000)
    mocks.getMyWork.mockResolvedValueOnce(tickets([ticket({ id: 5 })])).mockResolvedValue(tickets([ticket({ id: 5, status: 'IN_PROGRESS', capabilities: { can_open: true } })]))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(1)
    now.mockReturnValue(1_000_000 + 60_000)
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    await waitFor(() => expect(itemsIn('قيد التنفيذ')).toHaveLength(1))
    now.mockRestore()
  })
})

describe('narrow screens (768px and below)', () => {
  it('shows a status switcher with counts instead of a clipped strip, and every status is reachable', async () => {
    setNarrow(true)
    mocks.fetchMyTasks.mockResolvedValue(tasks([task({ id: 1, title: 'جارية', status: 'in_progress' })]))
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5 }), ticket({ id: 6, title: 'محلولة', status: 'RESOLVED', capabilities: { can_open: true } })]))
    mount()
    await screen.findByTestId('my-work-board')
    const board = screen.getByTestId('my-work-board')
    expect(board).toHaveAttribute('data-layout', 'tabs')

    const tabs = within(screen.getByRole('tablist', { name: 'حالات مهامي وتذاكري' })).getAllByRole('tab')
    expect(tabs).toHaveLength(8)
    const byName = (n: string) => tabs.find((t) => t.textContent?.startsWith(n)) as HTMLElement
    expect(byName('بانتظار الاستلام')).toHaveTextContent('1')
    expect(byName('قيد التنفيذ')).toHaveTextContent('1')
    expect(byName('أفكار')).toHaveTextContent('0')

    // opens on the first status that has something; the others are one tap away
    expect(screen.getByRole('tabpanel')).toHaveTextContent('الشبكة لا تعمل')
    await userEvent.click(byName('مكتملة'))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('محلولة')
    expect(screen.queryByText('الشبكة لا تعمل')).not.toBeInTheDocument()
    await userEvent.click(byName('أفكار'))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('لا أفكار بعد')
  })

  it('the wide layout is a wrapping grid, not a fixed-width strip', async () => {
    mount()
    const board = await screen.findByTestId('my-work-board')
    expect(board).toHaveAttribute('data-layout', 'grid')
    expect(board.style.gridTemplateColumns).toContain('auto-fit')
    expect(board.className).not.toMatch(/overflow-x/)
  })
})


/* ───────────── round 3: defects found in review ───────────── */

/** A task row exactly as the server serializes it (date cast = midnight UTC, instants in UTC). */
const serverTask = (over: Record<string, unknown> = {}) =>
  normalizeOpsTask({
    id: 40, title: 'مهمة الخادم', status: 'planning', priority: 'medium', acceptance_status: 'accepted', task_scope: 'medium', points: 100, estimated_hours: '2.00',
    due_date: '2026-11-30T00:00:00.000000Z', due_datetime: null, department: { id: 1, name: 'الإعلام' }, assigned_to: { id: 7, name: 'سلمى' }, parent_task_id: null, ...over,
  })

describe('real server shapes', () => {
  it('a task due today (date cast = midnight UTC) is not overdue until the day is over, and is shown as a local date', async () => {
    const dueDate = new Date()
    const ymd = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
    mocks.fetchMyTasks.mockResolvedValue(tasks([serverTask({ due_date: `${ymd}T00:00:00.000000Z` })]))
    mount()
    const card = (await screen.findByText('مهمة الخادم')).closest('[data-testid="work-item"]') as HTMLElement
    expect(within(card).queryByText('متأخرة')).not.toBeInTheDocument()
    expect(within(card).getByTestId('due')).toHaveTextContent(`الموعد: ${formatDue(ymd)}`)
    expect(within(card).getByTestId('due').textContent).not.toMatch(/T00|000000/)
  })

  it('a ticket due instant is shown through the local date helper, not cut with slice', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5, expected_resolution_time: '2099-03-04T21:30:00.000000Z' })]))
    mount()
    const card = (await screen.findByText('الشبكة لا تعمل')).closest('[data-testid="work-item"]') as HTMLElement
    expect(within(card).getByTestId('due')).toHaveTextContent(`الموعد: ${formatDue('2099-03-04T21:30:00.000000Z')}`)
    expect(within(card).getByTestId('due').textContent).not.toContain('2099-03-04T')
  })
})

describe('collective tasks', () => {
  it('the member who owns the parent AND their own copy sees ONE card (the copy)', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([
      serverTask({ id: 50, title: 'مهمة جماعية', parent_task_id: null, subtasks: [{ id: 51, title: 'مهمة جماعية', assigned_to: { id: 7, name: 'سلمى' }, parent_task_id: 50, status: 'planning' }] }),
      serverTask({ id: 51, title: 'مهمة جماعية', parent_task_id: 50 }),
    ]))
    mount()
    await screen.findAllByText('مهمة جماعية')
    expect(screen.getAllByText('مهمة جماعية')).toHaveLength(1)
    expect(screen.getByTestId('work-item')).toHaveAttribute('data-key', 'task:51')
  })

  it('recognized from the flat list alone too (no loaded subtasks)', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([serverTask({ id: 50, title: 'جماعية' }), serverTask({ id: 51, title: 'جماعية', parent_task_id: 50 })]))
    mount()
    await screen.findAllByText('جماعية')
    expect(screen.getAllByTestId('work-item')).toHaveLength(1)
  })

  it('a copy of someone else\'s parent is kept (the parent belongs to another member)', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([serverTask({ id: 51, title: 'نسختي', parent_task_id: 50 })]))
    mount()
    expect(await screen.findByText('نسختي')).toBeInTheDocument()
  })
})

describe('a slow stale poll can never undo an acceptance', () => {
  it('the poll that started before the accept answers last and is ignored', async () => {
    const pendingTask = serverTask({ id: 12, title: 'تنتظر', acceptance_status: 'pending', status: 'idea' })
    const acceptedTask = serverTask({ id: 12, title: 'تنتظر', acceptance_status: 'accepted', status: 'planning' })
    let releaseStale!: (v: ReturnType<typeof tasks>) => void
    mocks.fetchMyTasks
      .mockResolvedValueOnce(tasks([pendingTask]))
      .mockImplementationOnce(() => new Promise((res) => { releaseStale = res }))
      .mockResolvedValue(tasks([acceptedTask]))
    mocks.acceptTask.mockResolvedValue(undefined)
    mount()
    await screen.findByText('تنتظر')
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'تحديث' })) // the slow poll
    await userEvent.click(screen.getByRole('button', { name: /قبول المهمة/ }))
    await waitFor(() => expect(itemsIn('بانتظار الاستلام')).toHaveLength(0))
    expect(itemsIn('قيد المراجعة والتخطيط')).toHaveLength(1)

    await act(async () => releaseStale(tasks([pendingTask])))
    expect(itemsIn('بانتظار الاستلام')).toHaveLength(0)
    expect(itemsIn('قيد المراجعة والتخطيط')).toHaveLength(1)
  })

  it('an older read that answers after a newer one never brings back what the newer one removed', async () => {
    const mine = serverTask({ id: 12, title: 'أُعيد إسنادها', status: 'planning' })
    let releaseStale!: (v: ReturnType<typeof tasks>) => void
    mocks.fetchMyTasks
      .mockResolvedValueOnce(tasks([mine]))
      .mockImplementationOnce(() => new Promise((res) => { releaseStale = res }))
      .mockResolvedValue(tasks([]))
    mount()
    await screen.findByText('أُعيد إسنادها')
    await userEvent.click(screen.getByRole('button', { name: 'تحديث' })) // slow, started first
    await userEvent.click(screen.getByRole('button', { name: 'تحديث' })) // newer: the admin reassigned it away
    await waitFor(() => expect(screen.queryByText('أُعيد إسنادها')).not.toBeInTheDocument())
    await act(async () => releaseStale(tasks([mine])))
    expect(screen.queryByText('أُعيد إسنادها')).not.toBeInTheDocument()
  })

  it('an idea accepted says it moved to the member\'s tasks', async () => {
    mocks.fetchMyTasks.mockResolvedValueOnce(tasks([serverTask({ id: 12, acceptance_status: 'pending', status: 'idea' })])).mockResolvedValue(tasks([serverTask({ id: 12, status: 'planning' })]))
    mocks.acceptTask.mockResolvedValue(undefined)
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /قبول المهمة/ }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم قبول المهمة ونُقلت إلى مهامك'))
  })
})

describe('no empty-state flash, and failed declines re-read', () => {
  it('«nothing assigned» waits for BOTH sources', async () => {
    let releaseTickets!: (v: ReturnType<typeof tickets>) => void
    mocks.getMyWork.mockImplementation(() => new Promise((res) => { releaseTickets = res }))
    mocks.fetchMyTasks.mockResolvedValue(tasks([]))
    mount()
    await waitFor(() => expect(mocks.fetchMyTasks).toHaveBeenCalled())
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByTestId('nothing-assigned')).not.toBeInTheDocument()
    await act(async () => releaseTickets(tickets([])))
    expect(await screen.findByTestId('nothing-assigned')).toBeInTheDocument()
  })

  it('a failed ticket decline (409) re-reads both sources', async () => {
    mocks.getMyWork.mockResolvedValue(tickets([ticket({ id: 5 })]))
    mocks.rejectTicket.mockRejectedValue(new Error('conflict'))
    mount()
    await screen.findByText('الشبكة لا تعمل')
    const before = { tasks: mocks.fetchMyTasks.mock.calls.length, tickets: mocks.getMyWork.mock.calls.length }
    await userEvent.click(screen.getByRole('button', { name: /الاعتذار عن التذكرة/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox'), 'تعارض مواعيد')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد الاعتذار' }))
    await waitFor(() => expect(mocks.getMyWork.mock.calls.length).toBeGreaterThan(before.tickets))
    expect(mocks.fetchMyTasks.mock.calls.length).toBeGreaterThan(before.tasks)
  })

  it('a failed task decline re-reads both sources', async () => {
    mocks.fetchMyTasks.mockResolvedValue(tasks([serverTask({ id: 12, acceptance_status: 'pending' })]))
    mocks.rejectTask.mockRejectedValue(new Error('conflict'))
    mount()
    await screen.findByText('مهمة الخادم')
    const before = { tasks: mocks.fetchMyTasks.mock.calls.length, tickets: mocks.getMyWork.mock.calls.length }
    await userEvent.click(screen.getByRole('button', { name: /الاعتذار عن المهمة/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox'), 'ضغط مهام')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد الاعتذار' }))
    await waitFor(() => expect(mocks.fetchMyTasks.mock.calls.length).toBeGreaterThan(before.tasks))
    expect(mocks.getMyWork.mock.calls.length).toBeGreaterThan(before.tickets)
  })
})
