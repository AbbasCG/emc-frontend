import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'

const svc = vi.hoisted(() => ({ getMeta: vi.fn(), approveTicket: vi.fn(), reassign: vi.fn() }))
vi.mock('@/services/ticketService', () => ({ ticketService: svc }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))
// The assignee picker is a react-select; a plain select keeps these tests about WHICH people are offered.
vi.mock('@/components/tickets/AssigneeSearchSelect', () => ({
  default: ({ users, value, onChange, ariaLabel, isDisabled, placeholder }: { users: Array<{ id: number; name: string }>; value: string; onChange: (v: string) => void; ariaLabel: string; isDisabled?: boolean; placeholder?: string }) => (
    <select aria-label={ariaLabel} value={value} disabled={isDisabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder ?? '--'}</option>
      {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
    </select>
  ),
}))

import { ApproveTicketModal } from '@/components/tickets/modals/ApproveTicketModal'
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const salma = { id: 9, name: 'سلمى', email: '' }
const khaled = { id: 10, name: 'خالد', email: '' }
const unitA = { id: 4, name_ar: 'الدعم الفني' }
const unitB = { id: 5, name_ar: 'الشبكات' }

const apiError = (status: number, data: Record<string, unknown>) =>
  new AxiosError('x', String(status), undefined, undefined, { status, statusText: '', headers: {}, config: {} as never, data })

/** A promise settled by hand, so a test decides which of two requests answers first. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })

  return { promise, resolve }
}

/** A department WITH units: the department answer lists them (and no members), a unit answer lists that unit's members. */
function withUnits(byUnit: Record<number, Array<{ id: number; name: string; email: string }>> = { 4: [salma, khaled], 5: [khaled] }) {
  svc.getMeta.mockImplementation(async (p: { unit_id?: number }) => ({
    tech_units: [unitA, unitB],
    users: p.unit_id ? (byUnit[p.unit_id] ?? []) : [],
  }))
}

/** A department WITHOUT units: the department answer already carries its eligible members. */
function withoutUnits(users: Array<{ id: number; name: string; email: string }> = [salma, khaled]) {
  svc.getMeta.mockImplementation(async () => ({ tech_units: [], users }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

const fillEstimate = async () => {
  await userEvent.selectOptions(screen.getByLabelText(/حجم المهمة/), 'medium')
  await userEvent.type(screen.getByLabelText(/نقاط المهمة/), '120')
  // the approximate duration is required when work is assigned
  await userEvent.selectOptions(screen.getByLabelText(/^المدة التقريبية/), '2')
}

const approveButton = () => screen.getByRole('button', { name: 'تأكيد الاعتماد والإحالة' })
const reassignButton = () => screen.getByRole('button', { name: 'تأكيد إعادة التوجيه' })
const assignee = (label: string) => screen.getByLabelText(label) as HTMLSelectElement

const APPROVE_ASSIGNEE = 'الموظف المكلف بالإنجاز'
const REASSIGN_ASSIGNEE = 'المكلف الجديد'

describe('ApproveTicketModal: a department WITH units keeps the unit-first rules', () => {
  it('asks for the unit first, loads its members after, and sends unit_id', async () => {
    withUnits()
    svc.approveTicket.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={onSuccess} />)

    const unit = await screen.findByLabelText(/الوحدة التقنية المستهدفة/)
    expect(assignee(APPROVE_ASSIGNEE)).toBeDisabled()
    expect(within(assignee(APPROVE_ASSIGNEE)).getByRole('option', { name: 'اختر الوحدة التقنية أولاً' })).toBeInTheDocument()
    expect(approveButton()).toBeDisabled()
    expect(svc.getMeta).toHaveBeenCalledTimes(1)

    await userEvent.selectOptions(unit, '4')
    await screen.findByRole('option', { name: 'سلمى' })
    expect(svc.getMeta).toHaveBeenLastCalledWith({ department_id: 2, unit_id: 4 })
    expect(approveButton()).toBeDisabled() // no assignee yet

    await userEvent.selectOptions(assignee(APPROVE_ASSIGNEE), '9')
    expect(approveButton()).toBeEnabled()
    await fillEstimate()
    await userEvent.click(approveButton())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.approveTicket.mock.calls[0][1]).toMatchObject({ unit_id: 4, assigned_to_id: 9, sla_hours: 24 })
  })

  it('shows the unit-wording message when the chosen unit has nobody', async () => {
    withUnits({ 4: [] })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.selectOptions(await screen.findByLabelText(/الوحدة التقنية المستهدفة/), '4')
    expect(await screen.findByTestId('assignment-no-members')).toHaveTextContent('لا يوجد موظفون مرتبطون بهذه الوحدة')
    expect(approveButton()).toBeDisabled()
  })
})

describe('ApproveTicketModal: a department WITHOUT units can still assign', () => {
  it('hides the unit field, shows the members at once from the SAME response, and sends no unit_id', async () => {
    withoutUnits()
    svc.approveTicket.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={onSuccess} />)

    expect(await screen.findByTestId('assignment-no-units')).toHaveTextContent('لا توجد وحدات تقنية في هذه الإدارة')
    expect(screen.queryByLabelText(/الوحدة التقنية المستهدفة/)).not.toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'سلمى' })).toBeInTheDocument()
    expect(assignee(APPROVE_ASSIGNEE)).toBeEnabled()
    expect(svc.getMeta).toHaveBeenCalledTimes(1) // no redundant request
    expect(svc.getMeta).toHaveBeenCalledWith({ department_id: 2 })

    await userEvent.selectOptions(assignee(APPROVE_ASSIGNEE), '9')
    expect(approveButton()).toBeEnabled()
    await fillEstimate()
    await userEvent.click(approveButton())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const body = svc.approveTicket.mock.calls[0][1]
    expect(body).toMatchObject({ assigned_to_id: 9, sla_hours: 24, task_scope: 'medium', task_points: 120 })
    expect('unit_id' in body).toBe(false)
    expect(svc.getMeta).toHaveBeenCalledTimes(1)
  })

  it('says there is nobody eligible in the DEPARTMENT (not the unit wording) when the list is empty', async () => {
    withoutUnits([])
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByTestId('assignment-no-members')).toHaveTextContent('لا يوجد أعضاء مؤهلون للإسناد في هذه الإدارة')
    expect(screen.getByTestId('approve-ticket-modal')).not.toHaveTextContent('الوحدة')
    expect(approveButton()).toBeDisabled()
  })
})

