import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { WorkBoardCard, WorkBoardTaskActions } from '@/api/operationsWorkBoardApi'
import type { MyWorkColumnKey } from '@/lib/myWorkColumns'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  acceptTicket: vi.fn(),
  rejectTicket: vi.fn(),
  acceptTask: vi.fn(),
  rejectTask: vi.fn(),
  fetchMyTask: vi.fn(),
  fetchTask: vi.fn(),
  departments: vi.fn(),
  members: vi.fn(),
  scopeDepartments: vi.fn(),
  editable: vi.fn(),
  patch: vi.fn(),
  role: { current: 'operations_manager' as string },
}))
vi.mock('@/api/axios', () => ({ default: { get: mocks.get, post: mocks.post, patch: mocks.patch, put: vi.fn() } }))
vi.mock('@/services/ticketService', () => ({ ticketService: { acceptTask: mocks.acceptTicket, rejectTask: mocks.rejectTicket } }))
vi.mock('@/api/tasksApi', () => ({
  acceptMyTask: mocks.acceptTask,
  rejectMyTask: mocks.rejectTask,
  fetchMyTask: mocks.fetchMyTask,
  fetchTask: mocks.fetchTask,
  fetchMyTasks: vi.fn(),
  fetchTasks: vi.fn(),
  updateTask: vi.fn(),
  addTaskComment: vi.fn(),
  commentOnMyTask: vi.fn(),
  setMyTaskStatus: vi.fn(),
  toggleMyChecklist: vi.fn(),
}))
// The evaluation form itself is not under test here: only that finishing it refreshes the open drawer.
vi.mock('@/components/operations/TaskEvaluationModal', () => ({
  default: ({ open, onEvaluated }: { open: boolean; onEvaluated: () => void }) => (open ? <button type="button" onClick={onEvaluated}>إنهاء التقييم</button> : null),
}))
vi.mock('@/api/jobTitlesApi', () => ({ fetchDepartmentOptions: mocks.departments }))
// The task-scope READS are the form's data source; the write (PATCH) stays the real function over the mocked HTTP client.
vi.mock('@/api/taskScopeApi', async (orig) => ({
  ...(await orig<typeof import('@/api/taskScopeApi')>()),
  fetchTaskScopeDepartments: mocks.scopeDepartments,
  fetchTaskScopeMembers: mocks.members,
  fetchEditableTask: mocks.editable,
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'سلمى', role: mocks.role.current } }) }))
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

import toast from 'react-hot-toast'
import OperationsBoardPage from '@/pages/operations/OperationsBoardPage'
import WorkItemCard from '@/components/operations/myWork/WorkItemCard'
import { MY_WORK_COLUMNS, columnForTask, columnForTicket } from '@/lib/myWorkColumns'
import { appendColumnPage, columnsFromRead, dedupeBoard, emptyColumns, matchesQuickView, refreshSize } from '@/lib/workBoard'
import { workBoardCardToItem } from '@/lib/myWork'
import { normalizeTaskActions, normalizeWorkBoardCard } from '@/api/operationsWorkBoardApi'

const NO_CAPS = { can_open: false, can_accept: false, can_reject: false, can_complete: false, can_edit: false, can_reassign: false }
const ALL_ACTIONS: WorkBoardTaskActions = { can_create: true, can_assign: true, can_update: true, manageable_department_ids: null }

function card(over: Partial<WorkBoardCard> = {}): WorkBoardCard {
  return {
    key: 'task:1', kind: 'task', id: 1, reference: null, title: 'تصميم منشور', masked: false, column: 'planning', status: 'planning', acceptance: 'accepted',
    stage: null, stage_badge: null, next_step: null, priority: 'medium', due_at: null, is_overdue: false, assignee: { id: 9, name: 'منى' }, department: { id: 3, name: 'الإعلام' },
    scope: 'medium', points: 100, hours: 2, estimate_hidden: false, is_locked: false, group_id: null, is_mine: false, updated_at: '2026-11-20T10:00:00Z',
    capabilities: { ...NO_CAPS }, ...over,
  }
}
const ticketCard = (id: number, over: Partial<WorkBoardCard> = {}): WorkBoardCard =>
  card({ key: `ticket:${id}`, kind: 'ticket', id, reference: `EMC-${id}`, title: `تذكرة ${id}`, status: 'IN_PROGRESS', column: 'in_progress', acceptance: null, ...over })

type Cols = Partial<Record<MyWorkColumnKey, WorkBoardCard[]>>
interface ColExtra { count?: number; has_more?: boolean }

function payload(byCol: Cols, extra: Partial<Record<MyWorkColumnKey, ColExtra>> = {}, counts?: { all: number; tasks: number; tickets: number }, metaOver: Record<string, unknown> = {}) {
  const columns = MY_WORK_COLUMNS.map((c) => {
    const items = byCol[c.key] ?? []
    const e = extra[c.key] ?? {}

    return { key: c.key, label: c.label, count: e.count ?? items.length, counts: { tasks: items.filter((i) => i.kind === 'task').length, tickets: items.filter((i) => i.kind === 'ticket').length }, has_more: e.has_more ?? false, items }
  })
  const all = columns.reduce((n, c) => n + c.count, 0)

  return {
    data: {
      success: true,
      data: { columns },
      meta: { scope: 'all', kind: 'all', per_column: 30, column: null, page: 1, counts: counts ?? { all, tasks: 0, tickets: 0 }, task_actions: { can_create: false, can_assign: false, can_update: false, manageable_department_ids: [] }, generated_at: '2026-11-23T10:00:00Z', ...metaOver },
    },
  }
}

const apiError = (status: number) => new AxiosError('x', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data: { success: false, message: 'm' } })
const lastParams = () => (mocks.get.mock.calls.at(-1)![1] as { params: Record<string, string | number> }).params

function LocationProbe() {
  const loc = useLocation()

  return <p data-testid="loc">{loc.pathname}</p>
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/operations/board']}>
      <Routes>
        <Route path="/dashboard/operations/board" element={<OperationsBoardPage />} />
        <Route path="/dashboard/tickets/:id" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const column = (label: string) => screen.getByRole('region', { name: new RegExp(`^${label}:`) })
const keysIn = (label: string) => within(column(label)).queryAllByTestId('work-item').map((e) => e.getAttribute('data-key'))

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
  mocks.role.current = 'operations_manager'
  mocks.get.mockResolvedValue(payload({}))
  mocks.post.mockResolvedValue({ data: { success: true } })
  mocks.members.mockResolvedValue([{ id: 21, name: 'عضو' }])
  mocks.scopeDepartments.mockResolvedValue({ items: [{ id: 3, name: 'Media', name_ar: 'الإعلام' }], manageableDepartmentIds: null })
  mocks.patch.mockResolvedValue({ data: { success: true } })
  mocks.departments.mockResolvedValue([{ id: 3, name: 'Media', name_ar: 'الإعلام' }, { id: 4, name: 'Tech', name_ar: 'التقنية' }])
})

