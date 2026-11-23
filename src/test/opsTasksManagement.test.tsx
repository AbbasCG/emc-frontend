import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { OpsTask } from '@/types/operations'
import { isSafeTicketOrigin } from '@/utils/ticketNavigation'

const api = vi.hoisted(() => ({ fetchTasks: vi.fn(), fetchMyTasks: vi.fn(), fetchTask: vi.fn(), fetchWorkspaceDepartments: vi.fn(), rejectTask: vi.fn() }))
vi.mock('@/api/tasksApi', () => ({ fetchTasks: api.fetchTasks, fetchMyTasks: api.fetchMyTasks, fetchTask: api.fetchTask, updateTask: vi.fn(), addTaskComment: vi.fn() }))
vi.mock('@/api/operationsApi', () => ({ fetchWorkspaceDepartments: api.fetchWorkspaceDepartments }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'مدير' } }) }))
vi.mock('@/services/ticketService', () => ({ ticketService: { rejectTask: api.rejectTask } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

import OpsTasksListPage from '@/pages/operations/admin/OpsTasksListPage'
import OpsTasksKanbanPage from '@/pages/operations/admin/OpsTasksKanbanPage'
import OpsTasksOverduePage from '@/pages/operations/admin/OpsTasksOverduePage'
import OpsTaskTabs from '@/components/operations/OpsTaskTabs'
import { RejectTaskModal } from '@/components/tickets/modals/RejectTaskModal'

const task = (over: Partial<OpsTask>): OpsTask => ({ id: 1, title: 'مهمة', department_id: '3', department_name: 'الإعلام', status: 'planning', priority: 'medium', assignee_id: 7, assignee_name: 'سلمى', ...over })

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchWorkspaceDepartments.mockResolvedValue({ items: [{ id: '3', title: 'الإعلام' }] })
})

const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('«إدارة المهام» (management)', () => {
  it('the tabs are only the management views; «مهامي» is not one of them', () => {
    mount(<OpsTaskTabs />)
    const nav = screen.getByRole('navigation', { name: 'عروض إدارة المهام' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['قائمة', 'كانبان', 'المتأخرة'])
    expect(nav.querySelector('a[href="/dashboard/admin/tasks/my"]')).toBeNull()
  })

  it('the list page is titled «إدارة المهام» and filters unassigned and group tasks', async () => {
    api.fetchTasks.mockResolvedValue([
      task({ id: 1, title: 'مسندة', assignee_id: 7 }),
      task({ id: 2, title: 'بلا مسؤول', assignee_id: null, assignee_name: null }),
      task({ id: 3, title: 'نسخة جماعية', parent_task_id: 9 }),
    ])
    mount(<OpsTasksListPage />)
    expect(await screen.findByRole('heading', { level: 1, name: 'إدارة المهام' })).toBeInTheDocument()
    expect(api.fetchTasks).toHaveBeenCalledWith(undefined)

    await userEvent.click(screen.getByRole('button', { name: 'غير المسندة' }))
    expect(screen.getByText('بلا مسؤول')).toBeInTheDocument()
    expect(screen.queryByText('مسندة')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'المهام الجماعية' }))
    expect(screen.getByText('نسخة جماعية')).toBeInTheDocument()
    expect(screen.queryByText('بلا مسؤول')).not.toBeInTheDocument()
  })

  it('a failed list is an error with a retry, not an empty list', async () => {
    api.fetchTasks.mockRejectedValueOnce(new Error('down')).mockResolvedValue([task({ title: 'وصلت' })])
    mount(<OpsTasksListPage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل المهام')
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('وصلت')).toBeInTheDocument()
  })

  it('the kanban and the overdue page also report a failure', async () => {
    api.fetchTasks.mockRejectedValue(new Error('down'))
    const first = mount(<OpsTasksKanbanPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل لوحة المهام')
    first.unmount()
    mount(<OpsTasksOverduePage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل المهام المتأخرة')
  })

  it('the kanban shows all nine real status columns', async () => {
    api.fetchTasks.mockResolvedValue([task({ id: 1, status: 'needs_evaluation' })])
    mount(<OpsTasksKanbanPage />)
    expect(await screen.findByRole('heading', { level: 1, name: /إدارة المهام/ })).toBeInTheDocument()
    expect(screen.getAllByRole('region')).toHaveLength(9)
    expect(screen.getByRole('region', { name: 'بحاجة لتقييم: 1' })).toBeInTheDocument()
  })
})

describe('ticket page back-link from «مهامي ومسؤولياتي»', () => {
  it('is a safe origin, and only that exact page outside /dashboard/tickets', () => {
    expect(isSafeTicketOrigin('/dashboard/admin/tasks/my')).toBe(true)
    expect(isSafeTicketOrigin('/dashboard/admin/tasks/my?x=1')).toBe(true)
    expect(isSafeTicketOrigin('/dashboard/admin/tasks')).toBe(false)
    expect(isSafeTicketOrigin('/dashboard/admin/tasks/myevil')).toBe(false)
  })
})

describe('the ticket decline reason', () => {
  it('is capped at 1000 characters, with a counter', async () => {
    render(<RejectTaskModal ticketId={4} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const box = await screen.findByRole('textbox')
    expect(box).toHaveAttribute('maxlength', '1000')
    await userEvent.type(box, 'سبب')
    expect(screen.getByTestId('reason-counter')).toHaveTextContent('3 / 1000')
  })
})
