import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'
import type { MyWorkTicket, Ticket, TicketCapabilities, TicketCredit, TicketStatus, TicketWorkflow } from '@/types/ticket'

const svc = vi.hoisted(() => ({
  getMeta: vi.fn(),
  approveTicket: vi.fn(),
  reassign: vi.fn(),
  updateWorkEstimate: vi.fn(),
  confirmReview: vi.fn(),
  markDeployed: vi.fn(),
  verifyResolved: vi.fn(),
  verifyFailed: vi.fn(),
  returnForRework: vi.fn(),
  completeTask: vi.fn(),
  acceptTask: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }))
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: toastMock }))
vi.mock('@/api/axios', () => ({ default: api }))
// The assignee picker is a react-select; a plain select keeps these tests about the lifecycle.
vi.mock('@/components/tickets/AssigneeSearchSelect', () => ({
  default: ({ users, value, onChange, ariaLabel, isDisabled }: { users: Array<{ id: number; name: string }>; value: string; onChange: (v: string) => void; ariaLabel: string; isDisabled?: boolean }) => (
    <select aria-label={ariaLabel} value={value} disabled={isDisabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">--</option>
      {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
    </select>
  ),
}))

import { ApproveTicketModal } from '@/components/tickets/modals/ApproveTicketModal'
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal'
import { EditEstimateModal } from '@/components/tickets/modals/EditEstimateModal'
import { MarkDeployedModal, VerifyFailedModal, VerifyResolvedModal } from '@/components/tickets/modals/TicketStepModals'
import { ReturnForReworkModal } from '@/components/tickets/modals/ReturnForReworkModal'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import { TicketLifecyclePanel } from '@/components/tickets/TicketLifecyclePanel'
import { TicketCreditBlock } from '@/components/tickets/TicketCreditBlock'
import TicketStatusBadge from '@/components/tickets/TicketStatusBadge'
import { TicketKpiCards } from '@/components/tickets/ops/TicketKpiCards'
import { TicketKanbanBoard } from '@/components/tickets/ops/TicketKanbanBoard'
import { RowActions } from '@/components/tickets/ops/TicketTable'
import { STATUS_LABELS, STATUS_META, TIMELINE_META, isClosed, ticketActionLabel } from '@/components/tickets/ops/ticketOpsUi'
import WorkItemCard from '@/components/operations/myWork/WorkItemCard'
import TaskEstimateFields from '@/components/operations/TaskEstimateFields'
import { ticketToWorkItem } from '@/lib/myWork'
import { columnForTicket, MY_WORK_COLUMN_LABEL } from '@/lib/myWorkColumns'
import { NEXT_STEP_TEXT, TICKET_DEPLOYMENT_CLAUSE, validateLiveUrl, deploymentFreezeMessage, isDeploymentFlagLocked } from '@/lib/ticketLifecycle'
import { DURATION_PRESETS, TICKET_ESTIMATE_NOTE, emptyEstimate, pointsChoices } from '@/lib/taskEstimate'
import { reporterStatusCopy } from '@/utils/reporterTicketStatus'
import { DEFAULT_FILTERS, TICKET_STATUSES, kpiPatch, TICKET_PRESETS } from '@/utils/ticketFilters'
import { fetchTicketStats } from '@/services/ticketOpsService'
import type { BoardColumn, TicketStats } from '@/types/ticketOps'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const POINTS = { simple: [25, 30, 40, 50], medium: [75, 100, 120, 150], large: [200, 250, 300], strategic: [300, 400, 500] }

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(api).forEach((m) => m.mockReset())
  svc.getMeta.mockResolvedValue({ tech_units: [], users: [], points_options: POINTS })
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

const workflow = (stage: TicketWorkflow['stage'], next_actor: TicketWorkflow['next_actor'], next_step_key: TicketWorkflow['next_step_key']): TicketWorkflow => ({ stage, next_actor, next_step_key })

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 41, ticket_number: 'EMC-41', title: 'مشكلة', description: '...', ticket_category: 'OLD_ISSUE', priority: 'MEDIUM', department_id: 2,
    created_by_name: 'سارة', status: 'IN_PROGRESS', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-02T00:00:00Z', assigned_to_id: 9,
    assignee: { id: 9, name: 'سلمى', email: '' }, task_scope: 'medium', task_points: 120, estimated_hours: 2, capabilities: NO_CAPS, ...over,
  }
}

const deployTicket = (over: Partial<Ticket> = {}): Ticket => ticket({ requires_deployment: true, ...over })

// ── 1. the new statuses in every map ────────────────────────────────────────────

describe('APPROVED_FOR_DEPLOY and PENDING_VERIFICATION in every status map', () => {
  const NEW: TicketStatus[] = ['APPROVED_FOR_DEPLOY', 'PENDING_VERIFICATION']

  it('labels, colours and open state', () => {
    expect(STATUS_META.APPROVED_FOR_DEPLOY.label).toBe('معتمدة للنشر')
    expect(STATUS_META.PENDING_VERIFICATION.label).toBe('بانتظار الاختبار الحي')
    for (const s of NEW) {
      expect(STATUS_LABELS[s]).toMatch(/[؀-ۿ]/)
      expect(isClosed(s)).toBe(false)
      expect(TICKET_STATUSES).toContain(s)
    }
    expect(TICKET_STATUSES).toHaveLength(10)
  })

  it('badges', () => {
    const { rerender } = render(<TicketStatusBadge status="APPROVED_FOR_DEPLOY" />)
    expect(screen.getByText('معتمدة للنشر')).toBeInTheDocument()
    rerender(<TicketStatusBadge status="PENDING_VERIFICATION" />)
    expect(screen.getByText('بانتظار الاختبار الحي')).toBeInTheDocument()
  })

  it('the reporter fallback reads «in progress», never a deployment state', () => {
    for (const s of NEW) expect(reporterStatusCopy(s, 'OLD_ISSUE')).toEqual(reporterStatusCopy('IN_PROGRESS', 'OLD_ISSUE'))
  })

  it('both stay in «بانتظار الاعتماد والتقييم» in «مهامي»', () => {
    for (const s of NEW) expect(columnForTicket(s)).toBe('review')
    expect(MY_WORK_COLUMN_LABEL.review).toBe('بانتظار الاعتماد والتقييم')
    expect(columnForTicket('RESOLVED')).toBe('completed')
    // rework and a failed live test go back to work
    expect(columnForTicket('IN_PROGRESS')).toBe('in_progress')
  })

  it('every history action of the lifecycle has an Arabic label, never the raw key', () => {
    for (const a of ['SUBMITTED_FOR_REVIEW', 'APPROVED_FOR_DEPLOY', 'DEPLOYED_LIVE', 'VERIFIED_RESOLVED', 'VERIFICATION_FAILED', 'RETURNED_FOR_REWORK']) {
      expect(TIMELINE_META[a], a).toBeDefined()
      expect(ticketActionLabel(a)).toMatch(/[؀-ۿ]/)
      expect(ticketActionLabel(a)).not.toBe(a)
    }
  })

  it('filters and presets', () => {
    expect(kpiPatch('approvedForDeploy')).toMatchObject({ status: ['APPROVED_FOR_DEPLOY'] })
    expect(kpiPatch('pendingVerification')).toMatchObject({ status: ['PENDING_VERIFICATION'] })
    expect(TICKET_PRESETS.find((p) => p.id === 'deploy')?.patch).toMatchObject({ status: ['APPROVED_FOR_DEPLOY'] })
    expect(TICKET_PRESETS.find((p) => p.id === 'verify')?.patch).toMatchObject({ status: ['PENDING_VERIFICATION'] })
  })

  it('statistics: the new counts are read, and absent ones are 0', async () => {
    api.get.mockResolvedValue({ data: { data: { counts: { approved_for_deploy: '4', pending_verification: 3 } } } })
    const s = await fetchTicketStats({})
    expect(s.counts.approvedForDeploy).toBe(4)
    expect(s.counts.pendingVerification).toBe(3)
    api.get.mockResolvedValue({ data: { data: { counts: { total: 5 } } } })
    const none = await fetchTicketStats({})
    expect(none.counts.approvedForDeploy).toBe(0)
    expect(none.counts.pendingVerification).toBe(0)
  })

  it('KPI cards: both counts show, and a payload without them degrades to 0 instead of breaking', async () => {
    const counts = { total: 10, pendingApproval: 1, assigned: 1, inProgress: 1, pendingReview: 2, resolved: 1, unresolved: 0, rejectedByAdmin: 0, rejectedByAssignee: 0, open: 9, closed: 1, overdue: 0, dueSoon: 0, unassigned: 0, highPriority: 0, new24h: 0 }
    const timings = { windowDays: 30, avgResponseHours: null, responseSample: 0, avgResolutionHours: null, resolutionSample: 0, truncated: false, definitions: { response: '', resolution: '' } }
    const onPick = vi.fn()
    const { rerender } = render(<TicketKpiCards stats={{ counts: { ...counts, approvedForDeploy: 4, pendingVerification: 3 }, timings, scopeNote: '', dueSoonHours: 24 } as TicketStats} loading={false} filters={DEFAULT_FILTERS} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: /مزيد من المؤشرات/ }))
    expect(screen.getByTestId('kpi-value-approvedForDeploy')).toHaveTextContent('4')
    expect(screen.getByTestId('kpi-value-pendingVerification')).toHaveTextContent('3')
    await userEvent.click(screen.getByText('معتمدة للنشر'))
    expect(onPick).toHaveBeenCalledWith('approvedForDeploy')
    rerender(<TicketKpiCards stats={{ counts, timings, scopeNote: '', dueSoonHours: 24 } as TicketStats} loading={false} filters={DEFAULT_FILTERS} onPick={onPick} />)
    expect(screen.getByTestId('kpi-value-approvedForDeploy')).toHaveTextContent('0')
    expect(screen.getByTestId('kpi-value-pendingVerification')).toHaveTextContent('0')
  })

  it('the board renders the columns the server sends (9 here), new ones included', () => {
    const statuses: TicketStatus[] = ['PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED_FOR_DEPLOY', 'PENDING_VERIFICATION', 'RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ADMIN']
    const columns: BoardColumn[] = statuses.map((status) => ({ status, count: 0, tickets: [] }))
    render(
      <MemoryRouter>
        <TicketKanbanBoard columns={columns} loading={false} activeId={null} onOpen={vi.fn()} onAction={vi.fn()} onShowAll={vi.fn()} />
      </MemoryRouter>,
    )
    const board = screen.getByTestId('ticket-status-board')
    expect(within(board).getAllByText('معتمدة للنشر').length).toBeGreaterThan(0)
    expect(within(board).getAllByText('بانتظار الاختبار الحي').length).toBeGreaterThan(0)
  })
})

