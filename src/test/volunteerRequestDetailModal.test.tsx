import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { MemoryRouter } from 'react-router'
import VolunteerRequestDetailModal from '@/components/volunteer/VolunteerRequestDetailModal'
import type { VolunteerRequest } from '@/api/volunteerApplicationApi'

const api = vi.hoisted(() => ({ updateVolunteerRequestStatus: vi.fn() }))
vi.mock('@/api/volunteerApplicationApi', async (orig) => ({ ...(await orig<typeof import('@/api/volunteerApplicationApi')>()), ...api }))
vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
  promiseToast: (p: Promise<unknown>) => p,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const req = (over: Partial<VolunteerRequest> = {}): VolunteerRequest => ({
  id: 5, full_name: 'سارة الأحمد', email: 'sara@example.com', phone: '+31600000000', country: 'هولندا', city: 'أمستردام', gender: 'female',
  desired_department: 'التسويق والإعلام', experience_level: 'متوسط', availability: '5-10 ساعات أسبوعيًا', skills: 'تصميم، كتابة محتوى',
  motivation: 'أرغب في المساهمة بخبرتي في تصميم المحتوى.', previous_experience: 'تصميم هوية لجمعية', notes: 'متاحة مساءً',
  admin_notes: null, status: 'pending', created_at: '2026-10-01T09:00:00Z', updated_at: '2026-10-02T09:00:00Z', cv_view_url: 'https://api.test/signed/cv', ...over,
})

function renderModal(r = req(), props: Partial<React.ComponentProps<typeof VolunteerRequestDetailModal>> = {}) {
  const onClose = vi.fn()
  const onUpdated = vi.fn()
  render(<MemoryRouter><VolunteerRequestDetailModal req={r} onClose={onClose} onUpdated={onUpdated} {...props} /></MemoryRouter>)

  return { onClose, onUpdated, dlg: screen.getByTestId('volunteer-request-modal') }
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.style.overflow = ''
})