describe('the global board: the same columns as «مهامي ومسؤولياتي»', () => {
  it('renders all eight columns, in the order and with the labels of the shared column map, even when empty', async () => {
    mount()
    await screen.findByTestId('operations-board')

    const headings = within(screen.getByTestId('operations-board')).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(MY_WORK_COLUMNS.map((c) => c.label))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('لوحة التشغيل والأجايل العامة')
  })

  it('is right-to-left', async () => {
    mount()
    const board = await screen.findByTestId('operations-board')

    expect(board).toHaveAttribute('dir', 'rtl')
    expect(board.closest('[dir="rtl"]')).not.toBeNull()
  })

  it('shows tasks AND tickets of different assignees, each in the column the server named', async () => {
    mocks.get.mockResolvedValue(
      payload({
        ideas: [card({ key: 'task:1', id: 1, title: 'فكرة', column: 'ideas', status: 'idea' })],
        pending: [ticketCard(10, { column: 'pending', status: 'ASSIGNED', assignee: { id: 11, name: 'ريم' } })],
        in_progress: [card({ key: 'task:3', id: 3, title: 'جارية', column: 'in_progress', status: 'in_progress', assignee: { id: 12, name: 'هدى' } }), ticketCard(11, { assignee: { id: 13, name: 'ليلى' } })],
        completed: [ticketCard(12, { column: 'completed', status: 'RESOLVED' })],
        closed: [card({ key: 'task:4', id: 4, title: 'معتذر', column: 'closed', acceptance: 'rejected' })],
      }),
    )
    mount()
    await screen.findByText('فكرة')

    expect(keysIn('أفكار')).toEqual(['task:1'])
    expect(keysIn('بانتظار الاستلام')).toEqual(['ticket:10'])
    expect(keysIn('قيد التنفيذ')).toEqual(['task:3', 'ticket:11'])
    expect(keysIn('مكتملة')).toEqual(['ticket:12'])
    expect(keysIn('متعذّر / معتذر عنه')).toEqual(['task:4'])
    const names = screen.getAllByTestId('assignee').map((n) => n.textContent)
    expect(names).toEqual(expect.arrayContaining(['المكلّف: ريم', 'المكلّف: هدى', 'المكلّف: ليلى']))
    const kinds = screen.getAllByTestId('kind-badge').map((b) => b.textContent)
    expect(kinds.filter((k) => k === 'تذكرة')).toHaveLength(3)
    expect(kinds.filter((k) => k === 'مهمة')).toHaveLength(3)
  })

  it('never re-derives a column: the card goes where the server put it', async () => {
    // The status would map to «قيد التنفيذ», but the server says «مكتملة»: the page shows what the server says.
    mocks.get.mockResolvedValue(payload({ completed: [ticketCard(20, { status: 'IN_PROGRESS', column: 'completed' })] }))
    mount()
    await screen.findByText('تذكرة 20')

    expect(keysIn('مكتملة')).toEqual(['ticket:20'])
    expect(keysIn('قيد التنفيذ')).toEqual([])
  })

  it('shows no card twice, even when the server (or a refresh) repeats one', async () => {
    mocks.get.mockResolvedValue(
      payload({
        planning: [card({ key: 'task:5', id: 5, title: 'مكررة' }), card({ key: 'task:5', id: 5, title: 'مكررة' })],
        review: [card({ key: 'task:5', id: 5, title: 'مكررة', column: 'review' })],
      }),
    )
    mount()
    await screen.findByText('مكررة')

    expect(screen.getAllByTestId('work-item')).toHaveLength(1)
  })

  it('has the SAME status-to-column answers as «مهامي» for every task and ticket status the server knows', () => {
    const tasks: Array<[string, string | null, MyWorkColumnKey]> = [
      ['idea', null, 'ideas'], ['under_review', null, 'planning'], ['planning', null, 'planning'], ['waiting_approval', null, 'review'], ['in_progress', null, 'in_progress'],
      ['needs_evaluation', null, 'review'], ['completed', null, 'completed'], ['postponed', null, 'on_hold'], ['cancelled', null, 'on_hold'],
      ['planning', 'pending', 'pending'], ['completed', 'pending', 'completed'], ['planning', 'rejected', 'closed'],
    ]
    const tickets: Array<[string, MyWorkColumnKey]> = [
      ['PENDING_APPROVAL', 'pending'], ['ASSIGNED', 'pending'], ['IN_PROGRESS', 'in_progress'], ['PENDING_REVIEW', 'review'], ['APPROVED_FOR_DEPLOY', 'review'],
      ['PENDING_VERIFICATION', 'review'], ['RESOLVED', 'completed'], ['UNRESOLVED', 'closed'], ['REJECTED_BY_ASSIGNEE', 'closed'], ['REJECTED_BY_ADMIN', 'closed'],
    ]
    for (const [status, acceptance, col] of tasks) expect(columnForTask(status, acceptance), `${status}/${acceptance}`).toBe(col)
    for (const [status, col] of tickets) expect(columnForTicket(status), status).toBe(col)
  })

  it('lays out the same fixture in the same columns as «مهامي» (one map, one card component)', async () => {
    const fixture: Array<WorkBoardCard> = [
      card({ key: 'task:1', id: 1, title: 'أ', status: 'idea', column: 'ideas' }),
      card({ key: 'task:2', id: 2, title: 'ب', status: 'waiting_approval', column: 'review' }),
      ticketCard(3, { title: 'ج', status: 'PENDING_REVIEW', column: 'review', stage_badge: 'بانتظار المراجعة', next_step: 'بانتظار مراجعة الإنجاز' }),
      ticketCard(4, { title: 'د', status: 'RESOLVED', column: 'completed' }),
    ]
    mocks.get.mockResolvedValue(payload({ ideas: [fixture[0]], review: [fixture[1], fixture[2]], completed: [fixture[3]] }))
    mount()
    await screen.findByText('أ')

    // The card shows the same stage badge and next step the «مهامي» card shows for this ticket.
    expect(within(column('بانتظار الاعتماد والتقييم')).getByTestId('stage-badge')).toHaveTextContent('بانتظار المراجعة')
    expect(within(column('بانتظار الاعتماد والتقييم')).getByTestId('next-step')).toHaveTextContent('بانتظار مراجعة الإنجاز')
    for (const c of fixture) {
      expect(workBoardCardToItem(c).column).toBe(c.column)
      expect(c.kind === 'task' ? columnForTask(c.status, c.acceptance) : columnForTicket(c.status)).toBe(c.column)
    }
  })
})

describe('what a card lets the viewer do', () => {
  it('opens a ticket only when can_open is true («فتح التذكرة»), otherwise the card has no link', async () => {
    mocks.get.mockResolvedValue(
      payload({
        in_progress: [ticketCard(1, { capabilities: { ...NO_CAPS, can_open: true } }), ticketCard(2, { capabilities: { ...NO_CAPS, can_open: false } })],
      }),
    )
    mount()
    await screen.findByText('تذكرة 1')

    expect(screen.getAllByRole('link', { name: /فتح التذكرة/ })).toHaveLength(1)
    expect(screen.getByRole('link', { name: /EMC-1/ })).toHaveAttribute('href', '/dashboard/tickets/1')
    expect(within(screen.getAllByTestId('work-item')[1]).queryByRole('link')).toBeNull()
    expect(within(screen.getAllByTestId('work-item')[1]).queryByRole('button')).toBeNull()
  })

  it('shows a masked ticket as a read-only placeholder: muted title, «بيانات محجوبة», nothing to open or read', async () => {
    mocks.get.mockResolvedValue(
      payload({
        in_progress: [
          ticketCard(7, {
            masked: true, title: 'تذكرة محجوبة', reference: null, stage_badge: 'بانتظار المراجعة', due_at: '2026-11-26T21:28:00Z',
            capabilities: { ...NO_CAPS }, assignee: { id: 5, name: 'نور' },
          }),
        ],
      }),
    )
    mount()
    const item = await screen.findByTestId('work-item')

    expect(within(item).getByTestId('masked-hint')).toHaveTextContent('بيانات محجوبة')
    expect(within(item).getByTestId('masked-heading')).toHaveTextContent('تذكرة محجوبة')
    expect(within(item).queryByRole('link')).toBeNull()
    expect(within(item).queryByRole('button')).toBeNull()
    expect(within(item).queryByTestId('due')).toBeNull()
    expect(within(item).queryByTestId('estimate')).toBeNull()
    expect(item.textContent).not.toContain('EMC-7')
    // The status badge and the assignee stay.
    expect(within(item).getByTestId('stage-badge')).toBeInTheDocument()
    expect(within(item).getByTestId('assignee')).toHaveTextContent('نور')
  })

  it('offers no administrative action on any card (no lock, evaluate, claim, reassign, status menu)', async () => {
    mocks.get.mockResolvedValue(
      payload({
        review: [card({ key: 'task:1', id: 1, status: 'needs_evaluation', column: 'review', is_locked: true, capabilities: { ...NO_CAPS, can_open: true } })],
        planning: [card({ key: 'task:2', id: 2, assignee: null, capabilities: { ...NO_CAPS, can_open: true } })],
      }),
    )
    mount()
    await screen.findAllByTestId('work-item')
    const board = screen.getByTestId('operations-board')

    for (const name of [/تقييم/, /قفل/, /فتح المهمة/, /استلام المهمة لنفسي/, /إسناد/, /إعادة توجيه/]) expect(within(board).queryByRole('button', { name })).toBeNull()
    expect(within(board).queryByRole('combobox')).toBeNull()
    expect(board.querySelectorAll('[draggable="true"]')).toHaveLength(0)
    // A locked task says so, read-only.
    expect(within(board).getByTestId('locked-hint')).toBeInTheDocument()
  })

  it('offers accept / decline only on the cards where the server says the viewer is the assignee', async () => {
    mocks.get.mockResolvedValue(
      payload({
        pending: [
          ticketCard(1, { column: 'pending', status: 'ASSIGNED', is_mine: true, capabilities: { ...NO_CAPS, can_open: true, can_accept: true, can_reject: true } }),
          ticketCard(2, { column: 'pending', status: 'ASSIGNED', capabilities: { ...NO_CAPS, can_open: true } }),
        ],
      }),
    )
    mount()
    await screen.findByText('تذكرة 1')

    expect(screen.getAllByRole('button', { name: /قبول التذكرة/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /الاعتذار عن/ })).toHaveLength(1)
  })

  it('accepting a ticket calls the existing endpoint and re-reads the board', async () => {
    mocks.acceptTicket.mockResolvedValue({})
    mocks.get.mockResolvedValue(payload({ pending: [ticketCard(1, { column: 'pending', status: 'ASSIGNED', capabilities: { ...NO_CAPS, can_open: true, can_accept: true, can_reject: true } })] }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /قبول التذكرة/ }))

    await waitFor(() => expect(mocks.acceptTicket).toHaveBeenCalledWith(1))
    await waitFor(() => expect(mocks.get.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(toast.success).toHaveBeenCalled()
  })

  it('opens a task through the authorised endpoint, the own-only one for the viewer\'s own task', async () => {
    mocks.fetchMyTask.mockResolvedValue({ id: 1, title: 'مهمتي', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    mocks.get.mockResolvedValue(payload({ planning: [card({ is_mine: true, title: 'مهمتي', capabilities: { ...NO_CAPS, can_open: true } })] }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /مهمتي/ }))

    await waitFor(() => expect(mocks.fetchMyTask).toHaveBeenCalledWith(1))
    expect(mocks.fetchTask).not.toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'مهمتي', level: 2 })).toBeInTheDocument()
  })

  it('a task of someone else is opened through the management endpoint (the server decides), and a task that cannot be opened has no button', async () => {
    mocks.fetchTask.mockResolvedValue({ id: 2, title: 'مهمة منى', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    mocks.get.mockResolvedValue(
      payload({
        planning: [
          card({ key: 'task:2', id: 2, title: 'مهمة منى', capabilities: { ...NO_CAPS, can_open: true } }),
          card({ key: 'task:3', id: 3, title: 'مهمة مغلقة عليّ', capabilities: { ...NO_CAPS, can_open: false } }),
        ],
      }),
    )
    mount()
    expect(await screen.findByText('مهمة مغلقة عليّ')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /مهمة مغلقة عليّ/ })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /مهمة منى/ }))
    await waitFor(() => expect(mocks.fetchTask).toHaveBeenCalledWith(2))
    expect(mocks.fetchMyTask).not.toHaveBeenCalled()
  })

  it('the management actions of a task live in its drawer (managers only), never on the card', async () => {
    mocks.fetchTask.mockResolvedValue({ id: 2, title: 'تنتظر التقييم', department_id: '3', status: 'needs_evaluation', priority: 'medium', comments: [], checklist: [] })
    mocks.get.mockResolvedValue(payload({ review: [card({ key: 'task:2', id: 2, title: 'تنتظر التقييم', column: 'review', status: 'needs_evaluation', capabilities: { ...NO_CAPS, can_open: true } })] }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /تنتظر التقييم/ }))

    const mgmt = await screen.findByTestId('board-task-management')
    expect(within(mgmt).getByRole('button', { name: /تقييم واعتماد المهمة/ })).toBeInTheDocument()
    expect(within(mgmt).getByRole('button', { name: /قفل المهمة/ })).toBeInTheDocument()
  })

  it('a viewer without a management role gets no management actions in the drawer and no quick views', async () => {
    mocks.role.current = 'volunteer'
    mocks.fetchTask.mockResolvedValue({ id: 2, title: 'مهمة', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    mocks.get.mockResolvedValue(payload({ planning: [card({ key: 'task:2', id: 2, title: 'مهمة', capabilities: { ...NO_CAPS, can_open: true } })] }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /مهمة/ }))

    await screen.findByRole('heading', { level: 2, name: 'مهمة' })
    expect(screen.queryByTestId('board-task-management')).toBeNull()
    expect(screen.queryByRole('button', { name: /بانتظار التقييم/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /إسناد مهمة جديدة/ })).toBeNull()
  })
})