// ── 2. the lifecycle panel ──────────────────────────────────────────────────────

describe('TicketLifecyclePanel', () => {
  const states = () => Array.from(screen.getByTestId('lifecycle-steps').querySelectorAll('li')).map((li) => `${li.getAttribute('data-stage')}:${li.getAttribute('data-state')}`)

  it('a deployment ticket in progress: the 5-step stepper, the assignee holds the next move', () => {
    render(<TicketLifecyclePanel ticket={deployTicket({ workflow: workflow('in_progress', 'assignee', 'submit_for_review') })} />)
    expect(screen.getByTestId('lifecycle-steps').querySelectorAll('li')).toHaveLength(5)
    expect(states()).toEqual(['in_progress:current', 'pending_review:upcoming', 'approved_for_deploy:upcoming', 'pending_verification:upcoming', 'resolved:upcoming'])
    expect(screen.getByTestId('lifecycle-next')).toHaveTextContent('بانتظار إرسال المكلّف العمل للمراجعة')
    expect(screen.getByTestId('lifecycle-actor')).toHaveTextContent('المكلّف')
    expect(screen.getByTestId('lifecycle-deployment-badge')).toBeInTheDocument()
  })

  it('pending review: the reviewer holds it («بانتظار مراجعة الإنجاز»)', () => {
    render(<TicketLifecyclePanel ticket={deployTicket({ status: 'PENDING_REVIEW', workflow: workflow('pending_review', 'reviewer', 'review') })} />)
    expect(states()).toEqual(['in_progress:done', 'pending_review:current', 'approved_for_deploy:upcoming', 'pending_verification:upcoming', 'resolved:upcoming'])
    expect(screen.getByTestId('lifecycle-next')).toHaveTextContent('بانتظار مراجعة الإنجاز')
    expect(screen.getByTestId('lifecycle-actor')).toHaveTextContent('المراجع')
  })

  it('approved for deployment: the deployer holds it, and who approved and when is shown', () => {
    render(
      <TicketLifecyclePanel
        ticket={deployTicket({
          status: 'APPROVED_FOR_DEPLOY',
          workflow: workflow('approved_for_deploy', 'deployer', 'deploy'),
          deployment: { review_approved_by_name: 'المدير', review_approved_at: '2026-11-20T10:00:00Z', deployed_by_name: null, deployed_at: null, live_url: null, verified_at: null, round: 1 },
        })}
      />,
    )
    expect(states()).toEqual(['in_progress:done', 'pending_review:done', 'approved_for_deploy:current', 'pending_verification:upcoming', 'resolved:upcoming'])
    expect(screen.getByTestId('lifecycle-next')).toHaveTextContent('بانتظار النشر على الموقع الحي')
    expect(screen.getByTestId('lifecycle-actor')).toHaveTextContent('مسؤول النشر')
    expect(screen.getByTestId('lifecycle-approved')).toHaveTextContent('المدير')
    expect(screen.queryByTestId('lifecycle-deployed')).not.toBeInTheDocument()
    expect(screen.queryByTestId('lifecycle-live-link')).not.toBeInTheDocument()
  })

  it('pending verification: the assignee tests; the live link opens in a new tab with noopener', () => {
    render(
      <TicketLifecyclePanel
        ticket={deployTicket({
          status: 'PENDING_VERIFICATION',
          workflow: workflow('pending_verification', 'assignee', 'verify_live'),
          deployment: { review_approved_by_name: 'المدير', review_approved_at: '2026-11-20T10:00:00Z', deployed_by_name: 'خالد', deployed_at: '2026-11-21T09:30:00Z', live_url: 'https://emc.example/page', verified_at: null, round: 2 },
        })}
      />,
    )
    expect(states()).toEqual(['in_progress:done', 'pending_review:done', 'approved_for_deploy:done', 'pending_verification:current', 'resolved:upcoming'])
    expect(screen.getByTestId('lifecycle-next')).toHaveTextContent('بانتظار اختبار المكلّف')
    expect(screen.getByTestId('lifecycle-deployed')).toHaveTextContent('خالد')
    expect(screen.getByTestId('lifecycle-round')).toHaveTextContent('2')
    const link = within(screen.getByTestId('lifecycle-live-link')).getByRole('link')
    expect(link).toHaveAttribute('href', 'https://emc.example/page')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.queryByTestId('lifecycle-verified')).not.toBeInTheDocument()
  })

  it('resolved: everything done, verification time shown, nobody is next', () => {
    render(
      <TicketLifecyclePanel
        ticket={deployTicket({
          status: 'RESOLVED',
          workflow: workflow('resolved', null, 'none'),
          deployment: { review_approved_by_name: 'المدير', review_approved_at: '2026-11-20T10:00:00Z', deployed_by_name: 'خالد', deployed_at: '2026-11-21T09:30:00Z', live_url: 'https://emc.example/page', verified_at: '2026-11-22T08:00:00Z', round: 1 },
        })}
      />,
    )
    expect(states().every((x) => x.endsWith(':done') || x === 'resolved:current')).toBe(true)
    expect(screen.queryByTestId('lifecycle-next')).not.toBeInTheDocument()
    expect(screen.getByTestId('lifecycle-verified')).toBeInTheDocument()
  })

  it('a link that is not https is never rendered as a link', () => {
    render(
      <TicketLifecyclePanel
        ticket={deployTicket({
          status: 'PENDING_VERIFICATION',
          workflow: workflow('pending_verification', 'assignee', 'verify_live'),
          deployment: { review_approved_by_name: null, review_approved_at: '2026-11-20T10:00:00Z', deployed_by_name: null, deployed_at: '2026-11-21T09:30:00Z', live_url: 'javascript:alert(1)', verified_at: null, round: 1 },
        })}
      />,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('the history comes from the activity log (review / deploy / verify entries only, in Arabic)', () => {
    render(
      <TicketLifecyclePanel
        ticket={deployTicket({
          status: 'PENDING_VERIFICATION',
          workflow: workflow('pending_verification', 'assignee', 'verify_live'),
          activity_logs: [
            { id: 1, ticket_id: 41, action: 'COMMENT', logged_at: '2026-11-19T10:00:00Z', performed_by_name: 'س' },
            { id: 2, ticket_id: 41, action: 'SUBMITTED_FOR_REVIEW', logged_at: '2026-11-19T11:00:00Z', performed_by_name: 'سلمى' },
            { id: 3, ticket_id: 41, action: 'APPROVED_FOR_DEPLOY', logged_at: '2026-11-20T10:00:00Z', performed_by_name: 'المدير' },
            { id: 4, ticket_id: 41, action: 'DEPLOYED_LIVE', logged_at: '2026-11-21T09:30:00Z', performed_by_name: 'خالد' },
            { id: 5, ticket_id: 41, action: 'APPROVED_COMPLETION', logged_at: '2026-11-21T09:31:00Z', performed_by_name: 'x' },
          ],
        })}
      />,
    )
    const history = screen.getByTestId('lifecycle-history')
    const actions = Array.from(history.querySelectorAll('li')).map((li) => li.getAttribute('data-action'))
    expect(actions).toEqual(['SUBMITTED_FOR_REVIEW', 'APPROVED_FOR_DEPLOY', 'DEPLOYED_LIVE'])
    expect(history).toHaveTextContent('اعتُمد للنشر')
    expect(history.textContent).not.toMatch(/APPROVED_FOR_DEPLOY|DEPLOYED_LIVE|SUBMITTED_FOR_REVIEW/)
  })

  it('a ticket that does NOT require deployment keeps its short flow and shows nothing about deployment', () => {
    render(
      <TicketLifecyclePanel
        ticket={ticket({
          status: 'PENDING_REVIEW',
          requires_deployment: false,
          workflow: workflow('pending_review', 'reviewer', 'review'),
          deployment: { review_approved_by_name: 'x', review_approved_at: '2026-11-20T10:00:00Z', deployed_by_name: 'y', deployed_at: '2026-11-21T09:30:00Z', live_url: 'https://emc.example', verified_at: null, round: 1 },
        })}
      />,
    )
    expect(screen.getByTestId('lifecycle-steps').querySelectorAll('li')).toHaveLength(3)
    expect(states()).toEqual(['in_progress:done', 'pending_review:current', 'resolved:upcoming'])
    const panel = screen.getByTestId('ticket-lifecycle')
    expect(panel).toHaveAttribute('data-deployment', 'false')
    expect(panel.textContent).not.toMatch(/نشر|الموقع الحي|الاختبار|اختبار/)
    expect(screen.queryByTestId('lifecycle-deployment')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('a legacy ticket with no requires_deployment field at all is the short flow too', () => {
    render(<TicketLifecyclePanel ticket={ticket({ status: 'PENDING_REVIEW', workflow: workflow('pending_review', 'reviewer', 'review') })} />)
    expect(screen.getByTestId('lifecycle-steps').querySelectorAll('li')).toHaveLength(3)
    expect(screen.getByTestId('ticket-lifecycle').textContent).not.toMatch(/نشر|الموقع الحي/)
  })

  it('nothing for a viewer the server sent no workflow to, or for a ticket that has not started', () => {
    const { container, rerender } = render(<TicketLifecyclePanel ticket={deployTicket({ status: 'PENDING_REVIEW' })} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<TicketLifecyclePanel ticket={deployTicket({ status: 'ASSIGNED', workflow: workflow('in_progress', 'assignee', 'submit_for_review') })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('every next-step key has its Arabic sentence (none has no sentence)', () => {
    expect(NEXT_STEP_TEXT.review).toBe('بانتظار مراجعة الإنجاز')
    expect(NEXT_STEP_TEXT.deploy).toBe('بانتظار النشر على الموقع الحي')
    expect(NEXT_STEP_TEXT.verify_live).toBe('بانتظار اختبار المكلّف')
    expect(NEXT_STEP_TEXT.none).toBeNull()
  })
})

// ── 3. buttons come ONLY from the server capabilities ───────────────────────────

describe('the action buttons follow the capabilities', () => {
  const NAMES = {
    submit: 'إرسال للمراجعة',
    confirm: 'تأكيد المراجعة',
    deployed: 'تم النشر على الموقع الحي',
    verified: 'تم التحقق — وضع كمحلولة',
    rework: 'إعادة للتنفيذ',
    oldApprove: 'اعتماد للنشر',
    oldCompletion: 'اعتماد الإنجاز',
  }
  const buttons = () => Object.fromEntries(Object.entries(NAMES).map(([k, n]) => [k, screen.queryAllByRole('button', { name: n }).length]))
  const NONE = { submit: 0, confirm: 0, deployed: 0, verified: 0, rework: 0, oldApprove: 0, oldCompletion: 0 }

  it('assignee (in progress): only «إرسال للمراجعة» for a deployment ticket (and «تعذر الحل»)', () => {
    render(<TicketActionCenter ticket={deployTicket({ capabilities: { ...NO_CAPS, complete_task: true } })} onChanged={vi.fn()} currentUserId={9} />)
    expect(buttons()).toEqual({ ...NONE, submit: 1 })
    expect(screen.getByRole('button', { name: 'تعذر الحل' })).toBeInTheDocument()
  })

  it('reviewer: «تأكيد المراجعة» and «إعادة للتنفيذ» only (the old «اعتماد للنشر» wording is gone)', () => {
    render(<TicketActionCenter ticket={deployTicket({ status: 'PENDING_REVIEW', capabilities: { ...NO_CAPS, confirm_review: true, return_for_rework: true } })} onChanged={vi.fn()} />)
    expect(buttons()).toEqual({ ...NONE, confirm: 1, rework: 1 })
  })

  it('deployer: only «تم النشر على الموقع الحي» (the reviewer may also send it back while approved)', () => {
    const { rerender } = render(<TicketActionCenter ticket={deployTicket({ status: 'APPROVED_FOR_DEPLOY', capabilities: { ...NO_CAPS, mark_deployed: true } })} onChanged={vi.fn()} />)
    expect(buttons()).toEqual({ ...NONE, deployed: 1 })
    rerender(<TicketActionCenter ticket={deployTicket({ status: 'APPROVED_FOR_DEPLOY', capabilities: { ...NO_CAPS, return_for_rework: true } })} onChanged={vi.fn()} />)
    expect(buttons()).toEqual({ ...NONE, rework: 1 })
  })

  it('assignee after the live deployment: «تم التحقق» and «إعادة للتنفيذ»', () => {
    render(<TicketActionCenter ticket={deployTicket({ status: 'PENDING_VERIFICATION', capabilities: { ...NO_CAPS, verify_resolved: true, verify_failed: true } })} onChanged={vi.fn()} currentUserId={9} />)
    expect(buttons()).toEqual({ ...NONE, verified: 1, rework: 1 })
  })

  it('a regular ticket in review offers the same «تأكيد المراجعة», never the deployment buttons or the old «اعتماد الإنجاز»', () => {
    render(<TicketActionCenter ticket={ticket({ status: 'PENDING_REVIEW', capabilities: { ...NO_CAPS, confirm_review: true, return_for_rework: true } })} onChanged={vi.fn()} />)
    expect(buttons()).toEqual({ ...NONE, confirm: 1, rework: 1 })
    expect(screen.queryByRole('button', { name: 'تعذر الحل' })).not.toBeInTheDocument()
  })

  it('plain member / reporter (no capabilities granted): the action center renders nothing, whatever the status', () => {
    for (const status of ['PENDING_REVIEW', 'APPROVED_FOR_DEPLOY', 'PENDING_VERIFICATION'] as TicketStatus[]) {
      const { container, unmount } = render(<TicketActionCenter ticket={deployTicket({ status, capabilities: NO_CAPS })} onChanged={vi.fn()} currentUserId={77} />)
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
    const { container } = render(<TicketActionCenter ticket={{ ...deployTicket(), capabilities: undefined }} onChanged={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('card / row actions: «تأكيد المراجعة» only when granted', async () => {
    svc.confirmReview.mockResolvedValue({ success: true, message: 'ok', data: { status: 'APPROVED_FOR_DEPLOY' } })
    const onConfirmed = vi.fn()
    const t = deployTicket({ status: 'PENDING_REVIEW', capabilities: { ...NO_CAPS, confirm_review: true } })
    const { rerender } = render(<RowActions ticket={t} onAction={vi.fn()} onConfirmed={onConfirmed} />)
    await userEvent.click(screen.getByRole('button', { name: /تأكيد مراجعة التذكرة EMC-41/ }))
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled())
    rerender(<RowActions ticket={deployTicket({ capabilities: NO_CAPS })} onAction={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

// ── 4. «إرسال للمراجعة»: a small dialog with the ACTUAL duration ────────────────

describe('«إرسال للمراجعة» on a deployment ticket', () => {
  const mount = (onChanged = vi.fn(), over: Partial<Ticket> = {}) => {
    render(<TicketActionCenter ticket={deployTicket({ capabilities: { ...NO_CAPS, complete_task: true }, ...over })} onChanged={onChanged} currentUserId={9} />)

    return onChanged
  }
  const open = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'إرسال للمراجعة' }))

    return await screen.findByTestId('submit-review-modal')
  }
  const submit = () => userEvent.click(within(screen.getByTestId('submit-review-modal')).getByRole('button', { name: 'إرسال للمراجعة' }))

  it('opens a small dialog with hours + minutes that START EMPTY; nothing is sent by opening it', async () => {
    mount()
    const dialog = await open()
    expect(svc.completeTask).not.toHaveBeenCalled()
    expect((within(dialog).getByLabelText('ساعات') as HTMLSelectElement).value).toBe('')
    expect((within(dialog).getByLabelText('دقائق') as HTMLSelectElement).value).toBe('')
    expect(dialog.querySelector('textarea, input[type="text"]')).toBeNull()
  })

  it('empty or 0h 0m is refused before any request, with the Arabic message under the field', async () => {
    mount()
    const dialog = await open()
    await submit()
    expect(await within(dialog).findByText(/أدخل المدة الفعلية/)).toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('ساعات'), '0')
    await userEvent.selectOptions(within(dialog).getByLabelText('دقائق'), '0')
    await submit()
    expect(svc.completeTask).not.toHaveBeenCalled()
  })

  it('minutes are exact: 2 h 7 min sends actual_minutes=127 and nothing else, and the preview shows the points and the durations', async () => {
    svc.completeTask.mockResolvedValue({ success: true })
    const onChanged = mount()
    const dialog = await open()
    await userEvent.selectOptions(within(dialog).getByLabelText('ساعات'), '2')
    await userEvent.selectOptions(within(dialog).getByLabelText('دقائق'), '7')
    const preview = within(dialog).getByTestId('submit-duration-preview')
    expect(preview).toHaveTextContent('ساعتان و7 دقائق')
    expect(preview).toHaveTextContent('نقاط 120')
    expect(preview).toHaveTextContent('المدة التقريبية')
    await submit()
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    const [id, form] = svc.completeTask.mock.calls[0] as [number, FormData]
    expect(id).toBe(41)
    expect(Array.from(form.keys())).toEqual(['actual_minutes'])
    expect(form.get('actual_minutes')).toBe('127')
    expect(toastMock.success).toHaveBeenCalledWith('أُرسلت التذكرة للمراجعة')
    expect(screen.queryByTestId('submit-review-modal')).not.toBeInTheDocument()
  })

  it('minutes alone are enough (45 min)', async () => {
    svc.completeTask.mockResolvedValue({ success: true })
    mount()
    const dialog = await open()
    await userEvent.selectOptions(within(dialog).getByLabelText('دقائق'), '45')
    await submit()
    await waitFor(() => expect(svc.completeTask).toHaveBeenCalledTimes(1))
    expect((svc.completeTask.mock.calls[0][1] as FormData).get('actual_minutes')).toBe('45')
  })

  it('a double click on the dialog button sends one request', async () => {
    const pending = deferred<{ success: boolean }>()
    svc.completeTask.mockReturnValue(pending.promise)
    const onChanged = mount()
    const dialog = await open()
    await userEvent.selectOptions(within(dialog).getByLabelText('دقائق'), '30')
    await userEvent.dblClick(within(dialog).getByRole('button', { name: 'إرسال للمراجعة' }))
    expect(svc.completeTask).toHaveBeenCalledTimes(1)
    pending.resolve({ success: true })
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  })

  it('a refusal (INVALID_STAGE: the ticket moved on) shows the server message once and re-reads the ticket', async () => {
    svc.completeTask.mockRejectedValue(apiError(409, { code: 'INVALID_STAGE', message: 'لا يمكن إغلاق تذكرة ليست بحالة (قيد المعالجة).' }))
    const onChanged = mount()
    const dialog = await open()
    await userEvent.selectOptions(within(dialog).getByLabelText('دقائق'), '30')
    await submit()
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(toastMock.error).toHaveBeenCalledTimes(1)
    expect(toastMock.error).toHaveBeenCalledWith('لا يمكن إغلاق تذكرة ليست بحالة (قيد المعالجة).')
  })

  it('the server 422 ACTUAL_DURATION_INVALID shows under the field and keeps the dialog open', async () => {
    svc.completeTask.mockRejectedValue(apiError(422, { success: false, code: 'ACTUAL_DURATION_INVALID', message: 'المدة الفعلية غير صالحة.' }))
    mount()
    const dialog = await open()
    await userEvent.selectOptions(within(dialog).getByLabelText('دقائق'), '30')
    await submit()
    expect(await within(dialog).findByText('المدة الفعلية غير صالحة.')).toBeInTheDocument()
    expect(screen.getByTestId('submit-review-modal')).toBeInTheDocument()
  })

  it('a regular ticket keeps its modal with the written resolution', async () => {
    render(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, complete_task: true } })} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'تقديم للمراجعة' }))
    expect(await screen.findByTestId('complete-task-modal')).toBeInTheDocument()
    expect(svc.completeTask).not.toHaveBeenCalled()
  })

  it('«تعذر الحل» on a deployment ticket opens the unresolved-only dialog', async () => {
    render(<TicketActionCenter ticket={deployTicket({ capabilities: { ...NO_CAPS, complete_task: true } })} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'تعذر الحل' }))
    const dialog = await screen.findByTestId('complete-task-modal')
    expect(within(dialog).getByPlaceholderText(/وضح العوائق الفنية/)).toBeInTheDocument()
    expect(within(dialog).queryByText('تقديم للمراجعة')).not.toBeInTheDocument()
  })
})

// ── 6. «تم النشر» / «تم التحقق» / «إعادة للتنفيذ» ───────────────────────────────

describe('MarkDeployedModal', () => {
  const mount = (actorName: string | null = 'خالد') => {
    const onSuccess = vi.fn()
    const onStale = vi.fn()
    render(<MarkDeployedModal ticketId={41} actorName={actorName} onClose={vi.fn()} onSuccess={onSuccess} onStale={onStale} />)

    return { onSuccess, onStale }
  }
  const url = () => screen.getByLabelText(/رابط الموقع الحي/) as HTMLInputElement
  const submit = () => screen.getByRole('button', { name: 'تأكيد النشر' })

  it('says who and when will be recorded, and has a required link plus an optional note', async () => {
    mount()
    const dialog = await screen.findByRole('dialog', { name: 'تم النشر على الموقع الحي' })
    expect(within(dialog).getByTestId('deploy-record-note')).toHaveTextContent('سيُسجَّل اسمك (خالد) وتاريخ ووقت التأكيد الحاليان')
    expect(url()).toHaveAttribute('aria-required', 'true')
    expect(screen.getByLabelText(/ملاحظة النشر/)).toBeInTheDocument()
  })

  it('refuses an empty link, a non-https link, a non-URL and an over-long one, without a request', async () => {
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'تأكيد النشر' }))
    expect(await screen.findByText('أدخل رابط الموقع الحي الذي نُشر عليه العمل.')).toBeInTheDocument()
    await userEvent.type(url(), 'http://emc.example/page')
    await userEvent.click(submit())
    expect(await screen.findByText('أدخل رابطًا صحيحًا يبدأ بـ https://')).toBeInTheDocument()
    await userEvent.clear(url())
    await userEvent.type(url(), 'emc.example')
    await userEvent.click(submit())
    expect(await screen.findByText('أدخل رابطًا صحيحًا يبدأ بـ https://')).toBeInTheDocument()
    await userEvent.clear(url())
    await userEvent.click(url())
    await userEvent.paste(`https://emc.example/${'a'.repeat(500)}`)
    await userEvent.click(submit())
    expect(await screen.findByText('الرابط طويل جدًا؛ الحد الأقصى 500 حرف.')).toBeInTheDocument()
    expect(svc.markDeployed).not.toHaveBeenCalled()
  })

  it('sends the trimmed https link (and the note when written)', async () => {
    svc.markDeployed.mockResolvedValue({ success: true })
    const { onSuccess } = mount()
    await userEvent.type(await screen.findByLabelText(/رابط الموقع الحي/), '  https://emc.example/page  ')
    await userEvent.type(screen.getByLabelText(/ملاحظة النشر/), 'نُشر بعد الظهر')
    await userEvent.click(submit())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.markDeployed).toHaveBeenCalledWith(41, { live_url: 'https://emc.example/page', note: 'نُشر بعد الظهر' })
  })

  it('without a note, no note key is sent', async () => {
    svc.markDeployed.mockResolvedValue({ success: true })
    const { onSuccess } = mount()
    await userEvent.type(await screen.findByLabelText(/رابط الموقع الحي/), 'https://emc.example')
    await userEvent.click(submit())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.markDeployed).toHaveBeenCalledWith(41, { live_url: 'https://emc.example' })
  })

  it('409 INVALID_STAGE refreshes with the server message; 422 live_url shows under the field; a double click sends once', async () => {
    svc.markDeployed.mockRejectedValueOnce(apiError(409, { code: 'INVALID_STAGE', message: 'التذكرة ليست معتمدة للنشر.' }))
    const { onStale } = mount()
    await userEvent.type(await screen.findByLabelText(/رابط الموقع الحي/), 'https://emc.example')
    await userEvent.click(submit())
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1))
    expect(toastMock.error).toHaveBeenCalledWith('التذكرة ليست معتمدة للنشر.')

    svc.markDeployed.mockRejectedValueOnce(apiError(422, { message: 'x', errors: { live_url: ['الرابط غير صالح.'] } }))
    await userEvent.click(submit())
    expect(await screen.findByText('الرابط غير صالح.')).toBeInTheDocument()

    const pending = deferred<{ success: boolean }>()
    svc.markDeployed.mockReturnValueOnce(pending.promise)
    svc.markDeployed.mockClear()
    await userEvent.dblClick(submit())
    expect(svc.markDeployed).toHaveBeenCalledTimes(1)
    pending.resolve({ success: true })
  })

  it('403 stays inline', async () => {
    svc.markDeployed.mockRejectedValue(apiError(403, { message: 'لا تملك صلاحية تسجيل النشر.' }))
    const { onStale } = mount()
    await userEvent.type(await screen.findByLabelText(/رابط الموقع الحي/), 'https://emc.example')
    await userEvent.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية تسجيل النشر.')
    expect(onStale).not.toHaveBeenCalled()
  })

  it('the link rule on its own', () => {
    expect(validateLiveUrl('https://emc.example/a?b=1')).toBeNull()
    expect(validateLiveUrl('http://emc.example')).not.toBeNull()
    expect(validateLiveUrl('ftp://emc.example')).not.toBeNull()
    expect(validateLiveUrl('https://')).not.toBeNull()
    expect(validateLiveUrl('')).not.toBeNull()
  })
})

