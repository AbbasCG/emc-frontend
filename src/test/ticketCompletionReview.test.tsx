import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'
import type { MyWorkTicket, Ticket, TicketCapabilities, TicketCredit, TicketStatus } from '@/types/ticket'

const svc = vi.hoisted(() => ({
  getMeta: vi.fn(),
  confirmReview: vi.fn(),
  returnForRework: vi.fn(),
  completeTask: vi.fn(),
  updateWorkEstimate: vi.fn(),
  acceptTask: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }))
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: toastMock }))
vi.mock('@/api/axios', () => ({ default: api }))

import { ReturnForReworkModal } from '@/components/tickets/modals/ReturnForReworkModal'
import { CompleteTaskModal } from '@/components/tickets/modals/CompleteTaskModal'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import { TicketCreditBlock } from '@/components/tickets/TicketCreditBlock'
import TicketStatusBadge from '@/components/tickets/TicketStatusBadge'
import { RowActions } from '@/components/tickets/ops/TicketTable'
import { TicketKanbanBoard } from '@/components/tickets/ops/TicketKanbanBoard'
import { TicketKpiCards } from '@/components/tickets/ops/TicketKpiCards'
import { STATUS_LABELS, STATUS_META, TIMELINE_META, isClosed, ticketActionLabel } from '@/components/tickets/ops/ticketOpsUi'
import WorkItemCard from '@/components/operations/myWork/WorkItemCard'
import { ticketToWorkItem } from '@/lib/myWork'
import { MY_WORK_COLUMN_LABEL, columnForTask, columnForTicket } from '@/lib/myWorkColumns'
import { reporterStatusCopy } from '@/utils/reporterTicketStatus'
import { DEFAULT_FILTERS, TICKET_STATUSES, kpiPatch, parseFilters, TICKET_PRESETS } from '@/utils/ticketFilters'
import { apiErrorCode, fetchTicketStats } from '@/services/ticketOpsService'
import { categoryLabel } from '@/components/operations/impactPoints/impactPointsUi'
import { AWARD_CATEGORIES } from '@/api/volunteerPointsApi'
import { EditEstimateModal } from '@/components/tickets/modals/EditEstimateModal'
import { TICKET_ESTIMATE_NOTE, actualDraftToMinutes, formatDurationHours, formatDurationMinutes } from '@/lib/taskEstimate'
import type { BoardColumn, TicketStats } from '@/types/ticketOps'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(api).forEach((m) => m.mockReset())
  svc.getMeta.mockResolvedValue({ tech_units: [], users: [] })
})

const apiError = (status: number, data: Record<string, unknown>) =>
  new AxiosError('x', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data })

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })

  return { promise, resolve, reject }
}

const NO_CAPS: TicketCapabilities = {
  approve: false, reject: false, reassign: false, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: true,
}

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 31, ticket_number: 'EMC-31', title: 'مشكلة', description: '...', ticket_category: 'OLD_ISSUE', priority: 'MEDIUM', department_id: 2,
    created_by_name: 'سارة', status: 'PENDING_REVIEW', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-02T00:00:00Z', assigned_to_id: 9,
    assignee: { id: 9, name: 'سلمى', email: '' }, task_scope: 'medium', task_points: 120, estimated_hours: 2.5, capabilities: NO_CAPS, ...over,
  }
}

// ── 1. statuses, labels and maps ────────────────────────────────────────────────

