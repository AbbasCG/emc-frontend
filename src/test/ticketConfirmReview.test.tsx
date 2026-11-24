import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'
import type { Ticket, TicketCapabilities, TicketStatus } from '@/types/ticket'
import type { TicketFilters } from '@/types/ticketOps'

const svc = vi.hoisted(() => ({
  getMeta: vi.fn(),
  confirmReview: vi.fn(),
  completeTask: vi.fn(),
  returnForRework: vi.fn(),
  updateWorkEstimate: vi.fn(),
}))
const cache = vi.hoisted(() => ({ invalidate: vi.fn() }))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }))
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: toastMock }))
vi.mock('@/api/axios', () => ({ default: api }))
vi.mock('@/services/ticketDetailCache', async (orig) => ({ ...(await orig<typeof import('@/services/ticketDetailCache')>()), invalidateTicketDetail: cache.invalidate }))

import { ConfirmReviewButton } from '@/components/tickets/ConfirmReviewButton'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import { TicketLifecyclePanel } from '@/components/tickets/TicketLifecyclePanel'
import { CompleteTaskModal } from '@/components/tickets/modals/CompleteTaskModal'
import { TicketEstimateDialog } from '@/components/tickets/modals/TicketEstimateDialog'
import { TicketTable } from '@/components/tickets/ops/TicketTable'
import { TicketKanbanBoard } from '@/components/tickets/ops/TicketKanbanBoard'
import { CONFIRM_REVIEW_CLOSED_MESSAGE, CONFIRM_REVIEW_DEPLOY_MESSAGE, confirmReviewSuccessMessage } from '@/hooks/useConfirmReview'
import { DEFAULT_FILTERS } from '@/utils/ticketFilters'
import { DEFAULT_COLUMNS } from '@/components/tickets/ops/ticketColumns'
import { emptyEstimate } from '@/lib/taskEstimate'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(api).forEach((m) => m.mockReset())
  svc.getMeta.mockResolvedValue({ tech_units: [], users: [], points_options: { simple: [25, 30], medium: [75, 100] } })
})

const apiError = (status: number, data: Record<string, unknown>) =>
  new AxiosError('x', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data })

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => { resolve = res })

  return { promise, resolve }
}

const NO_CAPS: TicketCapabilities = {
  approve: false, reject: false, reassign: false, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: true,
}
const CONFIRM: TicketCapabilities = { ...NO_CAPS, confirm_review: true, return_for_rework: true }

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 51, ticket_number: 'EMC-51', title: 'مشكلة', description: '...', ticket_category: 'OLD_ISSUE', priority: 'MEDIUM', department_id: 2,
    created_by_name: 'سارة', status: 'PENDING_REVIEW', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-02T00:00:00Z', assigned_to_id: 9,
    assignee: { id: 9, name: 'سلمى', email: '' }, task_scope: 'medium', task_points: 120, estimated_hours: 2, actual_minutes: 95, capabilities: CONFIRM,
    workflow: { stage: 'pending_review', next_actor: 'reviewer', next_step_key: 'review' }, ...over,
  }
}

const press = () => screen.getByRole('button', { name: 'تأكيد المراجعة' })

// ── the button: where it shows and where it does not ─────────────────────────────