describe('VerifyResolvedModal («تم التحقق — وضع كمحلولة»)', () => {
  const mount = (approved: { points: number | null; minutes: number | null } | null = { points: 120, minutes: 75 }) => {
    const onSuccess = vi.fn()
    const onStale = vi.fn()
    render(<VerifyResolvedModal ticketId={41} approved={approved} onClose={vi.fn()} onSuccess={onSuccess} onStale={onStale} />)

    return { onSuccess, onStale }
  }
  const note = () => screen.getByLabelText(/ملاحظة نتيجة الاختبار الحي/)
  const submit = () => screen.getByRole('button', { name: 'تأكيد الحل' })

  it('says what will be added to the balance on confirmation', async () => {
    mount()
    expect(await screen.findByTestId('verify-credit-note')).toHaveTextContent('عند التأكيد تُضاف 120 نقطة ومدة فعلية ساعة و15 دقيقة إلى رصيدك')
  })

  it('a short note (5..1000) is required: nothing is sent without it', async () => {
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'تأكيد الحل' }))
    expect(await screen.findByText('اكتب ملاحظة قصيرة عن نتيجة الاختبار الحي.')).toBeInTheDocument()
    await userEvent.type(note(), 'abcd')
    await userEvent.click(submit())
    expect(await screen.findByText('النص قصير؛ اكتب 5 أحرف على الأقل.')).toBeInTheDocument()
    await userEvent.clear(note())
    await userEvent.click(note())
    await userEvent.paste('أ'.repeat(1001))
    await userEvent.click(submit())
    expect(await screen.findByText('النص طويل جدًا؛ الحد الأقصى 1000 حرف.')).toBeInTheDocument()
    expect(svc.verifyResolved).not.toHaveBeenCalled()
  })

  it('sends the trimmed note', async () => {
    svc.verifyResolved.mockResolvedValue({ success: true })
    const { onSuccess } = mount()
    await userEvent.type(await screen.findByLabelText(/ملاحظة نتيجة الاختبار الحي/), '  اختُبر وعمل بشكل سليم  ')
    await userEvent.click(submit())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.verifyResolved).toHaveBeenCalledWith(41, 'اختُبر وعمل بشكل سليم')
  })

  it('409 ALREADY_CREDITED (a replay) is information + refresh; INVALID_STAGE is an error + refresh', async () => {
    svc.verifyResolved.mockRejectedValueOnce(apiError(409, { code: 'ALREADY_CREDITED', message: 'تم اعتماد هذه التذكرة وإضافة رصيدها مسبقًا.' }))
    const { onSuccess, onStale } = mount()
    await userEvent.type(await screen.findByLabelText(/ملاحظة نتيجة الاختبار الحي/), 'اختبار ناجح تمامًا')
    await userEvent.click(submit())
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(toastMock.message).toHaveBeenCalledWith('تم اعتماد هذه التذكرة وإضافة رصيدها مسبقًا.')
    expect(onStale).not.toHaveBeenCalled()

    svc.verifyResolved.mockRejectedValueOnce(apiError(409, { code: 'INVALID_STAGE', message: 'التذكرة ليست بانتظار الاختبار الحي.' }))
    await userEvent.click(submit())
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1))
  })

  it('without approved figures the sentence stays general', async () => {
    mount(null)
    expect(await screen.findByTestId('verify-credit-note')).toHaveTextContent('عند التأكيد تُضاف النقاط والمدة الفعلية المعتمدة إلى رصيدك')
  })
})

