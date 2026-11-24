import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { Ticket, TicketActivityLog, TicketCapabilities, TicketReviewContext } from '@/types/ticket'

const svc = vi.hoisted(() => ({
  getMeta: vi.fn(),
  confirmReview: vi.fn(),
  returnForRework: vi.fn(),
  markDeployed: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }))
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: toastMock }))
vi.mock('@/api/axios', () => ({ default: api }))

import { ConfirmReviewButton } from '@/components/tickets/ConfirmReviewButton'
import { ReturnForReworkModal } from '@/components/tickets/modals/ReturnForReworkModal'
import { TicketLifecyclePanel } from '@/components/tickets/TicketLifecyclePanel'
import { TicketReviewContextNotice } from '@/components/tickets/TicketReviewContextNotice'
import { TicketActivityTimeline } from '@/components/tickets/ops/TicketActivityTimeline'
import { RowActions } from '@/components/tickets/ops/TicketTable'
import { reviewRefusalOf } from '@/services/ticketOpsService'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})
beforeEach(() => {
  vi.clearAllMocks()
  svc.getMeta.mockResolvedValue({ tech_units: [], users: [] })
})

const apiError = (status: number, data: Record<string, unknown>) =>
  new AxiosError('x', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data })

const CAPS: TicketCapabilities = {
  approve: false, reject: false, reassign: false, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: true,
}

const ctx = (over: Partial<TicketReviewContext> = {}): TicketReviewContext => ({
  stage: 'PENDING_REVIEW', can_review: false, reason: 'missing_permission', relation: [], needs_participation_permission: false,
  required_permissions: ['tickets.review_completion'], ...over,
})

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 31, ticket_number: 'EMC-31', title: 'مشكلة', description: '...', ticket_category: 'OLD_ISSUE', priority: 'MEDIUM', department_id: 2,
    created_by_name: 'سارة', status: 'PENDING_REVIEW', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-02T00:00:00Z', assigned_to_id: 9,
    assignee: { id: 9, name: 'سلمى', email: '' }, task_scope: 'medium', task_points: 120, estimated_hours: 2.5, capabilities: CAPS,
    workflow: { stage: 'pending_review', next_actor: 'reviewer', next_step_key: 'review' } as Ticket['workflow'],
    ...over,
  }
}

const log = (over: Partial<TicketActivityLog>): TicketActivityLog => ({ id: 1, ticket_id: 31, action: 'APPROVED_COMPLETION', logged_at: '2026-11-26T21:28:00Z', performed_by_name: 'ليلى', ...over })