describe('counters, filters and «load more»', () => {
  it('shows the server\'s totals: the column count and the kind counters (never recomputed from the loaded cards)', async () => {
    mocks.get.mockResolvedValue(payload({ planning: [card()] }, { planning: { count: 57, has_more: true } }, { all: 120, tasks: 70, tickets: 50 }))
    mount()
    await screen.findByText('تصميم منشور')

    expect(within(column('قيد المراجعة والتخطيط')).getByTestId('column-count')).toHaveTextContent('57')
    const kinds = screen.getByRole('group', { name: 'نوع العناصر' })
    expect(within(kinds).getByRole('button', { name: /الكل/ })).toHaveTextContent('120')
    expect(within(kinds).getByRole('button', { name: /المهام/ })).toHaveTextContent('70')
    expect(within(kinds).getByRole('button', { name: /التذاكر/ })).toHaveTextContent('50')
  })

  it('«load more» asks for the next page of that one column, appends it, and keeps the board totals from the answer', async () => {
    mocks.get.mockResolvedValueOnce(payload({ planning: [card({ key: 'task:1', id: 1, title: 'الأولى' })] }, { planning: { count: 3, has_more: true } }, { all: 3, tasks: 3, tickets: 0 }))
    mocks.get.mockResolvedValueOnce(
      payload(
        { planning: [card({ key: 'task:2', id: 2, title: 'الثانية' }), card({ key: 'task:1', id: 1, title: 'الأولى' })] },
        { planning: { count: 3, has_more: false } },
        { all: 3, tasks: 3, tickets: 0 },
        { column: 'planning', page: 2 },
      ),
    )
    mount()
    await userEvent.click(await screen.findByTestId('load-more-planning'))

    expect(await screen.findByText('الثانية')).toBeInTheDocument()
    expect(lastParams()).toMatchObject({ column: 'planning', page: 2, per_column: 30 })
    // The overlapping card is not repeated, the button is gone, and the total is still the server's 3.
    expect(keysIn('قيد المراجعة والتخطيط')).toEqual(['task:1', 'task:2'])
    expect(screen.queryByTestId('load-more-planning')).toBeNull()
    expect(within(column('قيد المراجعة والتخطيط')).getByTestId('column-count')).toHaveTextContent('3')
  })

  it('shows no «load more» on a column that has everything', async () => {
    mocks.get.mockResolvedValue(payload({ planning: [card()] }))
    mount()
    await screen.findByText('تصميم منشور')

    expect(screen.queryByTestId('load-more-planning')).toBeNull()
  })

  it('the kind, scope and department filters go to the server and start from the first page', async () => {
    mount()
    await screen.findByTestId('operations-board')
    expect(lastParams()).toMatchObject({ scope: 'all', kind: 'all', per_column: 30 })
    expect(lastParams()).not.toHaveProperty('column')
    expect(lastParams()).not.toHaveProperty('page')

    await userEvent.click(within(screen.getByRole('group', { name: 'نوع العناصر' })).getByRole('button', { name: /التذاكر/ }))
    await waitFor(() => expect(lastParams()).toMatchObject({ kind: 'tickets' }))

    await userEvent.click(screen.getByRole('button', { name: 'لوحة الأجايل الخاصة بي' }))
    await waitFor(() => expect(lastParams()).toMatchObject({ scope: 'mine', kind: 'tickets' }))

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'الإدارة' }), '4')
    await waitFor(() => expect(lastParams()).toMatchObject({ department_id: 4, scope: 'mine' }))
  })

  it('sends the search to the server after a pause (trimmed, at most 100 characters)', async () => {
    mount()
    await screen.findByTestId('operations-board')
    const calls = mocks.get.mock.calls.length

    await userEvent.type(screen.getByRole('searchbox'), '  EMC-12 ')

    await waitFor(() => expect(lastParams()).toMatchObject({ search: 'EMC-12' }))
    // One request for the finished word, not one per key.
    expect(mocks.get.mock.calls.length - calls).toBeLessThanOrEqual(2)
    expect(screen.getByRole('searchbox')).toHaveAttribute('maxlength', '100')
  })

  it('the priority filter applies to the loaded cards and says so while more are waiting', async () => {
    mocks.get.mockResolvedValue(
      payload({ planning: [card({ key: 'task:1', id: 1, title: 'عاجلة', priority: 'high' }), card({ key: 'task:2', id: 2, title: 'عادية', priority: 'low' })] }, { planning: { count: 40, has_more: true } }),
    )
    mount()
    await screen.findByText('عاجلة')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /الأولوية/ }), 'high')

    expect(screen.queryByText('عادية')).toBeNull()
    expect(screen.getByText('عاجلة')).toBeInTheDocument()
    expect(screen.getByTestId('partial-note')).toBeInTheDocument()
  })

  it('«بانتظار التقييم» is a quick view over the loaded cards, counted honestly while more are waiting', async () => {
    mocks.get.mockResolvedValue(
      payload(
        { review: [card({ key: 'task:1', id: 1, title: 'للتقييم', column: 'review', status: 'needs_evaluation' })], planning: [card({ key: 'task:2', id: 2, title: 'عادية' })] },
        { planning: { count: 10, has_more: true } },
      ),
    )
    mount()
    await screen.findByText('للتقييم')

    expect(screen.getByTestId('quick-count-pending_eval')).toHaveTextContent('1+')
    await userEvent.click(screen.getByRole('button', { name: /بانتظار التقييم/ }))
    expect(screen.queryByText('عادية')).toBeNull()
    expect(screen.getByText('للتقييم')).toBeInTheDocument()
  })

  it('the refresh button is a QUIET refresh: when the read fails the cards stay on screen, with the error shown', async () => {
    mocks.get.mockResolvedValueOnce(payload({ planning: [card()] }))
    mount()
    await screen.findByText('تصميم منشور')
    mocks.get.mockRejectedValueOnce(apiError(500))

    await userEvent.click(screen.getByRole('button', { name: 'تحديث اللوحة' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل لوحة التشغيل')
    expect(screen.getByText('تصميم منشور')).toBeInTheDocument()
    expect(screen.getAllByTestId('work-item')).toHaveLength(1)
  })

  it('the retry of the error banner starts over (an explicit reload), and recovers', async () => {
    mocks.get.mockRejectedValueOnce(apiError(500))
    mocks.get.mockResolvedValueOnce(payload({ planning: [card()] }))
    mount()

    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('تصميم منشور')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('«load more» after a refresh returns NEW rows: the refresh covers whole pages and the next page follows them', async () => {
    const rows = (from: number, n: number) => Array.from({ length: n }, (_, i) => card({ key: `task:${from + i}`, id: from + i, title: `مهمة ${from + i}` }))
    mocks.get.mockImplementation(async (_url: string, { params }: { params: Record<string, number | string> }) => {
      const per = Number(params.per_column)
      const page = Number(params.page ?? 1)
      const start = params.column ? (page - 1) * per : 0
      const n = params.column ? per : per

      return payload({ planning: rows(start + 1, n) }, { planning: { count: 200, has_more: true } }, undefined, params.column ? { column: 'planning', page } : {})
    })
    mount()
    await userEvent.click(await screen.findByTestId('load-more-planning'))
    await waitFor(() => expect(keysIn('قيد المراجعة والتخطيط')).toHaveLength(60))
    expect(lastParams()).toMatchObject({ column: 'planning', page: 2, per_column: 30 })

    // The auto/manual refresh now reads the 60 cards that are open: two whole pages.
    await userEvent.click(screen.getByRole('button', { name: 'تحديث اللوحة' }))
    await waitFor(() => expect(lastParams()).toMatchObject({ per_column: 60 }))
    await waitFor(() => expect(keysIn('قيد المراجعة والتخطيط')).toHaveLength(60))

    await userEvent.click(screen.getByTestId('load-more-planning'))
    await waitFor(() => expect(keysIn('قيد المراجعة والتخطيط')).toHaveLength(90))
    // Page 3, not page 2 again: the rows are new and none repeats.
    expect(lastParams()).toMatchObject({ column: 'planning', page: 3, per_column: 30 })
    expect(new Set(keysIn('قيد المراجعة والتخطيط')).size).toBe(90)
  })

  it("a query change clears the old query's cards at once: «لوحتي» never shows everyone's cards while it loads", async () => {
    mocks.get.mockResolvedValueOnce(payload({ planning: [card({ key: 'task:1', id: 1, title: 'مهمة شخص آخر' })] }))
    mount()
    await screen.findByText('مهمة شخص آخر')
    mocks.get.mockImplementationOnce(() => new Promise(() => {}))

    await userEvent.click(screen.getByRole('button', { name: 'لوحة الأجايل الخاصة بي' }))

    await waitFor(() => expect(screen.queryByText('مهمة شخص آخر')).toBeNull())
    expect(screen.queryAllByTestId('work-item')).toHaveLength(0)
  })

  it('a query change also clears the previous error', async () => {
    mocks.get.mockRejectedValueOnce(apiError(500))
    mount()
    await screen.findByRole('alert')
    mocks.get.mockImplementationOnce(() => new Promise(() => {}))

    await userEvent.click(screen.getByRole('button', { name: 'لوحة الأجايل الخاصة بي' }))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('a «load more» that fails after the query changed says nothing about the new query', async () => {
    let rejectOld!: (e: unknown) => void
    const pendingPage = new Promise((_, rej) => { rejectOld = rej })
    mocks.get.mockResolvedValueOnce(payload({ planning: [card()] }, { planning: { count: 60, has_more: true } }))
    mocks.get.mockReturnValueOnce(pendingPage)
    mount()
    await userEvent.click(await screen.findByTestId('load-more-planning'))
    mocks.get.mockResolvedValue(payload({ planning: [card({ key: 'task:9', id: 9, title: 'الجديدة' })] }))

    await userEvent.click(screen.getByRole('button', { name: 'لوحة الأجايل الخاصة بي' }))
    expect(await screen.findByText('الجديدة')).toBeInTheDocument()
    rejectOld(apiError(500))
    await new Promise((r) => setTimeout(r, 20))

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('الجديدة')).toBeInTheDocument()
  })
})

describe('time and display', () => {
  it('shows a due time in 24 hours (HH:mm), never «ص» / «م»', async () => {
    mocks.get.mockResolvedValue(payload({ planning: [card({ due_at: '2026-11-26T21:28:00Z' }), card({ key: 'task:2', id: 2, due_at: '2026-11-26T09:05:00Z' })] }))
    mount()
    await screen.findAllByTestId('due')

    for (const el of screen.getAllByTestId('due')) {
      expect(el.textContent).toMatch(/\d{2}:\d{2}$/)
      expect(el.textContent).not.toMatch(/\s[صم]$/)
    }
  })

  it('does not call a hidden assignee «unassigned»: a ticket without an assignee shows «—»', async () => {
    mocks.get.mockResolvedValue(payload({ in_progress: [ticketCard(1, { assignee: null, due_at: null, is_overdue: false, capabilities: { ...NO_CAPS } })], planning: [card({ assignee: null })] }))
    mount()
    await screen.findByText('تذكرة 1')

    const text = screen.getAllByTestId('assignee').map((e) => e.textContent)
    expect(text).toContain('المكلّف: —')
    expect(text).toContain('المكلّف: غير مسندة')
  })

  it('works on a narrow screen: one column at a time, each reachable from the tabs', async () => {
    setNarrow(true)
    mocks.get.mockResolvedValue(payload({ in_progress: [card({ column: 'in_progress', title: 'جارية' })] }))
    mount()

    const tabs = await screen.findByRole('tablist', { name: 'حالات مهام وتذاكر اللوحة' })
    expect(within(tabs).getAllByRole('tab')).toHaveLength(8)
    expect(await screen.findByText('جارية')).toBeInTheDocument()
  })

  it('the list view shows the loaded cards with the same masking and the same open rules', async () => {
    mocks.get.mockResolvedValue(
      payload({ in_progress: [ticketCard(1, { capabilities: { ...NO_CAPS, can_open: true } }), ticketCard(2, { masked: true, title: 'تذكرة', reference: null })] }),
    )
    mount()
    await screen.findByText('تذكرة 1')

    await userEvent.click(screen.getByRole('button', { name: 'قائمة' }))

    const rows = await screen.findAllByTestId('work-row')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByRole('link', { name: /فتح التذكرة/ })).toBeInTheDocument()
    expect(within(rows[1]).queryByRole('link')).toBeNull()
    expect(rows[1]).toHaveTextContent('بيانات محجوبة')
  })
})

describe('failures', () => {
  it.each([
    [403, 'لا تملك صلاحية عرض هذه اللوحة'],
    [429, 'طلبات كثيرة في وقت قصير'],
    [422, 'المرشحات غير صالحة'],
    [401, 'انتهت الجلسة'],
    [500, 'تعذّر تحميل لوحة التشغيل'],
  ])('a %s answer is said in Arabic, with a retry, never shown as an empty board', async (status, title) => {
    mocks.get.mockRejectedValue(apiError(status))
    mount()

    expect(await screen.findByRole('alert')).toHaveTextContent(title)
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })
})

describe('the data layer', () => {
  it('normalizes a card defensively: a missing capability is «no», an unknown column drops the card', () => {
    const ok = normalizeWorkBoardCard({ key: 'ticket:3', kind: 'ticket', id: 3, column: 'review', title: 'x', capabilities: { can_open: 'yes' } })
    expect(ok).toMatchObject({ column: 'review', masked: false, capabilities: { can_open: false, can_accept: false, can_reject: false, can_complete: false }, assignee: null, priority: 'medium' })
    expect(normalizeWorkBoardCard({ kind: 'task', id: 1, column: 'nowhere' })).toBeNull()
    expect(normalizeWorkBoardCard({ kind: 'alien', id: 1, column: 'review' })).toBeNull()
    expect(normalizeWorkBoardCard({ kind: 'task', id: 0, column: 'review' })).toBeNull()
  })

  it('keeps masked and null fields as the server sent them', () => {
    const c = normalizeWorkBoardCard({ key: 'ticket:9', kind: 'ticket', id: 9, column: 'pending', title: 'ثابت', masked: true, reference: null, assignee: null, due_at: null, capabilities: { can_open: false } })

    expect(c).toMatchObject({ masked: true, reference: null, assignee: null, due_at: null })
    expect(workBoardCardToItem(c!)).toMatchObject({ masked: true, reference: null, dueAt: null, canOpen: false, assigneeName: '—' })
  })

  it('dedupeBoard keeps the first card of a key; appendColumnPage never repeats and takes the counts of the answer', () => {
    const a = card({ key: 'task:1' })
    const b = card({ key: 'task:2', id: 2 })
    const base = columnsFromRead([{ key: 'planning', label: '', count: 5, counts: { tasks: 5, tickets: 0 }, has_more: true, items: [a] }])
    const next = appendColumnPage(base, { key: 'planning', label: '', count: 5, counts: { tasks: 5, tickets: 0 }, has_more: false, items: [a, b] }, 2)

    expect(next.planning.items.map((i) => i.key)).toEqual(['task:1', 'task:2'])
    expect(next.planning).toMatchObject({ count: 5, hasMore: false, page: 2 })
    // A read that asked for 60 per column covers two pages: the next «load more» is page 3.
    expect(columnsFromRead([{ key: 'planning', label: '', count: 200, counts: { tasks: 200, tickets: 0 }, has_more: true, items: [a] }], 60).planning.page).toBe(2)
    expect(columnsFromRead([{ key: 'planning', label: '', count: 200, counts: { tasks: 200, tickets: 0 }, has_more: true, items: [a] }], 90).planning.page).toBe(3)
    expect(base.planning.page).toBe(1)
    const dup = { ...emptyColumns(), ideas: { ...emptyColumns().ideas, items: [a] }, planning: { ...emptyColumns().planning, items: [a, b] } }
    expect(dedupeBoard(dup).planning.items.map((i) => i.key)).toEqual(['task:2'])
  })

  it('a quiet refresh asks for as many cards as are already open (never shrinks a column), within the server limit', () => {
    const many = columnsFromRead([{ key: 'planning', label: '', count: 200, counts: { tasks: 200, tickets: 0 }, has_more: true, items: Array.from({ length: 60 }, (_, i) => card({ key: `task:${i}`, id: i + 1 })) }])

    expect(refreshSize(emptyColumns(), 30, 100)).toBe(30)
    expect(refreshSize(many, 30, 100)).toBe(60)
    // Always whole pages (so the next page number stays exact), never above the cap (90 = three pages).
    expect(refreshSize(many, 30, 50)).toBe(30)
    const more = columnsFromRead([{ key: 'planning', label: '', count: 400, counts: { tasks: 400, tickets: 0 }, has_more: true, items: Array.from({ length: 61 }, (_, i) => card({ key: `task:${i}`, id: i + 1 })) }])
    expect(refreshSize(more, 30, 90)).toBe(90)
    expect(refreshSize(more, 30, 120)).toBe(90)
    const huge = columnsFromRead([{ key: 'planning', label: '', count: 400, counts: { tasks: 400, tickets: 0 }, has_more: true, items: Array.from({ length: 150 }, (_, i) => card({ key: `task:${i}`, id: i + 1 })) }])
    expect(refreshSize(huge, 30, 90)).toBe(90)
  })

  it('the quick views read fields on the card only', () => {
    expect(matchesQuickView(card({ status: 'needs_evaluation' }), 'pending_eval')).toBe(true)
    expect(matchesQuickView(ticketCard(1, { status: 'needs_evaluation' }), 'pending_eval')).toBe(false)
    expect(matchesQuickView(card({ assignee: null }), 'unassigned')).toBe(true)
    expect(matchesQuickView(ticketCard(1, { assignee: null }), 'unassigned')).toBe(false)
    expect(matchesQuickView(card({ acceptance: 'rejected' }), 'rejected')).toBe(true)
  })
})

describe('management controls only for the roles that can really open a task', () => {
  // What the server answers an old manager: every task action, everywhere (can_edit / can_reassign on the cards too).
  const managerCard = (actions = ALL_ACTIONS) =>
    payload({ review: [card({ key: 'task:2', id: 2, title: 'تنتظر التقييم', column: 'review', status: 'needs_evaluation', capabilities: { ...NO_CAPS, can_open: true, can_edit: actions.can_update, can_reassign: actions.can_assign } })] }, {}, undefined, { task_actions: actions })

  it.each(['admin', 'super_admin', 'tech_admin', 'operations_manager'])('%s gets the quick views and «إسناد مهمة جديدة»', async (role) => {
    mocks.role.current = role
    mocks.get.mockResolvedValue(managerCard())
    mount()
    await screen.findByText('تنتظر التقييم')

    expect(screen.getByRole('button', { name: /بانتظار التقييم/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /إسناد مهمة جديدة/ })).toBeInTheDocument()
  })

  it.each(['executive_admin', 'hr_manager', 'department_manager', 'volunteer', 'instructor'])('%s gets no management control without the grants (the server would refuse to open the task)', async (role) => {
    mocks.role.current = role
    mocks.get.mockResolvedValue(managerCard({ can_create: false, can_assign: false, can_update: false, manageable_department_ids: [] }))
    mount()
    await screen.findByText('تنتظر التقييم')

    expect(screen.queryByRole('button', { name: /بانتظار التقييم/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /إسناد مهمة جديدة/ })).toBeNull()
    expect(screen.queryByTestId('quick-count-pending_eval')).toBeNull()
  })
})

describe('the reassign dialog still gets the decline reason', () => {
  it('shows the member\'s reason, read from the task the drawer loaded (a public card never carries it)', async () => {
    mocks.fetchTask.mockResolvedValue({
      id: 2, title: 'مهمة مرفوضة', department_id: '3', status: 'planning', priority: 'medium', acceptance_status: 'rejected', rejection_reason: 'ظروف شخصية طارئة', comments: [], checklist: [],
    })
    mocks.get.mockResolvedValue(
      payload({ closed: [card({ key: 'task:2', id: 2, title: 'مهمة مرفوضة', column: 'closed', acceptance: 'rejected', capabilities: { ...NO_CAPS, can_open: true, can_reassign: true } })] }),
    )
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'مهمة مرفوضة' }))
    const mgmt = await screen.findByTestId('board-task-management')

    await userEvent.click(within(mgmt).getByRole('button', { name: /إعادة توجيه لعضو آخر/ }))

    expect(await screen.findByText(/ظروف شخصية طارئة/)).toBeInTheDocument()
    // The members of the card's department are read once for this dialog.
    await waitFor(() => expect(mocks.members).toHaveBeenCalledWith(3))
  })
})

