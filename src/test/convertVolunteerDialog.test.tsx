import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConvertVolunteerDialog from '@/components/volunteer/ConvertVolunteerDialog'
import type { ConvertVolunteerResult, VolunteerRequest } from '@/api/volunteerApplicationApi'
import * as applicationApi from '@/api/volunteerApplicationApi'
import * as opportunitiesAdminApi from '@/api/volunteerOpportunitiesAdminApi'
import { axeCheck } from './axe'

vi.mock('@/api/volunteerApplicationApi', async (importActual) => {
  const actual = await importActual<typeof import('@/api/volunteerApplicationApi')>()
  return { ...actual, convertVolunteerToMember: vi.fn(), resendVolunteerCredentials: vi.fn() }
})
vi.mock('@/api/volunteerOpportunitiesAdminApi', () => ({ fetchDepartmentOptions: vi.fn() }))

const convert = vi.mocked(applicationApi.convertVolunteerToMember)
const resend = vi.mocked(applicationApi.resendVolunteerCredentials)
const fetchDepartments = vi.mocked(opportunitiesAdminApi.fetchDepartmentOptions)

const DEPARTMENTS = [
  { id: 3, name: 'الموارد البشرية' },
  { id: 4, name: 'الإعلام والتسويق' },
  { id: 5, name: 'التقنية' },
]

function makeRequest(over: Partial<VolunteerRequest> = {}): VolunteerRequest {
  return {
    id: 7,
    full_name: 'علي حسن',
    email: 'ali@example.com',
    status: 'accepted',
    desired_department: 'الإعلام والتسويق',
    suggested_department_id: 4,
    suggested_department_name: 'الإعلام والتسويق',
    is_converted: false,
    ...over,
  }
}

function makeResult(over: Partial<ConvertVolunteerResult['member']> = {}): ConvertVolunteerResult {
  return {
    request: { ...makeRequest(), is_converted: true, status: 'converted_to_member', can_convert_to_member: false },
    message: 'تم تحويل المتطوع إلى عضو.',
    member: {
      id: 99,
      name_ar: 'علي حسن',
      position_ar: 'عضو',
      role_key: 'department_member',
      department_id: 4,
      department_name: 'الإعلام والتسويق',
      member_type: 'volunteer',
      source: 'volunteer_request',
      source_id: 7,
      is_new_member: true,
      joined_at: '2026-11-16',
      is_active: true,
      has_user_account: true,
      user_id: 501,
      account_created: true,
      account_existing: false,
      credentials_reissued: false,
      department_kept_existing: false,
      email_sent: true,
      ...over,
    },
  }
}

const http = (status: number, data?: unknown) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } })

function setup(request = makeRequest()) {
  const onClose = vi.fn()
  const onConverted = vi.fn()
  const onListStale = vi.fn()
  const view = render(<ConvertVolunteerDialog request={request} onClose={onClose} onConverted={onConverted} onListStale={onListStale} />)

  return { ...view, onClose, onConverted, onListStale }
}

const select = () => screen.findByRole('combobox', { name: 'الإدارة التي سيُضاف إليها العضو' })
const confirmButton = () => screen.getByRole('button', { name: 'اعتماد الإدارة وإنشاء الحساب' })

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

beforeEach(() => {
  vi.clearAllMocks()
  fetchDepartments.mockResolvedValue(DEPARTMENTS)
})

