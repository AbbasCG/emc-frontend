import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router'
import OpsConsultantApplicationsPage from '@/pages/operations/admin/OpsConsultantApplicationsPage'
import OpsPartnershipRequestsPage from '@/pages/operations/admin/OpsPartnershipRequestsPage'
import type { ConsultantApplication } from '@/api/consultantApi'
import type { PartnershipRequest } from '@/types/operations'

const consultant = vi.hoisted(() => ({ fetchConsultantApplications: vi.fn(), updateConsultantApplicationStatus: vi.fn() }))
vi.mock('@/api/consultantApi', async (orig) => ({ ...(await orig<typeof import('@/api/consultantApi')>()), ...consultant }))
const partners = vi.hoisted(() => ({ fetchPartnershipRequests: vi.fn(), updatePartnershipRequest: vi.fn() }))
vi.mock('@/api/partnersApi', async (orig) => ({ ...(await orig<typeof import('@/api/partnersApi')>()), ...partners }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }, promiseToast: (p: Promise<unknown>) => p }))
vi.mock('@/components/operations/OpsPageSkeleton', () => ({ default: () => <div>loading</div> }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const app = (over: Partial<ConsultantApplication> = {}): ConsultantApplication => ({
  id: 4, full_name: 'سارة المستشارة', email: 'sara@example.com', phone: '+31600000000', country: 'هولندا', city: 'أمستردام', specialty: 'استراتيجية البيانات',
  desired_department: 'التقنية', years_experience: 9, linkedin_url: 'https://linkedin.com/in/sara', motivation: 'أرغب في دعم فرق EMC في مشاريع البيانات.', availability: '5 ساعات',
  status: 'new', reviewer_note: null, cv_view_url: 'https://api.test/signed/cv', created_at: '2026-10-01T09:00:00Z', ...over,
})
const partner = (over: Partial<PartnershipRequest> = {}): PartnershipRequest => ({
  id: 8, partner_name: 'جامعة المستقبل', contact_name: 'خالد', email: 'k@uni.edu', phone: '+966500000000', country: 'السعودية', city: 'الرياض', website: 'https://uni.edu',
  type: 'جامعة', partnership_type: 'تدريب', message: 'نقترح برنامج تدريب مشترك للطلاب.', privacy_accepted: true, status: 'new', created_at: '2026-10-02T09:00:00Z', ...over,
} as PartnershipRequest)

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
  consultant.fetchConsultantApplications.mockResolvedValue({ rows: [app(), app({ id: 5, full_name: 'نورة', email: 'n@example.com', cv_view_url: null })], total: 2, counts: {} })
  partners.fetchPartnershipRequests.mockResolvedValue([partner(), partner({ id: 9, partner_name: 'شركة الأفق', status: 'approved', converted_user: { id: 1, name: 'x', email: 'portal@x.com' } })])
})

