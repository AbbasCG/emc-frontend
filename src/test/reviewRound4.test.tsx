import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Ticket, TicketCapabilities } from '@/types/ticket'

const svc = vi.hoisted(() => ({ getMeta: vi.fn(), getTicket: vi.fn(), reassign: vi.fn(), updateWorkEstimate: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'مدير' } }) }))
vi.mock('@/contexts/PageAccessContext', () => ({ usePageAccess: () => ({ canAccessPath: () => false }) }))

import { TicketActivityTimeline } from '@/components/tickets/ops/TicketActivityTimeline'
import { TIMELINE_META, UNKNOWN_ACTION_LABEL, ticketActionLabel } from '@/components/tickets/ops/ticketOpsUi'
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal'
import { EditEstimateModal } from '@/components/tickets/modals/EditEstimateModal'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import TaskEstimateFields from '@/components/operations/TaskEstimateFields'
import TicketDetailPage from '@/components/tickets/TicketDetailPage'
import { emptyEstimate, TICKET_ESTIMATE_NOTE } from '@/lib/taskEstimate'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  svc.getMeta.mockImplementation(async (p: { unit_id?: number }) => ({
    tech_units: [{ id: 4, name_ar: 'الدعم الفني' }],
    users: p.unit_id ? [{ id: 9, name: 'سلمى', email: '' }, { id: 10, name: 'خالد', email: '' }] : [],
  }))
})

/** Every action key the backend writes to the ticket activity log (TicketController, TicketActions, TicketWorkEstimate). */
const BACKEND_ACTIONS = [
  'SUBMITTED', 'APPROVED_AND_ASSIGNED', 'REJECTED_BY_ADMIN', 'ACCEPTED_BY_ASSIGNEE', 'REJECTED_BY_ASSIGNEE', 'REASSIGNED',
  'RESOLVED', 'MARKED_UNRESOLVED', 'PRIORITY_CHANGED', 'ESTIMATE_UPDATED', 'COMMENT', 'INTERNAL_NOTE',
]

const log = (id: number, action: string) => ({ id, ticket_id: 1, action, logged_at: `2026-11-2${id}T10:00:00Z`, performed_by_name: 'مدير', details: undefined })

