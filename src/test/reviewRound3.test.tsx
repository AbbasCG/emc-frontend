import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { BoardTask } from '@/api/operationsBoardApi'
import type { OpsTask } from '@/types/operations'

const api = vi.hoisted(() => ({
  createAdvancedBoardTask: vi.fn(),
  fetchWorkspaceDepartments: vi.fn(),
  fetchDepartmentMembers: vi.fn(),
  scopeDepartments: vi.fn(),
  reassignTask: vi.fn(),
  rejectTask: vi.fn(),
  fetchTasks: vi.fn(),
}))
vi.mock('@/api/operationsBoardApi', () => ({
  createAdvancedBoardTask: api.createAdvancedBoardTask,
  reassignTask: api.reassignTask,
  rejectTask: api.rejectTask,
  evaluateTask: vi.fn(),
}))
vi.mock('@/api/operationsApi', () => ({ fetchWorkspaceDepartments: api.fetchWorkspaceDepartments }))
vi.mock('@/api/operationsReportsApi', () => ({ fetchDepartmentMembers: api.fetchDepartmentMembers }))
// The create / reassign forms read the departments and members of the viewer's write scope (same fixtures as before).
vi.mock('@/api/taskScopeApi', () => ({ fetchTaskScopeDepartments: api.scopeDepartments, fetchTaskScopeMembers: api.fetchDepartmentMembers, fetchEditableTask: vi.fn(), updateTaskFields: vi.fn() }))
vi.mock('@/api/tasksApi', () => ({ fetchTasks: api.fetchTasks, fetchMyTasks: vi.fn(), fetchTask: vi.fn(), updateTask: vi.fn(), addTaskComment: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'مدير' } }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

import TaskCreateModal from '@/components/operations/TaskCreateModal'
import TaskReassignModal from '@/components/operations/TaskReassignModal'
import TaskRejectModal from '@/components/operations/TaskRejectModal'
import TaskEvaluationModal from '@/components/operations/TaskEvaluationModal'
import OpsTasksListPage from '@/pages/operations/admin/OpsTasksListPage'
import StatusBoard from '@/components/ui/StatusBoard'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { hideOwnedParents, taskToWorkItem } from '@/lib/myWork'
import { dueMs, formatDue, normalizeDateOnly } from '@/lib/dueDate'
import { groupParentsUnknown, isGroupTask, subtaskCount } from '@/lib/opsTaskKinds'
import { validatePointsForScope, validateEstimate, emptyEstimate } from '@/lib/taskEstimate'
import { isSidebarItemActive } from '@/layouts/dashboardSidebar'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchWorkspaceDepartments.mockResolvedValue({ items: [{ id: '3', title: 'الإعلام' }] })
  api.fetchDepartmentMembers.mockResolvedValue([{ id: 9, user_id: 9, name: 'سلمى', role: 'member' }])
  api.scopeDepartments.mockResolvedValue({ items: [{ id: 3, name: 'Media', name_ar: 'الإعلام' }], manageableDepartmentIds: null })
  api.createAdvancedBoardTask.mockResolvedValue({})
  api.reassignTask.mockResolvedValue(undefined)
})

const ops = (over: Partial<OpsTask>): OpsTask => ({ id: 1, title: 'مهمة', department_id: '3', status: 'planning', priority: 'medium', ...over })
const board = (id: number, title: string) => ({ id, title, description: null, priority: 'medium', status: 'needs_evaluation', locked_at: null, locked_by: null, due_date: null, points: 100, estimated_hours: 2, task_scope: 'medium', department: { id: 1, name: 'الإعلام' }, assigned_to: { id: 7, name: 'خالد' } }) as unknown as BoardTask

