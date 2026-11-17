import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import AcceptedVolunteersPage from '@/pages/admin/AcceptedVolunteersPage'
import VolunteerRequestsPage from '@/pages/super-admin/VolunteerRequestsPage'
import type { ConvertVolunteerResult, VolunteerRequest } from '@/api/volunteerApplicationApi'
import * as applicationApi from '@/api/volunteerApplicationApi'
import * as opportunitiesAdminApi from '@/api/volunteerOpportunitiesAdminApi'
import toast from '@/lib/toast'

vi.mock('@/api/volunteerApplicationApi', async (importActual) => {
  const actual = await importActual<typeof import('@/api/volunteerApplicationApi')>()
  return {
    ...actual,
    fetchAcceptedVolunteers: vi.fn(),
    fetchVolunteerRequests: vi.fn(),
    convertVolunteerToMember: vi.fn(),
    resendVolunteerCredentials: vi.fn(),
  }
})
vi.mock('@/api/volunteerOpportunitiesAdminApi', () => ({ fetchDepartmentOptions: vi.fn() }))
vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
  promiseToast: (p: Promise<unknown>) => p,
}))

const fetchAccepted = vi.mocked(applicationApi.fetchAcceptedVolunteers)
const fetchRequests = vi.mocked(applicationApi.fetchVolunteerRequests)
const convert = vi.mocked(applicationApi.convertVolunteerToMember)
const fetchDepartments = vi.mocked(opportunitiesAdminApi.fetchDepartmentOptions)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const volunteer = (over: Partial<VolunteerRequest> = {}): VolunteerRequest => ({
  id: 7,
  full_name: 'علي حسن',
  email: 'ali@example.com',
  status: 'accepted',
  desired_department: 'الإعلام والتسويق',
  suggested_department_id: 4,
  suggested_department_name: 'الإعلام والتسويق',
  is_converted: false,
  can_convert_to_member: true,
  ...over,
})

const meta = { total_accepted: 1, total_converted: 0, accepted_this_month: 1, top_department: 'الإعلام والتسويق' }
const pagination = { total: 1, current_page: 1, last_page: 1, per_page: 200 }

function converted(): ConvertVolunteerResult {
  return {
    message: 'تم تحويل المتطوع إلى عضو.',
    request: volunteer({ status: 'converted_to_member', is_converted: true, can_convert_to_member: false }),
    member: {
      id: 99, name_ar: 'علي حسن', position_ar: 'عضو', role_key: 'department_member', department_id: 4, department_name: 'الإعلام والتسويق',
      member_type: 'volunteer', source: 'volunteer_request', source_id: 7, is_new_member: true, joined_at: '2026-11-16', is_active: true,
      has_user_account: true, user_id: 501, account_created: true, account_existing: false, credentials_reissued: false, department_kept_existing: false, email_sent: true,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchDepartments.mockResolvedValue([{ id: 3, name: 'الموارد البشرية' }, { id: 4, name: 'الإعلام والتسويق' }])
})

describe('the accepted volunteers page no longer converts anyone', () => {
  it('has no «تحويل إلى عضو» button, neither in the row nor in the name window', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [volunteer()], meta, pagination })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    await screen.findByRole('button', { name: 'علي حسن' })
    expect(screen.queryByRole('button', { name: /تحويل إلى عضو/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'علي حسن' }))
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })
    expect(within(dialog).queryByRole('button', { name: /تحويل إلى عضو/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'تحويل المتطوع إلى عضو' })).not.toBeInTheDocument()
    expect(convert).not.toHaveBeenCalled()
  })
})