describe('the load states', () => {
  it('shows a loading state, then the fields', async () => {
    const slow = deferred<{ tech_units: never[]; users: typeof salma[] }>()
    svc.getMeta.mockReturnValue(slow.promise)
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByTestId('assignment-loading')).toBeInTheDocument()
    expect(approveButton()).toBeDisabled()
    slow.resolve({ tech_units: [], users: [salma] })
    expect(await screen.findByTestId('assignment-no-units')).toBeInTheDocument()
    expect(screen.queryByTestId('assignment-loading')).not.toBeInTheDocument()
  })

  it('a failed load is an error with retry, NOT «no units»; it blocks submit; retry recovers', async () => {
    withUnits()
    svc.getMeta.mockRejectedValueOnce(new Error('network')) // the first call fails, later ones succeed
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)

    const alert = await screen.findByTestId('assignment-load-error')
    expect(alert).toHaveTextContent('تعذر تحميل الوحدات والأعضاء المتاحين للإسناد')
    expect(screen.queryByTestId('assignment-no-units')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/الوحدة التقنية المستهدفة/)).not.toBeInTheDocument()
    expect(approveButton()).toBeDisabled()
    expect(assignee(APPROVE_ASSIGNEE)).toBeDisabled()

    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByLabelText(/الوحدة التقنية المستهدفة/)).toBeInTheDocument()
    expect(screen.queryByTestId('assignment-load-error')).not.toBeInTheDocument()
    expect(svc.getMeta).toHaveBeenCalledTimes(2)
  })

  it('the same for reassign', async () => {
    svc.getMeta.mockImplementation(async () => ({ tech_units: [], users: [salma] }))
    svc.getMeta.mockRejectedValueOnce(new Error('network'))
    render(<ReassignTicketModal ticketId={5} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const alert = await screen.findByTestId('assignment-load-error')
    expect(reassignButton()).toBeDisabled()
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByRole('option', { name: 'سلمى' })).toBeInTheDocument()
    expect(reassignButton()).toBeDisabled() // still no assignee
  })

  it('a failed members load for a unit is its own retryable error, not an empty list', async () => {
    let failOnce = true
    svc.getMeta.mockImplementation(async (p: { unit_id?: number }) => {
      if (p.unit_id && failOnce) { failOnce = false; throw new Error('boom') }

      return { tech_units: [unitA], users: p.unit_id ? [salma] : [] }
    })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await userEvent.selectOptions(await screen.findByLabelText(/الوحدة التقنية المستهدفة/), '4')
    const alert = await screen.findByTestId('assignment-users-error')
    expect(screen.queryByTestId('assignment-no-members')).not.toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByRole('option', { name: 'سلمى' })).toBeInTheDocument()
  })
})