describe('masked cards and dates', () => {
  const masked = (over: Partial<WorkBoardCard> = {}) => ticketCard(7, { masked: true, title: 'تذكرة محجوبة', reference: null, is_overdue: true, due_at: '2020-01-01T00:00:00Z', capabilities: { ...NO_CAPS }, ...over })

  it('a masked card is never shown as late, even when the server says it is', async () => {
    mocks.get.mockResolvedValue(payload({ in_progress: [masked()] }))
    mount()
    const item = await screen.findByTestId('work-item')

    expect(within(item).queryByText('متأخرة')).toBeNull()
    expect(item.className).not.toContain('rose')
    expect(workBoardCardToItem(masked())).toMatchObject({ overdue: false, dueAt: null })
  })

  it('a masked card matches neither «بلا موعد» nor «المتأخرة»', async () => {
    mocks.get.mockResolvedValue(payload({ in_progress: [masked(), ticketCard(8, { capabilities: { ...NO_CAPS, can_open: true } })] }))
    mount()
    await screen.findByText('تذكرة 8')
    const due = screen.getByRole('combobox', { name: /الموعد/ })

    await userEvent.selectOptions(due, 'none')
    expect(screen.queryByTestId('masked-heading')).toBeNull()
    expect(screen.getByText('تذكرة 8')).toBeInTheDocument()

    await userEvent.selectOptions(due, 'overdue')
    expect(screen.queryByTestId('masked-heading')).toBeNull()
  })

  it('in the list a masked row says «بيانات محجوبة» once, whether or not the placeholder already says it', async () => {
    mocks.get.mockResolvedValue(payload({ in_progress: [masked({ title: 'بيانات محجوبة' }), masked({ key: 'ticket:9', id: 9, title: 'تذكرة' })] }))
    mount()
    await screen.findAllByTestId('work-item')
    await userEvent.click(screen.getByRole('button', { name: 'قائمة' }))

    const rows = await screen.findAllByTestId('work-row')
    for (const r of rows) expect((r.textContent ?? '').match(/بيانات محجوبة/g)).toHaveLength(1)
    expect(within(rows[0]).getByTestId('masked-row')).toBeInTheDocument()
  })

  it('the list headers are column headers', async () => {
    mocks.get.mockResolvedValue(payload({ planning: [card()] }))
    mount()
    await screen.findByText('تصميم منشور')
    await userEvent.click(screen.getByRole('button', { name: 'قائمة' }))

    expect(await screen.findAllByRole('columnheader')).toHaveLength(7)
    for (const th of screen.getAllByRole('columnheader')) expect(th).toHaveAttribute('scope', 'col')
  })
})

