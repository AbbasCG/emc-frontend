import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BoardTask } from '@/api/operationsBoardApi'

vi.mock('@/api/operationsBoardApi', async (orig) => ({ ...(await orig<typeof import('@/api/operationsBoardApi')>()), reassignTask: vi.fn().mockResolvedValue(undefined), evaluateTask: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/api/taskScopeApi', () => ({ fetchTaskScopeMembers: vi.fn().mockResolvedValue([{ id: 9, user_id: 9, name: 'سلمى', role: 'member' }]) }))
vi.mock('@/services/ticketService', () => ({ ticketService: { completeTask: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

import TaskReassignModal from '@/components/operations/TaskReassignModal'
import TaskEvaluationModal from '@/components/operations/TaskEvaluationModal'
import { CompleteTaskModal } from '@/components/tickets/modals/CompleteTaskModal'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const task = {
  id: 3, title: 'تصميم منشور', description: null, priority: 'medium', status: 'needs_evaluation', locked_at: null, locked_by: null, due_date: null,
  points: 100, estimated_hours: 2, task_scope: 'medium', rejection_reason: 'تعارض مواعيد', department: { id: 1, name: 'الإعلام' }, assigned_to: { id: 7, name: 'خالد' },
} as unknown as BoardTask

function expectPinned(testId: string, confirm: RegExp | string) {
  const dialog = screen.getByTestId(testId)
  const scrollers = dialog.querySelectorAll('.overflow-y-auto')
  expect(scrollers).toHaveLength(1)
  const footer = within(dialog).getByRole('button', { name: confirm }).closest('footer')
  expect(footer).not.toBeNull()
  expect(scrollers[0].contains(footer)).toBe(false)
  expect(within(footer as HTMLElement).getByRole('button', { name: 'إلغاء' })).toBeInTheDocument()
}

describe('the task dialogs reached from the boards use the shared modal', () => {
  it('reassign: one scroll area, pinned footer, shows the previous decline reason, Escape closes', async () => {
    const onClose = vi.fn()
    render(<TaskReassignModal task={task} open onClose={onClose} onReassigned={vi.fn()} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expectPinned('task-reassign-modal', 'تأكيد الإسناد للعضو')
    expect(screen.getByText(/تعارض مواعيد/)).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('evaluate: one scroll area (the old one had two), pinned footer', async () => {
    render(<TaskEvaluationModal task={task} open onClose={vi.fn()} onEvaluated={vi.fn()} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expectPinned('task-evaluation-modal', 'حفظ التقييم والاعتماد')
    expect(screen.getByText(/المكلف: خالد/)).toBeInTheDocument()
  })

  it('complete (ticket): one scroll area, pinned footer, still needs the written resolution', async () => {
    render(<CompleteTaskModal ticketId={4} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByRole('dialog', { name: 'تقديم للمراجعة' })).toBeInTheDocument()
    expectPinned('complete-task-modal', /تأكيد التقديم للمراجعة/)
  })
})

describe('the reassign dialog says what a reassignment does, and never offers stale members', () => {
  const held = { ...task, rejection_reason: null, acceptance_status: 'accepted' } as unknown as BoardTask

  it('a task somebody already holds shows a short confirmation text; a declined or an unassigned one does not', async () => {
    const view = render(<TaskReassignModal task={held} open onClose={vi.fn()} onReassigned={vi.fn()} />)
    expect(await screen.findByTestId('reassign-confirm-note')).toHaveTextContent('مسندة حاليًا إلى خالد')
    expect(screen.getByTestId('reassign-confirm-note')).toHaveTextContent('بانتظار الموافقة')
    view.unmount()

    const declined = render(<TaskReassignModal task={{ ...held, acceptance_status: 'rejected', rejection_reason: 'تعارض' } as BoardTask} open onClose={vi.fn()} onReassigned={vi.fn()} />)
    await screen.findByRole('dialog')
    expect(screen.queryByTestId('reassign-confirm-note')).toBeNull()
    declined.unmount()

    render(<TaskReassignModal task={{ ...held, assigned_to: null } as BoardTask} open onClose={vi.fn()} onReassigned={vi.fn()} />)
    await screen.findByRole('dialog')
    expect(screen.queryByTestId('reassign-confirm-note')).toBeNull()
  })

  it('going from a task with a department to a task without one empties the member list', async () => {
    const { rerender } = render(<TaskReassignModal task={held} open onClose={vi.fn()} onReassigned={vi.fn()} />)
    const select = (await screen.findByLabelText(/توجيه المهمة إلى عضو جديد/)) as HTMLSelectElement
    await screen.findByRole('option', { name: /سلمى/ })
    expect(select.options.length).toBeGreaterThan(1)

    rerender(<TaskReassignModal task={{ ...held, id: 99, department: null } as BoardTask} open onClose={vi.fn()} onReassigned={vi.fn()} />)
    const next = (await screen.findByLabelText(/توجيه المهمة إلى عضو جديد/)) as HTMLSelectElement
    expect(within(next).queryByRole('option', { name: /سلمى/ })).toBeNull()
    expect(next.options).toHaveLength(1)
  })
})
