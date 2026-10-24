import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router'
import AmbassadorApplicationsPage from '@/pages/super-admin/AmbassadorApplicationsPage'
import AmbassadorApplicationDetailModal from '@/components/admin/AmbassadorApplicationDetailModal'
import type { AmbassadorApplication } from '@/api/ambassadorApplicationApi'

const api = vi.hoisted(() => ({
  fetchAmbassadorApplications: vi.fn(),
  fetchAmbassadorFilterOptions: vi.fn(),
  fetchAmbassadorApplication: vi.fn(),
  updateAmbassadorStatus: vi.fn(),
  addAmbassadorNote: vi.fn(),
  deleteAmbassadorNote: vi.fn(),
}))
vi.mock('@/api/ambassadorApplicationApi', async (orig) => ({ ...(await orig<typeof import('@/api/ambassadorApplicationApi')>()), ...api }))
const auth = vi.hoisted(() => ({ role: 'super_admin' }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, name: 'م', role: auth.role }, isAuthenticated: true, isLoading: false }) }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() }, promiseToast: (p: Promise<unknown>) => p }))
vi.mock('@/components/admin/AmbassadorApplicationFiles', () => ({ default: () => <div data-testid="files-panel">الملفات</div> }))
vi.mock('react-select', () => ({ default: () => <select aria-label="select" /> }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const app = (over: Partial<AmbassadorApplication> = {}): AmbassadorApplication => ({
  id: 11, uuid: 'uuid-11', status: 'new', is_draft: true, full_name: 'أحمد محمد', email: 'ahmed@example.com', mobile_phone: '+31612345678', country: 'هولندا', city: 'بريدا',
  university_name: 'Avans', major: 'Software', created_at: '2026-08-01T10:00:00Z', followers_count: 1200, has_event_organization_experience: true,
  notes: [{ id: 5, content: 'ملاحظة أولى', author: 'مراجع', is_private: true, created_at: '2026-08-02T10:00:00Z' }], ...over,
} as AmbassadorApplication)

function Probe() {
  const l = useLocation()

  return <span data-testid="loc">{l.pathname + l.search}</span>
}

function mountPage(entry: string) {
  const router = createMemoryRouter([{ path: '/dashboard/super-admin/ambassador-applications/:id?', element: <><AmbassadorApplicationsPage /><Probe /></> }], { initialEntries: [entry] })
  render(<RouterProvider router={router} />)

  return router
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.role = 'super_admin'
  document.body.style.overflow = ''
  api.fetchAmbassadorApplications.mockResolvedValue({
    data: [app()], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1, from: 1, to: 1 },
    statistics: { total: 1, new: 1, under_review: 0, interview_scheduled: 0, approved: 0, rejected: 0, waitlisted: 0 }, by_country: [], monthly_trend: [],
  })
  api.fetchAmbassadorFilterOptions.mockResolvedValue({ countries: [], cities: [], universities: [], specializations: [] })
})

