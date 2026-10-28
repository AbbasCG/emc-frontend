import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiClient from '@/api/axios'
import FormAutomationPanel from '@/components/operations/formAutomation/FormAutomationPanel'
import type { FormAutomation } from '@/api/formsAutomationApi'

/**
 * Smart Forms Phase 8: the Notifications & automation tab. Payloads have the shape FormAutomationController returns
 * (tests/Feature/Forms/FormAutomationTest); each change is sent at once and the screen shows what the server kept.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)

// jsdom has no <dialog> methods; the confirmation dialog only needs them to open and close.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})
const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

const BASE: FormAutomation = {
  settings: {
    notify_owner: false, notify_department: false, notify_assignee: true, confirmation: { enabled: false, email_question_id: null },
    auto_assign_to: null, reminder_days: null, webhook: false, webhook_include_answers: false,
  },
  options: { email_questions: [{ id: 31, label: 'البريد' }], assignable: [{ id: 7, name: 'سارة' }], has_department: false, can_include_answers: false, webhook_endpoints: 0, max_reminder_days: 30 },
}

const withSettings = (patch: Partial<FormAutomation['settings']>, options: Partial<FormAutomation['options']> = {}): FormAutomation => ({
  settings: { ...BASE.settings, ...patch }, options: { ...BASE.options, ...options },
})

const RETENTION = { retention_days: null as number | null, can_change: true, expired_now: 0, min_days: 30, max_days: 3650 }

/** GET answers: the automation settings, and the retention section's own request. */
function serve(automation: FormAutomation | Error, retention: Partial<typeof RETENTION> = {}) {
  api.get.mockImplementation((async (url: string) => {
    if (url.endsWith('/retention')) return { data: { data: { ...RETENTION, ...retention } } }
    if (automation instanceof Error) throw automation
    return { data: { success: true, data: automation } }
  }) as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  serve(BASE)
})

describe('form automation panel', () => {
  it('shows the defaults and saves a switch at once', async () => {
    const user = userEvent.setup()
    api.put.mockResolvedValue({ data: { success: true, data: withSettings({ notify_owner: true }) } } as never)
    render(<FormAutomationPanel formId={4} />)

    const owner = await screen.findByRole('switch', { name: 'إشعار مالك النموذج' })
    expect(owner).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'إشعار الموظف عند إسناد رد إليه' })).toHaveAttribute('aria-checked', 'true')

    await user.click(owner)
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/operations/forms/4/automation', { notify_owner: true }, { skipErrorToast: true }))
    expect(await screen.findByText('حُفظت الإعدادات.')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'إشعار مالك النموذج' })).toHaveAttribute('aria-checked', 'true')
  })

  it('cannot switch on the department notice for a form without a department', async () => {
    render(<FormAutomationPanel formId={4} />)
    expect(await screen.findByRole('switch', { name: 'إشعار قيادة القسم' })).toBeDisabled()
    expect(screen.getByText('النموذج غير مرتبط بقسم. اختر قسماً للنموذج أولاً.')).toBeInTheDocument()
  })

  it('offers the e-mail questions once the receipt is on, and sends the choice', async () => {
    const user = userEvent.setup()
    serve(withSettings({ confirmation: { enabled: true, email_question_id: null } }))
    api.put.mockResolvedValue({ data: { data: withSettings({ confirmation: { enabled: true, email_question_id: 31 } }) } } as never)
    render(<FormAutomationPanel formId={4} />)

    await user.selectOptions(await screen.findByRole('combobox', { name: 'سؤال البريد الإلكتروني لغير المسجّلين' }), '31')
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/operations/forms/4/automation', { confirmation: { email_question_id: 31 } }, { skipErrorToast: true }))
  })

  it('keeps answers inside the platform unless a platform manager decides otherwise', async () => {
    serve(withSettings({ webhook: true }, { webhook_endpoints: 2 }))
    render(<FormAutomationPanel formId={4} />)

    expect(await screen.findByText(/إلى 2 من نقاط الربط/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'تضمين الإجابات في الحدث' })).toBeDisabled()
    expect(screen.getByText('إرسال الإجابات خارج المنصة قرار لمدير المنصة فقط.')).toBeInTheDocument()
  })

  it('shows the refusal and keeps the previous value', async () => {
    const user = userEvent.setup()
    api.put.mockRejectedValue(httpError(422, { errors: { auto_assign_to: ['لا يمكن الإسناد التلقائي لهذا الموظف.'] } }))
    render(<FormAutomationPanel formId={4} />)

    await user.selectOptions(await screen.findByRole('combobox', { name: 'الإسناد التلقائي' }), '7')
    expect(await screen.findByText('لا يمكن الإسناد التلقائي لهذا الموظف.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'الإسناد التلقائي' })).toHaveValue('')
  })

  it('says why it cannot load', async () => {
    serve(httpError(403))
    render(<FormAutomationPanel formId={4} />)
    expect(await screen.findByText('لا تملك صلاحية تعديل إعدادات هذا النموذج.')).toBeInTheDocument()
  })

  it('asks before a retention period that deletes responses, then saves it', async () => {
    const user = userEvent.setup()
    api.put.mockResolvedValue({ data: { data: { ...RETENTION, retention_days: 90, expired_now: 4 } } } as never)
    render(<FormAutomationPanel formId={4} />)

    await user.selectOptions(await screen.findByRole('combobox', { name: 'مدة الاحتفاظ بالردود' }), '90')
    expect(api.put).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'تأكيد المدة' }))

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/operations/forms/4/retention', { retention_days: 90 }, { skipErrorToast: true }))
    expect(await screen.findByText(/4 من الردود أقدم من هذه المدة/)).toBeInTheDocument()
  })

  it('shows the retention period read-only to editors who are not the owner', async () => {
    serve(BASE, { retention_days: 365, can_change: false })
    render(<FormAutomationPanel formId={4} />)
    const select = await screen.findByRole('combobox', { name: 'مدة الاحتفاظ بالردود' })
    await waitFor(() => expect(select).toHaveValue('365'))
    expect(select).toBeDisabled()
  })
})