describe('the task drawer', () => {
  it('shows the task of the LAST card pressed, not the slow answer of an earlier one', async () => {
    let finishFirst!: (t: unknown) => void
    const first = new Promise((res) => { finishFirst = res })
    mocks.fetchTask.mockReturnValueOnce(first)
    mocks.fetchTask.mockResolvedValueOnce({ id: 3, title: 'الثانية', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    mocks.get.mockResolvedValue(
      payload({
        planning: [
          card({ key: 'task:2', id: 2, title: 'الأولى', capabilities: { ...NO_CAPS, can_open: true } }),
          card({ key: 'task:3', id: 3, title: 'الثانية', capabilities: { ...NO_CAPS, can_open: true } }),
        ],
      }),
    )
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /الأولى/ }))
    await userEvent.click(screen.getByRole('button', { name: /الثانية/ }))
    expect(await screen.findByRole('heading', { level: 2, name: 'الثانية' })).toBeInTheDocument()

    finishFirst({ id: 2, title: 'الأولى', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    await new Promise((r) => setTimeout(r, 20))

    expect(screen.getByRole('heading', { level: 2, name: 'الثانية' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'الأولى' })).toBeNull()
  })
})

describe('the open drawer follows what management actions change', () => {
  const task = (over: Record<string, unknown> = {}) => ({ id: 2, title: 'مهمة للإدارة', department_id: '3', department_name: 'الإعلام', status: 'planning', priority: 'medium', assignee_name: null, comments: [], checklist: [], ...over })
  const openIt = async () => {
    await userEvent.click(await screen.findByRole('button', { name: /مهمة للإدارة/ }))

    return screen.findByTestId('board-task-management')
  }

  it('after «استلام المهمة لنفسي» the drawer shows the new assignee, not the old «—»', async () => {
    mocks.fetchTask.mockResolvedValueOnce(task()).mockResolvedValue(task({ assignee_name: 'سلمى' }))
    mocks.get.mockResolvedValue(payload({ planning: [card({ key: 'task:2', id: 2, title: 'مهمة للإدارة', assignee: null, capabilities: { ...NO_CAPS, can_open: true } })] }))
    mount()
    const mgmt = await openIt()
    expect(await screen.findByText('المسؤول: —')).toBeInTheDocument()

    await userEvent.click(within(mgmt).getByRole('button', { name: /استلام المهمة لنفسي/ }))

    expect(await screen.findByText('المسؤول: سلمى')).toBeInTheDocument()
    expect(mocks.post).toHaveBeenCalledWith('/admin/tasks/2/claim')
    expect(mocks.fetchTask).toHaveBeenCalledTimes(2)
  })

  it('after the evaluation is done the drawer shows the new status of the task', async () => {
    mocks.fetchTask.mockResolvedValueOnce(task({ status: 'needs_evaluation' })).mockResolvedValue(task({ status: 'completed' }))
    mocks.get.mockResolvedValue(payload({ review: [card({ key: 'task:2', id: 2, title: 'مهمة للإدارة', column: 'review', status: 'needs_evaluation', capabilities: { ...NO_CAPS, can_open: true } })] }))
    mount()
    const mgmt = await openIt()
    const statusSelect = () => within(screen.getByRole('complementary')).getAllByRole('combobox')[0] as HTMLSelectElement
    await waitFor(() => expect(statusSelect().value).toBe('needs_evaluation'))

    await userEvent.click(within(mgmt).getByRole('button', { name: /تقييم واعتماد المهمة/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'إنهاء التقييم' }))

    await waitFor(() => expect(mocks.fetchTask).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(statusSelect().value).toBe('completed'))
  })

  it('a stale re-read can never overwrite a newer answer', async () => {
    let finishOld!: (t: unknown) => void
    const old = new Promise((res) => { finishOld = res })
    mocks.fetchTask.mockResolvedValueOnce(task()).mockReturnValueOnce(old).mockResolvedValueOnce(task({ assignee_name: 'الأحدث' }))
    mocks.get.mockResolvedValue(payload({ planning: [card({ key: 'task:2', id: 2, title: 'مهمة للإدارة', assignee: null, capabilities: { ...NO_CAPS, can_open: true } })] }))
    mount()
    const mgmt = await openIt()

    // Two management actions in a row: two re-reads. The second answers first; the first answers late with older data.
    await userEvent.click(within(mgmt).getByRole('button', { name: /استلام المهمة لنفسي/ }))
    await userEvent.click(within(mgmt).getByRole('button', { name: /قفل المهمة/ }))
    expect(await screen.findByText('المسؤول: الأحدث')).toBeInTheDocument()
    finishOld(task({ assignee_name: 'قديم' }))
    await new Promise((r) => setTimeout(r, 20))

    expect(screen.getByText('المسؤول: الأحدث')).toBeInTheDocument()
    expect(screen.queryByText('المسؤول: قديم')).toBeNull()
  })
})

describe('creating, editing and assigning a task follow what the server says (meta.task_actions + card capabilities)', () => {
  const NOTHING: WorkBoardTaskActions = { can_create: false, can_assign: false, can_update: false, manageable_department_ids: [] }
  const taskCard = (over: Partial<WorkBoardCard> = {}) => card({ key: 'task:2', id: 2, title: 'تقرير الأسبوع', capabilities: { ...NO_CAPS }, ...over })
  const board = (cards: WorkBoardCard[], actions: WorkBoardTaskActions | undefined) =>
    payload({ planning: cards }, {}, undefined, actions === undefined ? { task_actions: undefined } : { task_actions: actions })
  const SCOPED_DEPTS = { items: [{ id: 3, name: 'Media', name_ar: 'الإعلام' }, { id: 5, name: 'Tech', name_ar: 'التقنية' }], manageableDepartmentIds: [3, 5] }
  const editableOf = (over: Record<string, unknown> = {}) => ({
    id: 2, title: 'تقرير الأسبوع', description: 'تفاصيل', notes: null, department_id: 3, section_id: null, assigned_to: { id: 9, name: 'منى' }, priority: 'medium', task_scope: 'medium',
    points: 100, estimated_hours: 2, status: 'planning', start_date: null, due_date: null, due_datetime: null, is_locked: false, capabilities: { can_edit: true, can_reassign: true }, ...over,
  })
  const createButton = () => screen.queryByRole('button', { name: /إسناد مهمة جديدة/ })
  const writeActions = (key: string) => screen.queryAllByTestId('work-item').find((e) => e.getAttribute('data-key') === key)

  it('an hr_manager with no grants sees no «إسناد مهمة جديدة» and no edit / reassign action on any card', async () => {
    mocks.role.current = 'hr_manager'
    mocks.get.mockResolvedValue(board([taskCard()], NOTHING))
    mount()
    await screen.findByText('تقرير الأسبوع')

    expect(createButton()).toBeNull()
    expect(screen.queryByTestId('task-write-actions')).toBeNull()
    expect(screen.queryByRole('button', { name: /تعديل المهمة/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /إسناد/ })).toBeNull()
  })

  it('a board answer WITHOUT task_actions means no permission: not even an operations_manager is shown the button', async () => {
    mocks.role.current = 'operations_manager'
    mocks.get.mockResolvedValue(board([taskCard()], undefined))
    mount()
    await screen.findByText('تقرير الأسبوع')

    expect(createButton()).toBeNull()
  })

  it('the button is absent while the board is loading and when the board could not be read', async () => {
    mocks.role.current = 'admin'
    mocks.get.mockImplementationOnce(() => new Promise(() => {}))
    const first = mount()
    expect(createButton()).toBeNull()
    first.unmount()

    mocks.get.mockRejectedValue(apiError(500))
    mount()
    await screen.findByText('تعذّر تحميل لوحة التشغيل')
    expect(createButton()).toBeNull()
  })

  it('create + assign, no update: the button is there, the form lists only the scoped departments and members, and the task is posted to /admin/tasks with its assignee; cards offer no edit', async () => {
    mocks.role.current = 'hr_manager'
    mocks.scopeDepartments.mockResolvedValue(SCOPED_DEPTS)
    mocks.members.mockResolvedValue([{ id: 21, user_id: 21, name: 'عضو الفريق', role: 'عضو' }])
    mocks.get.mockResolvedValue(board([taskCard({ capabilities: { ...NO_CAPS, can_reassign: true } })], { can_create: true, can_assign: true, can_update: false, manageable_department_ids: [3, 5] }))
    mount()
    await screen.findByText('تقرير الأسبوع')

    // No edit on the card (tasks.update is not held); the reassign the server allowed is there.
    expect(within(writeActions('task:2')!).queryByRole('button', { name: /تعديل المهمة/ })).toBeNull()
    expect(within(writeActions('task:2')!).getByRole('button', { name: /^إعادة إسناد: / })).toBeInTheDocument()

    await userEvent.click(createButton()!)
    const dialog = await screen.findByTestId('task-create-modal')
    const dept = within(dialog).getByLabelText('الإدارة التابعة') as HTMLSelectElement
    await waitFor(() => expect(within(dept).getAllByRole('option').map((o) => o.textContent)).toEqual(['-- اختر الإدارة --', 'الإعلام', 'التقنية']))
    expect(mocks.scopeDepartments).toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText(/عنوان المهمة/), 'مهمة من الموارد')
    await userEvent.selectOptions(dept, '5')
    await waitFor(() => expect(mocks.members).toHaveBeenCalledWith(5))
    await within(dialog).findByRole('option', { name: /عضو الفريق/ })
    await userEvent.selectOptions(within(dialog).getByLabelText('العضو المكلف'), '21')
    await userEvent.click(within(dialog).getByRole('button', { name: /إسناد المهمة الآن/ }))

    await waitFor(() => expect(mocks.post).toHaveBeenCalled())
    const [url, body] = mocks.post.mock.calls.at(-1)!
    expect(url).toBe('/admin/tasks')
    // The form shows the server's reason itself: the global error toast must not add a second one.
    expect(mocks.post.mock.calls.at(-1)![2]).toMatchObject({ skipErrorToast: true })
    expect((body as FormData).get('assigned_to')).toBe('21')
    expect((body as FormData).get('department_id')).toBe('5')
    // The board is re-read afterwards.
    await waitFor(() => expect(mocks.get.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('create without assign: the form hides the assignee fields, explains, and sends no assignee', async () => {
    mocks.role.current = 'hr_manager'
    mocks.scopeDepartments.mockResolvedValue({ items: [{ id: 5, name: 'Tech', name_ar: 'التقنية' }], manageableDepartmentIds: [5] })
    mocks.get.mockResolvedValue(board([], { can_create: true, can_assign: false, can_update: false, manageable_department_ids: [5] }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /إسناد مهمة جديدة/ }))
    const dialog = await screen.findByTestId('task-create-modal')

    expect(within(dialog).queryByLabelText('العضو المكلف')).toBeNull()
    expect(within(dialog).getByTestId('no-assign-note')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText(/عنوان المهمة/), 'مهمة بلا مكلّف')
    await waitFor(() => expect((within(dialog).getByLabelText('الإدارة التابعة') as HTMLSelectElement).value).toBe('5'))
    await userEvent.click(within(dialog).getByRole('button', { name: /إنشاء المهمة الآن/ }))

    await waitFor(() => expect(mocks.post).toHaveBeenCalled())
    const body = mocks.post.mock.calls.at(-1)![1] as FormData
    expect(body.has('assigned_to')).toBe(false)
    expect(body.has('assigned_users[]')).toBe(false)
    expect(mocks.members).not.toHaveBeenCalled()
  })

  it('edit: a card the server marks can_edit offers «تعديل المهمة»; the form is pre-filled from /editable, saves with PATCH, and the board is re-read', async () => {
    mocks.role.current = 'hr_manager'
    mocks.scopeDepartments.mockResolvedValue(SCOPED_DEPTS)
    mocks.editable.mockResolvedValue(editableOf())
    mocks.get.mockResolvedValue(board([taskCard({ capabilities: { ...NO_CAPS, can_edit: true } })], { can_create: false, can_assign: false, can_update: true, manageable_department_ids: [3, 5] }))
    mount()
    await screen.findByText('تقرير الأسبوع')
    // Edit only: no create button, no reassign.
    expect(createButton()).toBeNull()
    expect(within(writeActions('task:2')!).queryByRole('button', { name: /إسناد/ })).toBeNull()

    await userEvent.click(within(writeActions('task:2')!).getByRole('button', { name: /تعديل المهمة/ }))
    expect(await screen.findByDisplayValue('تقرير الأسبوع')).toBeInTheDocument()
    expect(mocks.editable).toHaveBeenCalledWith(2)
    const dialog = screen.getByTestId('task-create-modal')
    // tasks.assign is not held: no assignee field.
    expect(within(dialog).queryByLabelText('العضو المكلف')).toBeNull()

    const reads = mocks.get.mock.calls.length
    await userEvent.clear(within(dialog).getByLabelText(/عنوان المهمة/))
    await userEvent.type(within(dialog).getByLabelText(/عنوان المهمة/), 'تقرير الأسبوع المحدّث')
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ التعديلات' }))

    await waitFor(() => expect(mocks.patch).toHaveBeenCalled())
    const [url, body] = mocks.patch.mock.calls.at(-1)!
    expect(url).toBe('/operations/tasks/2')
    expect(body).toMatchObject({ title: 'تقرير الأسبوع المحدّث', department_id: 3, priority: 'medium' })
    expect(body).not.toHaveProperty('assigned_to')
    await waitFor(() => expect(mocks.get.mock.calls.length).toBeGreaterThan(reads))
    await waitFor(() => expect(screen.queryByTestId('task-create-modal')).toBeNull())
  })

  it('edit: the server\'s Arabic 403 is shown and nothing is refreshed or closed', async () => {
    mocks.role.current = 'hr_manager'
    mocks.scopeDepartments.mockResolvedValue(SCOPED_DEPTS)
    mocks.editable.mockResolvedValue(editableOf())
    mocks.patch.mockRejectedValue(new AxiosError('x', '403', undefined, undefined, { status: 403, statusText: '', headers: {}, config: {} as never, data: { success: false, message: 'هذه المهمة خارج نطاق الإدارات التي تقودها، فلا يمكنك تعديلها.' } }))
    mocks.get.mockResolvedValue(board([taskCard({ capabilities: { ...NO_CAPS, can_edit: true } })], { can_create: false, can_assign: false, can_update: true, manageable_department_ids: [3] }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /تعديل المهمة/ }))
    await screen.findByDisplayValue('تقرير الأسبوع')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    expect(await screen.findByTestId('task-form-error')).toHaveTextContent('هذه المهمة خارج نطاق الإدارات التي تقودها، فلا يمكنك تعديلها.')
    expect(toast.error).toHaveBeenCalledWith('هذه المهمة خارج نطاق الإدارات التي تقودها، فلا يمكنك تعديلها.')
    expect(screen.getByTestId('task-create-modal')).toBeInTheDocument()
  })

  it('update + assign: the edit form also offers the assignee, read from the scoped members, and sends it only when it changed', async () => {
    mocks.role.current = 'hr_manager'
    mocks.scopeDepartments.mockResolvedValue(SCOPED_DEPTS)
    mocks.members.mockResolvedValue([{ id: 9, user_id: 9, name: 'منى', role: 'عضو' }, { id: 21, user_id: 21, name: 'ليلى', role: 'عضو' }])
    mocks.editable.mockResolvedValue(editableOf())
    mocks.get.mockResolvedValue(board([taskCard({ capabilities: { ...NO_CAPS, can_edit: true, can_reassign: true } })], { can_create: false, can_assign: true, can_update: true, manageable_department_ids: [3, 5] }))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /تعديل المهمة/ }))
    const assignee = (await screen.findByLabelText('العضو المكلف')) as HTMLSelectElement
    await waitFor(() => expect(assignee.value).toBe('9'))
    await screen.findByRole('option', { name: /ليلى/ })
    await userEvent.selectOptions(assignee, '21')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ التعديلات' }))

    await waitFor(() => expect(mocks.patch).toHaveBeenCalled())
    expect(mocks.patch.mock.calls.at(-1)![1]).toMatchObject({ assigned_to: 21 })
  })

  it('reassign: offered on the card by capabilities.can_reassign (not by the unassigned / declined heuristic), through the scoped members and POST /admin/tasks/{id}/reassign', async () => {
    mocks.role.current = 'hr_manager'
    mocks.members.mockResolvedValue([{ id: 21, user_id: 21, name: 'ليلى', role: 'عضو' }])
    mocks.get.mockResolvedValue(board([taskCard({ capabilities: { ...NO_CAPS, can_reassign: true } })], { can_create: false, can_assign: true, can_update: false, manageable_department_ids: [3] }))
    mount()
    await screen.findByText('تقرير الأسبوع')
    expect(within(writeActions('task:2')!).queryByRole('button', { name: /تعديل المهمة/ })).toBeNull()

    await userEvent.click(within(writeActions('task:2')!).getByRole('button', { name: /^إعادة إسناد: / }))
    await waitFor(() => expect(mocks.members).toHaveBeenCalledWith(3))
    await userEvent.selectOptions(await screen.findByLabelText(/توجيه المهمة إلى عضو جديد/), '21')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الإسناد للعضو' }))

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/admin/tasks/2/reassign', { assigned_to: 21, notes: undefined }, { skipErrorToast: true }))
  })

  it('a ticket card never offers a task action', async () => {
    mocks.role.current = 'admin'
    mocks.get.mockResolvedValue(payload({ in_progress: [ticketCard(5, { capabilities: { ...NO_CAPS, can_open: true } })] }, {}, undefined, { task_actions: ALL_ACTIONS }))
    mount()
    await screen.findByText('تذكرة 5')

    expect(screen.queryByTestId('task-write-actions')).toBeNull()
  })

  it.each(['admin', 'super_admin', 'tech_admin'])('%s keeps the old drawer actions (lock) and also gets «تعديل المهمة» there when the server says so', async (role) => {
    mocks.role.current = role
    mocks.fetchTask.mockResolvedValue({ id: 2, title: 'تقرير الأسبوع', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    mocks.editable.mockResolvedValue(editableOf())
    mocks.get.mockResolvedValue(board([taskCard({ capabilities: { ...NO_CAPS, can_open: true, can_edit: true, can_reassign: true } })], ALL_ACTIONS))
    mount()
    expect(await screen.findByRole('button', { name: /إسناد مهمة جديدة/ })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'تقرير الأسبوع' }))

    const mgmt = await screen.findByTestId('board-task-management')
    expect(within(mgmt).getByRole('button', { name: /قفل المهمة/ })).toBeInTheDocument()
    expect(within(mgmt).getByRole('button', { name: /إعادة إسناد/ })).toBeInTheDocument()
    await userEvent.click(within(mgmt).getByRole('button', { name: /تعديل المهمة/ }))
    await waitFor(() => expect(mocks.editable).toHaveBeenCalledWith(2))
  })

  it('without can_edit / can_reassign the drawer of a non-manager has no management section at all', async () => {
    mocks.role.current = 'hr_manager'
    mocks.fetchTask.mockResolvedValue({ id: 2, title: 'تقرير الأسبوع', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    mocks.get.mockResolvedValue(board([taskCard({ is_mine: true, capabilities: { ...NO_CAPS, can_open: true } })], NOTHING))
    mocks.fetchMyTask.mockResolvedValue({ id: 2, title: 'تقرير الأسبوع', department_id: '3', status: 'planning', priority: 'medium', comments: [], checklist: [] })
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'تقرير الأسبوع' }))
    await screen.findByRole('heading', { level: 2, name: 'تقرير الأسبوع' })

    expect(screen.queryByTestId('board-task-management')).toBeNull()
  })
})

