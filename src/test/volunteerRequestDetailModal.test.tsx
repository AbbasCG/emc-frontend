import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { MemoryRouter } from 'react-router'
import VolunteerRequestDetailModal from '@/components/volunteer/VolunteerRequestDetailModal'
import type { VolunteerRequest } from '@/api/volunteerApplicationApi'
import toast from '@/lib/toast'

const api = vi.hoisted(() => ({ updateVolunteerRequestStatus: vi.fn(), resendVolunteerCredentials: vi.fn() }))
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

describe('volunteer application window: converting an accepted volunteer', () => {
  it('offers «تحويل إلى عضو» only on an accepted, not-yet-converted request, and hands the request to the caller', async () => {
    const onOpenConvert = vi.fn()
    const accepted = req({ status: 'accepted' })
    const { dlg } = renderModal(accepted, { onOpenConvert })

    await userEvent.click(within(dlg).getByRole('button', { name: 'تحويل إلى عضو' }))

    expect(onOpenConvert).toHaveBeenCalledTimes(1)
    expect(onOpenConvert).toHaveBeenCalledWith(accepted)
  })

  it('hides it for pending, rejected, already converted and ineligible requests, and without a handler', () => {
    const onOpenConvert = vi.fn()
    for (const r of [req({ status: 'pending' }), req({ status: 'rejected' }), req({ status: 'accepted', is_converted: true }), req({ status: 'accepted', can_convert_to_member: false })]) {
      const { dlg } = renderModal(r, { onOpenConvert })
      expect(within(dlg).queryByRole('button', { name: 'تحويل إلى عضو' })).toBeNull()
      cleanup()
    }
    const { dlg } = renderModal(req({ status: 'accepted' }))
    expect(within(dlg).queryByRole('button', { name: 'تحويل إلى عضو' })).toBeNull()
  })
})

describe('volunteer application window: a converted request cannot have its status changed', () => {
  const converted = () => req({ status: 'converted_to_member', is_converted: true })

  it('hides قبول / رفض / جدولة مقابلة, disables save, the status select and the notes, and explains why', () => {
    const { dlg } = renderModal(converted())

    for (const name of ['قبول', 'رفض', 'جدولة مقابلة']) expect(within(dlg).queryByRole('button', { name })).toBeNull()
    expect(within(dlg).getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled()
    expect(within(dlg).getByLabelText('حالة الطلب')).toBeDisabled()
    expect(within(dlg).getByLabelText('ملاحظات الإدارة')).toBeDisabled()
    expect(within(dlg).getByText(/تم تحويل هذا الطلب إلى عضو، فلا تُعدَّل حالته/)).toBeTruthy()
  })

  it('also when only is_converted says so (status still «accepted»)', () => {
    const { dlg } = renderModal(req({ status: 'accepted', is_converted: true }))
    expect(within(dlg).queryByRole('button', { name: 'رفض' })).toBeNull()
    expect(within(dlg).queryByRole('button', { name: 'قبول' })).toBeNull()
  })

  it('a not-yet-converted request keeps the actions, and the status list does not offer «converted» as a manual choice', () => {
    const { dlg } = renderModal(req({ status: 'pending' }))
    expect(within(dlg).getByRole('button', { name: 'قبول' })).toBeTruthy()
    const options = within(within(dlg).getByLabelText('حالة الطلب')).getAllByRole('option').map((o) => o.textContent)
    expect(options).not.toContain('تم التحويل لعضو')
    expect(options.length).toBe(6)
  })

  it('if the server still refuses (409 already_converted) the request is flipped to converted (the toast carries the server message)', async () => {
    const message = 'هذا الطلب محوّل إلى عضو ولا تُعدَّل حالته.'
    api.updateVolunteerRequestStatus.mockRejectedValueOnce({ response: { status: 409, data: { already_converted: true, message } } })
    const onUpdated = vi.fn()
    const { dlg } = renderModal(req({ status: 'pending' }), { onUpdated })

    await userEvent.click(within(dlg).getByRole('button', { name: 'قبول' }))

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ is_converted: true, status: 'converted_to_member' })))
  })
})

describe('volunteer application window: resending login details for a converted request', () => {
  const resendName = 'إعادة إرسال بيانات الدخول'
  const converted = () => req({ status: 'converted_to_member', is_converted: true })

  it('is offered only for a converted request', () => {
    const { dlg } = renderModal(converted())
    expect(within(dlg).getByRole('button', { name: resendName })).toBeTruthy()
    cleanup()
    for (const r of [req({ status: 'accepted' }), req({ status: 'pending' })]) {
      const { dlg: d } = renderModal(r)
      expect(within(d).queryByRole('button', { name: resendName })).toBeNull()
      cleanup()
    }
  })

  it('calls the resend endpoint once and reports success', async () => {
    api.resendVolunteerCredentials.mockResolvedValueOnce({ email_sent: true })
    const { dlg } = renderModal(converted())

    await userEvent.click(within(dlg).getByRole('button', { name: resendName }))

    expect(api.resendVolunteerCredentials).toHaveBeenCalledWith(5)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('أُعيد إرسال بيانات الدخول إلى المتطوع.'))
  })

  it("shows the server's own Arabic reason when it no longer applies", async () => {
    api.resendVolunteerCredentials.mockRejectedValueOnce({ response: { status: 409, data: { message: 'سجّل المتطوع دخوله بالفعل، فلا حاجة لكلمة مرور مؤقتة.' } } })
    const { dlg } = renderModal(converted())

    await userEvent.click(within(dlg).getByRole('button', { name: resendName }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('سجّل المتطوع دخوله بالفعل، فلا حاجة لكلمة مرور مؤقتة.'))
  })

  it('a double click sends one request', async () => {
    let finish!: (v: { email_sent: boolean }) => void
    api.resendVolunteerCredentials.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    const { dlg } = renderModal(converted())
    const button = within(dlg).getByRole('button', { name: resendName })

    await userEvent.click(button)
    await userEvent.click(button)
    expect(api.resendVolunteerCredentials).toHaveBeenCalledTimes(1)

    finish({ email_sent: true })
    await waitFor(() => expect(button).toBeEnabled())
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