describe('PENDING_REVIEW in every status map', () => {
  it('has the label, an open (not closed) state and a badge', () => {
    expect(STATUS_META.PENDING_REVIEW.label).toBe('بانتظار المراجعة والاعتماد')
    expect(STATUS_LABELS.PENDING_REVIEW).toBe('بانتظار المراجعة والاعتماد')
    expect(isClosed('PENDING_REVIEW')).toBe(false)
    render(<TicketStatusBadge status="PENDING_REVIEW" />)
    expect(screen.getByText('بانتظار المراجعة والاعتماد')).toBeInTheDocument()
  })

  it('every status of the union has a label and a badge (nothing falls back to the raw key)', () => {
    for (const s of TICKET_STATUSES) {
      expect(STATUS_META[s], s).toBeDefined()
      expect(STATUS_LABELS[s]).toMatch(/[؀-ۿ]/)
    }
    expect(TICKET_STATUSES).toHaveLength(10)
    expect(TICKET_STATUSES).toContain('PENDING_REVIEW')
  })

  it('the filters accept it (up to 8 statuses) and the review preset and KPI filter on it', () => {
    const f = parseFilters(new URLSearchParams('status=PENDING_APPROVAL,ASSIGNED,IN_PROGRESS,PENDING_REVIEW,RESOLVED,UNRESOLVED,REJECTED_BY_ADMIN,REJECTED_BY_ASSIGNEE'))
    expect(f.status).toHaveLength(8)
    expect(kpiPatch('pendingReview')).toMatchObject({ status: ['PENDING_REVIEW'] })
    expect(TICKET_PRESETS.find((p) => p.id === 'review')?.patch).toMatchObject({ status: ['PENDING_REVIEW'] })
    expect(DEFAULT_FILTERS.status).toEqual([])
  })

  it('a reporter that somehow gets it sees «قيد التنفيذ» wording, never a review state', () => {
    const copy = reporterStatusCopy('PENDING_REVIEW', 'OLD_ISSUE')
    expect(copy).toEqual(reporterStatusCopy('IN_PROGRESS', 'OLD_ISSUE'))
    expect(copy.statusLabel).toBe('قيد المعالجة')
    expect(reporterStatusCopy('PENDING_REVIEW', 'NEW_SUGGESTION').statusLabel).toBe('قيد التنفيذ')
  })

  it('«مهامي»: it goes to the same column as a task waiting for approval', () => {
    expect(columnForTicket('PENDING_REVIEW')).toBe('review')
    expect(columnForTicket('PENDING_REVIEW')).toBe(columnForTask('waiting_approval', 'accepted'))
    expect(columnForTicket('PENDING_REVIEW')).toBe(columnForTask('needs_evaluation', 'accepted'))
    expect(MY_WORK_COLUMN_LABEL.review).toBe('بانتظار الاعتماد والتقييم')
    expect(columnForTicket('IN_PROGRESS')).toBe('in_progress')
    expect(columnForTicket('RESOLVED')).toBe('completed')
  })

  it('every activity-log action of the review flow has an Arabic label, never the raw key', () => {
    for (const a of ['SUBMITTED_FOR_REVIEW', 'APPROVED_COMPLETION', 'CREDIT_ADDED', 'RETURNED_FOR_REWORK', 'ESTIMATE_UPDATED']) {
      expect(TIMELINE_META[a], a).toBeDefined()
      expect(ticketActionLabel(a)).toMatch(/[؀-ۿ]/)
      expect(ticketActionLabel(a)).not.toBe(a)
    }
  })

  it('the statistics normalizer reads counts.pending_review (and is 0 when absent)', async () => {
    api.get.mockResolvedValue({ data: { data: { counts: { pending_review: '7' } } } })
    expect((await fetchTicketStats({})).counts.pendingReview).toBe(7)
    api.get.mockResolvedValue({ data: { data: { counts: {} } } })
    expect((await fetchTicketStats({})).counts.pendingReview).toBe(0)
  })
})