describe('the data layer of the task actions', () => {
  it('normalises meta.task_actions defensively: a missing or malformed block is «no permission»', () => {
    expect(normalizeTaskActions(undefined)).toEqual({ can_create: false, can_assign: false, can_update: false, manageable_department_ids: [] })
    expect(normalizeTaskActions({ can_create: 'yes', can_assign: 1 })).toEqual({ can_create: false, can_assign: false, can_update: false, manageable_department_ids: [] })
    expect(normalizeTaskActions({ can_create: true, can_assign: false, can_update: true, manageable_department_ids: null })).toEqual({ can_create: true, can_assign: false, can_update: true, manageable_department_ids: null })
    expect(normalizeTaskActions({ can_create: true, manageable_department_ids: ['3', 5, 'x'] }).manageable_department_ids).toEqual([3, 5])
  })

  it('a task card\'s can_edit / can_reassign default to false (a ticket never has them)', () => {
    const c = normalizeWorkBoardCard({ kind: 'task', id: 1, column: 'planning', capabilities: { can_open: true } })!
    expect(c.capabilities.can_edit).toBe(false)
    expect(c.capabilities.can_reassign).toBe(false)
    const e = normalizeWorkBoardCard({ kind: 'task', id: 1, column: 'planning', capabilities: { can_edit: true, can_reassign: true } })!
    expect(e.capabilities).toMatchObject({ can_edit: true, can_reassign: true })
  })
})