describe('«تأكيد المراجعة»: visibility', () => {
  it('shows only for PENDING_REVIEW with capabilities.confirm_review', () => {
    const { rerender } = render(<ConfirmReviewButton ticket={ticket()} onDone={vi.fn()} />)
    expect(press()).toBeInTheDocument()

    rerender(<ConfirmReviewButton ticket={ticket({ capabilities: { ...CONFIRM, confirm_review: false } })} onDone={vi.fn()} />)
    expect(screen.queryByTestId('confirm-review-button')).not.toBeInTheDocument()

    rerender(<ConfirmReviewButton ticket={ticket({ capabilities: undefined })} onDone={vi.fn()} />)
    expect(screen.queryByTestId('confirm-review-button')).not.toBeInTheDocument()

    for (const status of ['IN_PROGRESS', 'APPROVED_FOR_DEPLOY', 'PENDING_VERIFICATION', 'RESOLVED'] as TicketStatus[]) {
      rerender(<ConfirmReviewButton ticket={ticket({ status })} onDone={vi.fn()} />)
      expect(screen.queryByTestId('confirm-review-button')).not.toBeInTheDocument()
    }
  })

  it('details: the action center shows it with «إعادة للتنفيذ» and has no old approval buttons; hidden for a viewer without the capability', () => {
    const { rerender } = render(<TicketActionCenter ticket={ticket()} onChanged={vi.fn()} />)
    expect(press()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة للتنفيذ' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /اعتماد/ })).not.toBeInTheDocument()

    rerender(<TicketActionCenter ticket={ticket({ capabilities: { ...CONFIRM, confirm_review: false } })} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'تأكيد المراجعة' })).not.toBeInTheDocument()
  })

  it('a deployment ticket uses the very same button (no «اعتماد للنشر»)', () => {
    render(<TicketActionCenter ticket={ticket({ requires_deployment: true })} onChanged={vi.fn()} />)
    expect(press()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'اعتماد للنشر' })).not.toBeInTheDocument()
  })

  const FILTERS: TicketFilters = DEFAULT_FILTERS
  const renderTable = (t: Ticket, onConfirmed = vi.fn(), compact = false) =>
    render(
      <MemoryRouter>
        <TicketTable tickets={[t]} filters={FILTERS} columns={DEFAULT_COLUMNS} onSort={vi.fn()} selected={new Set()} onToggle={vi.fn()} onToggleAll={vi.fn()} activeId={null} onOpen={vi.fn()} onAction={vi.fn()} onConfirmed={onConfirmed} compact={compact} />
      </MemoryRouter>,
    )

  it('table row and mobile card: the button is there with the capability, and gone without it', () => {
    const first = renderTable(ticket())
    expect(screen.getByRole('button', { name: 'تأكيد مراجعة التذكرة EMC-51' })).toBeInTheDocument()
    first.unmount()
    const second = renderTable(ticket(), vi.fn(), true)
    expect(screen.getByRole('button', { name: 'تأكيد مراجعة التذكرة EMC-51' })).toBeInTheDocument()
    second.unmount()
    renderTable(ticket({ capabilities: { ...CONFIRM, confirm_review: false } }))
    expect(screen.queryByRole('button', { name: /تأكيد مراجعة/ })).not.toBeInTheDocument()
  })

  it('the kanban card carries it too', () => {
    render(
      <MemoryRouter>
        <TicketKanbanBoard columns={[{ status: 'PENDING_REVIEW', count: 1, tickets: [ticket()] }]} loading={false} activeId={null} onOpen={vi.fn()} onAction={vi.fn()} onConfirmed={vi.fn()} onShowAll={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'تأكيد مراجعة التذكرة EMC-51' })).toBeInTheDocument()
  })
})

// ── one press, one request, no dialog ────────────────────────────────────────────