describe('review_context: why review is not available', () => {
  it('missing review permission: asks for «مراجعة واعتماد إنجاز التذاكر»', () => {
    render(<TicketReviewContextNotice context={ctx()} />)

    expect(screen.getByTestId('review-context-message')).toHaveTextContent('تلزمك صلاحية «مراجعة واعتماد إنجاز التذاكر»')
    expect(screen.getByTestId('review-context-required')).toHaveTextContent('مراجعة واعتماد إنجاز التذاكر')
  })

  it('needs the participation permission: names what the viewer is to the ticket and what to ask for', () => {
    render(
      <TicketReviewContextNotice
        context={ctx({ reason: 'needs_participation_permission', relation: ['creator', 'assignee', 'submitter'], needs_participation_permission: true, required_permissions: ['tickets.review_completion', 'tickets.review_participated'] })}
      />,
    )

    const text = screen.getByTestId('review-context-message').textContent ?? ''
    expect(text).toContain('أنت منشئ ومكلّف ومقدّم إنجاز هذه التذكرة')
    expect(text).toContain('«اعتماد التذاكر التي أشارك فيها»')
    expect(screen.getByTestId('review-context-required')).toHaveTextContent('مراجعة واعتماد إنجاز التذاكر + اعتماد التذاكر التي أشارك فيها')
  })

  it('survives a context without the optional arrays (an older or partial payload)', () => {
    const partial = { stage: 'PENDING_REVIEW', can_review: false, reason: 'missing_permission' } as unknown as TicketReviewContext
    render(<TicketReviewContextNotice context={partial} />)

    expect(screen.getByTestId('review-context-message')).toHaveTextContent('تلزمك صلاحية')
    expect(screen.queryByTestId('review-context-required')).toBeNull()
  })

  it('a single relation reads as one role', () => {
    render(<TicketReviewContextNotice context={ctx({ reason: 'needs_participation_permission', relation: ['assignee'], needs_participation_permission: true })} />)

    expect(screen.getByTestId('review-context-message').textContent).toContain('أنت مكلّف هذه التذكرة')
  })

  it('renders nothing when the server sent no context (reporter, plain member) or when the viewer can review', () => {
    const { container, rerender } = render(<TicketReviewContextNotice context={undefined} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<TicketReviewContextNotice context={null} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<TicketReviewContextNotice context={ctx({ can_review: true, reason: null })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows up inside the lifecycle panel, and not when the ticket has no review_context', () => {
    const { rerender } = render(<TicketLifecyclePanel ticket={ticket({ review_context: ctx() })} />)
    expect(screen.getByTestId('review-context')).toBeInTheDocument()

    rerender(<TicketLifecyclePanel ticket={ticket()} />)
    expect(screen.queryByTestId('review-context')).toBeNull()
  })

  it('never turns into a button: the context explains, the capabilities decide', () => {
    // review_context says the viewer cannot review and the capabilities agree: no review action is offered anywhere.
    render(<RowActions ticket={ticket({ review_context: ctx() })} onAction={vi.fn()} />)

    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('review buttons come only from the server capabilities', () => {
  it('shows exactly the review actions the capabilities allow', () => {
    const { rerender } = render(<RowActions ticket={ticket({ capabilities: { ...CAPS, confirm_review: true, return_for_rework: true } })} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: /تأكيد مراجعة التذكرة/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /إعادة التذكرة EMC-31 للتنفيذ/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /للنشر/ })).toBeNull()

    // outside PENDING_REVIEW the confirm button never shows, whatever the capability says
    rerender(<RowActions ticket={ticket({ status: 'APPROVED_FOR_DEPLOY', capabilities: { ...CAPS, confirm_review: true } })} onAction={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /تأكيد مراجعة/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /إعادة التذكرة/ })).toBeNull()
  })
})

describe('the review history shows who decided, when, and in what capacity', () => {
  const logs = [
    log({ id: 1, action: 'SUBMITTED_FOR_REVIEW', performed_by_name: 'سلمى' }),
    log({ id: 2, action: 'APPROVED_COMPLETION', metadata: { reviewer_relation: ['creator', 'assignee'], participated: true, review_round: 2 } }),
    log({ id: 3, action: 'RETURNED_FOR_REWORK', performed_by_name: 'منى', metadata: { reviewer_relation: [], participated: false, review_round: 1 } }),
  ]

  it('the timeline names the approver and the time (24h) and flags a reviewer who was the creator / assignee', () => {
    render(<TicketActivityTimeline logs={logs} />)

    const rows = screen.getAllByRole('listitem')
    const approved = rows.find((r) => r.getAttribute('data-action') === 'APPROVED_COMPLETION')!
    expect(within(approved).getByText('ليلى')).toBeInTheDocument()
    expect(approved.textContent).toMatch(/\d{2}:\d{2}/)
    expect(approved.textContent).not.toMatch(/\s[صم]\b/)
    const rel = within(approved).getByTestId('reviewer-relation')
    expect(rel).toHaveTextContent('المراجع هو:')
    expect(rel).toHaveTextContent('المنشئ')
    expect(rel).toHaveTextContent('المكلّف')
    expect(within(approved).getByTestId('review-round')).toHaveTextContent('جولة المراجعة 2')
    expect(rel).toHaveTextContent('بصلاحية اعتماد التذاكر التي أشارك فيها')
  })

  it('a reviewer with no tie to the ticket gets no relation line, and a row without metadata none at all', () => {
    render(<TicketActivityTimeline logs={logs} />)

    const returned = screen.getAllByRole('listitem').find((r) => r.getAttribute('data-action') === 'RETURNED_FOR_REWORK')!
    expect(within(returned).queryByTestId('reviewer-relation')).toBeNull()
    expect(within(returned).getByText('منى')).toBeInTheDocument()
    const submitted = screen.getAllByRole('listitem').find((r) => r.getAttribute('data-action') === 'SUBMITTED_FOR_REVIEW')!
    expect(within(submitted).queryByTestId('review-log-meta')).toBeNull()
  })

  it('the lifecycle history uses the three Arabic labels «المنشئ» «المكلّف» «مقدّم الإنجاز»', () => {
    render(<TicketLifecyclePanel ticket={ticket({ activity_logs: [log({ metadata: { reviewer_relation: ['creator', 'assignee', 'submitter'], participated: true, review_round: 1 } })] })} />)

    const rel = within(screen.getByTestId('lifecycle-history')).getByTestId('reviewer-relation')
    expect(rel).toHaveTextContent('المنشئ')
    expect(rel).toHaveTextContent('المكلّف')
    expect(rel).toHaveTextContent('مقدّم الإنجاز')
    expect(screen.getByTestId('lifecycle-history')).toHaveTextContent('ليلى')
  })

  it('handles absent metadata (reporter / older row) without a crash', () => {
    render(<TicketLifecyclePanel ticket={ticket({ activity_logs: [log({ metadata: undefined })] })} />)

    expect(screen.getByTestId('lifecycle-history')).toHaveTextContent('ليلى')
    expect(screen.queryByTestId('review-log-meta')).toBeNull()
  })
})

describe('403 REVIEW_PERMISSION_REQUIRED / PARTICIPATION_PERMISSION_REQUIRED show the server\'s Arabic sentence', () => {
  const REVIEW_MSG = 'لا تملك صلاحية «مراجعة واعتماد إنجاز التذاكر»؛ اطلبها من مسؤول الصلاحيات.'
  const PART_MSG = 'أنت منشئ التذكرة؛ ولاعتماد تذكرة تشارك فيها تلزمك صلاحية «اعتماد التذاكر التي أشارك فيها».'

  it('reviewRefusalOf reads only a 403 with one of the two codes', () => {
    expect(reviewRefusalOf(apiError(403, { success: false, message: REVIEW_MSG, code: 'REVIEW_PERMISSION_REQUIRED' }))).toEqual({ code: 'REVIEW_PERMISSION_REQUIRED', message: REVIEW_MSG })
    expect(reviewRefusalOf(apiError(403, { code: 'PARTICIPATION_PERMISSION_REQUIRED' }))?.message).toContain('اعتماد التذاكر التي أشارك فيها')
    expect(reviewRefusalOf(apiError(403, { code: 'HR_APPROVAL_REQUIRED', message: 'x' }))).toBeNull()
    expect(reviewRefusalOf(apiError(409, { code: 'REVIEW_PERMISSION_REQUIRED' }))).toBeNull()
    expect(reviewRefusalOf(new Error('x'))).toBeNull()
  })

  it.each([
    ['REVIEW_PERMISSION_REQUIRED', REVIEW_MSG],
    ['PARTICIPATION_PERMISSION_REQUIRED', PART_MSG],
  ])('confirm review: %s shows the server sentence (no generic error) and the ticket is re-read', async (code, message) => {
    svc.confirmReview.mockRejectedValue(apiError(403, { success: false, message, code }))
    const onDone = vi.fn()
    render(<ConfirmReviewButton ticket={ticket({ capabilities: { ...CAPS, confirm_review: true } })} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد المراجعة' }))

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(message))
    expect(toastMock.error).not.toHaveBeenCalledWith('تعذّر تأكيد المراجعة')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['REVIEW_PERMISSION_REQUIRED', REVIEW_MSG],
    ['PARTICIPATION_PERMISSION_REQUIRED', PART_MSG],
  ])('return for rework: %s stays inline with the server message', async (code, message) => {
    svc.returnForRework.mockRejectedValue(apiError(403, { success: false, message, code }))
    const onStale = vi.fn()
    render(<ReturnForReworkModal ticketId={31} onClose={vi.fn()} onSuccess={vi.fn()} onStale={onStale} />)
    await userEvent.type(await screen.findByLabelText(/سبب الإعادة/), 'سبب كافٍ للإعادة')
    await userEvent.click(screen.getByRole('button', { name: /^إعادة للتنفيذ$/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('alert')).not.toHaveTextContent('تعذّرت إعادة التذكرة')
    expect(onStale).not.toHaveBeenCalled()
  })

  it('the retired SELF_REVIEW code is still shown harmlessly (the server message, inline)', async () => {
    svc.returnForRework.mockRejectedValue(apiError(403, { code: 'SELF_REVIEW', message: 'لا يمكنك اعتماد عمل قدّمته بنفسك.' }))
    render(<ReturnForReworkModal ticketId={31} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.type(await screen.findByLabelText(/سبب الإعادة/), 'سبب كافٍ للإعادة')
    await userEvent.click(screen.getByRole('button', { name: /^إعادة للتنفيذ$/ }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('عمل قدّمته بنفسك'))
  })
})
