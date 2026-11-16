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

describe('convert entry point: the accepted volunteers page', () => {
  it('the row button opens the confirmation dialog (no direct convert), and after success the list is re-read and the row is converted', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [volunteer()], meta, pagination })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    await userEvent.click(await screen.findByRole('button', { name: /تحويل إلى عضو/ }))

    // opening it converts nothing
    const dialog = await screen.findByRole('dialog', { name: 'تحويل المتطوع إلى عضو' })
    expect(convert).not.toHaveBeenCalled()
    expect(await within(dialog).findByRole('combobox')).toHaveValue('4')

    convert.mockResolvedValueOnce(converted())
    fetchAccepted.mockResolvedValueOnce({
      data: [volunteer({ status: 'converted_to_member', is_converted: true, can_convert_to_member: false })],
      meta: { ...meta, total_accepted: 0, total_converted: 1 },
      pagination,
    })
    await userEvent.click(within(dialog).getByRole('button', { name: 'اعتماد الإدارة وإنشاء الحساب' }))

    expect(convert).toHaveBeenCalledWith(7, 4)
    expect(await within(dialog).findByText('تم تحويل المتطوع إلى عضو.')).toBeInTheDocument()
    await waitFor(() => expect(fetchAccepted).toHaveBeenCalledTimes(2)) // refreshed behind the open dialog
    // the row turned «تم التحويل» and was NOT removed
    expect(await screen.findByText('تم التحويل', { selector: 'span' })).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('علي حسن')).toBeInTheDocument()
  })
})

describe('accepted volunteers page: the counters never count one request twice', () => {
  it('a converted row is counted only as converted, even if the server counted it as accepted too', async () => {
    const converted = volunteer({ id: 8, full_name: 'سارة', email: 's@example.com', status: 'accepted', is_converted: true, can_convert_to_member: false })
    // a server whose «accepted» counter still includes the converted request
    fetchAccepted.mockResolvedValueOnce({ data: [volunteer(), converted], meta: { ...meta, total_accepted: 2, total_converted: 1 }, pagination: { ...pagination, total: 2 } })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    await screen.findByText('سارة')
    const card = (label: string) => screen.getByText(label, { selector: 'p' }).parentElement as HTMLElement
    await waitFor(() => expect(card('بانتظار التحويل')).toHaveTextContent('1'))
    await waitFor(() => expect(card('تم التحويل')).toHaveTextContent('1'))
    expect(card('بانتظار التحويل')).not.toHaveTextContent('2')
  })
})

describe('resend entry point: converted rows of the accepted volunteers page', () => {
  it('a converted row offers «إعادة إرسال بيانات الدخول», which calls the endpoint and shows the server reason on refusal', async () => {
    const row = volunteer({ status: 'converted_to_member', is_converted: true, can_convert_to_member: false })
    fetchAccepted.mockResolvedValueOnce({ data: [row], meta: { ...meta, total_accepted: 0, total_converted: 1 }, pagination })
    vi.mocked(applicationApi.resendVolunteerCredentials).mockRejectedValueOnce({ response: { status: 409, data: { message: 'سجّل المتطوع دخوله بالفعل.' } } })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    await userEvent.click(await screen.findByRole('button', { name: 'إعادة إرسال بيانات الدخول' }))
    expect(screen.queryByRole('button', { name: /تحويل إلى عضو/ })).not.toBeInTheDocument()

    expect(applicationApi.resendVolunteerCredentials).toHaveBeenCalledWith(7)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('سجّل المتطوع دخوله بالفعل.'))
  })

  it('a not-yet-converted row has no resend button', async () => {
    fetchAccepted.mockResolvedValueOnce({ data: [volunteer()], meta, pagination })
    render(<MemoryRouter><AcceptedVolunteersPage /></MemoryRouter>)

    expect(await screen.findByRole('button', { name: /تحويل إلى عضو/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).not.toBeInTheDocument()
  })
})

describe('convert entry point: the volunteer requests page', () => {
  it('an accepted request opened in the detail window can be converted (the old no-op is gone)', async () => {
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
    expect(convert).not.toHaveBeenCalled()
  })
})