describe('«تأكيد المراجعة»: one press', () => {
  it('sends ONE request with no values, opens NO dialog, and re-reads (onDone) after the answer', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'RESOLVED' } })
    const onDone = vi.fn()
    render(<ConfirmReviewButton ticket={ticket()} onDone={onDone} />)
    await userEvent.click(press())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(svc.confirmReview).toHaveBeenCalledTimes(1)
    expect(svc.confirmReview).toHaveBeenCalledWith(51)
    expect(cache.invalidate).toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  })

  it('a double click sends ONE request; meanwhile the button is disabled with a spinner', async () => {
    const pending = deferred<{ success: boolean; data: { status: string } }>()
    svc.confirmReview.mockReturnValue(pending.promise)
    const onDone = vi.fn()
    render(<ConfirmReviewButton ticket={ticket()} onDone={onDone} />)
    await userEvent.dblClick(press())
    expect(svc.confirmReview).toHaveBeenCalledTimes(1)
    const busy = screen.getByTestId('confirm-review-button')
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(busy).toHaveTextContent('جارٍ التأكيد...')
    expect(busy.querySelector('svg.animate-spin')).not.toBeNull()
    pending.resolve({ success: true, data: { status: 'RESOLVED' } })
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(svc.confirmReview).toHaveBeenCalledTimes(1)
  })

  it('table row: pressing it never opens the ticket and reports the answer to the page', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'APPROVED_FOR_DEPLOY' } })
    const onOpen = vi.fn()
    const onConfirmed = vi.fn()
    render(
      <MemoryRouter>
        <TicketTable tickets={[ticket()]} filters={DEFAULT_FILTERS} columns={DEFAULT_COLUMNS} onSort={vi.fn()} selected={new Set()} onToggle={vi.fn()} onToggleAll={vi.fn()} activeId={null} onOpen={onOpen} onAction={vi.fn()} onConfirmed={onConfirmed} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد مراجعة التذكرة EMC-51' }))
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1))
    expect(onOpen).not.toHaveBeenCalled()
    expect(svc.confirmReview).toHaveBeenCalledTimes(1)
  })

  it('details: the action center refreshes the ticket through onChanged', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'RESOLVED' } })
    const onChanged = vi.fn()
    render(<TicketActionCenter ticket={ticket()} onChanged={onChanged} />)
    await userEvent.click(press())
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  })
})

// ── the success sentence comes from the server's status ───────────────────────────

describe('«تأكيد المراجعة»: the success message names the new stage', () => {
  it('a deployment ticket (server status APPROVED_FOR_DEPLOY): «بانتظار النشر»', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'x', data: { status: 'APPROVED_FOR_DEPLOY' } })
    render(<ConfirmReviewButton ticket={ticket({ requires_deployment: true })} onDone={vi.fn()} />)
    await userEvent.click(press())
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('تم تأكيد المراجعة — بانتظار النشر'))
  })

  it('any other ticket (server status RESOLVED): closed and credited', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'x', data: { status: 'RESOLVED' } })
    render(<ConfirmReviewButton ticket={ticket()} onDone={vi.fn()} />)
    await userEvent.click(press())
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('تم تأكيد المراجعة وإغلاق التذكرة وإضافة الرصيد'))
  })

  it('reads the status from the answer, not from requires_deployment', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'x', data: { status: 'RESOLVED' } })
    render(<ConfirmReviewButton ticket={ticket({ requires_deployment: true })} onDone={vi.fn()} />)
    await userEvent.click(press())
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(CONFIRM_REVIEW_CLOSED_MESSAGE))
  })

  it('the helper: both sentences, and a neutral one (or the server message) for an unknown stage', () => {
    expect(confirmReviewSuccessMessage('APPROVED_FOR_DEPLOY')).toBe(CONFIRM_REVIEW_DEPLOY_MESSAGE)
    expect(confirmReviewSuccessMessage('RESOLVED')).toBe(CONFIRM_REVIEW_CLOSED_MESSAGE)
    expect(confirmReviewSuccessMessage('SOMETHING_NEW', 'تمت المراجعة')).toBe('تمت المراجعة')
    expect(confirmReviewSuccessMessage(undefined)).toBe('تم تأكيد المراجعة')
  })
})

// ── the review round ─────────────────────────────────────────────────────────────