describe('the board and the counters', () => {
  const statuses: TicketStatus[] = ['PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ADMIN', 'REJECTED_BY_ASSIGNEE']
  const columns: BoardColumn[] = statuses.map((status, i) => ({
    status,
    count: i + 1,
    tickets: status === 'PENDING_REVIEW' ? [ticket({ id: 70, ticket_number: 'EMC-70', capabilities: { ...NO_CAPS, confirm_review: true, return_for_rework: true } })] : [],
  }))

  it('shows the 8 columns, the review one with its card and count', () => {
    render(
      <MemoryRouter>
        <TicketKanbanBoard columns={columns} loading={false} activeId={null} onOpen={vi.fn()} onAction={vi.fn()} onShowAll={vi.fn()} />
      </MemoryRouter>,
    )
    const board = screen.getByTestId('ticket-status-board')
    for (const s of statuses) expect(within(board).getAllByText(STATUS_LABELS[s]).length).toBeGreaterThan(0)
    expect(within(board).getAllByText('بانتظار المراجعة والاعتماد').length).toBeGreaterThan(0)
    expect(within(board).getByText('EMC-70')).toBeInTheDocument()
    // the card carries the review actions the server granted
    expect(within(board).getByRole('button', { name: /تأكيد مراجعة التذكرة EMC-70/ })).toBeInTheDocument()
    expect(within(board).getByRole('button', { name: /إعادة التذكرة EMC-70 للتنفيذ/ })).toBeInTheDocument()
  })

  it('the review KPI shows counts.pendingReview and applies the PENDING_REVIEW filter', async () => {
    const stats = { counts: { total: 10, pendingApproval: 1, assigned: 1, inProgress: 1, pendingReview: 6, approvedForDeploy: 2, pendingVerification: 1, resolved: 1, unresolved: 0, rejectedByAdmin: 0, rejectedByAssignee: 0, open: 9, closed: 1, overdue: 0, dueSoon: 0, unassigned: 0, highPriority: 0, new24h: 0 }, timings: { windowDays: 30, avgResponseHours: null, responseSample: 0, avgResolutionHours: null, resolutionSample: 0, truncated: false, definitions: { response: '', resolution: '' } }, scopeNote: '', dueSoonHours: 24 } as TicketStats
    const onPick = vi.fn()
    render(<TicketKpiCards stats={stats} loading={false} filters={DEFAULT_FILTERS} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /مزيد من المؤشرات/ }))
    expect(screen.getByTestId('kpi-value-pendingReview')).toHaveTextContent('6')
    await userEvent.click(screen.getByText('بانتظار المراجعة'))
    expect(onPick).toHaveBeenCalledWith('pendingReview')
  })
})

// ── 2. «مهامي ومسؤولياتي» ───────────────────────────────────────────────────────

describe('«مهامي»: a ticket in review and a credited ticket', () => {
  const row = (over: Partial<MyWorkTicket> = {}): MyWorkTicket => ({ id: 5, ticket_number: 'EMC-5', title: 'عنوان', status: 'PENDING_REVIEW', priority: 'LOW', department: { id: 2, name: 'التقنية' }, task_points: 40, estimated_hours: 1, capabilities: { can_open: true }, ...over })
  const me = { name: 'سلمى' }
  const renderCard = (i: ReturnType<typeof ticketToWorkItem>) => render(<MemoryRouter><WorkItemCard item={i} /></MemoryRouter>)

  it('in review: the «بانتظار الاعتماد والتقييم» column and the «بانتظار الاعتماد» tag on the card', () => {
    const item = ticketToWorkItem(row(), me)
    expect(item.column).toBe('review')
    expect(item.awaitingApproval).toBe(true)
    renderCard(item)
    expect(screen.getByTestId('stage-badge')).toHaveTextContent('بانتظار المراجعة')
    expect(screen.getByTestId('next-step')).toHaveTextContent('بانتظار مراجعة الإنجاز')
    expect(screen.queryByTestId('credited')).not.toBeInTheDocument()
  })

  it('completed with a credited block: the card shows the credited points and hours', () => {
    const credit: TicketCredit = { status: 'credited', points: 120, hours: 1.25, minutes: 75, credited_at: '2026-11-20T10:00:00Z', credited_by_name: 'المدير' }
    const item = ticketToWorkItem(row({ status: 'RESOLVED', credit }), me)
    expect(item.column).toBe('completed')
    expect(item.credited).toEqual({ points: 120, minutes: 75, hours: 1.25 })
    renderCard(item)
    // the approved minutes win over the decimal hours
    expect(screen.getByTestId('credited')).toHaveTextContent('120 نقطة · ساعة و15 دقيقة')
    expect(screen.queryByTestId('stage-badge')).not.toBeInTheDocument()
  })

  it('an older credit without minutes shows its decimal hours in the same wording', () => {
    const credit: TicketCredit = { status: 'credited', points: 40, hours: 2.5, credited_at: null, credited_by_name: null }
    renderCard(ticketToWorkItem(row({ status: 'RESOLVED', credit }), me))
    expect(screen.getByTestId('credited')).toHaveTextContent('40 نقطة · ساعتان و30 دقيقة')
  })

  it('completed WITHOUT a credit block (or not credited): nothing about credit is shown', () => {
    for (const credit of [undefined, { status: 'none', points: null, hours: null, credited_at: null, credited_by_name: null } as TicketCredit]) {
      const item = ticketToWorkItem(row({ status: 'RESOLVED', credit }), me)
      expect(item.credited).toBeNull()
    }
    renderCard(ticketToWorkItem(row({ status: 'RESOLVED' }), me))
    expect(screen.queryByTestId('credited')).not.toBeInTheDocument()
  })
})