describe('1. an emptied duration is never sent as the text "undefined"', () => {
  it('clearing the pre-filled hours and saving sends no estimated_hours at all', async () => {
    render(<TaskCreateModal open canAssign onClose={vi.fn()} onCreated={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة')
    await userEvent.clear(screen.getByLabelText('المدة التقريبية'))
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    await waitFor(() => expect(api.createAdvancedBoardTask).toHaveBeenCalled())
    const form = api.createAdvancedBoardTask.mock.calls[0][0] as FormData
    expect(form.has('estimated_hours')).toBe(false)
    expect(form.get('estimated_hours')).not.toBe('undefined')
  })
})

describe('6. always-mounted modals do not keep the previous task\'s input', () => {
  it('the create form is blank again after a successful save and when it is closed and reopened', async () => {
    const { rerender } = render(<TaskCreateModal open canAssign onClose={vi.fn()} onCreated={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مهمة أولى')
    await userEvent.click(screen.getByRole('button', { name: /إسناد المهمة الآن/ }))
    await waitFor(() => expect(api.createAdvancedBoardTask).toHaveBeenCalled())
    await waitFor(() => expect((screen.getByLabelText(/عنوان المهمة/) as HTMLInputElement).value).toBe(''))

    await userEvent.type(screen.getByLabelText(/عنوان المهمة/), 'مسودة')
    rerender(<TaskCreateModal open={false} canAssign onClose={vi.fn()} onCreated={vi.fn()} />)
    rerender(<TaskCreateModal open canAssign onClose={vi.fn()} onCreated={vi.fn()} />)
    expect((screen.getByLabelText(/عنوان المهمة/) as HTMLInputElement).value).toBe('')
  })

  it('reassigning task A then task B starts blank for B', async () => {
    const { rerender } = render(<TaskReassignModal task={board(1, 'أ')} open onClose={vi.fn()} onReassigned={vi.fn()} />)
    await userEvent.selectOptions(await screen.findByLabelText(/توجيه المهمة إلى عضو جديد/), '9')
    await userEvent.type(screen.getByLabelText(/ملاحظات أو تعديلات/), 'ملاحظة أ')
    rerender(<TaskReassignModal task={board(2, 'ب')} open onClose={vi.fn()} onReassigned={vi.fn()} />)
    expect((await screen.findByLabelText(/توجيه المهمة إلى عضو جديد/) as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText(/ملاحظات أو تعديلات/) as HTMLTextAreaElement).value).toBe('')
  })

  it('the decline reason typed for task A is gone for task B', async () => {
    const { rerender } = render(<TaskRejectModal task={{ id: 1, title: 'أ' }} open onClose={vi.fn()} onRejected={vi.fn()} />)
    await userEvent.type(await screen.findByRole('textbox'), 'سبب أ')
    rerender(<TaskRejectModal task={{ id: 2, title: 'ب' }} open onClose={vi.fn()} onRejected={vi.fn()} />)
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('')
  })

  it('the evaluation of task A does not leak its feedback into task B', async () => {
    const { rerender } = render(<TaskEvaluationModal task={board(1, 'أ')} open onClose={vi.fn()} onEvaluated={vi.fn()} />)
    await userEvent.type(await screen.findByPlaceholderText(/كلمة شكر/), 'ممتاز')
    rerender(<TaskEvaluationModal task={board(2, 'ب')} open onClose={vi.fn()} onEvaluated={vi.fn()} />)
    expect((screen.getByPlaceholderText(/كلمة شكر/) as HTMLTextAreaElement).value).toBe('')
  })
})

describe('2. a member never gets two cards for one collective task', () => {
  it('hides the parent when the same person owns one of its copies', () => {
    const parent = ops({ id: 50, assignee_id: 7 })
    const copy = ops({ id: 51, assignee_id: 7, parent_task_id: 50 })
    const other = ops({ id: 52, assignee_id: 8, parent_task_id: 50 })
    expect(hideOwnedParents([parent, copy]).map((t) => t.id)).toEqual([51])
    // a copy that belongs to someone else does not hide MY parent
    expect(hideOwnedParents([parent, other]).map((t) => t.id)).toEqual([50, 52])
  })

  it('also from loaded subtasks', () => {
    const parent = ops({ id: 50, assignee_id: 7, subtasks: [ops({ id: 51, assignee_id: 7, parent_task_id: 50 })] })
    expect(hideOwnedParents([parent])).toEqual([])
  })
})

describe('4. dates as the server really serializes them', () => {
  it('a date cast (midnight UTC) is a plain local day, due at the END of it', () => {
    expect(normalizeDateOnly('2026-11-30T00:00:00.000000Z')).toBe('2026-11-30')
    expect(normalizeDateOnly('2026-11-30T21:30:00.000000Z')).toBe('2026-11-30T21:30:00.000000Z')
    const endOfDay = new Date(2026, 10, 30, 23, 59, 59).getTime()
    expect(dueMs('2026-11-30T00:00:00.000000Z')).toBe(endOfDay)
    const task = ops({ due_at: '2026-11-30T00:00:00.000000Z', assignee_id: 7 })
    const noon = new Date(2026, 10, 30, 12, 0, 0).getTime()
    expect(taskToWorkItem(task, { name: 'x' }, noon).overdue).toBe(false)
    expect(taskToWorkItem(task, { name: 'x' }, endOfDay + 2000).overdue).toBe(true)
  })

  it('formatDue shows the day in the local calendar, never the raw text', () => {
    expect(formatDue('2026-11-30T00:00:00.000000Z')).toBe(formatDue('2026-11-30'))
    expect(formatDue('2026-11-30')).not.toContain('T00')
    expect(formatDue(null)).toBe('—')
  })
})

describe('9. group tasks', () => {
  it('counts copies from subtasks_count, else from loaded subtasks, and recognizes a copy by its parent', () => {
    expect(isGroupTask(ops({ subtasks_count: 3 }))).toBe(true)
    expect(subtaskCount(ops({ subtasks_count: 0, subtasks: [ops({ id: 2 })] }))).toBe(0)
    expect(isGroupTask(ops({ subtasks: [ops({ id: 2 })] }))).toBe(true)
    expect(isGroupTask(ops({ parent_task_id: 9 }))).toBe(true)
    expect(isGroupTask(ops({}))).toBe(false)
  })

  it('says when the server gave no way to recognize a parent', () => {
    expect(groupParentsUnknown([ops({ id: 1 }), ops({ id: 2, parent_task_id: 1 })])).toBe(true)
    expect(groupParentsUnknown([ops({ id: 1, subtasks_count: 2 })])).toBe(false)
    expect(groupParentsUnknown([])).toBe(false)
  })

  it('the filter explains itself instead of silently showing nothing', async () => {
    api.fetchTasks.mockResolvedValue([ops({ id: 1, title: 'أم' }), ops({ id: 2, title: 'نسخة', parent_task_id: 1 })])
    render(<MemoryRouter><OpsTasksListPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'المهام الجماعية' }))
    expect(screen.getByTestId('group-filter-note')).toBeInTheDocument()
    expect(screen.getByText('نسخة')).toBeInTheDocument()
    expect(screen.queryByText('أم')).not.toBeInTheDocument()
  })

  it('with subtasks_count the parent is listed and no note is shown', async () => {
    api.fetchTasks.mockResolvedValue([ops({ id: 1, title: 'أم', subtasks_count: 2 }), ops({ id: 2, title: 'نسخة', parent_task_id: 1, subtasks_count: 0 })])
    render(<MemoryRouter><OpsTasksListPage /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'المهام الجماعية' }))
    expect(screen.queryByTestId('group-filter-note')).not.toBeInTheDocument()
    expect(screen.getByText('أم')).toBeInTheDocument()
  })
})