describe('«تأكيد المراجعة»: review_round', () => {
  it('sends the round of the ticket on screen (details)', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'RESOLVED' } })
    render(<TicketActionCenter ticket={ticket({ review_round: 3 })} onChanged={vi.fn()} />)
    await userEvent.click(press())
    await waitFor(() => expect(svc.confirmReview).toHaveBeenCalledTimes(1))
    expect(svc.confirmReview).toHaveBeenCalledWith(51, undefined, 3)
  })

  it('omits it when the ticket carries none (list rows)', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'RESOLVED' } })
    render(<ConfirmReviewButton ticket={ticket()} onDone={vi.fn()} />)
    await userEvent.click(press())
    await waitFor(() => expect(svc.confirmReview).toHaveBeenCalledTimes(1))
    expect(svc.confirmReview).toHaveBeenCalledWith(51)
  })

  it('a round of 0 is still sent', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'RESOLVED' } })
    render(<ConfirmReviewButton ticket={ticket({ review_round: 0 })} onDone={vi.fn()} />)
    await userEvent.click(press())
    await waitFor(() => expect(svc.confirmReview).toHaveBeenCalledWith(51, undefined, 0))
  })

  it('409 STALE_REVIEW: the server message as a warning (not an error) and the ticket is re-read', async () => {
    svc.confirmReview.mockRejectedValue(apiError(409, { success: false, code: 'STALE_REVIEW', message: 'تغيّرت جولة المراجعة؛ حدّث الصفحة ثم راجع من جديد.' }))
    const onDone = vi.fn()
    render(<ConfirmReviewButton ticket={ticket({ review_round: 1 })} onDone={onDone} />)
    await userEvent.click(press())
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ ok: false, ticket: null }))
    expect(toastMock.warning).toHaveBeenCalledWith('تغيّرت جولة المراجعة؛ حدّث الصفحة ثم راجع من جديد.')
    expect(toastMock.error).not.toHaveBeenCalled()
    expect(cache.invalidate).toHaveBeenCalled()
  })
})

// ── refusals ─────────────────────────────────────────────────────────────────────

describe('«تأكيد المراجعة»: the server refusals', () => {
  const run = async (status: number, body: Record<string, unknown>) => {
    svc.confirmReview.mockRejectedValue(apiError(status, { success: false, ...body }))
    const onDone = vi.fn()
    render(<ConfirmReviewButton ticket={ticket()} onDone={onDone} />)
    await userEvent.click(press())
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))

    return onDone
  }

  it('409 INVALID_STAGE / NOT_PENDING_REVIEW: the server message and a re-read (the stage moved)', async () => {
    const onDone = await run(409, { code: 'NOT_PENDING_REVIEW', message: 'لم تعد التذكرة بانتظار المراجعة.' })
    expect(toastMock.error).toHaveBeenCalledWith('لم تعد التذكرة بانتظار المراجعة.')
    expect(onDone).toHaveBeenCalledWith({ ok: false, ticket: null })
    expect(cache.invalidate).toHaveBeenCalled()
  })

  it('409 ALREADY_CREDITED is information, not an error, and the screen re-reads', async () => {
    await run(409, { code: 'ALREADY_CREDITED', message: 'تم اعتماد هذه التذكرة وإضافة رصيدها مسبقًا.' })
    expect(toastMock.message).toHaveBeenCalledWith('تم اعتماد هذه التذكرة وإضافة رصيدها مسبقًا.')
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it.each([
    ['REVIEW_PERMISSION_REQUIRED', 'لا تملك صلاحية «مراجعة واعتماد إنجاز التذاكر».'],
    ['PARTICIPATION_PERMISSION_REQUIRED', 'تلزمك صلاحية «اعتماد التذاكر التي أشارك فيها».'],
    ['HR_APPROVAL_REQUIRED', 'هذا الحجم يحتاج إلى اعتماد الموارد البشرية.'],
  ])('403 %s: the server sentence is shown, never a generic error', async (code, message) => {
    await run(403, { code, message })
    expect(toastMock.error).toHaveBeenCalledWith(message)
    expect(toastMock.error).not.toHaveBeenCalledWith('تعذّر تأكيد المراجعة')
  })

  it('422 REVIEW_DATA_INCOMPLETE: the reason is shown and the ticket is re-read so its blockers appear', async () => {
    await run(422, { code: 'REVIEW_DATA_INCOMPLETE', message: 'أكمل المدة الفعلية قبل تأكيد المراجعة.', missing: ['actual_minutes'] })
    expect(toastMock.error).toHaveBeenCalledWith('أكمل المدة الفعلية قبل تأكيد المراجعة.')
  })

  it('422 REVIEW_VALUES_LOCKED shows its message', async () => {
    await run(422, { code: 'REVIEW_VALUES_LOCKED', message: 'القيم مقفلة أثناء المراجعة.' })
    expect(toastMock.error).toHaveBeenCalledWith('القيم مقفلة أثناء المراجعة.')
  })

  it('a failure without any answer (network): a generic message, and the button is usable again', async () => {
    svc.confirmReview.mockRejectedValue(new Error('network'))
    const onDone = vi.fn()
    render(<ConfirmReviewButton ticket={ticket()} onDone={onDone} />)
    await userEvent.click(press())
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('تعذّر تأكيد المراجعة'))
    expect(onDone).not.toHaveBeenCalled()
    expect(press()).toBeEnabled()
  })
})