describe('ambassador window: nothing from the old detail page is lost', () => {
  const renderModal = (over: Partial<AmbassadorApplication> = {}) => {
    const onUpdated = vi.fn()
    const onClose = vi.fn()
    render(<AmbassadorApplicationDetailModal app={app(over)} onClose={onClose} onUpdated={onUpdated} />)

    return { onUpdated, onClose, dlg: screen.getByTestId('ambassador-application-modal') }
  }

  it('shows the fields the first version of the window left out (followers, external event organizing, draft flag)', () => {
    const { dlg } = renderModal()

    expect(within(dlg).getByText('عدد المتابعين')).toBeTruthy()
    expect(dlg.textContent).toContain('1200')
    expect(within(dlg).getByText('تنظيم فعاليات خارجية')).toBeTruthy()
    expect(within(dlg).getByText('مسودة')).toBeTruthy()
  })

  it('the header status saves at once for people who manage applications (as the old page header did)', async () => {
    api.updateAmbassadorStatus.mockResolvedValue(app({ status: 'under_review' }))
    const { dlg, onUpdated } = renderModal()

    await userEvent.selectOptions(within(dlg).getAllByLabelText('تغيير حالة الطلب')[0], 'under_review')

    await waitFor(() => expect(api.updateAmbassadorStatus).toHaveBeenCalledWith(11, 'under_review', undefined, undefined, undefined))
    expect(onUpdated).toHaveBeenCalled()
  })

  it('people who may not manage see a plain badge and no editing controls', () => {
    auth.role = 'support_agent'
    const { dlg } = renderModal()

    expect(within(dlg).queryByLabelText('تغيير حالة الطلب')).toBeNull()
    expect(within(dlg).queryByRole('button', { name: 'قبول' })).toBeNull()
    expect(within(dlg).queryByRole('button', { name: 'رفض' })).toBeNull()
    expect(within(dlg).queryByLabelText('حذف الملاحظة')).toBeNull()
    expect(within(dlg).queryByLabelText('ملاحظة داخلية جديدة')).toBeNull()
  })

  it('approve and reject ask first, naming the applicant, and do nothing if cancelled', async () => {
    api.updateAmbassadorStatus.mockResolvedValue(app({ status: 'approved' }))
    const { dlg } = renderModal()

    await userEvent.click(within(dlg).getByRole('button', { name: 'قبول' }))
    expect(await screen.findByText('هل أنت متأكد من قبول طلب أحمد محمد؟')).toBeTruthy()
    await userEvent.click(screen.getAllByRole('button', { name: 'إلغاء' })[0])
    expect(api.updateAmbassadorStatus).not.toHaveBeenCalled()

    await userEvent.click(within(dlg).getByRole('button', { name: 'رفض' }))
    expect(await screen.findByText(/هل أنت متأكد من رفض طلب أحمد محمد؟/)).toBeTruthy()
  })

  it('quick actions: interview, waitlist and under review, with the interview time and decision note', async () => {
    api.updateAmbassadorStatus.mockResolvedValue(app({ status: 'waitlisted' }))
    const { dlg } = renderModal()
    await userEvent.click(within(dlg).getByLabelText('ملاحظة القرار (اختياري)'))
    await userEvent.paste('بانتظار مقعد')

    await userEvent.click(within(dlg).getByRole('button', { name: 'قائمة انتظار' }))
    await waitFor(() => expect(api.updateAmbassadorStatus).toHaveBeenLastCalledWith(11, 'waitlisted', 'بانتظار مقعد', undefined, undefined))
    await userEvent.click(within(dlg).getByRole('button', { name: 'قيد المراجعة' }))
    await waitFor(() => expect(api.updateAmbassadorStatus).toHaveBeenLastCalledWith(11, 'under_review', 'بانتظار مقعد', undefined, undefined))
    await userEvent.click(within(dlg).getByRole('button', { name: /جدولة مقابلة/ }))
    await waitFor(() => expect(api.updateAmbassadorStatus).toHaveBeenLastCalledWith(11, 'interview_scheduled', 'بانتظار مقعد', undefined, undefined))
  })

  it('notes: add (private by default), list, delete with a progress state, and the timeline carries them', async () => {
    api.addAmbassadorNote.mockResolvedValue({})
    api.fetchAmbassadorApplication.mockResolvedValue(app({ notes: [] }))
    let finish!: (v: unknown) => void
    api.deleteAmbassadorNote.mockReturnValue(new Promise((r) => { finish = r }))
    const { dlg, onUpdated } = renderModal()
    expect(within(dlg).getAllByText('ملاحظة أولى').length).toBeGreaterThan(1)

    await userEvent.click(within(dlg).getByLabelText('ملاحظة داخلية جديدة'))
    await userEvent.paste('ملاحظة جديدة')
    await userEvent.click(within(dlg).getByRole('button', { name: 'حفظ الملاحظة' }))
    await waitFor(() => expect(api.addAmbassadorNote).toHaveBeenCalledWith(11, 'ملاحظة جديدة', true))

    await userEvent.click(within(dlg).getByRole('button', { name: 'حذف الملاحظة' }))
    expect(within(dlg).getByRole('button', { name: 'حذف الملاحظة' })).toBeDisabled()
    await act(async () => finish({}))
    await waitFor(() => expect(api.deleteAmbassadorNote).toHaveBeenCalledWith(11, 5))
    await waitFor(() => expect(onUpdated).toHaveBeenCalled())
  })

  it('attachments keep their own secure panel, with delete allowed only for managers; copy, e-mail, call, WhatsApp, print and refresh remain', async () => {
    api.fetchAmbassadorApplication.mockResolvedValue(app())
    const { dlg, onUpdated } = renderModal()

    expect(within(dlg).getByTestId('files-panel')).toBeTruthy()
    expect(within(dlg).getByRole('link', { name: /إرسال بريد/ })).toHaveAttribute('href', 'mailto:ahmed@example.com')
    expect(within(dlg).getByRole('link', { name: /اتصال/ })).toHaveAttribute('href', 'tel:+31612345678')
    expect(within(dlg).getByRole('link', { name: /واتساب/ })).toHaveAttribute('href', 'https://wa.me/31612345678')
    for (const name of ['نسخ البريد', 'طباعة', 'تحديث']) expect(within(dlg).getByRole('button', { name })).toBeTruthy()

    await userEvent.click(within(dlg).getByRole('button', { name: 'تحديث' }))
    await waitFor(() => expect(api.fetchAmbassadorApplication).toHaveBeenCalledWith(11))
    expect(onUpdated).toHaveBeenCalled()
  })
})