describe('ConvertVolunteerDialog: the form', () => {
  it('is an accessible dialog titled «تحويل المتطوع إلى عضو» that shows who and what they applied for', async () => {
    const { container } = setup()
    const dialog = await screen.findByRole('dialog', { name: 'تحويل المتطوع إلى عضو' })

    expect(within(dialog).getAllByText('علي حسن').length).toBeGreaterThan(0)
    expect(screen.getByTestId('applied-department')).toHaveTextContent('الإعلام والتسويق')
    // the plain-language list of what will happen
    expect(screen.getByText(/يُنشأ حساب للمتطوع/)).toBeInTheDocument()
    expect(screen.getByText(/بيانات الدخول/)).toBeInTheDocument()
    expect(screen.getByText(/«المتطوعون» و«الأعضاء» و«الفريق»/)).toBeInTheDocument()
    expect(screen.getByText(/كلمة مرور جديدة عند أول دخول/)).toBeInTheDocument()
    await select()
    expect(await axeCheck(container.ownerDocument.body)).toHaveNoViolations()
  })

  it('moves keyboard focus to the department select as soon as the list has loaded', async () => {
    setup()

    const dept = await select()
    await waitFor(() => expect(dept).toHaveFocus())
  })

  it('pre-selects the server-suggested department and lets HR confirm with one click', async () => {
    const { onConverted } = setup()
    expect(await select()).toHaveValue('4')
    expect(confirmButton()).toBeEnabled()
    convert.mockResolvedValueOnce(makeResult())

    await userEvent.click(confirmButton())

    expect(convert).toHaveBeenCalledWith(7, 4)
    await waitFor(() => expect(onConverted).toHaveBeenCalledTimes(1))
  })

  it('sends the department HR picked instead of the suggestion', async () => {
    setup()
    await userEvent.selectOptions(await select(), '5')
    convert.mockResolvedValueOnce(makeResult({ department_id: 5, department_name: 'التقنية' }))

    await userEvent.click(confirmButton())

    expect(convert).toHaveBeenCalledWith(7, 5)
  })

  it('with no suggestion shows what they applied for, pre-selects nothing and forces a choice', async () => {
    setup(makeRequest({ suggested_department_id: null, suggested_department_name: null, desired_department: 'قسم غير معروف' }))

    expect(await select()).toHaveValue('')
    expect(screen.getByRole('note')).toHaveTextContent('قسم غير معروف')
    expect(screen.getByRole('note')).toHaveTextContent('اختر الإدارة المناسبة يدويًا')
    expect(confirmButton()).toBeDisabled()

    await userEvent.selectOptions(await select(), '3')
    expect(confirmButton()).toBeEnabled()
  })

  it('the «no match» warning disappears once a department is chosen, replaced by a neutral «الإدارة المختارة: X»', async () => {
    setup(makeRequest({ suggested_department_id: null, suggested_department_name: null, desired_department: 'قسم غير معروف' }))
    await select()
    expect(screen.getByRole('note')).toHaveTextContent('تعذّر ربط الإدارة المطلوبة')
    expect(screen.queryByTestId('chosen-department')).not.toBeInTheDocument()

    await userEvent.selectOptions(await select(), '3')

    expect(screen.queryByText(/تعذّر ربط الإدارة المطلوبة/)).not.toBeInTheDocument()
    expect(screen.getByTestId('chosen-department')).toHaveTextContent('الإدارة المختارة: الموارد البشرية')

    // clearing the choice brings the warning back
    await userEvent.selectOptions(await select(), '')
    expect(screen.getByText(/تعذّر ربط الإدارة المطلوبة/)).toBeInTheDocument()
  })

  it('does not trust a suggestion that is not an active department', async () => {
    setup(makeRequest({ suggested_department_id: 99 }))

    expect(await select()).toHaveValue('')
    expect(confirmButton()).toBeDisabled()
  })

  it('offers only what the active-departments endpoint returned, and retries when it fails', async () => {
    fetchDepartments.mockRejectedValueOnce(new Error('boom'))
    setup()

    expect(await screen.findByText('تعذّر تحميل قائمة الإدارات.')).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await select()).toHaveValue('4')
    expect(fetchDepartments).toHaveBeenCalledTimes(2)
  })

  it('cannot be double-submitted: a second click while the request runs does nothing', async () => {
    setup()
    await select()
    let finish!: (r: ConvertVolunteerResult) => void
    convert.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))

    const button = confirmButton()
    await userEvent.click(button)
    await userEvent.click(button)
    await userEvent.click(button)

    expect(convert).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    finish(makeResult())
    expect(await screen.findByText('تم تحويل المتطوع إلى عضو.')).toBeInTheDocument()
  })

  it('cancel closes without calling the server', async () => {
    const { onClose } = setup()
    await select()

    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(convert).not.toHaveBeenCalled()
  })
})