describe('changing the unit', () => {
  it('clears the assignee when the new unit does not have them, keeps them when it does', async () => {
    withUnits({ 4: [salma, khaled], 5: [khaled] })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const unit = await screen.findByLabelText(/الوحدة التقنية المستهدفة/)
    await userEvent.selectOptions(unit, '4')
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(assignee(APPROVE_ASSIGNEE), '9')
    expect(assignee(APPROVE_ASSIGNEE).value).toBe('9')

    await userEvent.selectOptions(unit, '5') // سلمى is not in unit 5
    await waitFor(() => expect(screen.queryByRole('option', { name: 'سلمى' })).not.toBeInTheDocument())
    expect(assignee(APPROVE_ASSIGNEE).value).toBe('')
    expect(approveButton()).toBeDisabled()

    await userEvent.selectOptions(assignee(APPROVE_ASSIGNEE), '10')
    await userEvent.selectOptions(unit, '4') // خالد is in both units
    await screen.findByRole('option', { name: 'سلمى' })
    expect(assignee(APPROVE_ASSIGNEE).value).toBe('10')
    expect(approveButton()).toBeEnabled()
  })

  it('ignores a slower answer for an EARLIER unit (it neither replaces the list nor re-selects a stale assignee)', async () => {
    const slowA = deferred<{ tech_units: typeof unitA[]; users: typeof salma[] }>()
    svc.getMeta.mockImplementation((p: { unit_id?: number }) => {
      if (p.unit_id === 4) return slowA.promise
      if (p.unit_id === 5) return Promise.resolve({ tech_units: [unitA, unitB], users: [khaled] })

      return Promise.resolve({ tech_units: [unitA, unitB], users: [] })
    })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const unit = await screen.findByLabelText(/الوحدة التقنية المستهدفة/)

    await userEvent.selectOptions(unit, '4') // slow
    await userEvent.selectOptions(unit, '5') // fast: answers first
    expect(await screen.findByRole('option', { name: 'خالد' })).toBeInTheDocument()

    slowA.resolve({ tech_units: [unitA, unitB], users: [salma, khaled] }) // the old answer lands late
    await new Promise((r) => setTimeout(r, 30))

    expect(screen.queryByRole('option', { name: 'سلمى' })).not.toBeInTheDocument()
    expect(within(assignee(APPROVE_ASSIGNEE)).getAllByRole('option').map((o) => o.textContent)).toEqual(['-- ابحث عن المكلف بالاسم --', 'خالد'])
    expect((unit as HTMLSelectElement).value).toBe('5')
  })

  it('a stale answer cannot bring back an assignee chosen under an earlier unit', async () => {
    const slowA = deferred<{ tech_units: typeof unitA[]; users: typeof salma[] }>()
    let aCalls = 0
    svc.getMeta.mockImplementation((p: { unit_id?: number }) => {
      if (p.unit_id === 4) { aCalls += 1; return aCalls === 1 ? Promise.resolve({ tech_units: [unitA, unitB], users: [salma] }) : slowA.promise }
      if (p.unit_id === 5) return Promise.resolve({ tech_units: [unitA, unitB], users: [khaled] })

      return Promise.resolve({ tech_units: [unitA, unitB], users: [] })
    })
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const unit = await screen.findByLabelText(/الوحدة التقنية المستهدفة/)
    await userEvent.selectOptions(unit, '4')
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(assignee(APPROVE_ASSIGNEE), '9')
    await userEvent.selectOptions(unit, '5')
    await screen.findByRole('option', { name: 'خالد' })
    expect(assignee(APPROVE_ASSIGNEE).value).toBe('')
    slowA.resolve({ tech_units: [], users: [salma] })
    await new Promise((r) => setTimeout(r, 30))
    expect(assignee(APPROVE_ASSIGNEE).value).toBe('')
    expect(approveButton()).toBeDisabled()
  })
})