describe('an open task form keeps what it was opened with', () => {
  const ACTIONS: WorkBoardTaskActions = { can_create: true, can_assign: true, can_update: false, manageable_department_ids: [5] }
  const boardWith = (actions: WorkBoardTaskActions) => payload({ planning: [card({ key: 'task:2', id: 2, title: 'تقرير الأسبوع' })] }, {}, undefined, { task_actions: actions })
  const refreshButton = () => screen.getByLabelText('تحديث اللوحة')

  async function openCreate() {
    mocks.role.current = 'hr_manager'
    mocks.scopeDepartments.mockResolvedValue({ items: [{ id: 5, name: 'Tech', name_ar: 'التقنية' }], manageableDepartmentIds: [5] })
    mocks.members.mockResolvedValue([{ id: 21, user_id: 21, name: 'ليلى', role: 'عضو' }])
    mocks.get.mockResolvedValue(boardWith(ACTIONS))
    mount()
    await userEvent.click(await screen.findByRole('button', { name: /إسناد مهمة جديدة/ }))

    return screen.findByTestId('task-create-modal')
  }

  it('a refresh that FAILS while the form is open keeps the create button, the assignee controls and the assignee in the payload', async () => {
    const dialog = await openCreate()
    await within(dialog).findByLabelText('العضو المكلف')
    await userEvent.type(within(dialog).getByLabelText(/عنوان المهمة/), 'مهمة مع مكلّف')
    await screen.findByRole('option', { name: /ليلى/ })

    mocks.get.mockRejectedValueOnce(apiError(500))
    fireEvent.click(refreshButton())
    await screen.findByText('تعذّر تحميل لوحة التشغيل')

    // The read failed, the permission did not change: nothing is switched off under the user.
    expect(screen.getByRole('button', { name: /إسناد مهمة جديدة/ })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('العضو المكلف')).toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('العضو المكلف'), '21')
    await userEvent.click(within(dialog).getByRole('button', { name: /إسناد المهمة الآن/ }))

    await waitFor(() => expect(mocks.post).toHaveBeenCalled())
    expect((mocks.post.mock.calls.at(-1)![1] as FormData).get('assigned_to')).toBe('21')
  })

  it('a refresh that answers «no assign» while the form is open does not change the open form; the next opening follows the new answer', async () => {
    const dialog = await openCreate()
    await within(dialog).findByLabelText('العضو المكلف')

    mocks.get.mockResolvedValueOnce(boardWith({ ...ACTIONS, can_assign: false }))
    fireEvent.click(refreshButton())
    await waitFor(() => expect(mocks.get.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(within(dialog).getByLabelText('العضو المكلف')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }))
    await waitFor(() => expect(screen.queryByTestId('task-create-modal')).toBeNull())
    await userEvent.click(screen.getByRole('button', { name: /إسناد مهمة جديدة/ }))
    const reopened = await screen.findByTestId('task-create-modal')
    expect(within(reopened).queryByLabelText('العضو المكلف')).toBeNull()
    expect(within(reopened).getByTestId('no-assign-note')).toBeInTheDocument()
  })

  it('the very first read failing means no permission (no button), and a failed LATER read keeps the last good answer', async () => {
    mocks.role.current = 'hr_manager'
    mocks.get.mockResolvedValue(boardWith(ACTIONS))
    mount()
    expect(await screen.findByRole('button', { name: /إسناد مهمة جديدة/ })).toBeInTheDocument()
    mocks.get.mockRejectedValueOnce(apiError(500))
    fireEvent.click(refreshButton())
    await screen.findByText('تعذّر تحميل لوحة التشغيل')
    expect(screen.getByRole('button', { name: /إسناد مهمة جديدة/ })).toBeInTheDocument()
  })
})

describe('the card\'s task buttons', () => {
  const item = (over: Partial<WorkBoardCard> = {}) => workBoardCardToItem(card({ capabilities: { ...NO_CAPS, can_edit: true, can_reassign: true }, ...over }))
  const show = (it: ReturnType<typeof item>, busy = false) =>
    render(<MemoryRouter><WorkItemCard item={it} busy={busy} onEdit={vi.fn()} onReassign={vi.fn()} /></MemoryRouter>)

  it('their accessible names START with the visible text (label in name), for an assigned and an unassigned task', () => {
    const first = show(item())
    expect(screen.getByRole('button', { name: /^تعديل المهمة: / })).toHaveTextContent('تعديل المهمة')
    expect(screen.getByRole('button', { name: /^إعادة إسناد: / })).toHaveTextContent('إعادة إسناد')
    first.unmount()

    show(item({ assignee: null }))
    expect(screen.getByRole('button', { name: /^إسناد لعضو: / })).toHaveTextContent('إسناد لعضو')
  })

  it('are disabled while the card is busy', () => {
    show(item(), true)
    expect(screen.getByRole('button', { name: /^تعديل المهمة: / })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^إعادة إسناد: / })).toBeDisabled()
  })
})