describe('VerifyFailedModal (the assignee sends it back after the live test)', () => {
  const mount = () => {
    const onSuccess = vi.fn()
    const onStale = vi.fn()
    render(<VerifyFailedModal ticketId={41} onClose={vi.fn()} onSuccess={onSuccess} onStale={onStale} />)

    return { onSuccess, onStale }
  }
  const submit = () => screen.getByRole('button', { name: 'إعادة للتنفيذ' })

  it('explains that a new review, approval and deployment are required, and credits nothing', async () => {
    mount()
    const note = await screen.findByTestId('verify-failed-note')
    expect(note).toHaveTextContent('مراجعة جديدة واعتمادًا ونشرًا جديدًا')
    expect(note).toHaveTextContent('لا يُضاف أي رصيد')
  })

  it('the description of what he saw is required (5..1000)', async () => {
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة للتنفيذ' }))
    expect(await screen.findByText('اكتب وصفًا لما رأيته على الموقع الحي.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/صف ما رأيته/), 'abcd')
    await userEvent.click(submit())
    expect(await screen.findByText('النص قصير؛ اكتب 5 أحرف على الأقل.')).toBeInTheDocument()
    expect(svc.verifyFailed).not.toHaveBeenCalled()
  })

  it('sends the description; 422 shows under the field', async () => {
    svc.verifyFailed.mockRejectedValueOnce(apiError(422, { message: 'x', errors: { description: ['الوصف قصير.'] } }))
    const { onSuccess } = mount()
    await userEvent.type(await screen.findByLabelText(/صف ما رأيته/), 'الزر لا يستجيب على الموقع الحي')
    await userEvent.click(submit())
    expect(await screen.findByText('الوصف قصير.')).toBeInTheDocument()
    svc.verifyFailed.mockResolvedValueOnce({ success: true })
    await userEvent.click(submit())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.verifyFailed).toHaveBeenLastCalledWith(41, 'الزر لا يستجيب على الموقع الحي')
  })
})

describe('«إعادة للتنفيذ» by the reviewer (from review and from approved-for-deployment)', () => {
  it('the reason is required; from an approved ticket it says the approval is cancelled', async () => {
    svc.returnForRework.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<ReturnForReworkModal ticketId={41} fromDeploy onClose={vi.fn()} onSuccess={onSuccess} />)
    const dialog = await screen.findByRole('dialog', { name: 'إعادة للتنفيذ' })
    expect(dialog).toHaveTextContent('يُلغى الاعتماد للنشر')
    await userEvent.click(within(dialog).getByRole('button', { name: 'إعادة للتنفيذ' }))
    expect(await screen.findByText('اكتب سبب إعادة التذكرة للتنفيذ.')).toBeInTheDocument()
    expect(svc.returnForRework).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText(/سبب الإعادة/), 'يلزم اختبار إضافي قبل النشر')
    await userEvent.click(within(dialog).getByRole('button', { name: 'إعادة للتنفيذ' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.returnForRework).toHaveBeenCalledWith(41, 'يلزم اختبار إضافي قبل النشر')
  })

  it('the action center opens it with that wording for an approved ticket', async () => {
    render(<TicketActionCenter ticket={deployTicket({ status: 'APPROVED_FOR_DEPLOY', capabilities: { ...NO_CAPS, return_for_rework: true } })} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'إعادة للتنفيذ' }))
    expect(await screen.findByTestId('return-for-rework-modal')).toHaveTextContent('يُلغى الاعتماد للنشر')
  })
})