describe('server refusals', () => {
  const pick = async () => {
    await userEvent.selectOptions(await screen.findByLabelText(/الوحدة التقنية المستهدفة/), '4')
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(assignee(APPROVE_ASSIGNEE), '9')
    await fillEstimate()
  }

  it('422 on unit_id / assigned_to_id shows Arabic field errors under the fields and keeps the dialog', async () => {
    withUnits()
    svc.approveTicket.mockRejectedValue(apiError(422, { message: 'x', errors: { unit_id: ['الوحدة المختارة لا تتبع هذه الإدارة.'], assigned_to_id: ['هذا الموظف غير مؤهل للإسناد.'] } }))
    const onSuccess = vi.fn()
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={onSuccess} />)
    await pick()
    await userEvent.click(approveButton())
    expect(await screen.findByText('الوحدة المختارة لا تتبع هذه الإدارة.')).toBeInTheDocument()
    expect(screen.getByText('هذا الموظف غير مؤهل للإسناد.')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it.each([[403, 'ليس لديك صلاحية إسناد هذه التذكرة.'], [409, 'تغيّرت حالة التذكرة. حدّث الصفحة.']])('%i shows the server message', async (status, message) => {
    withUnits()
    svc.approveTicket.mockRejectedValue(apiError(status, { message }))
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await pick()
    await userEvent.click(approveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('reassign: 422 on assigned_to_id is a field error', async () => {
    withoutUnits()
    svc.reassign.mockRejectedValue(apiError(422, { message: 'x', errors: { assigned_to_id: ['لا يمكن إسناد التذكرة لمن اعتذر عنها.'] } }))
    render(<ReassignTicketModal ticketId={5} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(assignee(REASSIGN_ASSIGNEE), '9')
    await fillEstimate()
    await userEvent.click(reassignButton())
    expect(await screen.findByText('لا يمكن إسناد التذكرة لمن اعتذر عنها.')).toBeInTheDocument()
  })
})

describe('ReassignTicketModal', () => {
  it('with units: the ticket\'s current unit is preselected, its members load, unit_id is sent', async () => {
    withUnits()
    svc.reassign.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentUnitId={4} onClose={vi.fn()} onSuccess={onSuccess} />)
    const unit = (await screen.findByLabelText(/الوحدة التقنية/)) as HTMLSelectElement
    expect(unit.value).toBe('4')
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(assignee(REASSIGN_ASSIGNEE), '9')
    await fillEstimate()
    await userEvent.click(reassignButton())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(svc.reassign.mock.calls[0][1]).toMatchObject({ assigned_to_id: 9, unit_id: 4 })
  })

  it('with units but no current unit: the unit is required before anyone can be picked', async () => {
    withUnits()
    render(<ReassignTicketModal ticketId={5} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await screen.findByLabelText(/الوحدة التقنية/)
    expect(assignee(REASSIGN_ASSIGNEE)).toBeDisabled()
    expect(reassignButton()).toBeDisabled()
  })

  it('a current unit the department no longer lists is not kept (the unit must be chosen again)', async () => {
    withUnits()
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentUnitId={99} onClose={vi.fn()} onSuccess={vi.fn()} />)
    const unit = (await screen.findByLabelText(/الوحدة التقنية/)) as HTMLSelectElement
    expect(unit.value).toBe('')
    expect(svc.getMeta).toHaveBeenCalledTimes(1)
  })

  it('without units: no unit field, members at once, no unit_id even when the ticket carries a stale unit', async () => {
    withoutUnits()
    svc.reassign.mockResolvedValue({ success: true })
    const onSuccess = vi.fn()
    render(<ReassignTicketModal ticketId={5} departmentId={2} currentUnitId={4} onClose={vi.fn()} onSuccess={onSuccess} />)
    expect(await screen.findByTestId('assignment-no-units')).toHaveTextContent('لا توجد وحدات تقنية في هذه الإدارة')
    expect(screen.queryByLabelText(/الوحدة التقنية/)).not.toBeInTheDocument()
    await screen.findByRole('option', { name: 'سلمى' })
    expect(svc.getMeta).toHaveBeenCalledTimes(1)
    await userEvent.selectOptions(assignee(REASSIGN_ASSIGNEE), '9')
    await fillEstimate()
    await userEvent.click(reassignButton())
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect('unit_id' in svc.reassign.mock.calls[0][1]).toBe(false)
    expect(svc.reassign.mock.calls[0][1]).toMatchObject({ assigned_to_id: 9 })
  })

  it('without units and nobody eligible: the department message, submit stays off', async () => {
    withoutUnits([])
    render(<ReassignTicketModal ticketId={5} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByTestId('assignment-no-members')).toHaveTextContent('لا يوجد أعضاء مؤهلون للإسناد في هذه الإدارة')
    expect(reassignButton()).toBeDisabled()
  })

  it('reused for another ticket / department: nothing carries over (unit, assignee, lists)', async () => {
    svc.getMeta.mockImplementation(async (p: { department_id?: number; unit_id?: number }) =>
      p.department_id === 2
        ? { tech_units: [unitA], users: p.unit_id ? [salma] : [] }
        : { tech_units: [], users: [khaled] })
    const { rerender } = render(<ReassignTicketModal ticketId={5} departmentId={2} currentUnitId={4} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await screen.findByRole('option', { name: 'سلمى' })
    await userEvent.selectOptions(assignee(REASSIGN_ASSIGNEE), '9')
    expect(assignee(REASSIGN_ASSIGNEE).value).toBe('9')

    rerender(<ReassignTicketModal ticketId={6} departmentId={3} onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(await screen.findByRole('option', { name: 'خالد' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'سلمى' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/الوحدة التقنية/)).not.toBeInTheDocument()
    expect(assignee(REASSIGN_ASSIGNEE).value).toBe('')
    expect(reassignButton()).toBeDisabled()
  })
})

describe('layout', () => {
  it('approve with no units: still one scroll area with a pinned footer', async () => {
    withoutUnits()
    render(<ApproveTicketModal ticketId={77} departmentId={2} onClose={vi.fn()} onSuccess={vi.fn()} />)
    await screen.findByTestId('assignment-no-units')
    const dialog = screen.getByTestId('approve-ticket-modal')
    const scrollers = dialog.querySelectorAll('.overflow-y-auto')
    expect(scrollers).toHaveLength(1)
    const footer = within(dialog).getByRole('button', { name: 'تأكيد الاعتماد والإحالة' }).closest('footer')
    expect(footer).not.toBeNull()
    expect(scrollers[0].contains(footer)).toBe(false)
  })
})