// ── 3. the assignee submits for review ──────────────────────────────────────────

describe('the assignee: «تقديم للمراجعة»', () => {
  it('the modal is «تقديم للمراجعة» and says nothing is added before the final approval', async () => {
    render(<CompleteTaskModal ticketId={4} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const dialog = await screen.findByRole('dialog', { name: 'تقديم للمراجعة' })
    expect(within(dialog).getByTestId('submit-review-note')).toHaveTextContent('لن تُضاف النقاط والساعات إلا بعد الاعتماد النهائي')
    expect(within(dialog).getByRole('button', { name: 'تأكيد التقديم للمراجعة' })).toBeInTheDocument()
    // no old wording about closing
    expect(dialog.textContent).not.toMatch(/تأكيد الحل والإغلاق|إغلاق المهمة|تم إغلاق/)
  })

  it('submitting sends RESOLVED and says it went to review, not that the ticket closed', async () => {
    svc.completeTask.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<CompleteTaskModal ticketId={4} onClose={vi.fn()} onSuccess={onSuccess} />)
    await userEvent.type(screen.getByPlaceholderText('اشرح الإجراءات التقنية المتخذة والنتيجة التي تحققت...'), 'تم الإصلاح')
    await userEvent.selectOptions(screen.getByLabelText('ساعات'), '1')
    await userEvent.selectOptions(screen.getByLabelText('دقائق'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد التقديم للمراجعة' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(toastMock.success).toHaveBeenCalledWith('تم تقديم التذكرة للمراجعة والاعتماد')
    const [, form] = svc.completeTask.mock.calls[0] as [number, FormData]
    expect(form.get('resolution_type')).toBe('RESOLVED')
    expect(form.get('actual_minutes')).toBe('85')
  })

  it('the action center offers «تقديم للمراجعة» (not «تم الحل») when complete_task is granted', () => {
    render(<TicketActionCenter ticket={ticket({ status: 'IN_PROGRESS', capabilities: { ...NO_CAPS, complete_task: true } })} onChanged={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'تقديم للمراجعة' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تم الحل' })).not.toBeInTheDocument()
  })

  it('the estimate note says the approximate duration is planning only and the credited time is the actual approved one', () => {
    expect(TICKET_ESTIMATE_NOTE).toContain('الاعتماد النهائي')
    expect(TICKET_ESTIMATE_NOTE).not.toContain('فقط ولا تُضاف')
  })
})

// ── 4. capability gating ────────────────────────────────────────────────────────

describe('the review buttons follow the server capabilities', () => {
  const reviewButtons = () => ({
    confirm: screen.queryByRole('button', { name: 'تأكيد المراجعة' }),
    ret: screen.queryByRole('button', { name: 'إعادة للتنفيذ' }),
  })

  it('action center: both shown when granted', () => {
    render(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, confirm_review: true, return_for_rework: true } })} onChanged={vi.fn()} />)
    const b = reviewButtons()
    expect(b.confirm).toBeInTheDocument()
    expect(b.ret).toBeInTheDocument()
    expect(screen.getByTestId('review-hint')).toBeInTheDocument()
  })

  it('action center: only the granted one is shown, and none when neither (even in PENDING_REVIEW)', () => {
    const { rerender } = render(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, return_for_rework: true } })} onChanged={vi.fn()} />)
    expect(reviewButtons().confirm).not.toBeInTheDocument()
    expect(reviewButtons().ret).toBeInTheDocument()
    rerender(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, confirm_review: false, return_for_rework: false } })} onChanged={vi.fn()} />)
    expect(reviewButtons().confirm).not.toBeInTheDocument()
    expect(reviewButtons().ret).not.toBeInTheDocument()
    expect(screen.queryByTestId('ticket-action-center')).not.toBeInTheDocument()
  })

  it('the assignee of a ticket in review (no capability) gets neither, however the status reads', () => {
    render(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, comment: true } })} onChanged={vi.fn()} currentUserId={9} />)
    expect(reviewButtons().confirm).not.toBeInTheDocument()
    expect(reviewButtons().ret).not.toBeInTheDocument()
  })

  it('row / card actions: same gating; «تأكيد المراجعة» confirms in one press and the others report the action with the ticket', async () => {
    const onAction = vi.fn()
    const onConfirmed = vi.fn()
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'RESOLVED' } })
    const t = ticket({ capabilities: { ...NO_CAPS, confirm_review: true, return_for_rework: true } })
    const { rerender } = render(<RowActions ticket={t} onAction={onAction} onConfirmed={onConfirmed} />)
    await userEvent.click(screen.getByRole('button', { name: /تأكيد مراجعة التذكرة/ }))
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(1))
    expect(svc.confirmReview).toHaveBeenCalledWith(31)
    await userEvent.click(screen.getByRole('button', { name: /للتنفيذ/ }))
    expect(onAction).toHaveBeenCalledWith('return_for_rework', t)
    rerender(<RowActions ticket={ticket({ capabilities: NO_CAPS })} onAction={onAction} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('the actual-duration helpers', () => {
  it('whole numbers only, 1 minute up to 1000 hours', () => {
    expect(actualDraftToMinutes({ hours: '', minutes: '' })).toEqual({ ok: false, reason: 'empty' })
    expect(actualDraftToMinutes({ hours: '0', minutes: '0' })).toEqual({ ok: false, reason: 'empty' })
    expect(actualDraftToMinutes({ hours: '1', minutes: '15' })).toEqual({ ok: true, minutes: 75 })
    expect(actualDraftToMinutes({ hours: '', minutes: '45' })).toEqual({ ok: true, minutes: 45 })
    expect(actualDraftToMinutes({ hours: '1000', minutes: '0' })).toEqual({ ok: true, minutes: 60000 })
    expect(actualDraftToMinutes({ hours: '1000', minutes: '1' })).toEqual({ ok: false, reason: 'too_long' })
    expect(actualDraftToMinutes({ hours: '1.5', minutes: '' })).toEqual({ ok: false, reason: 'invalid' })
    expect(actualDraftToMinutes({ hours: '-1', minutes: '' })).toEqual({ ok: false, reason: 'invalid' })
  })
})

// ── 6. ReturnForReworkModal ─────────────────────────────────────────────────────

describe('ReturnForReworkModal', () => {
  const submitName = 'إعادة للتنفيذ'
  const mount = () => {
    const onSuccess = vi.fn()
    const onStale = vi.fn()
    render(<ReturnForReworkModal ticketId={31} onClose={vi.fn()} onSuccess={onSuccess} onStale={onStale} />)

    return { onSuccess, onStale }
  }
  const submit = () => within(screen.getByTestId('return-for-rework-modal')).getByRole('button', { name: submitName })

  it('the reason is required and at least 5 characters: nothing is sent before that', async () => {
    mount()
    await screen.findByRole('dialog', { name: 'إعادة للتنفيذ' })
    await userEvent.click(submit())
    expect(await screen.findByText('اكتب سبب إعادة التذكرة للتنفيذ.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/سبب الإعادة/), '   ab  ')
    await userEvent.click(submit())
    expect(await screen.findByText('سبب الإعادة قصير؛ اكتب 5 أحرف على الأقل.')).toBeInTheDocument()
    expect(svc.returnForRework).not.toHaveBeenCalled()
  })

  it('sends the trimmed reason and closes as a success', async () => {
    svc.returnForRework.mockResolvedValue({ success: true })
    const { onSuccess } = mount()
    await userEvent.type(await screen.findByLabelText(/سبب الإعادة/), '  أكمل اختبار الاتصال  ')
    await userEvent.click(submit())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.returnForRework).toHaveBeenCalledWith(31, 'أكمل اختبار الاتصال')
  })

  it('1000 characters is the most; one more is refused before the request', async () => {
    mount()
    const box = await screen.findByLabelText(/سبب الإعادة/)
    await userEvent.click(box)
    await userEvent.paste('أ'.repeat(1001))
    expect(screen.getByText('1001 / 1000')).toBeInTheDocument()
    await userEvent.click(submit())
    expect(await screen.findByText('سبب الإعادة طويل جدًا؛ الحد الأقصى 1000 حرف.')).toBeInTheDocument()
    expect(svc.returnForRework).not.toHaveBeenCalled()
  })

  it('403 and 422 stay in the dialog, 409 re-reads the ticket', async () => {
    svc.returnForRework.mockRejectedValueOnce(apiError(403, { message: 'لا تملك صلاحية إعادة هذه التذكرة.' }))
    const { onStale } = mount()
    await userEvent.type(await screen.findByLabelText(/سبب الإعادة/), 'سبب كافٍ')
    await userEvent.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية إعادة هذه التذكرة.')

    svc.returnForRework.mockRejectedValueOnce(apiError(422, { message: 'x', errors: { reason: ['سبب الإعادة غير صالح.'] } }))
    await userEvent.click(submit())
    expect(await screen.findByText('سبب الإعادة غير صالح.')).toBeInTheDocument()

    svc.returnForRework.mockRejectedValueOnce(apiError(409, { message: 'التذكرة ليست بانتظار المراجعة.' }))
    await userEvent.click(submit())
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1))
    expect(toastMock.error).toHaveBeenCalledWith('التذكرة ليست بانتظار المراجعة.')
  })

  it('a double click sends one request', async () => {
    const pending = deferred<{ success: boolean }>()
    svc.returnForRework.mockReturnValue(pending.promise)
    const { onSuccess } = mount()
    await userEvent.type(await screen.findByLabelText(/سبب الإعادة/), 'سبب كافٍ')
    await userEvent.dblClick(submit())
    expect(svc.returnForRework).toHaveBeenCalledTimes(1)
    pending.resolve({ success: true })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})

// ── 7. «الرصيد والتقدير» on the ticket ──────────────────────────────────────────

describe('TicketCreditBlock', () => {
  const credit = (over: Partial<TicketCredit> = {}): TicketCredit => ({ status: 'none', points: null, hours: null, minutes: null, credited_at: null, credited_by_name: null, ...over })

  it('none: the estimate (planning) and «لم يُسجَّل رصيد»', () => {
    render(<TicketCreditBlock ticket={ticket({ status: 'IN_PROGRESS', credit: credit() })} />)
    const block = screen.getByTestId('ticket-credit-block')
    expect(block).toHaveTextContent('الرصيد والتقدير')
    expect(within(block).getByTestId('credit-scope')).toHaveTextContent('مهمة متوسطة')
    expect(within(block).getByTestId('credit-points')).toHaveTextContent('120 نقطة')
    expect(within(block).getByTestId('credit-planned-duration')).toHaveTextContent('المدة التقريبية (تخطيط)')
    expect(within(block).getByTestId('credit-planned-duration')).toHaveTextContent('ساعتان و30 دقيقة')
    expect(within(block).queryByTestId('credit-actual')).not.toBeInTheDocument()
    expect(within(block).getByTestId('credit-status')).toHaveTextContent('لم يُسجَّل رصيد')
  })

  it('pending review without an actual duration: «لم تُدخَل المدة الفعلية بعد»', () => {
    render(<TicketCreditBlock ticket={ticket({ actual_minutes: null, credit: credit({ status: 'pending_review' }) })} />)
    expect(screen.getByTestId('credit-status')).toHaveTextContent('بانتظار الاعتماد النهائي')
    expect(screen.getByTestId('credit-actual-missing')).toHaveTextContent('لم تُدخَل المدة الفعلية بعد')
  })

  it('pending review with an entered actual duration shows it as «المدة الفعلية (المعتمدة)»', () => {
    render(<TicketCreditBlock ticket={ticket({ actual_minutes: 75, credit: credit({ status: 'pending_review' }) })} />)
    expect(screen.getByTestId('credit-actual-duration')).toHaveTextContent('المدة الفعلية (المعتمدة)')
    expect(screen.getByTestId('credit-actual-duration')).toHaveTextContent('ساعة و15 دقيقة')
    expect(screen.queryByTestId('credit-actual-missing')).not.toBeInTheDocument()
  })

  it('credited with minutes: both durations side by side, the actual one in hours and minutes, the assignee, date and approver', () => {
    render(<TicketCreditBlock ticket={ticket({ status: 'RESOLVED', actual_minutes: 75, credit: credit({ status: 'credited', points: 120, hours: 1.25, minutes: 75, credited_at: '2026-11-20T10:00:00Z', credited_by_name: 'المدير العام' }) })} />)
    expect(screen.getByTestId('credit-planned-duration')).toHaveTextContent('ساعتان و30 دقيقة')
    expect(screen.getByTestId('credit-actual-duration')).toHaveTextContent('ساعة و15 دقيقة')
    const status = screen.getByTestId('credit-status')
    expect(status).toHaveTextContent('أُضيف إلى رصيد سلمى بتاريخ')
    expect(status).toHaveTextContent('اعتمده: المدير العام')
    expect(screen.getByTestId('credit-amounts')).toHaveTextContent('120 نقطة · ساعة و15 دقيقة')
    expect(screen.queryByTestId('credit-legacy-hours')).not.toBeInTheDocument()
  })

  it('an old credit without minutes: the credited hours under «ساعات مُضافة (قبل تسجيل المدة الفعلية)»', () => {
    render(<TicketCreditBlock ticket={ticket({ status: 'RESOLVED', actual_minutes: null, credit: credit({ status: 'credited', points: 120, hours: 2.5, minutes: null, credited_at: '2026-11-20T10:00:00Z', credited_by_name: 'المدير' }) })} />)
    expect(screen.getByTestId('credit-legacy-hours')).toHaveTextContent('ساعات مُضافة (قبل تسجيل المدة الفعلية)')
    expect(screen.getByTestId('credit-legacy-hours')).toHaveTextContent('ساعتان و30 دقيقة')
    expect(screen.queryByTestId('credit-actual-duration')).not.toBeInTheDocument()
    expect(screen.getByTestId('credit-amounts')).toHaveTextContent('120 نقطة · ساعتان و30 دقيقة')
  })

  it('a legacy ticket (estimate keys present but empty): the «لا تقدير لهذه التذكرة» hint', () => {
    render(<TicketCreditBlock ticket={ticket({ task_scope: null, task_points: null, estimated_hours: null, credit: credit({ status: 'pending_review' }) })} />)
    expect(screen.getByTestId('credit-no-estimate')).toHaveTextContent('لا تقدير لهذه التذكرة')
  })

  it('absent for a viewer the server hid it from: nothing at all is rendered', () => {
    const { task_scope: _a, task_points: _b, estimated_hours: _c, credit: _d, actual_minutes: _e, ...bare } = ticket()
    void _a; void _b; void _c; void _d; void _e
    const { container } = render(<TicketCreditBlock ticket={bare} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('formatDurationMinutes: Arabic plural forms', () => {
  it.each([
    [75, 'ساعة و15 دقيقة'],
    [120, 'ساعتان'],
    [45, '45 دقيقة'],
    [60, 'ساعة'],
    [1, 'دقيقة'],
    [2, 'دقيقتان'],
    [3, '3 دقائق'],
    [10, '10 دقائق'],
    [11, '11 دقيقة'],
    [180, '3 ساعات'],
    [600, '10 ساعات'],
    [660, '11 ساعة'],
    [122, 'ساعتان ودقيقتان'],
    [150, 'ساعتان و30 دقيقة'],
    [183, '3 ساعات و3 دقائق'],
    [60000, '1000 ساعة'],
  ])('%i minutes -> %s', (m, text) => {
    expect(formatDurationMinutes(m)).toBe(text)
  })

  it('nothing usable is a dash, never «0 دقيقة»', () => {
    for (const v of [null, undefined, 0, -5, Number.NaN]) expect(formatDurationMinutes(v)).toBe('—')
    expect(formatDurationHours(2.5)).toBe('ساعتان و30 دقيقة')
    expect(formatDurationHours(null)).toBe('—')
  })
})

// ── 8. the old copy is gone ─────────────────────────────────────────────────────

describe('no ticket screen still says points are never credited, or that «تم الحل» closes the ticket from the assignee', () => {
  const sources = import.meta.glob(['/src/components/tickets/**/*.tsx', '/src/components/operations/TaskEstimateFields.tsx', '/src/lib/taskEstimate.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

  it('every place that talks about the balance says the credited time is the ACTUAL approved duration', () => {
    expect(TICKET_ESTIMATE_NOTE).toContain('المدة الفعلية')
    expect(TICKET_ESTIMATE_NOTE).toContain('المدة التقريبية للتخطيط فقط')
    expect(sources['/src/components/tickets/modals/CompleteTaskModal.tsx']).toContain('المدة الفعلية التي تسجّلها الآن')
    expect(sources['/src/components/tickets/AssigneeWorkspacePage.tsx']).toContain('المدة الفعلية التي تسجّلها الآن')
    expect(sources['/src/components/tickets/modals/EditEstimateModal.tsx']).toContain('TICKET_ESTIMATE_NOTE')
    expect(sources['/src/components/tickets/ops/TicketAssignmentPanel.tsx']).toContain('TICKET_ESTIMATE_NOTE')
  })

  it('scans the ticket sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
  })

  it.each([
    'تقدير للتخطيط فقط',
    'ولا تُضاف إلى رصيد المكلّف.',
    'تأكيد الحل والإغلاق',
    'تأكيد الإغلاق (تم الحل)',
    'تم إغلاق التذكرة — أحسنت',
    'أنهِ وأغلق التذكرة',
    // the old approval note implied the corrected estimate is what is credited
    'تُضاف القيم النهائية',
    // round 3: the approximate duration is never credited
    'تقدير للتخطيط، ولا تُضاف إلى رصيد المكلّف إلا مرة واحدة',
  ])('«%s» appears nowhere', (phrase) => {
    const hits = Object.entries(sources).filter(([, src]) => src.includes(phrase)).map(([file]) => file)
    expect(hits).toEqual([])
  })
})

// ── 9. round 2: the estimate freeze, codes, folded counts, the ledger category ──────

describe('«تعديل النقاط والمدة» is strictly the server capability', () => {
  const editBtn = () => screen.queryByRole('button', { name: 'تعديل النقاط والمدة' })

  it('not offered in PENDING_REVIEW when can_edit_estimate is false, even for a reviewer', () => {
    render(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, confirm_review: true, return_for_rework: true, can_edit_estimate: false } })} onChanged={vi.fn()} />)
    expect(editBtn()).not.toBeInTheDocument()
  })

  it('offered only when the capability is true', () => {
    render(<TicketActionCenter ticket={ticket({ status: 'IN_PROGRESS', capabilities: { ...NO_CAPS, can_edit_estimate: true } })} onChanged={vi.fn()} />)
    expect(editBtn()).toBeInTheDocument()
  })

  it('a 409 ESTIMATE_FROZEN on save shows the server message inside the dialog', async () => {
    svc.updateWorkEstimate.mockRejectedValue(apiError(409, { success: false, code: 'ESTIMATE_FROZEN', message: 'التقدير مجمّد أثناء المراجعة.' }))
    render(<EditEstimateModal ticketId={3} current={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('التقدير مجمّد أثناء المراجعة.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('error codes', () => {
  it('reads the code of a refusal, and null when there is none', () => {
    expect(apiErrorCode(apiError(409, { code: 'ESTIMATE_FROZEN' }))).toBe('ESTIMATE_FROZEN')
    expect(apiErrorCode(apiError(403, { code: 'SELF_REVIEW' }))).toBe('SELF_REVIEW')
    expect(apiErrorCode(apiError(409, { message: 'x' }))).toBeNull()
    expect(apiErrorCode(new Error('x'))).toBeNull()
  })
})

describe('a reporter-only viewer: no review column or count', () => {
  it('an absent pending_review count is 0 and an absent column does not break the 7-column board', async () => {
    api.get.mockResolvedValue({ data: { data: { counts: { total: 3, in_progress: 2 } } } })
    expect((await fetchTicketStats({})).counts.pendingReview).toBe(0)
    const seven: BoardColumn[] = (['PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ADMIN', 'REJECTED_BY_ASSIGNEE'] as TicketStatus[]).map((status) => ({ status, count: 0, tickets: [] }))
    render(
      <MemoryRouter>
        <TicketKanbanBoard columns={seven} loading={false} activeId={null} onOpen={vi.fn()} onAction={vi.fn()} onShowAll={vi.fn()} />
      </MemoryRouter>,
    )
    const board = screen.getByTestId('ticket-status-board')
    expect(within(board).queryByText('بانتظار المراجعة والاعتماد')).not.toBeInTheDocument()
    expect(within(board).getAllByText('قيد المعالجة').length).toBeGreaterThan(0)
  })
})

describe('the points ledger category «ticket»', () => {
  it('is labelled «تذكرة», never the raw word', () => {
    expect(AWARD_CATEGORIES.find((c) => c.value === 'ticket')?.label).toBe('تذكرة')
    expect(categoryLabel('ticket')).toBe('تذكرة')
    expect(categoryLabel('task')).toBe('مهمة')
  })
})