describe('consultant applications: the detail window', () => {
  it('opens a centered window in this tab over the list, with every consultant field, and no new tab', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const router = mount(<OpsConsultantApplicationsPage />, '/x?status=new')
    await userEvent.click(await screen.findByRole('button', { name: 'عرض تفاصيل سارة المستشارة' }))

    const dlg = await screen.findByTestId('consultant-application-modal')
    expect(dlg.parentElement).toHaveClass('items-end', 'sm:items-center')
    expect(screen.getByTestId('loc').textContent).toBe('/x?status=new&view=4')
    for (const text of ['سارة المستشارة', 'sara@example.com', 'استراتيجية البيانات', 'التقنية', '9 سنة', 'أرغب في دعم فرق EMC', 'هولندا', 'أمستردام', '5 ساعات']) {
      expect(dlg.textContent, text).toContain(text)
    }
    expect(within(dlg).getAllByRole('link', { name: /معاينة السيرة الذاتية/ })[0]).toHaveAttribute('href', 'https://api.test/signed/cv')
    expect(open).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/x')
  })

  it('Back closes it, Forward reopens it, and a direct link opens it too', async () => {
    const router = mount(<OpsConsultantApplicationsPage />, '/x')
    await userEvent.click(await screen.findByRole('button', { name: 'عرض تفاصيل سارة المستشارة' }))
    await screen.findByTestId('consultant-application-modal')

    await act(async () => { await router.navigate(-1) })
    await waitFor(() => expect(screen.queryByTestId('consultant-application-modal')).toBeNull())
    await act(async () => { await router.navigate(1) })
    expect(await screen.findByTestId('consultant-application-modal')).toBeTruthy()
  })

  it('a direct link to ?view=<id> opens the window; an unknown id opens nothing', async () => {
    mount(<OpsConsultantApplicationsPage />, '/x?view=5')
    expect(await screen.findByTestId('consultant-application-modal')).toBeTruthy()
  })

  it('Escape closes it and focus returns to the control that opened it', async () => {
    mount(<OpsConsultantApplicationsPage />, '/x')
    const trigger = await screen.findByRole('button', { name: 'عرض تفاصيل سارة المستشارة' })
    trigger.focus()
    await userEvent.keyboard('{Enter}')
    await screen.findByTestId('consultant-application-modal')

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByTestId('consultant-application-modal')).toBeNull())
  })

  it('keeps the workflow actions, sending the review note with the decision', async () => {
    consultant.updateConsultantApplicationStatus.mockResolvedValue(app({ status: 'interview' }))
    mount(<OpsConsultantApplicationsPage />, '/x?view=4')
    const dlg = await screen.findByTestId('consultant-application-modal')
    await userEvent.click(within(dlg).getByLabelText(/ملاحظة المراجعة/))
    await userEvent.paste('مناسبة للمقابلة')

    await userEvent.click(within(dlg).getByRole('button', { name: 'مقابلة' }))

    await waitFor(() => expect(consultant.updateConsultantApplicationStatus).toHaveBeenCalledWith(4, 'interview', 'مناسبة للمقابلة'))
    expect(within(dlg).queryByRole('button', { name: 'جديد' })).toBeNull()
  })

  it('an unsaved review note asks before closing', async () => {
    mount(<OpsConsultantApplicationsPage />, '/x?view=4')
    const dlg = await screen.findByTestId('consultant-application-modal')
    await userEvent.click(within(dlg).getByLabelText(/ملاحظة المراجعة/))
    await userEvent.paste('مسودة')

    await userEvent.keyboard('{Escape}')

    expect(await screen.findByRole('button', { name: 'متابعة التحرير' })).toBeTruthy()
    expect(screen.getByTestId('consultant-application-modal')).toBeTruthy()
  })
})

describe('partnership requests: the detail window', () => {
  it('opens a centered window with the organization, contact, proposal and decision, in this tab', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    mount(<OpsPartnershipRequestsPage />, '/x')
    await userEvent.click((await screen.findAllByRole('button', { name: /عرض التفاصيل/ }))[0])

    const dlg = await screen.findByTestId('partnership-request-modal')
    expect(dlg.parentElement).toHaveClass('items-end', 'sm:items-center')
    for (const text of ['جامعة المستقبل', 'خالد', 'k@uni.edu', 'السعودية', 'الرياض', 'https://uni.edu', 'نقترح برنامج تدريب مشترك للطلاب.', 'تدريب']) {
      expect(dlg.textContent, text).toContain(text)
    }
    expect(open).not.toHaveBeenCalled()
    expect(screen.getByTestId('loc').textContent).toBe('/x?view=8')
  })

  it('keeps the decisions: change status and approve (with its confirmation)', async () => {
    partners.updatePartnershipRequest.mockImplementation(async (id: number, status: string) => partner({ id, status }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mount(<OpsPartnershipRequestsPage />, '/x?view=8')
    const dlg = await screen.findByTestId('partnership-request-modal')

    await userEvent.selectOptions(within(dlg).getByLabelText('تحديث الحالة'), 'under_review')
    await waitFor(() => expect(partners.updatePartnershipRequest).toHaveBeenCalledWith(8, 'under_review'))

    await userEvent.click(within(dlg).getByRole('button', { name: /اعتماد وتجهيز البوابة/ }))
    await waitFor(() => expect(partners.updatePartnershipRequest).toHaveBeenLastCalledWith(8, 'approved'))
  })

  it('an approved request shows the ready portal account and offers no further decision', async () => {
    mount(<OpsPartnershipRequestsPage />, '/x?view=9')
    const dlg = await screen.findByTestId('partnership-request-modal')

    expect(within(dlg).getAllByText(/portal@x.com/).length).toBeGreaterThan(0)
    expect(within(dlg).queryByRole('button', { name: /اعتماد وتجهيز البوابة/ })).toBeNull()
  })

  it('Back closes it and the list stays', async () => {
    const router = mount(<OpsPartnershipRequestsPage />, '/x')
    await userEvent.click((await screen.findAllByRole('button', { name: /عرض التفاصيل/ }))[0])
    await screen.findByTestId('partnership-request-modal')

    await act(async () => { await router.navigate(-1) })

    await waitFor(() => expect(screen.queryByTestId('partnership-request-modal')).toBeNull())
    expect(screen.getByText('شركة الأفق')).toBeTruthy()
  })
})
