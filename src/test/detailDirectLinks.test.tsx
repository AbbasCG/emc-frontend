import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router'
import OpsConsultantApplicationsPage from '@/pages/operations/admin/OpsConsultantApplicationsPage'
import OpsPartnershipRequestsPage from '@/pages/operations/admin/OpsPartnershipRequestsPage'
import AdminExpertApplicationsPage from '@/pages/platform/admin/ai/AdminExpertApplicationsPage'
import { classifyDetailError } from '@/hooks/useDetailRecord'

const consultant = vi.hoisted(() => ({ fetchConsultantApplications: vi.fn(), fetchConsultantApplication: vi.fn(), updateConsultantApplicationStatus: vi.fn() }))
vi.mock('@/api/consultantApi', async (orig) => ({ ...(await orig<typeof import('@/api/consultantApi')>()), ...consultant }))
const partners = vi.hoisted(() => ({ fetchPartnershipRequests: vi.fn(), fetchPartnershipRequest: vi.fn(), updatePartnershipRequest: vi.fn() }))
vi.mock('@/api/partnersApi', async (orig) => ({ ...(await orig<typeof import('@/api/partnersApi')>()), ...partners }))
const expert = vi.hoisted(() => ({ fetchExpertApplications: vi.fn(), fetchExpertApplication: vi.fn(), updateExpertApplicationStatus: vi.fn() }))
vi.mock('@/api/expertApplicationsAdminApi', async (orig) => ({ ...(await orig<typeof import('@/api/expertApplicationsAdminApi')>()), ...expert }))
vi.mock('@/contexts/PageAccessContext', () => ({ usePageAccess: () => ({ canAccessPath: () => null }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }, promiseToast: (p: Promise<unknown>) => p }))
vi.mock('@/components/operations/OpsPageSkeleton', () => ({ default: () => <div>loading</div> }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const http = (status: number) => Object.assign(new Error(String(status)), { isAxiosError: true, response: { status, data: {} } })

const consultantRow = (over: Record<string, unknown> = {}) => ({
  id: 4, full_name: 'سارة المستشارة', email: 'sara@example.com', phone: '+31600000000', country: 'هولندا', city: 'أمستردام', specialty: 'استراتيجية البيانات',
  desired_department: 'التقنية', years_experience: 9, linkedin_url: null, motivation: 'دعم الفرق.', availability: '5 ساعات', status: 'new', reviewer_note: null,
  cv_view_url: null, created_at: '2026-10-01T09:00:00Z', ...over,
})
const partnerRow = (over: Record<string, unknown> = {}) => ({
  id: 8, partner_name: 'جامعة المستقبل', contact_name: 'خالد', email: 'k@uni.edu', phone: '+966500000000', country: 'السعودية', city: 'الرياض', website: null,
  type: 'جامعة', partnership_type: 'تدريب', message: 'مقترح.', privacy_accepted: true, status: 'new', created_at: '2026-10-02T09:00:00Z', ...over,
})
const expertRow = (over: Record<string, unknown> = {}) => ({
  id: 7, uuid: 'u', status: 'new', full_name: 'ليلى أحمد', email: 'layla@example.test', whatsapp_number: null, country: 'هولندا', city: 'أمستردام',
  primary_specialty: 'تعلم الآلة', created_at: '2026-10-01T10:00:00Z', ...over,
})

function Probe() {
  const l = useLocation()

  return <span data-testid="loc">{l.pathname + l.search}</span>
}

function mount(el: React.ReactElement, entry: string) {
  const router = createMemoryRouter([{ path: '/x', element: <>{el}<Probe /></> }], { initialEntries: [entry] })
  render(<RouterProvider router={router} />)

  return router
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.style.overflow = ''
  consultant.fetchConsultantApplications.mockResolvedValue({ rows: [consultantRow({ id: 5, full_name: 'نورة' })], total: 1, counts: {} })
  partners.fetchPartnershipRequests.mockResolvedValue([partnerRow({ id: 9, partner_name: 'شركة الأفق' })])
  expert.fetchExpertApplications.mockResolvedValue({ data: [expertRow({ id: 2, full_name: 'عمر' })], current_page: 1, last_page: 1, total: 1 })
})

describe('classifyDetailError', () => {
  it('403 and 401 are forbidden, 404 is not found, anything else is an error', () => {
    expect(classifyDetailError(http(403))).toBe('forbidden')
    expect(classifyDetailError(http(401))).toBe('forbidden')
    expect(classifyDetailError(http(404))).toBe('not_found')
    expect(classifyDetailError(http(500))).toBe('error')
    expect(classifyDetailError(new Error('network'))).toBe('error')
  })
})

describe('consultant direct link to a record the list does not contain', () => {
  it('requests that one record by id, shows it, and leaves the list and URL alone', async () => {
    consultant.fetchConsultantApplication.mockResolvedValue(consultantRow({ id: 4 }))
    mount(<OpsConsultantApplicationsPage />, '/x?status=approved&view=4')

    const dlg = await screen.findByTestId('consultant-application-modal')
    expect(dlg.textContent).toContain('سارة المستشارة')
    expect(consultant.fetchConsultantApplication).toHaveBeenCalledWith(4)
    expect(consultant.fetchConsultantApplication).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('loc').textContent).toBe('/x?status=approved&view=4')
    expect(await screen.findByText('نورة')).toBeTruthy()
  })

  it('a record that is in the loaded list is not requested again', async () => {
    consultant.fetchConsultantApplications.mockResolvedValue({ rows: [consultantRow({ id: 5, full_name: 'نورة' })], total: 1, counts: {} })
    mount(<OpsConsultantApplicationsPage />, '/x')
    await userEvent.click(await screen.findByRole('button', { name: 'عرض تفاصيل نورة' }))
    await screen.findByTestId('consultant-application-modal')

    expect(consultant.fetchConsultantApplication).not.toHaveBeenCalled()
  })

  it('403 says the record is out of scope with no retry; 404 says it is gone', async () => {
    consultant.fetchConsultantApplication.mockRejectedValue(http(403))
    mount(<OpsConsultantApplicationsPage />, '/x?view=4')
    expect(await screen.findByTestId('detail-state-forbidden')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()
    expect(screen.queryByTestId('consultant-application-modal')).toBeNull()
  })

  it('404: deleted or wrong id, closing keeps the list URL', async () => {
    consultant.fetchConsultantApplication.mockRejectedValue(http(404))
    mount(<OpsConsultantApplicationsPage />, '/x?status=new&view=4')
    expect(await screen.findByTestId('detail-state-not_found')).toBeTruthy()

    await userEvent.click(screen.getAllByRole('button', { name: 'إغلاق' }).at(-1)!)

    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/x?status=new'))
    expect(screen.queryByTestId('detail-state-not_found')).toBeNull()
  })

  it('an error offers a retry that then shows the record', async () => {
    consultant.fetchConsultantApplication.mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(consultantRow({ id: 4 }))
    mount(<OpsConsultantApplicationsPage />, '/x?view=4')

    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByTestId('consultant-application-modal')).toBeTruthy()
    expect(consultant.fetchConsultantApplication).toHaveBeenCalledTimes(2)
  })

  it('Back and Forward still close and reopen a fetched record', async () => {
    consultant.fetchConsultantApplication.mockResolvedValue(consultantRow({ id: 4 }))
    const router = mount(<OpsConsultantApplicationsPage />, '/x')
    await screen.findByText('نورة')
    await act(async () => { await router.navigate('/x?view=4') })
    await screen.findByTestId('consultant-application-modal')

    await act(async () => { await router.navigate(-1) })
    await waitFor(() => expect(screen.queryByTestId('consultant-application-modal')).toBeNull())
    await act(async () => { await router.navigate(1) })

    expect(await screen.findByTestId('consultant-application-modal')).toBeTruthy()
  })

  it('a status change in a fetched record is reflected in the open window', async () => {
    consultant.fetchConsultantApplication.mockResolvedValue(consultantRow({ id: 4 }))
    consultant.updateConsultantApplicationStatus.mockResolvedValue(consultantRow({ id: 4, status: 'interview' }))
    mount(<OpsConsultantApplicationsPage />, '/x?view=4')
    const dlg = await screen.findByTestId('consultant-application-modal')

    await userEvent.click(within(dlg).getByRole('button', { name: 'مقابلة' }))

    await waitFor(() => expect(consultant.updateConsultantApplicationStatus).toHaveBeenCalledWith(4, 'interview', undefined))
    await waitFor(() => expect(within(dlg).queryByRole('button', { name: 'مقابلة' })).toBeNull())
  })
})