describe('each action button opens its own dialog', () => {
  it.each([
    [{ mark_deployed: true }, 'تم النشر على الموقع الحي', 'mark-deployed-modal', 'APPROVED_FOR_DEPLOY'],
    [{ verify_resolved: true }, 'تم التحقق — وضع كمحلولة', 'verify-resolved-modal', 'PENDING_VERIFICATION'],
    [{ verify_failed: true }, 'إعادة للتنفيذ', 'verify-failed-modal', 'PENDING_VERIFICATION'],
  ] as Array<[Partial<TicketCapabilities>, string, string, TicketStatus]>)('%o -> %s', async (caps, name, testId, status) => {
    render(<TicketActionCenter ticket={deployTicket({ status, capabilities: { ...NO_CAPS, ...caps } })} onChanged={vi.fn()} currentUserName="خالد" />)
    await userEvent.click(screen.getByRole('button', { name }))
    expect(await screen.findByTestId(testId)).toBeInTheDocument()
  })
})

// ── 7. «تتطلب نشرًا على الموقع الحي» and the ticket-only form controls ───────────

describe('requires_deployment switch', () => {
  const fillApprove = async () => {
    await userEvent.selectOptions(await screen.findByLabelText('الموظف المكلف بالإنجاز'), '9')
    await userEvent.selectOptions(screen.getByLabelText(/حجم المهمة/), 'medium')
    await userEvent.selectOptions(screen.getByLabelText(/نقاط المهمة/), '100')
    await userEvent.selectOptions(screen.getByLabelText(/^المدة التقريبية/), '2')
  }

  beforeEach(() => {
    svc.getMeta.mockResolvedValue({ tech_units: [], users: [{ id: 9, name: 'سلمى', email: '' }], points_options: POINTS })
  })

  it('assignment (approve): the switch with its helper; off by default and sent as false; on sends true', async () => {
    svc.approveTicket.mockResolvedValue({ success: true })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const box = await screen.findByTestId('requires-deployment')
    expect(box).toHaveTextContent('تتطلب نشرًا على الموقع الحي')
    expect(box).toHaveTextContent('تمر التذكرة بمراجعة ثم نشر ثم اختبار المكلّف على الموقع الحي قبل الإغلاق')
    const sw = within(box).getByRole('switch') as HTMLInputElement
    expect(sw.checked).toBe(false)
    await fillApprove()
    await userEvent.click(sw)
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    await waitFor(() => expect(svc.approveTicket).toHaveBeenCalled())
    expect(svc.approveTicket.mock.calls[0][1]).toMatchObject({ requires_deployment: true, assigned_to_id: 9, task_scope: 'medium', task_points: 100 })
  })

  it('assignment: left off, false is sent', async () => {
    svc.approveTicket.mockResolvedValue({ success: true })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await fillApprove()
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    await waitFor(() => expect(svc.approveTicket).toHaveBeenCalled())
    expect(svc.approveTicket.mock.calls[0][1].requires_deployment).toBe(false)
  })

  it('reassign: starts from the ticket and is sent; frozen (can_edit_estimate false) it is disabled with the reason and NOT sent', async () => {
    svc.reassign.mockResolvedValue({ success: true })
    const { unmount } = render(<ReassignTicketModal ticketId={5} departmentId={2} currentRequiresDeployment currentEstimate={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const sw = (await screen.findByRole('switch')) as HTMLInputElement
    expect(sw.checked).toBe(true)
    expect(sw).toBeEnabled()
    await userEvent.selectOptions(screen.getByLabelText('المكلف الجديد'), '9')
    await userEvent.click(sw)
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التوجيه' }))
    await waitFor(() => expect(svc.reassign).toHaveBeenCalled())
    expect(svc.reassign.mock.calls[0][1]).toMatchObject({ requires_deployment: false })
    unmount()

    svc.reassign.mockClear()
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentRequiresDeployment deploymentFrozen currentEstimate={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const frozen = (await screen.findByRole('switch')) as HTMLInputElement
    expect(frozen).toBeDisabled()
    expect(screen.getByTestId('requires-deployment-frozen')).toHaveTextContent('لا يمكن تغيير هذا الخيار الآن لأن التذكرة في مرحلة المراجعة أو النشر.')
    await userEvent.selectOptions(screen.getByLabelText('المكلف الجديد'), '9')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التوجيه' }))
    await waitFor(() => expect(svc.reassign).toHaveBeenCalled())
    expect('requires_deployment' in svc.reassign.mock.calls[0][1]).toBe(false)
  })

  it('edit estimate: the switch is sent with the PATCH; frozen it is disabled and not sent', async () => {
    svc.updateWorkEstimate.mockResolvedValue({ success: true })
    const { unmount } = render(<EditEstimateModal ticketId={3} current={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.click(await screen.findByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    await waitFor(() => expect(svc.updateWorkEstimate).toHaveBeenCalled())
    expect(svc.updateWorkEstimate.mock.calls[0][1]).toMatchObject({ requires_deployment: true })
    unmount()

    svc.updateWorkEstimate.mockClear()
    render(<EditEstimateModal ticketId={3} requiresDeployment deploymentFrozen current={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByRole('switch')).toBeDisabled()
    expect(screen.getByTestId('requires-deployment-frozen')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    await waitFor(() => expect(svc.updateWorkEstimate).toHaveBeenCalled())
    expect('requires_deployment' in svc.updateWorkEstimate.mock.calls[0][1]).toBe(false)
  })

  it('the action center passes the freeze from can_edit_estimate=false to the edit dialog', async () => {
    render(<TicketActionCenter ticket={deployTicket({ capabilities: { ...NO_CAPS, can_edit_estimate: true } })} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'تعديل النقاط والمدة' }))
    expect(await screen.findByRole('switch')).toBeEnabled()
  })
})

describe('ticket estimate controls: the points dropdown and the approximate-duration presets', () => {
  function Harness({ mode }: { mode?: Parameters<typeof TaskEstimateFields>[0]['ticketMode'] }) {
    return <TaskEstimateFields value={emptyEstimate()} onChange={vi.fn()} idPrefix="h" ticketMode={mode} />
  }

  it('the preset list, in order, plus «مدة مخصصة» that reveals the free input', async () => {
    const draft = { ...emptyEstimate() }
    const { rerender } = render(<TaskEstimateFields value={draft} onChange={vi.fn()} idPrefix="h" ticketMode={{ pointsOptions: POINTS }} />)
    const select = screen.getByLabelText('المدة التقريبية') as HTMLSelectElement
    const labels = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(labels).toEqual(['بدون مدة تقريبية', '15 دقيقة', '30 دقيقة', '45 دقيقة', 'ساعة', 'ساعة ونصف', 'ساعتان', '3 ساعات', '4 ساعات', '6 ساعات', '8 ساعات', '12 ساعة', '16 ساعة', '24 ساعة', '40 ساعة', 'مدة مخصصة'])
    expect(DURATION_PRESETS).toHaveLength(14)
    expect(screen.queryByLabelText('المدة التقريبية (مخصصة)')).not.toBeInTheDocument()
    await userEvent.selectOptions(select, 'custom')
    expect(screen.getByLabelText('المدة التقريبية (مخصصة)')).toBeInTheDocument()
    rerender(<TaskEstimateFields value={{ ...draft, duration: '5' }} onChange={vi.fn()} idPrefix="h" ticketMode={{ pointsOptions: POINTS }} />)
    expect((screen.getByLabelText('المدة التقريبية') as HTMLSelectElement).value).toBe('custom')
  })

  it('assigning a ticket REQUIRES the approximate duration: without it nothing is sent and the message shows under the field', async () => {
    svc.approveTicket.mockResolvedValue({ success: true })
    svc.getMeta.mockResolvedValue({ tech_units: [], users: [{ id: 9, name: 'سلمى', email: '' }], points_options: POINTS })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.selectOptions(await screen.findByLabelText('الموظف المكلف بالإنجاز'), '9')
    await userEvent.selectOptions(screen.getByLabelText(/حجم المهمة/), 'simple')
    await userEvent.selectOptions(screen.getByLabelText(/نقاط المهمة/), '30')
    expect(screen.queryByRole('option', { name: 'بدون مدة تقريبية' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    expect(await screen.findByText('حدّد المدة التقريبية للمهمة.')).toBeInTheDocument()
    expect(svc.approveTicket).not.toHaveBeenCalled()
  })

  it('assigning requires the size and the points too (no request without them)', async () => {
    svc.getMeta.mockResolvedValue({ tech_units: [], users: [{ id: 9, name: 'سلمى', email: '' }], points_options: POINTS })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.selectOptions(await screen.findByLabelText('الموظف المكلف بالإنجاز'), '9')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    expect(await screen.findByText('اختر حجم المهمة.')).toBeInTheDocument()
    expect(screen.getByText('نقاط المهمة مطلوبة.')).toBeInTheDocument()
    expect(svc.approveTicket).not.toHaveBeenCalled()
  })

  it('reassigning requires the approximate duration as well (a ticket without one cannot be assigned blank)', async () => {
    svc.getMeta.mockResolvedValue({ tech_units: [], users: [{ id: 9, name: 'سلمى', email: '' }], points_options: POINTS })
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentEstimate={{ task_scope: 'medium', task_points: 100, estimated_hours: null }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.selectOptions(await screen.findByLabelText('المكلف الجديد'), '9')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التوجيه' }))
    expect(await screen.findByText('حدّد المدة التقريبية للمهمة.')).toBeInTheDocument()
    expect(svc.reassign).not.toHaveBeenCalled()
  })

  it('a preset sends its hours', async () => {
    svc.approveTicket.mockResolvedValue({ success: true })
    svc.getMeta.mockResolvedValue({ tech_units: [], users: [{ id: 9, name: 'سلمى', email: '' }], points_options: POINTS })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.selectOptions(await screen.findByLabelText('الموظف المكلف بالإنجاز'), '9')
    await userEvent.selectOptions(screen.getByLabelText(/حجم المهمة/), 'simple')
    await userEvent.selectOptions(screen.getByLabelText(/نقاط المهمة/), '30')
    await userEvent.selectOptions(screen.getByLabelText(/^المدة التقريبية/), '1.5')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    await waitFor(() => expect(svc.approveTicket).toHaveBeenCalled())
    expect(svc.approveTicket.mock.calls[0][1]).toMatchObject({ task_scope: 'simple', task_points: 30, estimated_hours: 1.5 })
  })

  it('pointsChoices: the server list, sorted and unique; the stored value only for its own size', () => {
    expect(pointsChoices(POINTS, 'medium')).toEqual([75, 100, 120, 150])
    expect(pointsChoices(POINTS, 'medium', { scope: 'medium', points: '130' })).toEqual([75, 100, 120, 130, 150])
    expect(pointsChoices(POINTS, 'medium', { scope: 'medium', points: '120' })).toEqual([75, 100, 120, 150])
    expect(pointsChoices(POINTS, 'simple', { scope: 'medium', points: '130' })).toEqual([25, 30, 40, 50])
    expect(pointsChoices(POINTS, '')).toEqual([])
    expect(pointsChoices(null, 'medium', { scope: 'medium', points: '130' })).toEqual([130])
  })

  it('TASK forms are unaffected: without ticketMode the points are a free number and the duration keeps its hours/minutes input and toggle', () => {
    render(<Harness />)
    expect((screen.getByLabelText(/نقاط المهمة/) as HTMLElement).tagName).toBe('INPUT')
    expect((screen.getByLabelText('المدة التقريبية') as HTMLElement).tagName).toBe('INPUT')
    expect(screen.getByRole('button', { name: 'ساعات' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'دقائق' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'مدة مخصصة' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})

// ── 8. «مهامي ومسؤولياتي» ───────────────────────────────────────────────────────

describe('«مهامي»: the stage on the card', () => {
  const row = (over: Partial<MyWorkTicket> = {}): MyWorkTicket => ({ id: 5, ticket_number: 'EMC-5', title: 'عنوان', status: 'PENDING_REVIEW', priority: 'LOW', department: { id: 2, name: 'التقنية' }, task_points: 40, estimated_hours: 1, capabilities: { can_open: true }, ...over })
  const me = { name: 'سلمى' }
  const renderCard = (status: MyWorkTicket['status']) => render(<MemoryRouter><WorkItemCard item={ticketToWorkItem(row({ status }), me)} /></MemoryRouter>)

  it.each([
    ['PENDING_REVIEW', 'بانتظار المراجعة', 'بانتظار مراجعة الإنجاز'],
    ['APPROVED_FOR_DEPLOY', 'معتمدة للنشر', 'بانتظار النشر'],
    ['PENDING_VERIFICATION', 'بانتظار اختبار المكلّف', 'بانتظار اختبار المكلّف'],
  ] as Array<[MyWorkTicket['status'], string, string]>)('%s: column «review», badge «%s», line «%s»', (status, badge, next) => {
    const item = ticketToWorkItem(row({ status }), me)
    expect(item.column).toBe('review')
    expect(item.awaitingApproval).toBe(true)
    renderCard(status)
    expect(screen.getByTestId('work-item')).toHaveAttribute('data-column', 'review')
    expect(screen.getByTestId('stage-badge')).toHaveTextContent(badge)
    expect(screen.getByTestId('next-step')).toHaveTextContent(next)
    // review, deployment and verification live only in the ticket details: the card just opens it
    const open = screen.getByRole('link', { name: 'فتح التذكرة' })
    expect(open).toHaveAttribute('href', '/dashboard/tickets/5')
    expect(screen.queryByRole('button', { name: /اعتماد|نشر|تحقق|إعادة/ })).not.toBeInTheDocument()
  })

  it('resolved goes to «مكتملة» with no stage badge; rework / a failed live test goes back to «قيد التنفيذ»', () => {
    expect(ticketToWorkItem(row({ status: 'RESOLVED' }), me).column).toBe('completed')
    expect(ticketToWorkItem(row({ status: 'IN_PROGRESS' }), me).column).toBe('in_progress')
    renderCard('RESOLVED')
    expect(screen.queryByTestId('stage-badge')).not.toBeInTheDocument()
    expect(screen.queryByTestId('next-step')).not.toBeInTheDocument()
  })

  it('the ticket that is in progress and can be submitted also opens with «فتح التذكرة»', () => {
    render(<MemoryRouter><WorkItemCard item={ticketToWorkItem(row({ status: 'IN_PROGRESS', capabilities: { can_open: true, can_complete: true } }), me)} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'فتح التذكرة' })).toBeInTheDocument()
    expect(screen.queryByText('فتح التذكرة لإنهاء المهمة')).not.toBeInTheDocument()
  })

  it('the state is derived from the status alone, so it is the same after a reload', () => {
    const a = ticketToWorkItem(row({ status: 'PENDING_VERIFICATION' }), me)
    const b = ticketToWorkItem(row({ status: 'PENDING_VERIFICATION' }), me)
    expect(a).toEqual(b)
  })
})

// ── 9. the credit block ─────────────────────────────────────────────────────────

describe('TicketCreditBlock: approved but not yet credited', () => {
  it('«approved» says the points and time are approved and will be added after the live test', () => {
    const credit: TicketCredit = { status: 'approved', points: 120, hours: 1.25, minutes: 75, credited_at: null, credited_by_name: null }
    render(<TicketCreditBlock ticket={deployTicket({ status: 'APPROVED_FOR_DEPLOY', actual_minutes: 75, credit })} />)
    expect(screen.getByTestId('credit-approved')).toHaveTextContent('تُضافان إلى رصيد سلمى عند تأكيد الحل بعد الاختبار الحي')
    expect(screen.getByTestId('credit-actual-duration')).toHaveTextContent('ساعة و15 دقيقة')
    expect(screen.queryByTestId('credit-amounts')).not.toBeInTheDocument()
  })
})

// ── 10. copy ────────────────────────────────────────────────────────────────────

describe('copy', () => {
  const sources = import.meta.glob(['/src/components/tickets/**/*.tsx', '/src/components/operations/TaskEstimateFields.tsx', '/src/lib/taskEstimate.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

  it('the estimate note separates the planning duration from the credited actual duration and carries NO deployment clause', () => {
    expect(TICKET_ESTIMATE_NOTE).toContain('المدة التقريبية للتخطيط فقط')
    expect(TICKET_ESTIMATE_NOTE).toContain('المدة الفعلية')
    expect(TICKET_ESTIMATE_NOTE).not.toContain('الاختبار الحي')
    expect(TICKET_ESTIMATE_NOTE).not.toContain('نشر')
  })

  it('the deployment clause appears only where the ticket requires deployment', () => {
    const { rerender } = render(<TaskEstimateFields value={emptyEstimate()} onChange={vi.fn()} idPrefix="c" ticketMode={{ pointsOptions: POINTS }} />)
    expect(document.body.textContent).not.toContain('الاختبار الحي')
    rerender(<TaskEstimateFields value={emptyEstimate()} onChange={vi.fn()} idPrefix="c" ticketMode={{ pointsOptions: POINTS, requiresDeployment: true }} />)
    expect(document.body.textContent).toContain(TICKET_DEPLOYMENT_CLAUSE)
  })

  it.each([
    'لإضافة النقاط والساعات إلى رصيده، أو أعده',
    'تُضاف القيم النهائية',
    'تأكيد الحل والإغلاق',
    'فتح التذكرة لإنهاء المهمة',
  ])('«%s» appears nowhere', (phrase) => {
    const hits = Object.entries(sources).filter(([, src]) => src.includes(phrase)).map(([file]) => file)
    expect(hits).toEqual([])
  })
})

// ── round 2 ─────────────────────────────────────────────────────────────────────

describe('round 2: stale points, copy, freeze and lock', () => {
  it('changing the size clears the points even while the options are still loading', async () => {
    const onChange = vi.fn()
    render(<TaskEstimateFields value={{ ...emptyEstimate(), scope: 'medium', points: '120' }} onChange={onChange} idPrefix="s" ticketMode={{ pointsOptions: null, pointsLoading: true }} />)
    await userEvent.selectOptions(screen.getByLabelText(/حجم المهمة/), 'simple')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ scope: 'simple', points: '' }))
  })

  it('and with no options at all (the free input), a new size also clears the points', async () => {
    const onChange = vi.fn()
    render(<TaskEstimateFields value={{ ...emptyEstimate(), scope: 'medium', points: '120' }} onChange={onChange} idPrefix="s" ticketMode={{ pointsOptions: null }} />)
    await userEvent.selectOptions(screen.getByLabelText(/حجم المهمة/), 'large')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ scope: 'large', points: '' }))
  })

  it('the credit block says «بانتظار تأكيد المراجعة» for a deployment ticket in review, and keeps the old words for a regular one', () => {
    const credit: TicketCredit = { status: 'pending_review', points: null, hours: null, minutes: null, credited_at: null, credited_by_name: null }
    const { rerender } = render(<TicketCreditBlock ticket={deployTicket({ status: 'PENDING_REVIEW', credit })} />)
    expect(screen.getByTestId('credit-pending-text')).toHaveTextContent('بانتظار تأكيد المراجعة')
    expect(screen.getByTestId('credit-pending-text').textContent).not.toContain('الاعتماد النهائي')
    rerender(<TicketCreditBlock ticket={ticket({ status: 'PENDING_REVIEW', credit })} />)
    expect(screen.getByTestId('credit-pending-text')).toHaveTextContent('بانتظار الاعتماد النهائي')
  })

  it('the freeze reason: the stage, or «you are the assignee», never a stage that is not true', () => {
    expect(deploymentFreezeMessage({ status: 'PENDING_REVIEW' }, 7)).toBe('لا يمكن تغيير هذا الخيار الآن لأن التذكرة في مرحلة المراجعة أو النشر.')
    expect(deploymentFreezeMessage({ status: 'IN_PROGRESS', assigned_to_id: 7 }, 7)).toBe('لا يمكنك تعديل التقدير لتذكرة أنت المكلف بها')
    expect(deploymentFreezeMessage({ status: 'IN_PROGRESS', assignee: { id: 7 } }, 7)).toBe('لا يمكنك تعديل التقدير لتذكرة أنت المكلف بها')
    expect(deploymentFreezeMessage({ status: 'IN_PROGRESS', assigned_to_id: 9 }, 7)).toBe('لا يمكن تغيير هذا الخيار الآن لأن التذكرة في مرحلة المراجعة أو النشر.')
  })

  it('the reassign dialog shows the neutral assignee wording when the manager is the assignee', async () => {
    svc.getMeta.mockResolvedValue({ tech_units: [], users: [], points_options: POINTS })
    render(<ReassignTicketModal ticketId={5} departmentId={2} deploymentFrozen deploymentFrozenMessage={deploymentFreezeMessage({ status: 'IN_PROGRESS', assigned_to_id: 7 }, 7)} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByTestId('requires-deployment-frozen')).toHaveTextContent('لا يمكنك تعديل التقدير لتذكرة أنت المكلف بها')
    expect(screen.getByTestId('requires-deployment-frozen').textContent).not.toContain('المراجعة أو النشر')
  })

  it('once submitted for review the flag stays on: the switch is disabled and says why', async () => {
    expect(isDeploymentFlagLocked(deployTicket({ deployment: { review_approved_by_name: null, review_approved_at: null, deployed_by_name: null, deployed_at: null, live_url: null, verified_at: null, round: 1 } }))).toBe(true)
    expect(isDeploymentFlagLocked(deployTicket({ deployment: null }))).toBe(false)
    expect(isDeploymentFlagLocked(ticket({ requires_deployment: false, deployment: { review_approved_by_name: null, review_approved_at: null, deployed_by_name: null, deployed_at: null, live_url: null, verified_at: null, round: 2 } }))).toBe(false)
    render(<EditEstimateModal ticketId={3} requiresDeployment deploymentLocked current={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const sw = await screen.findByRole('switch')
    expect(sw).toBeChecked()
    expect(sw).toBeDisabled()
    expect(screen.getByTestId('requires-deployment-locked')).toHaveTextContent('لا يمكن إلغاء شرط النشر على الموقع الحي بعد أول إرسال للمراجعة.')
  })

  it('409 DEPLOYMENT_FLAG_LOCKED: the server message appears at the switch (edit estimate and reassign) and the switch stays on', async () => {
    svc.updateWorkEstimate.mockRejectedValue(apiError(409, { code: 'DEPLOYMENT_FLAG_LOCKED', message: 'الشرط مقفل بعد أول إرسال للمراجعة.' }))
    const { unmount } = render(<EditEstimateModal ticketId={3} requiresDeployment current={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.click(await screen.findByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    expect(await screen.findByTestId('requires-deployment-error')).toHaveTextContent('الشرط مقفل بعد أول إرسال للمراجعة.')
    expect(screen.getByRole('switch')).toBeChecked()
    unmount()

    svc.getMeta.mockResolvedValue({ tech_units: [], users: [{ id: 9, name: 'سلمى', email: '' }], points_options: POINTS })
    svc.reassign.mockRejectedValue(apiError(409, { code: 'DEPLOYMENT_FLAG_LOCKED', message: 'الشرط مقفل بعد أول إرسال للمراجعة.' }))
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentRequiresDeployment currentEstimate={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.click(await screen.findByRole('switch'))
    await userEvent.selectOptions(screen.getByLabelText('المكلف الجديد'), '9')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التوجيه' }))
    expect(await screen.findByTestId('requires-deployment-error')).toHaveTextContent('الشرط مقفل بعد أول إرسال للمراجعة.')
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('a manager sends back a ticket waiting for the live test: the dialog says the assignee is unavailable and nothing is credited', async () => {
    render(<TicketActionCenter ticket={deployTicket({ status: 'PENDING_VERIFICATION', capabilities: { ...NO_CAPS, return_for_rework: true } })} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'إعادة للتنفيذ' }))
    const dialog = await screen.findByTestId('return-for-rework-modal')
    expect(dialog).toHaveTextContent('المكلّف غير متاح لإكمال الاختبار الحي')
    expect(dialog).toHaveTextContent('ولا يُضاف أي رصيد')
  })

  it('a stricter live-URL policy on the server: its 422 message shows under the field', async () => {
    svc.markDeployed.mockRejectedValue(apiError(422, { message: 'x', errors: { live_url: ['هذا النطاق غير مسموح به للنشر.'] } }))
    render(<MarkDeployedModal ticketId={41} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.type(await screen.findByLabelText(/رابط الموقع الحي/), 'https://emc.example')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد النشر' }))
    expect(await screen.findByText('هذا النطاق غير مسموح به للنشر.')).toBeInTheDocument()
  })

  it('«DEPLOY_DETAILS» and «DEPLOYMENT_FLAG_CHANGED» have Arabic labels, never the raw key', () => {
    expect(ticketActionLabel('DEPLOY_DETAILS')).toBe('تفاصيل النشر')
    expect(ticketActionLabel('DEPLOYMENT_FLAG_CHANGED')).toBe('تغيير شرط النشر على الموقع الحي')
    expect(TIMELINE_META.DEPLOY_DETAILS).toBeDefined()
  })

  it('one toast for a failed submit-for-review (not the interceptor\'s as well)', async () => {
    svc.completeTask.mockRejectedValue(apiError(409, { message: 'لا يمكن إغلاق تذكرة ليست بحالة (قيد المعالجة).' }))
    render(<TicketActionCenter ticket={deployTicket({ capabilities: { ...NO_CAPS, complete_task: true } })} onChanged={vi.fn()} currentUserId={9} />)
    await userEvent.click(screen.getByRole('button', { name: 'إرسال للمراجعة' }))
    const dialog = await screen.findByTestId('submit-review-modal')
    await userEvent.selectOptions(within(dialog).getByLabelText('دقائق'), '30')
    await userEvent.click(within(dialog).getByRole('button', { name: 'إرسال للمراجعة' }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled())
    expect(toastMock.error).toHaveBeenCalledTimes(1)
  })

  it('a reporter-safe payload whose resolution_note is null still renders', async () => {
    const { ReporterTicketView } = await import('@/components/tickets/ReporterTicketView')
    render(
      <MemoryRouter>
        <ReporterTicketView
          ticket={{ viewer_role: 'reporter', id: 3, ticket_number: 'EMC-3', title: 'م', description: 'و', ticket_category: 'OLD_ISSUE', status: 'RESOLVED', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', resolved_at: '2026-01-02T00:00:00Z', resolution_note: null, rejection_reason: null, department: { id: 1, name: 'x' }, attachments: [], timeline: [], capabilities: NO_CAPS } as never}
          onBack={vi.fn()}
          onChanged={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('reporter-ticket-view')).toBeInTheDocument()
  })
})