describe('accepted volunteers page: the counters are the server’s, converted + waiting = total', () => {
  it('shows the numbers of meta, for rows that carry the converted status', async () => {
    const converted = volunteer({ id: 8, full_name: 'سارة', email: 's@example.com', status: 'converted_to_member', is_converted: true, can_convert_to_member: false })
    // one still waiting, one converted: the list holds both and meta counts each exactly once
    fetchAccepted.mockResolvedValueOnce({ data: [volunteer(), converted], meta: { ...meta, total_accepted: 1, total_converted: 1 }, pagination: { ...pagination, total: 2 } })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    await screen.findByText('سارة')
    const stats = screen.getByTestId('accepted-stats')
    const card = (label: string) => within(stats).getByText(label).parentElement as HTMLElement
    expect(card('بانتظار التحويل')).toHaveTextContent('1')
    expect(card('تم التحويل')).toHaveTextContent('1')
    expect(card('إجمالي المقبولين')).toHaveTextContent('2')

    // the badges in the table agree with the cards
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(within(rows[1]).getByText('بانتظار التحويل')).toBeInTheDocument()
    expect(within(rows[2]).getByText('تم التحويل')).toBeInTheDocument()
  })
})

describe('resend entry point: the window of a converted volunteer', () => {
  const convertedRow = () => volunteer({ status: 'converted_to_member', is_converted: true, can_convert_to_member: false })

  it('offers «إعادة إرسال بيانات الدخول», which calls the endpoint and shows the server reason on refusal', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [convertedRow()], meta: { ...meta, total_accepted: 0, total_converted: 1 }, pagination })
    vi.mocked(applicationApi.resendVolunteerCredentials).mockRejectedValueOnce({ response: { status: 409, data: { message: 'سجّل المتطوع دخوله بالفعل.' } } })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    // not a row action any more: it lives in the name window
    await screen.findByRole('button', { name: 'علي حسن' })
    expect(screen.queryByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'علي حسن' }))
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })
    expect(within(dialog).getAllByText('تم التحويل').length).toBeGreaterThan(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'إعادة إرسال بيانات الدخول' }))
    expect(screen.queryByRole('button', { name: /تحويل إلى عضو/ })).not.toBeInTheDocument()

    expect(applicationApi.resendVolunteerCredentials).toHaveBeenCalledWith(7)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('سجّل المتطوع دخوله بالفعل.'))
  })

  it('a successful resend says so', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [convertedRow()], meta: { ...meta, total_accepted: 0, total_converted: 1 }, pagination })
    vi.mocked(applicationApi.resendVolunteerCredentials).mockResolvedValueOnce({ email_sent: true })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    await userEvent.click(await screen.findByRole('button', { name: 'علي حسن' }))
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة إرسال بيانات الدخول' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('أُعيد إرسال بيانات الدخول إلى المتطوع.'))
  })

  it('a not-yet-converted volunteer has no resend button, and the window says «بانتظار التحويل»', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [volunteer()], meta, pagination })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    await userEvent.click(await screen.findByRole('button', { name: 'علي حسن' }))
    const dialog = await screen.findByRole('dialog', { name: /علي حسن/ })

    expect(within(dialog).getByText('بانتظار التحويل')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).not.toBeInTheDocument()
  })
})

describe('convert entry point: the volunteer requests page (the only place that converts)', () => {
  it('an accepted request opened in the detail window can be converted: confirmation first, then the call', async () => {
    fetchRequests.mockResolvedValue({
      data: [volunteer()],
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 1, from: 1, to: 1 },
      statistics: { total: 1, pending: 0, reviewing: 0, reviewed: 0, accepted: 1, rejected: 0, contacted: 0, converted_to_member: 0 },
    })
    render(<MemoryRouter><VolunteerRequestsPage /></MemoryRouter>)

    await userEvent.click(within(await screen.findByRole('table')).getByRole('button', { name: /^مراجعة$/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'تحويل إلى عضو' }))

    const dialog = await screen.findByRole('dialog', { name: 'تحويل المتطوع إلى عضو' })
    expect(await within(dialog).findByRole('combobox')).toHaveValue('4')
    // opening it converts nothing
    expect(convert).not.toHaveBeenCalled()

    convert.mockResolvedValueOnce(converted())
    await userEvent.click(within(dialog).getByRole('button', { name: 'اعتماد الإدارة وإنشاء الحساب' }))

    expect(convert).toHaveBeenCalledWith(7, 4)
    expect(await within(dialog).findByText('تم تحويل المتطوع إلى عضو.')).toBeInTheDocument()
  })
})