describe('ConvertVolunteerDialog: failures', () => {
  it('409 with already_converted:true: says it already happened, e-mail status unknown, reloads the list, offers resend', async () => {
    const { onListStale, onConverted } = setup()
    await select()
    convert.mockRejectedValueOnce(http(409, { already_converted: true, message: 'تم تحويل هذا الطلب مسبقاً إلى عضو.' }))

    await userEvent.click(confirmButton())

    expect(await screen.findByText('تم تحويل هذا الطلب مسبقاً إلى عضو.')).toBeInTheDocument()
    expect(screen.getByTestId('lost-explainer')).toHaveTextContent('حالة بريد بيانات الدخول غير معروفة')
    expect(onListStale).toHaveBeenCalledTimes(1)
    expect(onConverted).not.toHaveBeenCalled()

    resend.mockResolvedValueOnce({ email_sent: true })
    await userEvent.click(screen.getByRole('button', { name: 'إعادة إرسال بيانات الدخول' }))
    expect(resend).toHaveBeenCalledWith(7)
    expect(await screen.findByTestId('email-outcome')).toHaveTextContent('أُعيد إرسال بيانات الدخول')
  })

  it('a DIFFERENT 409 (an account-creation race) is NOT «already converted»: it shows the server message and stays on the form', async () => {
    const { onListStale } = setup()
    await select()
    convert.mockRejectedValueOnce(http(409, { message: 'تعذّر إنشاء الحساب بسبب تعارض لحظي، أعد المحاولة.' }))

    await userEvent.click(confirmButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر إنشاء الحساب بسبب تعارض لحظي، أعد المحاولة.')
    expect(screen.queryByTestId('lost-explainer')).not.toBeInTheDocument()
    expect(onListStale).not.toHaveBeenCalled()
    expect(confirmButton()).toBeEnabled()
  })

  it('a network error / timeout after submit: the outcome is unknown, the list reloads, and resend is offered', async () => {
    const { onListStale } = setup()
    await select()
    convert.mockRejectedValueOnce(new Error('timeout of 60000ms exceeded'))

    await userEvent.click(confirmButton())

    expect(await screen.findByText(/وقد يكون التحويل تمّ/)).toBeInTheDocument()
    expect(onListStale).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).toBeInTheDocument()
  })

  it('422 on department_id: shows the server message, offers «تحديث القائمة», which reloads the departments and clears the choice', async () => {
    setup()
    await select()
    convert.mockRejectedValueOnce(http(422, { message: 'الإدارة المختارة مؤرشفة ولا يمكن الانضمام إليها.', errors: { department_id: ['x'] } }))

    await userEvent.click(confirmButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('الإدارة المختارة مؤرشفة ولا يمكن الانضمام إليها.')
    expect(await select()).toHaveAttribute('aria-invalid', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'تحديث القائمة' }))
    await waitFor(() => expect(fetchDepartments).toHaveBeenCalledTimes(2))
    expect(await select()).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it("any other 4xx shows the server's own message; a 5xx shows the generic one", async () => {
    setup()
    await select()
    convert.mockRejectedValueOnce(http(422, { message: 'لا يمكن تحويل الطلب إلا إذا كان مقبولاً. الحالة الحالية: pending' }))
    await userEvent.click(confirmButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('لا يمكن تحويل الطلب إلا إذا كان مقبولاً')

    convert.mockRejectedValueOnce(http(500, { message: 'SQLSTATE[HY000] boom' }))
    await userEvent.click(confirmButton())
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('تعذّر التحويل'))
    expect(screen.queryByText(/SQLSTATE/)).not.toBeInTheDocument()
  })
})

describe('ConvertVolunteerDialog: the result', () => {
  async function convertWith(result: ConvertVolunteerResult) {
    const ctx = setup()
    await select()
    convert.mockResolvedValueOnce(result)
    await userEvent.click(confirmButton())
    await screen.findByText(result.message)

    return ctx
  }

  it('new account + e-mail sent: says so, shows the department, and offers no resend', async () => {
    await convertWith(makeResult())

    expect(screen.getByTestId('account-outcome')).toHaveTextContent('أُنشئ حساب جديد')
    expect(screen.getByTestId('email-outcome')).toHaveTextContent('أُرسلت بيانات الدخول')
    expect(screen.getByTestId('email-outcome')).toHaveTextContent('ali@example.com')
    expect(screen.getByText('الإعلام والتسويق', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByTestId('email-warning')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).not.toBeInTheDocument()
  })

  it('existing verified account linked: «ربط بحساب قائم؛ يدخل بكلمة مروره الحالية», no e-mail block and no resend', async () => {
    await convertWith(makeResult({ account_created: false, account_existing: true, email_sent: false }))

    expect(screen.getByTestId('account-outcome')).toHaveTextContent('ربط بحساب قائم؛ يدخل بكلمة مروره الحالية.')
    expect(screen.getByTestId('account-outcome')).not.toHaveTextContent('أُنشئ حساب جديد')
    expect(screen.queryByTestId('email-warning')).not.toBeInTheDocument()
    expect(screen.queryByTestId('email-outcome')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).not.toBeInTheDocument()
  })

  it('existing UNVERIFIED account: a temporary password was re-issued, so the e-mail outcome and resend apply', async () => {
    await convertWith(makeResult({ account_created: false, account_existing: true, credentials_reissued: true, email_sent: false }))

    expect(screen.getByTestId('account-outcome')).toHaveTextContent('أُعيد إصدار كلمة مرور مؤقتة')
    expect(screen.getByTestId('email-warning')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).toBeInTheDocument()
  })

  it('department_kept_existing: tells HR the member stays in the department they really are in, not the chosen one', async () => {
    await convertWith(makeResult({ account_created: false, account_existing: true, department_kept_existing: true, department_id: 3, department_name: 'الموارد البشرية' }))

    const note = screen.getByTestId('department-kept-note')
    expect(note).toHaveTextContent('باقٍ في إدارته الحالية «الموارد البشرية»')
    expect(note).toHaveTextContent('الإدارة التي اخترتها («الإعلام والتسويق»)')
    expect(screen.getByText('الموارد البشرية', { selector: 'strong' })).toBeInTheDocument()
  })

  it('has no «kept» note in the normal case', async () => {
    await convertWith(makeResult())
    expect(screen.queryByTestId('department-kept-note')).not.toBeInTheDocument()
  })

  it('the success block is a live status, and keyboard focus moves to its heading', async () => {
    await convertWith(makeResult())

    const heading = screen.getByText('تم تحويل المتطوع إلى عضو.')
    expect(heading.closest('[role="status"]')).not.toBeNull()
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('e-mail not sent: a visible warning with a resend button, and a successful resend clears it', async () => {
    await convertWith(makeResult({ email_sent: false }))

    const warning = screen.getByTestId('email-warning')
    expect(warning).toHaveAttribute('role', 'alert')
    expect(warning).toHaveTextContent('لم يُرسل بريد بيانات الدخول')

    resend.mockResolvedValueOnce({ email_sent: true })
    await userEvent.click(within(warning).getByRole('button', { name: 'إعادة إرسال بيانات الدخول' }))

    expect(resend).toHaveBeenCalledWith(7)
    expect(await screen.findByTestId('email-outcome')).toHaveTextContent('أُعيد إرسال بيانات الدخول')
    expect(screen.queryByTestId('email-warning')).not.toBeInTheDocument()
  })

  it('a resend that still fails keeps the warning and says why; the button is guarded against double clicks', async () => {
    await convertWith(makeResult({ email_sent: false }))
    let settle!: (v: { email_sent: boolean }) => void
    resend.mockReturnValueOnce(new Promise((resolve) => { settle = resolve }))

    const button = screen.getByRole('button', { name: 'إعادة إرسال بيانات الدخول' })
    await userEvent.click(button)
    await userEvent.click(button)
    expect(resend).toHaveBeenCalledTimes(1)

    settle({ email_sent: false })
    expect(await within(screen.getByTestId('email-warning')).findByText(/تعذّر إرسال البريد مرة أخرى/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة إرسال بيانات الدخول' })).toBeEnabled()
  })

  it("a resend refused by the server shows the SERVER's Arabic reason, with no text of our own claiming why", async () => {
    await convertWith(makeResult({ email_sent: false }))
    resend.mockRejectedValueOnce(http(409, { message: 'لا يمكن إعادة الإرسال: سجّل المتطوع دخوله بالفعل.' }))

    await userEvent.click(screen.getByRole('button', { name: 'إعادة إرسال بيانات الدخول' }))

    expect(await within(screen.getByTestId('email-warning')).findByText('لا يمكن إعادة الإرسال: سجّل المتطوع دخوله بالفعل.')).toBeInTheDocument()
    expect(screen.queryByText(/غيّر كلمة مروره/)).not.toBeInTheDocument()
  })

  it('stays open on the result until HR closes it', async () => {
    const { onClose } = await convertWith(makeResult())
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