// ── the review panel: read-only values and blockers ──────────────────────────────

describe('the review panel', () => {
  it('shows size, points, approximate and actual duration READ-ONLY (no inputs) with «مقفلة أثناء المراجعة»', () => {
    render(<TicketLifecyclePanel ticket={ticket()} />)
    const panel = screen.getByTestId('review-values')
    expect(panel).toHaveTextContent('مقفلة أثناء المراجعة')
    expect(within(panel).getByTestId('review-value-scope')).toHaveTextContent('متوسطة')
    expect(within(panel).getByTestId('review-value-points')).toHaveTextContent('120 نقطة')
    expect(within(panel).getByTestId('review-value-estimated')).toHaveTextContent('ساعتان')
    expect(within(panel).getByTestId('review-value-actual')).toHaveTextContent('ساعة و35 دقيقة')
    expect(panel.querySelector('input, select, textarea')).toBeNull()
  })

  it('missing values read as a dash, never as zero', () => {
    render(<TicketLifecyclePanel ticket={ticket({ task_scope: null, task_points: null, estimated_hours: null, actual_minutes: null })} />)
    const panel = screen.getByTestId('review-values')
    for (const k of ['scope', 'points', 'estimated', 'actual']) expect(within(panel).getByTestId(`review-value-${k}`)).toHaveTextContent('—')
  })

  it('outside review the panel does not show the values block', () => {
    render(<TicketLifecyclePanel ticket={ticket({ status: 'IN_PROGRESS', workflow: { stage: 'in_progress', next_actor: 'assignee', next_step_key: 'submit_for_review' } })} />)
    expect(screen.queryByTestId('review-values')).not.toBeInTheDocument()
  })

  it('blockers: the reasons show in the lifecycle area, the confirm button is not offered, and «إعادة للتنفيذ» stays', async () => {
    const t = ticket({
      capabilities: { ...NO_CAPS, return_for_rework: true },
      review_blockers: [
        { code: 'actual_minutes', message_ar: 'لم يُسجَّل المكلف المدة الفعلية.' },
        { code: 'HR_APPROVAL_REQUIRED', message_ar: 'هذا الحجم يحتاج إلى اعتماد الموارد البشرية.' },
      ],
    })
    render(
      <>
        <TicketLifecyclePanel ticket={t} />
        <TicketActionCenter ticket={t} onChanged={vi.fn()} />
      </>,
    )
    const box = screen.getByTestId('review-blockers')
    expect(box).toHaveAttribute('role', 'alert')
    expect(box).toHaveTextContent('لم يُسجَّل المكلف المدة الفعلية.')
    expect(box).toHaveTextContent('هذا الحجم يحتاج إلى اعتماد الموارد البشرية.')
    expect(screen.queryByRole('button', { name: 'تأكيد المراجعة' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة للتنفيذ' }))
    expect(await screen.findByTestId('return-for-rework-modal')).toBeInTheDocument()
  })

  it('the HR blocker never advises rework: it asks for an HR approver; the rework hint stays for incomplete data only', () => {
    const hr = ticket({ capabilities: { ...NO_CAPS, return_for_rework: true }, review_blockers: [{ code: 'HR_APPROVAL_REQUIRED', message_ar: 'هذا الحجم يحتاج إلى اعتماد الموارد البشرية.' }] })
    const { rerender } = render(<TicketLifecyclePanel ticket={hr} />)
    expect(screen.getByTestId('review-blockers-hr-hint')).toHaveTextContent('مسؤول موارد بشرية')
    expect(screen.queryByTestId('review-blockers-rework-hint')).not.toBeInTheDocument()
    expect(screen.getByTestId('review-blockers').textContent).not.toContain('إعادة التذكرة للتنفيذ')

    rerender(<TicketLifecyclePanel ticket={ticket({ capabilities: { ...NO_CAPS, return_for_rework: true }, review_blockers: [{ code: 'REVIEW_DATA_INCOMPLETE', message_ar: 'أكمل المدة الفعلية.' }] })} />)
    expect(screen.getByTestId('review-blockers-rework-hint')).toBeInTheDocument()
    expect(screen.queryByTestId('review-blockers-hr-hint')).not.toBeInTheDocument()
  })

  it('without the confirm button the action center does not say «أكّد المراجعة»: a short line points to the blocker (or nothing)', () => {
    const blocked = ticket({ capabilities: { ...NO_CAPS, return_for_rework: true }, review_blockers: [{ code: 'REVIEW_DATA_INCOMPLETE', message_ar: 'أكمل المدة الفعلية.' }] })
    const { rerender } = render(<TicketActionCenter ticket={blocked} onChanged={vi.fn()} />)
    expect(screen.queryByTestId('review-hint')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('أكّد المراجعة')
    expect(screen.getByTestId('review-blocked-hint')).toHaveTextContent('راجع السبب أعلاه')

    rerender(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, return_for_rework: true } })} onChanged={vi.fn()} />)
    expect(screen.queryByTestId('review-hint')).not.toBeInTheDocument()
    expect(screen.queryByTestId('review-blocked-hint')).not.toBeInTheDocument()

    rerender(<TicketActionCenter ticket={ticket()} onChanged={vi.fn()} />)
    expect(screen.getByTestId('review-hint')).toHaveTextContent('أكّد المراجعة')
  })

  it('no blockers: nothing is shown', () => {
    render(<TicketLifecyclePanel ticket={ticket({ review_blockers: [] })} />)
    expect(screen.queryByTestId('review-blockers')).not.toBeInTheDocument()
  })

  it('keeps the review_context notice (missing permission) next to the values', () => {
    render(<TicketLifecyclePanel ticket={ticket({ review_context: { stage: 'PENDING_REVIEW', can_review: false, reason: 'missing_permission', relation: [], needs_participation_permission: false, required_permissions: ['tickets.review_completion'] } })} />)
    expect(screen.getByTestId('review-values')).toBeInTheDocument()
    expect(document.body.textContent).toContain('مراجعة واعتماد إنجاز التذاكر')
  })

  it('the estimate editor is not offered in review even if the capability says true (the server locks the values)', () => {
    render(<TicketActionCenter ticket={ticket({ capabilities: { ...CONFIRM, can_edit_estimate: true } })} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'تعديل النقاط والمدة' })).not.toBeInTheDocument()
  })
})