describe('volunteer application window: matches the HR volunteer profile window', () => {
  it('has the same size, corner radius, backdrop, scrolling and layout as the HR profile modal (one shared shell)', () => {
    const hr = readFileSync('src/components/hr/HrVolunteerProfileDetailModal.tsx', 'utf8')
    const shell = readFileSync('src/components/detailModal/DetailModalParts.tsx', 'utf8')
    const mine = readFileSync('src/components/volunteer/VolunteerRequestDetailModal.tsx', 'utf8')

    // The HR window's literal classes (data here, not styling) all appear in the shared shell.
    for (const cls of ['sm:w-[min(92vw,1450px)]', 'sm:max-h-[92vh]', 'sm:rounded-[20px]', 'h-[100dvh]', 'z-[100]', 'lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.45fr)]', 'h-[68px]']) {
      expect(hr, `HR: ${cls}`).toContain(cls)
      expect(shell, `shell: ${cls}`).toContain(cls)
    }
    expect(mine).toContain("from '@/components/detailModal/DetailModalParts'")
    expect(mine).toContain("from '@/components/detailModal/detailModalUi'")
    expect(hr).toContain("from '@/components/detailModal/detailModalUi'")
  })

  it('shows the applicant identity, status, email and application date in the header', () => {
    const { dlg } = renderModal(req({ opportunity_title: 'فرصة تصميم المحتوى' }))

    expect(within(dlg).getByRole('heading', { name: 'سارة الأحمد' })).toBeTruthy()
    expect(within(dlg).getAllByText('قيد المراجعة').length).toBeGreaterThan(0)
    expect(within(dlg).getAllByText('sara@example.com').length).toBeGreaterThan(0)
    expect(within(dlg).getByText(/تاريخ التقديم:/)).toBeTruthy()
    expect(within(dlg).getByText(/الفرصة: فرصة تصميم المحتوى/)).toBeTruthy()
    expect(within(dlg).getByLabelText('إغلاق')).toBeTruthy()
  })

  it('shows every submitted answer', () => {
    const { dlg } = renderModal(req({ opportunity_title: 'فرصة تصميم المحتوى' }))
    const text = dlg.textContent ?? ''

    for (const v of ['سارة الأحمد', 'أنثى', '+31600000000', 'هولندا', 'أمستردام', 'التسويق والإعلام', 'متوسط', '5-10 ساعات أسبوعيًا', 'تصميم', 'كتابة محتوى', 'تصميم هوية لجمعية', 'أرغب في المساهمة بخبرتي في تصميم المحتوى.', 'متاحة مساءً', 'فرصة تصميم المحتوى']) {
      expect(text, v).toContain(v)
    }
    expect(within(dlg).getAllByTestId('summary-metric-card')).toHaveLength(4)
  })

  it('missing optional answers say so instead of leaving a blank, and show no fabricated values', () => {
    const { dlg } = renderModal(req({ skills: null, previous_experience: null, notes: null, cv_view_url: null, cv_file_url: null, opportunity_title: null, country: null }))

    expect(within(dlg).getAllByText('غير متوفر').length).toBeGreaterThanOrEqual(4)
    expect(within(dlg).queryByText('الفرصة المتقدَّم عليها')).toBeNull()
    expect(within(dlg).queryByText('معاينة السيرة الذاتية')).toBeNull()
  })

  it('offers the CV only as the server-signed link, opened safely in a new tab', () => {
    const { dlg } = renderModal()
    const links = within(dlg).getAllByRole('link', { name: /معاينة السيرة الذاتية/ })

    expect(links.length).toBeGreaterThan(0)
    for (const a of links) {
      expect(a).toHaveAttribute('href', 'https://api.test/signed/cv')
      expect(a).toHaveAttribute('rel', 'noopener noreferrer')
      expect(a).toHaveAttribute('target', '_blank')
    }
  })

  it('keeps the actions: accept, reject, schedule an interview and WhatsApp', async () => {
    api.updateVolunteerRequestStatus.mockImplementation(async (_id: number, status: string) => req({ status: status as VolunteerRequest['status'] }))
    const { dlg, onUpdated } = renderModal()

    expect(within(dlg).getByRole('link', { name: /واتساب/ })).toHaveAttribute('href', 'https://wa.me/31600000000')

    await userEvent.click(within(dlg).getByRole('button', { name: /جدولة مقابلة/ }))
    await waitFor(() => expect(api.updateVolunteerRequestStatus).toHaveBeenLastCalledWith(5, 'reviewed', undefined))
    await userEvent.click(within(dlg).getByRole('button', { name: /قبول/ }))
    await waitFor(() => expect(api.updateVolunteerRequestStatus).toHaveBeenLastCalledWith(5, 'accepted', undefined))
    expect(onUpdated).toHaveBeenCalledTimes(2)
  })

  it('rejecting closes the window; accepted requests cannot be accepted again', async () => {
    api.updateVolunteerRequestStatus.mockResolvedValue(req({ status: 'rejected' }))
    const { onClose, dlg } = renderModal()

    await userEvent.click(within(dlg).getByRole('button', { name: /رفض/ }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('does not offer WhatsApp without a usable number', () => {
    const { dlg } = renderModal(req({ phone: '12' }))

    expect(within(dlg).queryByRole('link', { name: /واتساب/ })).toBeNull()
  })
})

describe('volunteer application window: keyboard, focus and safeguards', () => {
  it('is a modal dialog, locks page scroll, and Escape / the close button close it when nothing is unsaved', async () => {
    const { onClose } = renderModal()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('سارة الأحمد')
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByLabelText('إغلاق'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('a press that starts inside and ends on the backdrop does not close it', async () => {
    const { onClose, dlg } = renderModal()
    const overlay = screen.getByTestId('volunteer-request-modal-overlay')

    await userEvent.pointer([{ keys: '[MouseLeft>]', target: dlg }, { target: overlay }, { keys: '[/MouseLeft]' }])
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.pointer({ keys: '[MouseLeft]', target: overlay })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('unsaved notes: closing asks first, staying keeps them, saving stores them', async () => {
    api.updateVolunteerRequestStatus.mockResolvedValue(req({ admin_notes: 'مراجعة أولية' }))
    const { onClose, onUpdated, dlg } = renderModal()
    await userEvent.type(within(dlg).getByLabelText('ملاحظات الإدارة'), 'مراجعة أولية')
    expect(within(dlg).getByRole('button', { name: 'حفظ التغييرات' })).toBeEnabled()

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(await screen.findByRole('button', { name: 'متابعة التحرير' }))
    expect((within(dlg).getByLabelText('ملاحظات الإدارة') as HTMLTextAreaElement).value).toBe('مراجعة أولية')

    await userEvent.click(within(dlg).getByRole('button', { name: 'حفظ التغييرات' }))
    await waitFor(() => expect(api.updateVolunteerRequestStatus).toHaveBeenCalledWith(5, 'pending', 'مراجعة أولية'))
    expect(onUpdated).toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('discarding unsaved changes closes it', async () => {
    const { onClose, dlg } = renderModal()
    await userEvent.selectOptions(within(dlg).getByLabelText('حالة الطلب'), 'contacted')

    await userEvent.click(within(dlg).getByLabelText('إغلاق'))
    await userEvent.click(await screen.findByRole('button', { name: 'تجاهل وإغلاق' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cannot be closed while a save is in flight', async () => {
    let release!: (v: unknown) => void
    api.updateVolunteerRequestStatus.mockReturnValue(new Promise((r) => { release = r }))
    const { onClose, dlg } = renderModal()
    await userEvent.click(within(dlg).getByRole('button', { name: /قبول/ }))

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(within(dlg).getByLabelText('إغلاق')).toBeDisabled()

    await act(async () => release(req({ status: 'accepted' })))
  })

  it('keeps focus inside while open', async () => {
    const { dlg } = renderModal()

    for (let i = 0; i < 25; i++) await userEvent.tab()

    expect(dlg.contains(document.activeElement)).toBe(true)
  })
})
