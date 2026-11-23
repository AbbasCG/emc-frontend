import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { AxiosError } from 'axios'
import type { OpsTask } from '@/types/operations'
import type { Ticket, TicketCapabilities } from '@/types/ticket'

const svc = vi.hoisted(() => ({ acceptTask: vi.fn(), getMeta: vi.fn(), completeTask: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: toast }))

import CommentThread from '@/components/operations/CommentThread'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { CompleteTaskModal } from '@/components/tickets/modals/CompleteTaskModal'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import { formatDateTime } from '@/components/tickets/ops/ticketOpsUi'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  svc.getMeta.mockResolvedValue({ tech_units: [], users: [] })
})

describe('1. comment dates are local Arabic dates, not raw ISO', () => {
  it('formats the server\'s UTC timestamp through the project helper', () => {
    const iso = '2026-11-23T01:04:47.000000Z'
    render(<CommentThread comments={[{ id: 1, author_name: 'مدير', body: 'تعليق', created_at: iso }]} onAdd={vi.fn()} />)
    expect(screen.getByText(formatDateTime(iso))).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('2026-11-23T01')
    expect(document.body.textContent).not.toContain('.000000Z')
  })

  it('a comment with no date shows no date text', () => {
    render(<CommentThread comments={[{ id: 1, author_name: 'مدير', body: 'تعليق', created_at: '' }]} onAdd={vi.fn()} />)
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })
})

const task: OpsTask = { id: 12, title: 'تصميم منشور', department_id: '3', status: 'planning', priority: 'medium', acceptance_status: 'accepted' }

function Harness({ withDialog = false }: { withDialog?: boolean }) {
  const [open, setOpen] = useState(false)
  const [dialog, setDialog] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>فتح البطاقة</button>
      <TaskDetailPanel task={task} open={open} onClose={() => setOpen(false)} onPatch={async () => {}} onToggleChecklist={async () => {}} onComment={async () => {}} />
      {withDialog && open ? <button type="button" onClick={() => setDialog(true)}>افتح نافذة</button> : null}
      <CenteredModal open={dialog} onClose={() => setDialog(false)} title="نافذة فوق المهمة"><button type="button">داخل</button></CenteredModal>
    </div>
  )
}

describe('2. Escape closes the task drawer', () => {
  it('closes it, and focus returns to the control that opened it', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'فتح البطاقة' })
    await userEvent.click(opener)
    const drawer = await screen.findByRole('complementary')
    expect(drawer.contains(document.activeElement)).toBe(true)

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(opener)
  })

  it('while a dialog is open above it, Escape closes only that dialog, then the drawer', async () => {
    render(<Harness withDialog />)
    await userEvent.click(screen.getByRole('button', { name: 'فتح البطاقة' }))
    await userEvent.click(await screen.findByRole('button', { name: 'افتح نافذة' }))
    expect(await screen.findByRole('dialog', { name: 'نافذة فوق المهمة' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'نافذة فوق المهمة' })).not.toBeInTheDocument())
    expect(screen.getByRole('complementary')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
  })

  it('a closed drawer does not react to Escape (no stray close calls)', async () => {
    const onClose = vi.fn()
    render(<TaskDetailPanel task={task} open={false} onClose={onClose} onPatch={async () => {}} onToggleChecklist={async () => {}} onComment={async () => {}} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('3. no mixed Arabic / English labels in the ticket actions', () => {
  it('the complete-task modal says «تقديم للمراجعة» and «تعذر الحل», without «(Resolved)»', async () => {
    render(<CompleteTaskModal ticketId={4} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const dialog = await screen.findByRole('dialog', { name: 'تقديم للمراجعة' })
    expect(within(dialog).getByRole('button', { name: /تأكيد التقديم للمراجعة/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /تعذر الحل/ })).toBeInTheDocument()
    expect(dialog.textContent).not.toMatch(/Resolved|Unresolved/)
  })
})

describe('4. accept on an unassigned ticket', () => {
  const NO: TicketCapabilities = { approve: false, reject: false, reassign: false, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: true }
  const ticket = (over: Partial<Ticket> = {}): Ticket => ({
    id: 5, ticket_number: 'EMC-5', title: 'م', description: '', ticket_category: 'OLD_ISSUE', priority: 'LOW', department_id: 2, created_by_name: 'x', status: 'ASSIGNED',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
  })

  it('with the server saying accept / decline are not available, no such button is shown', () => {
    render(<TicketActionCenter ticket={ticket({ capabilities: { ...NO, reassign: true } })} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'بدء المعالجة' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'اعتذار عن الاستلام' })).not.toBeInTheDocument()
  })

  it('a 409 shows the server\'s own message and re-reads the ticket', async () => {
    const message = 'لا يمكن قبول تذكرة غير مُسنَدة إلى أحد؛ أسندها أولًا.'
    svc.acceptTask.mockRejectedValue(new AxiosError('x', '409', undefined, undefined, { status: 409, statusText: '', headers: {}, config: {} as never, data: { success: false, message } }))
    const onChanged = vi.fn()
    render(<TicketActionCenter ticket={ticket({ assigned_to_id: 7, assignee: { id: 7, name: 'أنا', email: '' }, capabilities: { ...NO, accept_task: true } })} onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'بدء المعالجة' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'بدء المعالجة' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message))
    expect(onChanged).toHaveBeenCalled()
  })
})
