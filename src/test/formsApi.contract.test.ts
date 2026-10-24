import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  createFormDefinition,
  downloadFormAnswerFile,
  fetchFormDefinition,
  fetchFormDefinitions,
  fetchFormSubmissionsPage,
  fetchPublicFormBySlug,
  normalizeForm,
  parseFormSaveError,
  parseFormSubmitError,
  submitPublicForm,
  toFormPayload,
  updateFormDefinition,
} from '@/api/formsApi'
import contract from '@/test/fixtures/formsApiContract.json'
import type { FormQuestion } from '@/types/operations'

/**
 * The browser side of the Forms API contract, driven by REAL responses recorded from the Laravel API
 * (src/test/fixtures/formsApiContract.json, captured against a scratch database by running the fixed controllers).
 * The same shapes are asserted on the server by tests/Feature/Forms/*, so a change on either side breaks here or there.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)

/** What axios throws for an HTTP error: isAxiosError + the recorded response. */
const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

beforeEach(() => vi.clearAllMocks())

describe('reading forms (recorded responses)', () => {
  it('the admin detail carries both spellings and the editor gets form_type / required / options', async () => {
    api.get.mockResolvedValueOnce({ data: contract.detailResponse })

    const form = await fetchFormDefinition(1)

    expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/^\/operations\/forms\/1$/))
    expect(form.form_type).toBe('suggestion')
    expect(form.questions.map((q) => q.label)).toEqual(['الاسم الكامل', 'البريد الإلكتروني', 'المدينة', 'الاهتمامات', 'السيرة الذاتية'])
    expect(form.questions.map((q) => q.required)).toEqual([true, true, true, false, false])
    expect(form.questions[2].options).toEqual(['الرياض', 'جدة'])
    expect(form.questions[0].options).toBeUndefined()
    expect(form.questions.map((q) => q.type)).toEqual(['text', 'email', 'select', 'checkbox', 'file'])
    expect(form.submissions_count).toBe(contract.detailResponse.data.submissions_count)
    expect(form.created_by?.name).toBeTruthy()
  })

  it('the list unwraps the paginated envelope', async () => {
    api.get.mockResolvedValueOnce({ data: contract.listResponse })

    const forms = await fetchFormDefinitions()

    expect(forms.length).toBeGreaterThan(0)
    expect(forms[0]).toMatchObject({ title: 'استبيان رضا الطلاب', form_type: 'suggestion' })
    expect(forms[0].submissions_count).toBeTypeOf('number')
  })

  it('the public form shows what is needed to fill it in and nothing about its owner', async () => {
    api.get.mockResolvedValueOnce({ data: contract.publicShowResponse })

    const form = await fetchPublicFormBySlug('x')

    expect(form.questions).toHaveLength(5)
    expect(form.questions[0].required).toBe(true)
    expect(form).not.toHaveProperty('created_by')
    expect(form).not.toHaveProperty('department')
  })

  it('a form with the old column spellings only is still understood', () => {
    const form = normalizeForm({ id: 1, title: 't', slug: 's', type: 'complaint', questions: [{ id: 9, label: 'q', type: 'text', is_required: 1, sort_order: 1, options: null }] })

    expect(form.form_type).toBe('complaint')
    expect(form.questions[0].required).toBe(true)
    expect(form.questions[0].options).toBeUndefined()
  })
})