describe('partnership direct link to a record the list does not contain', () => {
  it('requests that one record by id and shows it', async () => {
    partners.fetchPartnershipRequest.mockResolvedValue(partnerRow({ id: 8 }))
    mount(<OpsPartnershipRequestsPage />, '/x?view=8')

    const dlg = await screen.findByTestId('partnership-request-modal')
    expect(dlg.textContent).toContain('جامعة المستقبل')
    expect(partners.fetchPartnershipRequest).toHaveBeenCalledWith(8)
    expect(partners.fetchPartnershipRequest).toHaveBeenCalledTimes(1)
  })

  it('403, 404 and error are each reported as such; only the error has a retry', async () => {
    partners.fetchPartnershipRequest.mockRejectedValueOnce(http(403))
    const first = mount(<OpsPartnershipRequestsPage />, '/x?view=8')
    expect(await screen.findByTestId('detail-state-forbidden')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()

    partners.fetchPartnershipRequest.mockRejectedValueOnce(http(404))
    await act(async () => { await first.navigate('/x?view=12') })
    expect(await screen.findByTestId('detail-state-not_found')).toBeTruthy()

    partners.fetchPartnershipRequest.mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(partnerRow({ id: 13, partner_name: 'شريك جديد' }))
    await act(async () => { await first.navigate('/x?view=13') })
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByTestId('partnership-request-modal')).toBeTruthy()
  })

  it('shows a loading window while the record is requested', async () => {
    partners.fetchPartnershipRequest.mockReturnValue(new Promise(() => {}))
    mount(<OpsPartnershipRequestsPage />, '/x?view=8')

    expect(await screen.findByTestId('detail-state-loading')).toBeTruthy()
  })
})