describe('D2: the ticket history never shows a raw action key', () => {
  it('every action the backend writes has an Arabic label', () => {
    for (const a of BACKEND_ACTIONS) {
      expect(TIMELINE_META[a], a).toBeDefined()
      expect(ticketActionLabel(a), a).toMatch(/[؀-ۿ]/)
      expect(ticketActionLabel(a)).not.toBe(a)
    }
    expect(ticketActionLabel('ESTIMATE_UPDATED')).toBe('تحديث النقاط والمدة')
  })

  it('an unknown key falls back to a generic Arabic label', () => {
    expect(ticketActionLabel('SOMETHING_NEW')).toBe(UNKNOWN_ACTION_LABEL)
    expect(UNKNOWN_ACTION_LABEL).toMatch(/[؀-ۿ]/)
  })

  it('the timeline shows the Arabic title for ESTIMATE_UPDATED and for an unknown key', () => {
    render(<TicketActivityTimeline logs={[log(1, 'ESTIMATE_UPDATED'), log(2, 'SOMETHING_NEW')] as never} />)
    const timeline = screen.getByTestId('ticket-timeline')
    expect(within(timeline).getByText('تحديث النقاط والمدة')).toBeInTheDocument()
    expect(within(timeline).getByText(UNKNOWN_ACTION_LABEL)).toBeInTheDocument()
    expect(timeline.textContent).not.toMatch(/ESTIMATE_UPDATED|SOMETHING_NEW/)
  })

  it('the full ticket page history shows it too', async () => {
    const caps: TicketCapabilities = { approve: false, reject: false, reassign: false, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: false }
    const ticket: Ticket = {
      id: 12, ticket_number: 'EMC-12', title: 'مشكلة', description: '...', ticket_category: 'OLD_ISSUE', priority: 'MEDIUM', department_id: 2, created_by_name: 'سارة',
      status: 'IN_PROGRESS', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', capabilities: caps,
      activity_logs: [log(1, 'ESTIMATE_UPDATED'), log(2, 'PRIORITY_CHANGED'), log(3, 'SOMETHING_NEW')] as never,
    }
    svc.getTicket.mockResolvedValue({ success: true, data: ticket })
    render(
      <MemoryRouter initialEntries={['/dashboard/tickets/12']}>
        <Routes><Route path="/dashboard/tickets/:id" element={<TicketDetailPage />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('تحديث النقاط والمدة')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/ESTIMATE_UPDATED|SOMETHING_NEW/)
  })
})

describe('D3: the wording about points and duration is the truth (credited once, after the final approval)', () => {
  it('the edit dialog says it is a planning estimate and credits nothing', async () => {
    render(<EditEstimateModal ticketId={3} current={{ task_scope: 'simple', task_points: 30, estimated_hours: null }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(TICKET_ESTIMATE_NOTE)
    expect(dialog).not.toHaveTextContent('تُحتسب')
    expect(dialog).not.toHaveTextContent('رصيد المتطوع')
    // the old copy said points are never credited; they are, once, after the final approval
    expect(dialog).not.toHaveTextContent('تقدير للتخطيط فقط')
  })

  it('the shared ticket fields say the same under the duration', () => {
    render(<TaskEstimateFields value={emptyEstimate()} onChange={vi.fn()} idPrefix="t" />)
    expect(screen.getByText(TICKET_ESTIMATE_NOTE)).toBeInTheDocument()
    expect(screen.queryByText(/رصيد المتطوع التراكمي/)).not.toBeInTheDocument()
  })

  it('the legacy note no longer promises anything at completion', () => {
    render(<TaskEstimateFields value={emptyEstimate()} onChange={vi.fn()} idPrefix="t" legacy />)
    expect(screen.getByTestId('legacy-estimate-note')).toHaveTextContent('هذه التذكرة قديمة ولم تُحدَّد لها نقاط بعد')
    expect(screen.getByTestId('legacy-estimate-note')).not.toHaveTextContent('عند الإنجاز')
  })

  it('the exact sentence', () => {
    expect(TICKET_ESTIMATE_NOTE).toBe('المدة التقريبية للتخطيط فقط. الوقت الذي يُضاف إلى رصيد المكلّف هو المدة الفعلية التي يسجّلها المكلّف قبل المراجعة، ولا تُضاف النقاط والساعات إلا بعد الاعتماد النهائي للتذكرة.')
    expect(TICKET_ESTIMATE_NOTE).not.toContain('فقط ولا تُضاف')
  })
})

describe('rerouting a declined ticket: the one who declined cannot be picked again', () => {
  const open = async (declined: number | null) => {
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentUnitId={4} declinedAssigneeId={declined} previousDeclineReason="خارج تخصصي" onClose={vi.fn()} onSuccess={vi.fn()} />)
    const select = await screen.findByRole('combobox', { name: 'المكلف الجديد' })
    await userEvent.click(select)
  }

  it('disables that option with the hint, and leaves the others', async () => {
    await open(9)
    const declined = await screen.findByText('سلمى — اعتذر عن هذه التذكرة')
    expect(declined.closest('[aria-disabled="true"]')).not.toBeNull()
    const other = screen.getByText('خالد')
    expect(other.closest('[aria-disabled="true"]')).toBeNull()
  })

  it('with no decliner (an ordinary reassign) nobody is disabled', async () => {
    await open(null)
    expect(await screen.findByText('سلمى')).toBeInTheDocument()
    expect(screen.queryByText(/اعتذر عن هذه التذكرة/)).not.toBeInTheDocument()
  })

  it('the action center passes the decliner only for a REJECTED_BY_ASSIGNEE ticket', async () => {
    const caps: TicketCapabilities = { approve: false, reject: false, reassign: true, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: true }
    const t = (status: Ticket['status']): Ticket => ({
      id: 5, ticket_number: 'EMC-5', title: 'م', description: '', ticket_category: 'OLD_ISSUE', priority: 'LOW', department_id: 2, unit_id: 4, created_by_name: 'x',
      status, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', assigned_to_id: 9, assignee: { id: 9, name: 'سلمى', email: '' }, capabilities: caps,
    })
    const first = render(<TicketActionCenter ticket={t('REJECTED_BY_ASSIGNEE')} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /إعادة التوجيه/ }))
    await userEvent.click(await screen.findByRole('combobox', { name: 'المكلف الجديد' }))
    expect(await screen.findByText('سلمى — اعتذر عن هذه التذكرة')).toBeInTheDocument()
    first.unmount()

    render(<TicketActionCenter ticket={t('ASSIGNED')} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /إعادة التوجيه/ }))
    await userEvent.click(await screen.findByRole('combobox', { name: 'المكلف الجديد' }))
    expect(await screen.findByText('سلمى')).toBeInTheDocument()
  })
})