describe('saving forms', () => {
  const draftQuestions: FormQuestion[] = [
    { id: 41, label: 'مخزّن', type: 'text', required: true, sort_order: 1 },
    { id: -1, label: 'جديد', type: 'select', required: false, sort_order: 2, options: ['أ', 'ب'] },
    { id: -2, label: 'مرفق', type: 'file', required: false, sort_order: 3, options: [] },
  ]

  it('sends type and form_type, required and is_required, the position as the order, and no id for an unsaved question', () => {
    const body = toFormPayload({ title: 'ع', description: 'و', form_type: 'complaint', slug: 's', questions: draftQuestions })

    expect(body).toMatchObject({ title: 'ع', description: 'و', form_type: 'complaint', type: 'complaint', slug: 's' })
    const qs = body.questions as Record<string, unknown>[]
    // Phase 2 added the builder properties; they are always sent (null when empty) so clearing one clears it on the server.
    const noExtras = { description: null, placeholder: null, help_text: null, config: null }
    expect(qs[0]).toEqual({ id: 41, label: 'مخزّن', type: 'text', required: true, is_required: true, sort_order: 1, ...noExtras })
    expect(qs[1]).toEqual({ label: 'جديد', type: 'select', required: false, is_required: false, sort_order: 2, options: ['أ', 'ب'], ...noExtras })
    expect(qs[2]).not.toHaveProperty('id')
    expect(qs[2]).not.toHaveProperty('options')
  })

  it('sends only what is present, so a title-only update cannot touch the questions', () => {
    expect(toFormPayload({ title: 'فقط' })).toEqual({ title: 'فقط' })
  })

  it('create posts the payload with the global toast off and returns the stored form (recorded response)', async () => {
    api.post.mockResolvedValueOnce({ data: contract.createResponse })

    const created = await createFormDefinition({ ...contract.createRequest, form_type: 'suggestion', questions: draftQuestions } as never)

    expect(api.post).toHaveBeenCalledWith('/operations/forms', expect.objectContaining({ type: 'suggestion' }), { skipErrorToast: true })
    expect(created.id).toBe(contract.createResponse.data.id)
    expect(created.questions.every((q) => q.id > 0)).toBe(true)
  })

  it('update PUTs to the form and failures propagate', async () => {
    api.put.mockRejectedValueOnce(httpError(403, contract.forbiddenResponse))

    await expect(updateFormDefinition(5, { title: 'x' })).rejects.toMatchObject({ response: { status: 403 } })
    expect(api.put).toHaveBeenCalledWith('/operations/forms/5', { title: 'x' }, { skipErrorToast: true })
  })
})

describe('submitting answers', () => {
  it('without files, sends JSON keyed by question id', async () => {
    api.post.mockResolvedValueOnce({ data: {} })

    await submitPublicForm('s', { '20': 'سارة', '22': 'جدة' })

    expect(api.post).toHaveBeenCalledWith('/forms/s/submit', { answers: { '20': 'سارة', '22': 'جدة' } }, { skipErrorToast: true })
  })

  it('with a file, sends multipart with answers[id], lists as answers[id][], and skips empty answers', async () => {
    api.post.mockResolvedValueOnce({ data: {} })
    const file = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' })

    await submitPublicForm('s', { '20': 'سارة', '23': ['برمجة', 'تصميم'], '24': file, '25': '', '26': undefined })

    const body = api.post.mock.calls[0][1] as FormData
    expect(body).toBeInstanceOf(FormData)
    expect([...body.keys()]).toEqual(['answers[20]', 'answers[23][]', 'answers[23][]', 'answers[24]'])
    expect(body.getAll('answers[23][]')).toEqual(['برمجة', 'تصميم'])
    expect((body.get('answers[24]') as File).name).toBe('cv.pdf')
    expect(api.post.mock.calls[0][2]).toEqual({ skipErrorToast: true })
  })
})