// ── the assignee records the ACTUAL duration ────────────────────────────────────

describe('the regular «تقديم للمراجعة» records the actual duration', () => {
  const fillSummary = () => userEvent.type(screen.getByPlaceholderText('اشرح الإجراءات التقنية المتخذة والنتيجة التي تحققت...'), 'تم الإصلاح')

  it('hours and minutes start empty; empty is refused before any request', async () => {
    render(<CompleteTaskModal ticketId={4} onClose={vi.fn()} onSuccess={vi.fn()} estimate={{ task_points: 120, estimated_hours: 2 }} />)
    expect((screen.getByLabelText('ساعات') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('دقائق') as HTMLSelectElement).value).toBe('')
    await fillSummary()
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد التقديم للمراجعة' }))
    expect(await screen.findByText(/أدخل المدة الفعلية/)).toBeInTheDocument()
    expect(svc.completeTask).not.toHaveBeenCalled()
  })

  it('exact minutes: 0 h 59 min sends 59; the preview shows points and both durations', async () => {
    svc.completeTask.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<CompleteTaskModal ticketId={4} onClose={vi.fn()} onSuccess={onSuccess} estimate={{ task_points: 120, estimated_hours: 2 }} />)
    await fillSummary()
    await userEvent.selectOptions(screen.getByLabelText('دقائق'), '59')
    expect(screen.getByTestId('submit-duration-preview')).toHaveTextContent('59 دقيقة')
    expect(screen.getByTestId('submit-duration-preview')).toHaveTextContent('نقاط 120')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد التقديم للمراجعة' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect((svc.completeTask.mock.calls[0][1] as FormData).get('actual_minutes')).toBe('59')
  })

  it('«تعذر الحل» needs no duration', async () => {
    svc.completeTask.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<CompleteTaskModal ticketId={4} unresolvedOnly onClose={vi.fn()} onSuccess={onSuccess} />)
    await userEvent.type(screen.getByPlaceholderText(/وضح العوائق الفنية/), 'لا صلاحية')
    await userEvent.click(screen.getByRole('button', { name: /تأكيد تعذر الحل/ }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect((svc.completeTask.mock.calls[0][1] as FormData).has('actual_minutes')).toBe(false)
  })

  it('the server 422 ACTUAL_DURATION_REQUIRED lands under the field', async () => {
    svc.completeTask.mockRejectedValue(apiError(422, { success: false, code: 'ACTUAL_DURATION_REQUIRED', message: 'سجّل المدة الفعلية قبل الإرسال.' }))
    render(<CompleteTaskModal ticketId={4} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await fillSummary()
    await userEvent.selectOptions(screen.getByLabelText('دقائق'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد التقديم للمراجعة' }))
    expect(await screen.findByText('سجّل المدة الفعلية قبل الإرسال.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

// ── the estimate is set at ASSIGNMENT ────────────────────────────────────────────

describe('the assignment estimate dialog requires scope, points and the approximate duration', () => {
  it('refuses an empty one with all three messages and sends nothing', async () => {
    const onSubmit = vi.fn()
    render(<TicketEstimateDialog title="إسناد التذكرة" initial={emptyEstimate()} submitLabel="إسناد" onSubmit={onSubmit} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'إسناد' }))
    expect(await screen.findByText('اختر حجم المهمة.')).toBeInTheDocument()
    expect(screen.getByText('نقاط المهمة مطلوبة.')).toBeInTheDocument()
    expect(screen.getByText('حدّد المدة التقريبية للمهمة.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the presets and «مدة مخصصة», and accepts a custom duration', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TicketEstimateDialog title="إسناد التذكرة" initial={emptyEstimate()} submitLabel="إسناد" onSubmit={onSubmit} onClose={vi.fn()} />)
    await userEvent.selectOptions(screen.getByLabelText(/حجم المهمة/), 'simple')
    await userEvent.selectOptions(await screen.findByLabelText(/نقاط المهمة/), '30')
    const duration = screen.getByLabelText(/^المدة التقريبية/)
    expect(within(duration).getByRole('option', { name: 'مدة مخصصة' })).toBeInTheDocument()
    expect(within(duration).getByRole('option', { name: '30 دقيقة' })).toBeInTheDocument()
    await userEvent.selectOptions(duration, 'custom')
    await userEvent.type(screen.getByLabelText('المدة التقريبية (مخصصة)'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'إسناد' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ task_scope: 'simple', task_points: 30, estimated_hours: 3 })
  })

  it('the dedicated edit (clearable) keeps the duration optional', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TicketEstimateDialog title="تعديل" initial={{ ...emptyEstimate(), scope: 'simple', points: '30' }} clearable submitLabel="حفظ" onSubmit={onSubmit} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })
})