describe('10. points must be whole numbers', () => {
  it('refuses 30.5 with the Arabic message', () => {
    expect(validatePointsForScope('simple', 30.5, false)).toBe('النقاط يجب أن تكون عدداً صحيحاً')
    expect(validatePointsForScope('simple', 30, false)).toBeNull()
    expect(validateEstimate({ ...emptyEstimate(), scope: 'simple', points: '30.5' }, { required: true }).task_points).toBe('النقاط يجب أن تكون عدداً صحيحاً')
  })
})

describe('11. dialog focus and the cancel button', () => {
  it('focus starts on the first field of the body, not the close button', async () => {
    render(<TaskCreateModal open canAssign onClose={vi.fn()} onCreated={vi.fn()} />)
    const title = await screen.findByLabelText(/عنوان المهمة/)
    expect(document.activeElement).toBe(title)
  })

  it('the footer «إلغاء» asks before throwing away input, exactly like Escape', async () => {
    const onClose = vi.fn()
    render(<TaskCreateModal open canAssign onClose={onClose} onCreated={vi.fn()} />)
    await userEvent.type(await screen.findByLabelText(/عنوان المهمة/), 'مسودة')
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByText('تجاهل التغييرات؟')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'تجاهل وإغلاق' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('with nothing typed, «إلغاء» closes at once', async () => {
    const onClose = vi.fn()
    render(<TaskCreateModal open canAssign onClose={onClose} onCreated={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'إلغاء' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('a function footer receives the modal\'s own close request', async () => {
    const onClose = vi.fn()
    render(
      <CenteredModal open onClose={onClose} title="ت" footer={(close) => <button type="button" onClick={close}>أغلق</button>}>
        <input aria-label="حقل" />
      </CenteredModal>,
    )
    expect(document.activeElement).toBe(await screen.findByLabelText('حقل'))
    await userEvent.click(screen.getByRole('button', { name: 'أغلق' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('12. StatusBoard on narrow screens', () => {
  const narrow = () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('max-width: 768px'), media: q, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
  }
  const cols = (aCount: number) => [
    { key: 'a', label: 'الأولى', count: aCount, children: <p>عنصر أ</p> },
    { key: 'b', label: 'الثانية', count: 1, children: <p>عنصر ب</p> },
    { key: 'c', label: 'الثالثة', count: 0, children: null },
  ]

  it('does not jump to another column when the default tab empties', () => {
    narrow()
    const { rerender } = render(<StatusBoard ariaLabel="ل" columns={cols(1)} />)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('عنصر أ')
    rerender(<StatusBoard ariaLabel="ل" columns={cols(0)} />)
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).not.toHaveTextContent('عنصر ب')
  })

  it('aria-controls points at a panel that exists, and only on the selected tab', () => {
    narrow()
    render(<StatusBoard ariaLabel="ل" columns={cols(1)} />)
    const tabs = screen.getAllByRole('tab')
    const controlled = tabs.filter((t) => t.hasAttribute('aria-controls'))
    expect(controlled).toHaveLength(1)
    expect(document.getElementById(controlled[0].getAttribute('aria-controls') as string)).toBe(screen.getByRole('tabpanel'))
  })

  it('Home and End jump to the first and last status', async () => {
    narrow()
    render(<StatusBoard ariaLabel="ل" columns={cols(1)} />)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await userEvent.keyboard('{End}')
    expect(screen.getAllByRole('tab')[2]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Home}')
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')
  })
})

describe('13. sidebar trailing slash', () => {
  it('/dashboard/admin/tasks/ is the same page as /dashboard/admin/tasks, and /my/ the same as /my', () => {
    expect(isSidebarItemActive('/dashboard/admin/tasks/my/', '/dashboard/admin/tasks/my')).toBe(true)
    expect(isSidebarItemActive('/dashboard/admin/tasks/my/', '/dashboard/admin/tasks')).toBe(false)
    expect(isSidebarItemActive('/dashboard/admin/tasks/', '/dashboard/admin/tasks')).toBe(true)
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })
})
