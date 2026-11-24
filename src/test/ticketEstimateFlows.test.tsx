import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AxiosError } from 'axios'
import type { Ticket, TicketCapabilities } from '@/types/ticket'

const svc = vi.hoisted(() => ({
  getMeta: vi.fn(),
  approveTicket: vi.fn(),
  reassign: vi.fn(),
  updateWorkEstimate: vi.fn(),
  getTicket: vi.fn(),
  acceptTask: vi.fn(),
}))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 7, name: 'مقدّم البلاغ' } }) }))
vi.mock('@/contexts/PageAccessContext', () => ({ usePageAccess: () => ({ canAccessPath: () => false }) }))
// The assignee picker is a react-select; a plain select keeps these tests about the estimate.
vi.mock('@/components/tickets/AssigneeSearchSelect', () => ({
  default: ({ users, value, onChange, ariaLabel }: { users: Array<{ id: number; name: string }>; value: string; onChange: (v: string) => void; ariaLabel: string }) => (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">--</option>
      {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
    </select>
  ),
}))

import { ApproveTicketModal } from '@/components/tickets/modals/ApproveTicketModal'
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal'
import { EditEstimateModal } from '@/components/tickets/modals/EditEstimateModal'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import { TicketEstimateValue } from '@/components/tickets/TicketEstimateValue'
import TicketDetailPage from '@/components/tickets/TicketDetailPage'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const unprocessable = (errors: Record<string, string[]>) =>
  new AxiosError('x', '422', undefined, undefined, { status: 422, statusText: '', headers: {}, config: {} as never, data: { success: false, message: 'بيانات غير صالحة', errors } })

beforeEach(() => {
  vi.clearAllMocks()
  svc.getMeta.mockImplementation(async (p: { unit_id?: number }) => ({
    tech_units: [{ id: 4, name_ar: 'الدعم الفني' }],
    users: p.unit_id ? [{ id: 9, name: 'سلمى', email: '' }] : [],
  }))
})

const scope = () => screen.getByLabelText(/حجم المهمة/) as HTMLSelectElement
const points = () => screen.getByLabelText(/نقاط المهمة/) as HTMLInputElement
const duration = () => screen.getByLabelText(/^المدة التقريبية\s*\*?$/) as HTMLInputElement

function expectPinnedLayout(testId: string, submitName: RegExp | string) {
  const dialog = screen.getByTestId(testId)
  const scrollers = dialog.querySelectorAll('.overflow-y-auto')
  expect(scrollers).toHaveLength(1)
  const footer = within(dialog).getByRole('button', { name: submitName }).closest('footer')
  expect(footer).not.toBeNull()
  expect(scrollers[0].contains(footer)).toBe(false)
  expect(within(footer as HTMLElement).getByRole('button', { name: 'إلغاء' })).toBeInTheDocument()
  expect(dialog.querySelector('header')).not.toBeNull()
}

async function fillApprove() {
  await userEvent.selectOptions(await screen.findByLabelText(/الوحدة التقنية المستهدفة/), '4')
  await screen.findByRole('option', { name: 'سلمى' })
  await userEvent.selectOptions(await screen.findByLabelText('الموظف المكلف بالإنجاز'), '9')
}

describe('ApproveTicketModal: points and duration are required to assign', () => {
  const mount = () => {
    const onSuccess = vi.fn()
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={onSuccess} />)

    return { onSuccess }
  }

  it('has the shared fields, empty, with the range card', async () => {
    mount()
    expect(await screen.findByRole('dialog', { name: /اعتماد التذكرة/ })).toBeInTheDocument()
    expect(scope().value).toBe('')
    expect(points().value).toBe('')
    expect(duration().value).toBe('')
    expect(screen.getByTestId('scope-card-empty')).toHaveTextContent('بسيطة 25–50')
    await userEvent.selectOptions(scope(), 'large')
    expect(screen.getByTestId('scope-card')).toHaveTextContent('200 - 300')
    // choosing a size never invents points for a ticket
    expect(points().value).toBe('')
  })

  it('does not send without size and points, and says so under the fields', async () => {
    mount()
    await fillApprove()
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    expect(svc.approveTicket).not.toHaveBeenCalled()
    expect(await screen.findByText('اختر حجم المهمة.')).toBeInTheDocument()
    expect(screen.getByText('نقاط المهمة مطلوبة.')).toBeInTheDocument()
  })

  it('refuses points outside the range of the size', async () => {
    mount()
    await fillApprove()
    await userEvent.selectOptions(scope(), 'medium')
    await userEvent.type(points(), '20')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    expect(svc.approveTicket).not.toHaveBeenCalled()
    expect(await screen.findByText('النقاط لهذا الحجم يجب أن تكون بين 75 و 150 نقطة')).toBeInTheDocument()
  })

  it('the approximate duration is required: an empty one is refused under the field and nothing is sent', async () => {
    const { onSuccess } = mount()
    await fillApprove()
    await userEvent.selectOptions(scope(), 'medium')
    await userEvent.type(points(), '120')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    expect(await screen.findByText('حدّد المدة التقريبية للمهمة.')).toBeInTheDocument()
    expect(duration()).toHaveAttribute('aria-invalid', 'true')
    expect(svc.approveTicket).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('sends the estimate with the chosen duration', async () => {
    svc.approveTicket.mockResolvedValue({ success: true })
    const { onSuccess } = mount()
    await fillApprove()
    await userEvent.selectOptions(scope(), 'medium')
    await userEvent.type(points(), '120')
    await userEvent.selectOptions(duration(), '3')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const body = svc.approveTicket.mock.calls[0][1]
    expect(body).toMatchObject({ unit_id: 4, assigned_to_id: 9, sla_hours: 24, task_scope: 'medium', task_points: 120, estimated_hours: 3 })
  })

  it('converts minutes to decimal hours exactly like the task form', async () => {
    svc.approveTicket.mockResolvedValue({ success: true })
    mount()
    await fillApprove()
    await userEvent.selectOptions(scope(), 'simple')
    await userEvent.type(points(), '30')
    // the ticket form offers presets; «مدة مخصصة» reveals the free hours/minutes input
    await userEvent.selectOptions(duration(), 'custom')
    await userEvent.click(screen.getByRole('button', { name: 'دقائق' }))
    await userEvent.type(screen.getByLabelText('المدة التقريبية (مخصصة)'), '150')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    await waitFor(() => expect(svc.approveTicket).toHaveBeenCalled())
    expect(svc.approveTicket.mock.calls[0][1].estimated_hours).toBe(2.5)
  })

  it('maps the server 422 back onto the fields and keeps the dialog open', async () => {
    svc.approveTicket.mockRejectedValue(unprocessable({ task_points: ['نقاط المهمة المتوسطة يجب أن تتراوح بين 75 و 150 نقطة.'], estimated_hours: ['المدة غير صالحة.'] }))
    const { onSuccess } = mount()
    await fillApprove()
    await userEvent.selectOptions(scope(), 'medium')
    await userEvent.type(points(), '100')
    await userEvent.selectOptions(duration(), '2')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }))
    expect(await screen.findByText('نقاط المهمة المتوسطة يجب أن تتراوح بين 75 و 150 نقطة.')).toBeInTheDocument()
    expect(screen.getByText('المدة غير صالحة.')).toBeInTheDocument()
    expect(points()).toHaveAttribute('aria-invalid', 'true')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('one scroll area, header and footer (إلغاء / تأكيد) always visible', async () => {
    mount()
    await screen.findByRole('dialog')
    expectPinnedLayout('approve-ticket-modal', 'تأكيد الاعتماد والإحالة')
  })
})

describe('ReassignTicketModal', () => {
  it('a legacy ticket opens EMPTY, with the explanation, never prefilled', async () => {
    render(<ReassignTicketModal ticketId={1} departmentId={2} currentEstimate={{ task_scope: null, task_points: null, estimated_hours: null }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByTestId('legacy-estimate-note')).toHaveTextContent('هذه التذكرة قديمة ولم تُحدَّد لها نقاط بعد')
    expect(scope().value).toBe('')
    expect(points().value).toBe('')
    expect(duration().value).toBe('')
  })

  it('a ticket with values opens with them, without the legacy note', async () => {
    render(<ReassignTicketModal ticketId={1} departmentId={2} currentEstimate={{ task_scope: 'medium', task_points: 120, estimated_hours: 2.5 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await screen.findByRole('dialog')
    expect(scope().value).toBe('medium')
    expect(points().value).toBe('120')
    // 2.5 hours is not a preset: «مدة مخصصة» with the free input filled
    expect(duration().value).toBe('custom')
    expect((screen.getByLabelText('المدة التقريبية (مخصصة)') as HTMLInputElement).value).toBe('2.5')
    expect(screen.queryByTestId('legacy-estimate-note')).not.toBeInTheDocument()
  })

  it('shows the previous assignee\'s decline reason read-only', async () => {
    render(<ReassignTicketModal ticketId={1} departmentId={2} previousDeclineReason="خارج نطاق تخصصي" onClose={vi.fn()} onSuccess={vi.fn()} />)
    const box = await screen.findByTestId('previous-decline-reason')
    expect(box).toHaveTextContent('خارج نطاق تخصصي')
    expect(within(box).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('reassigns with the estimate, the required duration included', async () => {
    svc.reassign.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentUnitId={4} onClose={vi.fn()} onSuccess={onSuccess} />)
    // The members of the preselected unit load after the department's units do.
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(await screen.findByLabelText('المكلف الجديد'), '9')
    await userEvent.selectOptions(scope(), 'large')
    await userEvent.type(points(), '250')
    await userEvent.selectOptions(duration(), '4')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التوجيه' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.reassign.mock.calls[0][0]).toBe(5)
    expect(svc.reassign.mock.calls[0][1]).toMatchObject({ assigned_to_id: 9, unit_id: 4, task_scope: 'large', task_points: 250, estimated_hours: 4 })
  })

  it('surfaces a server refusal of the reassignment (e.g. back to the one who declined)', async () => {
    svc.reassign.mockRejectedValue(unprocessable({ assigned_to_id: ['لا يمكن إسناد التذكرة لمن اعتذر عنها.'] }))
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentUnitId={4} currentEstimate={{ task_scope: 'simple', task_points: 30, estimated_hours: 1 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(await screen.findByLabelText('المكلف الجديد'), '9')
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التوجيه' }))
    expect(await screen.findAllByText('لا يمكن إسناد التذكرة لمن اعتذر عنها.')).not.toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('one scroll area, header and footer always visible', async () => {
    render(<ReassignTicketModal ticketId={1} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await screen.findByRole('dialog')
    expectPinnedLayout('reassign-ticket-modal', 'تأكيد إعادة التوجيه')
  })
})

describe('EditEstimateModal («تعديل النقاط والمدة»)', () => {
  it('a legacy ticket opens empty with the note; saving needs size and points', async () => {
    render(<EditEstimateModal ticketId={3} current={{ task_scope: null, task_points: null, estimated_hours: null }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByTestId('legacy-estimate-note')).toBeInTheDocument()
    expect(points().value).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    expect(svc.updateWorkEstimate).not.toHaveBeenCalled()
    expect(await screen.findByText('نقاط المهمة مطلوبة.')).toBeInTheDocument()
  })

  it('saves the new values with PATCH', async () => {
    svc.updateWorkEstimate.mockResolvedValue({ success: true })
    svc.getMeta.mockResolvedValue({ tech_units: [], users: [], points_options: { medium: [75, 100, 120, 140, 150] } })
    const onSuccess = vi.fn()
    render(<EditEstimateModal ticketId={3} current={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={onSuccess} />)
    // the points are a dropdown of the server's options for the size (the stored 100 is among them)
    await screen.findByRole('option', { name: '140' })
    await userEvent.selectOptions(points(), '140')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.updateWorkEstimate).toHaveBeenCalledWith(3, { task_scope: 'medium', task_points: 140, estimated_hours: 2, requires_deployment: false })
  })

  it('emptying the duration sends an explicit null (clears the hours)', async () => {
    svc.updateWorkEstimate.mockResolvedValue({ success: true })
    render(<EditEstimateModal ticketId={3} current={{ task_scope: 'medium', task_points: 100, estimated_hours: 2 }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    // 2 hours is a preset: «بدون مدة تقريبية» empties it
    await userEvent.selectOptions(duration(), '')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    await waitFor(() => expect(svc.updateWorkEstimate).toHaveBeenCalled())
    expect(svc.updateWorkEstimate.mock.calls[0][1]).toEqual({ task_scope: 'medium', task_points: 100, estimated_hours: null, requires_deployment: false })
  })

  it('leaving an empty duration untouched does not send a key for it', async () => {
    svc.updateWorkEstimate.mockResolvedValue({ success: true })
    render(<EditEstimateModal ticketId={3} current={{ task_scope: 'simple', task_points: 30, estimated_hours: null }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    await waitFor(() => expect(svc.updateWorkEstimate).toHaveBeenCalled())
    expect('estimated_hours' in svc.updateWorkEstimate.mock.calls[0][1]).toBe(false)
  })

  it('maps a server 422 to the fields', async () => {
    svc.updateWorkEstimate.mockRejectedValue(unprocessable({ task_scope: ['الحجم غير صالح.'], task_points: ['النقاط غير صالحة.'] }))
    render(<EditEstimateModal ticketId={3} current={{ task_scope: 'simple', task_points: 30, estimated_hours: null }} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    expect(await screen.findByText('الحجم غير صالح.')).toBeInTheDocument()
    expect(screen.getByText('النقاط غير صالحة.')).toBeInTheDocument()
  })

  it('one scroll area, header and footer always visible; Escape closes', async () => {
    const onClose = vi.fn()
    render(<EditEstimateModal ticketId={3} current={{ task_scope: 'simple', task_points: 30, estimated_hours: null }} onClose={onClose} onSuccess={vi.fn()} />)
    await screen.findByRole('dialog')
    expectPinnedLayout('edit-estimate-modal', 'حفظ النقاط والمدة')
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

const NO_CAPS: TicketCapabilities = {
  approve: false, reject: false, reassign: false, accept_task: false, reject_task: false, complete_task: false, add_internal_note: false, comment: true,
}

function staffTicket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 12, ticket_number: 'EMC-12', title: 'مشكلة', description: '...', ticket_category: 'OLD_ISSUE', priority: 'MEDIUM', department_id: 2,
    created_by_name: 'سارة', status: 'IN_PROGRESS', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', assigned_to_id: 9,
    assignee: { id: 9, name: 'سلمى', email: '' }, task_scope: 'medium', task_points: 120, estimated_hours: 2.5, ...over,
  }
}

describe('«تعديل النقاط والمدة» in the ticket actions', () => {
  it('is offered only when the server grants can_edit_estimate', () => {
    const { rerender } = render(<TicketActionCenter ticket={staffTicket({ capabilities: { ...NO_CAPS, can_edit_estimate: false } })} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'تعديل النقاط والمدة' })).not.toBeInTheDocument()
    rerender(<TicketActionCenter ticket={staffTicket({ capabilities: { ...NO_CAPS, can_edit_estimate: true } })} onChanged={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'تعديل النقاط والمدة' })).toBeInTheDocument()
  })

  it('opens the edit form with the ticket\'s current values and refreshes after saving', async () => {
    svc.updateWorkEstimate.mockResolvedValue({ success: true })
    const onChanged = vi.fn()
    render(<TicketActionCenter ticket={staffTicket({ capabilities: { ...NO_CAPS, can_edit_estimate: true } })} onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'تعديل النقاط والمدة' }))
    expect(await screen.findByRole('dialog', { name: 'تعديل النقاط والمدة' })).toBeInTheDocument()
    expect(points().value).toBe('120')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ النقاط والمدة' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('the reassign button is gated by the capability, whatever the status (a declined ticket can be rerouted)', async () => {
    render(<TicketActionCenter ticket={staffTicket({ status: 'REJECTED_BY_ASSIGNEE', assignee_rejection_reason: 'خارج نطاق تخصصي', capabilities: { ...NO_CAPS, reassign: true } })} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /إعادة التوجيه/ }))
    expect(await screen.findByTestId('previous-decline-reason')).toHaveTextContent('خارج نطاق تخصصي')
  })
})

describe('how the values are shown', () => {
  it('values, unset, and hidden are three different things', () => {
    const { rerender } = render(<TicketEstimateValue ticket={{ task_scope: 'medium', task_points: 120, estimated_hours: 2.5 }} />)
    expect(screen.getByText('120 نقطة · 2.5 ساعة')).toBeInTheDocument()
    rerender(<TicketEstimateValue ticket={{ task_scope: null, task_points: null, estimated_hours: null }} />)
    expect(screen.getByText('— لم تُحدَّد')).toBeInTheDocument()
    rerender(<TicketEstimateValue ticket={{}} />)
    expect(screen.getByText('غير متاح لك')).toBeInTheDocument()
  })
})

describe('ticket page: staff see the values, the reporter never does', () => {
  const page = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard/tickets/12']}>
        <Routes>
          <Route path="/dashboard/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

  it('staff: shows «120 نقطة · 2.5 ساعة»', async () => {
    svc.getTicket.mockResolvedValue({ success: true, data: { ...staffTicket(), capabilities: NO_CAPS, activity_logs: [], attachments: [] } })
    page()
    expect(await screen.findByTestId('ticket-estimate')).toHaveTextContent('120 نقطة · 2.5 ساعة')
  })

  it('staff without access to the values: «غير متاح لك», not «لم تُحدَّد»', async () => {
    const { task_scope: _a, task_points: _b, estimated_hours: _c, ...bare } = staffTicket()
    void _a; void _b; void _c
    svc.getTicket.mockResolvedValue({ success: true, data: { ...bare, capabilities: NO_CAPS, activity_logs: [], attachments: [] } })
    page()
    expect(await screen.findByTestId('ticket-estimate')).toHaveTextContent('غير متاح لك')
  })

  it('reporter view: no points, no duration, no estimate row, even if the payload carried them', async () => {
    svc.getTicket.mockResolvedValue({
      success: true,
      data: {
        viewer_role: 'reporter', id: 12, ticket_number: 'EMC-12', title: 'مشكلة', description: 'وصف', ticket_category: 'OLD_ISSUE', status: 'IN_PROGRESS',
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', resolved_at: null, resolution_note: null, rejection_reason: null,
        department: { id: 2, name: 'التقنية' }, attachments: [], timeline: [{ key: 'submitted', label: 'تم تقديم البلاغ', at: '2026-01-01T00:00:00Z' }], capabilities: NO_CAPS,
        task_scope: 'medium', task_points: 120, estimated_hours: 2.5,
      },
    })
    page()
    const view = await screen.findByTestId('reporter-ticket-view')
    expect(view).not.toHaveTextContent('نقطة')
    expect(view).not.toHaveTextContent('ساعة')
    expect(view).not.toHaveTextContent('النقاط')
    expect(screen.queryByTestId('ticket-estimate')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تعديل النقاط والمدة' })).not.toBeInTheDocument()
  })
})
