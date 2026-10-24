import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import apiClient from '@/api/axios'
import FormRenderer from '@/components/operations/FormRenderer'
import OpsFormCreatePage from '@/pages/operations/admin/OpsFormCreatePage'
import OpsFormDetailPage from '@/pages/operations/admin/OpsFormDetailPage'
import OpsFormsPage from '@/pages/operations/admin/OpsFormsPage'
import PublicFormPage from '@/pages/operations/public/PublicFormPage'
import { normalizeForm, submitPublicForm } from '@/api/formsApi'
import contract from '@/test/fixtures/formsApiContract.json'
import type { OpsFormDefinition } from '@/types/operations'

/**
 * The form screens against the real API contract: requests go through formsApi to a mocked HTTP client that
 * answers with responses recorded from the Laravel API (src/test/fixtures/formsApiContract.json).
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/components/operations/OpsPageSkeleton', () => ({ default: () => <div>loading</div> }))
const api = vi.mocked(apiClient, true)

const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

function Where() {
  const l = useLocation()

  return <span data-testid="where">{l.pathname}</span>
}

const publicForm = (): OpsFormDefinition => normalizeForm(contract.publicShowResponse.data as never)
const ids = () => Object.fromEntries(publicForm().questions.map((q) => [q.label, q.id])) as Record<string, number>

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══ Create and edit pages ═══════════════════════════════════════════════════

describe('create page', () => {
  const mount = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/forms/create']}>
        <Routes>
          <Route path="/dashboard/admin/forms/create" element={<OpsFormCreatePage />} />
          <Route path="/dashboard/admin/forms/:id" element={<div>detail page</div>} />
        </Routes>
        <Where />
      </MemoryRouter>,
    )

  it('a refused creation stays on the page and says why (it used to jump to the list as if it had worked)', async () => {
    api.post.mockRejectedValueOnce(httpError(422, { errors: { slug: ['رابط النموذج مستخدم في نموذج آخر.'] } }))
    mount()
    await userEvent.type(screen.getByLabelText('عنوان النموذج'), 'استبيان جديد')

    await userEvent.click(screen.getByRole('button', { name: 'إنشاء المسودة وفتح المحرر' }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((a) => a.textContent).join(' ')).toContain('رابط النموذج مستخدم في نموذج آخر.')
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/admin/forms/create')
    expect(screen.queryByText('detail page')).toBeNull()
  })

  it('a title is required before anything is sent', async () => {
    mount()

    await userEvent.click(screen.getByRole('button', { name: 'إنشاء المسودة وفتح المحرر' }))

    expect(await screen.findByText('عنوان النموذج مطلوب.')).toBeTruthy()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('a stored draft opens in the editor at its own page, and the request carries the stored column names and no questions', async () => {
    api.post.mockResolvedValueOnce({ data: contract.createResponse })
    mount()
    await userEvent.type(screen.getByLabelText('عنوان النموذج'), 'استبيان جديد')

    await userEvent.click(screen.getByRole('button', { name: 'إنشاء المسودة وفتح المحرر' }))

    await screen.findByText('detail page')
    expect(screen.getByTestId('where')).toHaveTextContent(`/dashboard/admin/forms/${contract.createResponse.data.id}`)
    const [path, body] = api.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe('/operations/forms')
    expect(body).toMatchObject({ title: 'استبيان جديد', type: 'suggestion', form_type: 'suggestion' })
    expect(body).not.toHaveProperty('status')
    expect(body).not.toHaveProperty('questions')
  })
})

describe('forms list', () => {
  it('shows each form with its publish status and response count, so a draft is recognisable', async () => {
    const list = [
      { ...contract.createResponse.data, id: 1, title: 'منشور', status: 'active', submissions_count: 3 },
      { ...contract.createDraftResponse.data, id: 2, title: 'مسودة', status: 'draft', submissions_count: 0 },
    ]
    api.get.mockResolvedValueOnce({ data: { success: true, data: { data: list } } })
    render(<MemoryRouter><OpsFormsPage /></MemoryRouter>)

    expect(await screen.findByText('منشور', { selector: 'h2' })).toBeTruthy()
    const published = screen.getByText('منشور', { selector: 'h2' }).closest('a')!
    const draft = screen.getByText('مسودة', { selector: 'h2' }).closest('a')!
    expect(within(published).getByText('منشور', { selector: 'span' })).toBeTruthy()
    expect(within(draft).getByText('مسودة', { selector: 'span' })).toBeTruthy()
    expect(within(published).getByText('عدد الإرسالات: 3')).toBeTruthy()
  })
})

describe('edit page', () => {
  const mount = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/forms/1']}>
        <Routes>
          <Route path="/dashboard/admin/forms/:id" element={<OpsFormDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

  it('loads the stored form into the editor', async () => {
    api.get.mockResolvedValueOnce({ data: contract.detailResponse })
    mount()

    expect(await screen.findByDisplayValue('استبيان رضا الطلاب')).toBeTruthy()
    expect(screen.getAllByTestId('block-card')).toHaveLength(5)
  })

  it('saving sends the questions with their stored ids and the revision it started from, and shows success only after the server accepts', async () => {
    api.get.mockResolvedValueOnce({ data: contract.detailResponse })
    api.put.mockResolvedValueOnce({ data: contract.detailResponse })
    mount()
    await userEvent.type(await screen.findByLabelText('عنوان النموذج'), ' معدّل')
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'dirty')

    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))

    await waitFor(() => expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'saved'))
    expect(screen.getByTestId('save-indicator')).toHaveTextContent('تم الحفظ')
    const [path, body] = api.put.mock.calls[0] as [string, { questions: { id: number }[]; title: string }]
    expect(path).toBe(`/operations/forms/${contract.detailResponse.data.id}`)
    expect(body.title).toBe('استبيان رضا الطلاب معدّل')
    expect(body.questions.map((q) => q.id)).toEqual(contract.detailResponse.data.questions.map((q) => q.id))
  })

  it('publishing waits while edits are unsaved, so they are never left out of the version, and opens once they are stored', async () => {
    const draft = { ...contract.detailResponse, data: { ...contract.detailResponse.data, status: 'draft', has_unpublished_changes: true } }
    api.get.mockResolvedValueOnce({ data: draft })
    api.put.mockResolvedValueOnce({ data: draft })
    mount()
    await userEvent.type(await screen.findByLabelText('عنوان النموذج'), ' معدّل')

    const publish = screen.getByRole('button', { name: /^نشر$/ })
    expect(publish).toBeDisabled()
    expect(screen.getByText(/هناك تعديلات لم تُحفظ بعد/)).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^نشر$/ })).toBeEnabled())
    expect(screen.queryByText(/هناك تعديلات لم تُحفظ بعد/)).toBeNull()
  })

  it('a person who may not edit gets the form read-only, with a note and no way to save', async () => {
    const viewer = { ...contract.detailResponse, data: { ...contract.detailResponse.data, abilities: { ...contract.detailResponse.data.abilities, edit: false, publish: false } } }
    api.get.mockResolvedValueOnce({ data: viewer })
    mount()

    expect(await screen.findByText(/لا تملك صلاحية تعديل هذا النموذج. يمكنك الاطلاع عليه ومعاينته فقط/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'حفظ الآن' })).toBeNull()
    expect(screen.queryByTestId('builder-library')).toBeNull()
    expect(screen.getAllByTestId('block-card')).toHaveLength(5)
  })

  it('a refused save is shown as refused, with no success message', async () => {
    api.get.mockResolvedValueOnce({ data: contract.detailResponse })
    api.put.mockRejectedValueOnce(httpError(500, {}))
    mount()
    await userEvent.type(await screen.findByLabelText('عنوان النموذج'), 'x')

    await userEvent.click(screen.getByRole('button', { name: 'حفظ الآن' }))

    expect(await screen.findByTestId('save-error')).toHaveTextContent('لم يُحفظ شيء')
    expect(screen.getByTestId('save-indicator')).toHaveAttribute('data-status', 'error')
    expect(screen.getByTestId('save-indicator')).not.toHaveTextContent('تم الحفظ')
  })

  it('says whether the form is forbidden or gone, instead of blaming the connection', async () => {
    api.get.mockRejectedValueOnce(httpError(403, contract.forbiddenResponse))
    const first = mount()
    expect(await screen.findByText('لا تملك صلاحية عرض هذا النموذج.')).toBeTruthy()
    first.unmount()

    api.get.mockRejectedValueOnce(httpError(404, contract.publicNotFoundResponse))
    mount()
    expect(await screen.findByText('النموذج غير موجود أو حُذف.')).toBeTruthy()
  })

  it('the responses tab lists them, opens every answer and downloads an attachment through the secure endpoint', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/submissions')) return { data: contract.submissionsResponse }
      if (url.endsWith('/file')) return { data: new Blob(['%PDF-']) }
      return { data: contract.detailResponse }
    })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    mount()
    await screen.findByDisplayValue('استبيان رضا الطلاب')

    await userEvent.click(screen.getByRole('tab', { name: 'الإرسالات' }))
    expect(await screen.findByText('زائر')).toBeTruthy()
    expect(screen.getByText(/الاسم الكامل: سارة العتيبي/)).toBeTruthy()

    const row = contract.submissionsResponse.data.data[0]
    await userEvent.click(screen.getByRole('button', { name: `عرض إجابات الإرسال ${row.id}` }))
    expect(screen.getByText('برمجة، تصميم')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /تنزيل cv\.pdf/ }))

    const fileAnswer = row.answers.find((a) => a.has_file)!
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`/operations/forms/1/submissions/${row.id}/answers/${fileAnswer.id}/file`, expect.objectContaining({ responseType: 'blob' })))
  })

  it('a failed attachment download is reported', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url.endsWith('/submissions')) return { data: contract.submissionsResponse }
      if (url.endsWith('/file')) throw httpError(404, {})
      return { data: contract.detailResponse }
    })
    mount()
    await screen.findByDisplayValue('استبيان رضا الطلاب')
    await userEvent.click(screen.getByRole('tab', { name: 'الإرسالات' }))
    await userEvent.click(await screen.findByRole('button', { name: /عرض إجابات الإرسال/ }))

    await userEvent.click(screen.getByRole('button', { name: /تنزيل cv\.pdf/ }))

    expect(await screen.findByText(/تعذّر تنزيل الملف/)).toBeTruthy()
  })
})

// ═══ The public form ═════════════════════════════════════════════════════════

describe('public form', () => {
  it('renders every question type of the recorded form with the right control', () => {
    render(<FormRenderer form={publicForm()} onSubmitAnswers={vi.fn()} />)

    expect(screen.getByLabelText(/الاسم الكامل/)).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText(/المدينة/).tagName).toBe('SELECT')
    expect(within(screen.getByRole('group', { name: /الاهتمامات/ })).getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByLabelText(/السيرة الذاتية/)).toHaveAttribute('type', 'file')
  })

  it('single choice is a radio group, a phone is a tel field, a list is a set of checkboxes', () => {
    const form: OpsFormDefinition = { ...publicForm(), questions: [
      { id: 1, label: 'التقييم', type: 'radio', required: true, sort_order: 1, options: ['ممتاز', 'جيد'] },
      { id: 2, label: 'الهاتف', type: 'phone', required: false, sort_order: 2 },
      { id: 3, label: 'المهارات', type: 'multiselect', required: false, sort_order: 3, options: ['php', 'js'] },
      { id: 4, label: 'موافق', type: 'checkbox', required: false, sort_order: 4 },
    ] }
    render(<FormRenderer form={form} onSubmitAnswers={vi.fn()} />)

    expect(within(screen.getByRole('group', { name: /التقييم/ })).getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByLabelText(/الهاتف/)).toHaveAttribute('type', 'tel')
    expect(within(screen.getByRole('group', { name: /المهارات/ })).getAllByRole('checkbox')).toHaveLength(2)
    expect(within(screen.getByRole('group', { name: /موافق/ })).getByLabelText('نعم')).toBeTruthy()
  })

  it('submits the answers keyed by question id (not the old q_ prefix) and then thanks the visitor', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const id = ids()
    render(<FormRenderer form={publicForm()} onSubmitAnswers={onSubmit} />)
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), 'سارة')
    await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/), 'sara@example.com')
    await userEvent.selectOptions(screen.getByLabelText(/المدينة/), 'جدة')
    await userEvent.click(screen.getByLabelText('برمجة'))
    await userEvent.click(screen.getByLabelText('تصميم'))

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      [String(id['الاسم الكامل'])]: 'سارة',
      [String(id['البريد الإلكتروني'])]: 'sara@example.com',
      [String(id['المدينة'])]: 'جدة',
      [String(id['الاهتمامات'])]: ['برمجة', 'تصميم'],
    })
    expect(await screen.findByRole('status')).toHaveTextContent('تم استلام إجاباتك')
  })

  it('does not call the server while a required question is empty, and says which', async () => {
    const onSubmit = vi.fn()
    render(<FormRenderer form={publicForm()} onSubmitAnswers={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByText('هذا الحقل مطلوب.')).toHaveLength(3)
  })

  it('server refusals appear next to the fields they are about, the visitor is not told it worked, and fixing a field clears its message', async () => {
    api.post.mockRejectedValueOnce(httpError(422, contract.submitInvalidResponse))
    const id = ids()
    render(<FormRenderer form={publicForm()} onSubmitAnswers={(a) => submitPublicForm('s', a)} />)
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), 'سارة')
    await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/), 'sara@example.com')
    await userEvent.selectOptions(screen.getByLabelText(/المدينة/), 'الرياض')

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(await screen.findByText('حقل «الاسم الكامل» مطلوب.')).toBeTruthy()
    expect(screen.getByText('اختر قيمة من الخيارات المتاحة في «المدينة».')).toBeTruthy()
    expect(screen.getByText('اختر من الخيارات المتاحة فقط في «الاهتمامات».')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect(id['الاسم الكامل']).toBeGreaterThan(0)

    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), 'x')
    expect(screen.queryByText('حقل «الاسم الكامل» مطلوب.')).toBeNull()
  })

  it('a throttled or failed send says it was not delivered, and the answers are still there', async () => {
    api.post.mockRejectedValueOnce(httpError(429, contract.throttledResponse)).mockRejectedValueOnce(new Error('Network Error'))
    render(<FormRenderer form={{ ...publicForm(), questions: publicForm().questions.slice(0, 1) }} onSubmitAnswers={(a) => submitPublicForm('s', a)} />)
    await userEvent.type(screen.getByLabelText(/الاسم الكامل/), 'سارة')

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('عدد كبير من الطلبات')
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('تعذّر الاتصال'))

    expect((screen.getByLabelText(/الاسم الكامل/) as HTMLInputElement).value).toBe('سارة')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('a chosen file is sent as multipart, and a file over 5 MB is stopped before the upload', async () => {
    api.post.mockResolvedValue({ data: {} })
    const form: OpsFormDefinition = { ...publicForm(), questions: [{ id: 7, label: 'مرفق', type: 'file', required: true, sort_order: 1 }] }
    render(<FormRenderer form={form} onSubmitAnswers={(a) => submitPublicForm('s', a)} />)

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText(/مرفق/), big)
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))
    expect(await screen.findByText('حجم الملف يتجاوز 5 ميغابايت.')).toBeTruthy()
    expect(api.post).not.toHaveBeenCalled()

    await userEvent.upload(screen.getByLabelText(/مرفق/), new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    const body = api.post.mock.calls[0][1] as FormData
    expect(body).toBeInstanceOf(FormData)
    expect((body.get('answers[7]') as File).name).toBe('cv.pdf')
  })

  const mountPage = (slug: string) =>
    render(
      <MemoryRouter initialEntries={[`/forms/${slug}`]}>
        <Routes>
          <Route path="/forms/:slug" element={<PublicFormPage />} />
        </Routes>
      </MemoryRouter>,
    )

  it('a closed or unknown link says the form is not available (the response the server gives for both)', async () => {
    api.get.mockRejectedValueOnce(httpError(contract.publicNotFoundStatus, contract.publicNotFoundResponse))
    mountPage('gone')

    expect(await screen.findByRole('alert')).toHaveTextContent('هذا النموذج غير متاح حالياً')
  })

  it('an existing link loads the form and a visitor can send it end to end', async () => {
    api.get.mockResolvedValueOnce({ data: contract.publicShowResponse })
    api.post.mockResolvedValueOnce({ data: contract.submitOkResponse })
    mountPage(contract.publicShowResponse.data.slug)
    await userEvent.type(await screen.findByLabelText(/الاسم الكامل/), 'سارة')
    await userEvent.type(screen.getByLabelText(/البريد الإلكتروني/), 'sara@example.com')
    await userEvent.selectOptions(screen.getByLabelText(/المدينة/), 'جدة')

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(await screen.findByRole('status')).toHaveTextContent('تم استلام إجاباتك')
    expect(api.post.mock.calls[0][0]).toBe(`/forms/${contract.publicShowResponse.data.slug}/submit`)
  })
})