describe('expert direct link', () => {
  it('opens a record that is not on the loaded page by asking for it by id', async () => {
    expert.fetchExpertApplication.mockResolvedValue({ ...expertRow({ id: 7 }), job_title: 'مهندسة بيانات' })
    mount(<AdminExpertApplicationsPage />, '/x?view=7')

    const dlg = await screen.findByTestId('expert-application-modal')
    expect(dlg.textContent).toContain('ليلى أحمد')
    expect(expert.fetchExpertApplication).toHaveBeenCalledWith(7)
    expect(expert.fetchExpertApplication).toHaveBeenCalledTimes(1)
  })

  it('403 and 404 are reported, a failure offers a retry', async () => {
    expert.fetchExpertApplication.mockRejectedValueOnce(http(403))
    const router = mount(<AdminExpertApplicationsPage />, '/x?view=7')
    expect(await screen.findByTestId('detail-state-forbidden')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()

    expert.fetchExpertApplication.mockRejectedValueOnce(http(404))
    await act(async () => { await router.navigate('/x?view=8') })
    expect(await screen.findByTestId('detail-state-not_found')).toBeTruthy()

    expert.fetchExpertApplication.mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce({ ...expertRow({ id: 9, full_name: 'منى' }), job_title: 'x' })
    await act(async () => { await router.navigate('/x?view=9') })
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByTestId('expert-application-modal')).toBeTruthy()
  })
})