describe('ambassador window: focus returns to the control that opened it', () => {
  it('after a mouse click on the ROW (not on the name), Escape returns focus to that row\'s name button', async () => {
    mountPage('/dashboard/super-admin/ambassador-applications')
    const row = (await screen.findByText('Avans')).closest('tr')!

    await userEvent.click(row)
    await screen.findByTestId('ambassador-application-modal')
    expect(document.activeElement).not.toBe(document.body)

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByTestId('ambassador-application-modal')).toBeNull())
    await waitFor(() => expect(screen.getByRole('button', { name: 'عرض تفاصيل أحمد محمد' })).toHaveFocus())
  })

  it('after keyboard opening and after the close button, focus is on the same name button', async () => {
    mountPage('/dashboard/super-admin/ambassador-applications')
    const trigger = await screen.findByRole('button', { name: 'عرض تفاصيل أحمد محمد' })
    trigger.focus()
    await userEvent.keyboard('{Enter}')
    await screen.findByTestId('ambassador-application-modal')

    await userEvent.click(screen.getByLabelText('إغلاق'))

    await waitFor(() => expect(trigger).toHaveFocus())
  })
})

describe('ambassador direct link when the record is not in the loaded list', () => {
  it('asks for that one record by id, shows it over the list, and keeps the list state', async () => {
    api.fetchAmbassadorApplication.mockResolvedValue(app({ id: 77, full_name: 'سارة خارج الصفحة' }))
    mountPage('/dashboard/super-admin/ambassador-applications/77?status=approved&page=3')

    const dlg = await screen.findByTestId('ambassador-application-modal')
    expect(within(dlg).getByRole('heading', { name: /سارة خارج الصفحة/ })).toBeTruthy()
    expect(api.fetchAmbassadorApplication).toHaveBeenCalledTimes(1)
    expect(api.fetchAmbassadorApplication).toHaveBeenCalledWith(77)
    expect(screen.getByTestId('loc').textContent).toBe('/dashboard/super-admin/ambassador-applications/77?status=approved&page=3')
  })

  it('shows a loading window first, never an empty page', async () => {
    api.fetchAmbassadorApplication.mockReturnValue(new Promise(() => {}))
    mountPage('/dashboard/super-admin/ambassador-applications/77')

    expect(await screen.findByTestId('detail-state-loading')).toBeTruthy()
  })

  it('403: says the record is out of scope, with no retry; closing returns to the list URL', async () => {
    api.fetchAmbassadorApplication.mockRejectedValue(Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, data: {} } }))
    mountPage('/dashboard/super-admin/ambassador-applications/77?status=new')

    expect(await screen.findByTestId('detail-state-forbidden')).toHaveTextContent('خارج نطاق صلاحياتك')
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()

    await userEvent.click(screen.getAllByRole('button', { name: 'إغلاق' }).at(-1)!)
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/dashboard/super-admin/ambassador-applications?status=new'))
  })

  it('404 (deleted or wrong id): says so', async () => {
    api.fetchAmbassadorApplication.mockRejectedValue(Object.assign(new Error('404'), { isAxiosError: true, response: { status: 404, data: {} } }))
    mountPage('/dashboard/super-admin/ambassador-applications/77')

    expect(await screen.findByTestId('detail-state-not_found')).toHaveTextContent('حُذف')
  })

  it('a failure offers a retry that loads the record', async () => {
    api.fetchAmbassadorApplication.mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(app({ id: 77, full_name: 'نورة' }))
    mountPage('/dashboard/super-admin/ambassador-applications/77')

    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByTestId('ambassador-application-modal')).toBeTruthy()
  })

  it('a link that is not a number is a not-found window, not a blank page', async () => {
    mountPage('/dashboard/super-admin/ambassador-applications/abc')

    expect(await screen.findByTestId('detail-state-not_found')).toBeTruthy()
    expect(api.fetchAmbassadorApplication).not.toHaveBeenCalled()
  })

  it('moving to another link never leaves the previous record under the new URL', async () => {
    api.fetchAmbassadorApplication.mockImplementation((id: number) => (id === 77 ? Promise.resolve(app({ id: 77, full_name: 'الأولى' })) : new Promise(() => {})))
    const router = mountPage('/dashboard/super-admin/ambassador-applications/77')
    await screen.findByRole('heading', { name: /الأولى/ })

    await act(async () => { await router.navigate('/dashboard/super-admin/ambassador-applications/88') })

    await waitFor(() => expect(screen.queryByRole('heading', { name: /الأولى/ })).toBeNull())
    expect(await screen.findByTestId('detail-state-loading')).toBeTruthy()
  })
})