describe('reading failures (recorded responses)', () => {
  it('422 gives a message per question, including list items, from the recorded server errors', () => {
    const parsed = parseFormSubmitError(httpError(422, contract.submitInvalidResponse))

    const ids = Object.keys(contract.submitInvalidResponse.errors).map((k) => Number(/^answers\.(\d+)/.exec(k)![1]))
    expect(parsed.kind).toBe('validation')
    expect(Object.keys(parsed.fieldErrors).map(Number).sort()).toEqual([...new Set(ids)].sort())
    expect(Object.values(parsed.fieldErrors).some((m) => m.includes('الاسم الكامل'))).toBe(true)
    expect(Object.values(parsed.fieldErrors).some((m) => m.includes('الاهتمامات'))).toBe(true)
    expect(parsed.message).toContain('راجع الحقول')
  })

  it('404, 429, no connection and 500 each say what happened', () => {
    expect(parseFormSubmitError(httpError(contract.publicNotFoundStatus, contract.publicNotFoundResponse)).kind).toBe('not_found')
    expect(parseFormSubmitError(httpError(contract.throttledStatus!, contract.throttledResponse)).kind).toBe('throttled')
    expect(parseFormSubmitError(new Error('Network Error')).kind).toBe('network')
    expect(parseFormSubmitError(httpError(500, {})).kind).toBe('server')
    expect(parseFormSubmitError(httpError(500, {})).message).toContain('لم تُحفظ')
  })

  it('save failures keep the field and the question errors apart', () => {
    const parsed = parseFormSaveError(httpError(422, { errors: { title: ['العنوان مطلوب'], 'questions.1.options': ['أضف خياراً'], 'questions.1.label': ['x'] } }))

    expect(parsed.fieldErrors).toEqual({ title: 'العنوان مطلوب' })
    expect(parsed.questionErrors).toEqual({ 1: 'أضف خياراً' })
    expect(parsed.message).toContain('لم يُحفظ النموذج')
  })

  it('a new form comes back as a draft, and publishing an empty one is refused with the reason on the status field', () => {
    const draft = normalizeForm(contract.createDraftResponse.data as never)
    expect(draft.status).toBe('draft')
    expect(toFormPayload({ status: draft.status })).toEqual({ status: 'draft' })

    const refused = parseFormSaveError(httpError(422, contract.publishEmptyResponse))
    expect(refused.fieldErrors.status).toContain('أضف سؤالاً')
    expect(refused.message).toContain('لم يُحفظ النموذج')
  })

  it('save failures by status: forbidden, gone, offline, server', () => {
    expect(parseFormSaveError(httpError(403, contract.forbiddenResponse)).message).toContain('صلاحية')
    expect(parseFormSaveError(httpError(404, {})).message).toContain('غير موجود')
    expect(parseFormSaveError(new Error('Network Error')).message).toContain('الاتصال')
    expect(parseFormSaveError(httpError(500, {})).message).toContain('لم يُحفظ شيء')
  })
})

describe('the response list (recorded response)', () => {
  it('returns rows with the preview, label, decoded lists and file flags, plus the paging facts', async () => {
    api.get.mockResolvedValueOnce({ data: contract.submissionsResponse })

    const page = await fetchFormSubmissionsPage(11, 2)

    expect(api.get).toHaveBeenCalledWith('/operations/forms/11/submissions', { params: { page: 2 } })
    expect(page).toMatchObject({ currentPage: 1, lastPage: 1, total: 1 })
    const row = page.rows[0]
    expect(row.submitter_label).toBe('زائر')
    expect(row.answers_preview).toContain('الاسم الكامل: سارة العتيبي')
    const interests = row.answers!.find((a) => a.question_label === 'الاهتمامات')!
    expect(interests.value).toEqual(['برمجة', 'تصميم'])
    const cv = row.answers!.find((a) => a.question_type === 'file')!
    expect(cv).toMatchObject({ has_file: true, file_name: 'cv.pdf' })
    expect(JSON.stringify(row)).not.toContain('form-uploads')
  })
})

describe('attachment download', () => {
  const created: string[] = []
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn((u: string) => void created.push(u))
  })
  afterEach(() => vi.restoreAllMocks())

  it('fetches through the authorized endpoint as a blob and saves it under the display name', async () => {
    api.get.mockResolvedValueOnce({ data: new Blob(['%PDF-']) })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await downloadFormAnswerFile(11, 7, 33, 'cv.pdf')

    expect(api.get).toHaveBeenCalledWith('/operations/forms/11/submissions/7/answers/33/file', { responseType: 'blob', skipErrorToast: true })
    expect(click).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })

  it('a refused download rejects instead of saving an error page', async () => {
    api.get.mockRejectedValueOnce(httpError(403, {}))

    await expect(downloadFormAnswerFile(11, 7, 33, 'cv.pdf')).rejects.toMatchObject({ response: { status: 403 } })
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
