import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiClient from '@/api/axios'
import FormRenderer from '@/components/operations/FormRenderer'
import FormResponsesPanel from '@/components/operations/formResponses/FormResponsesPanel'
import { LIBRARY_TYPES, TYPE_SPECS } from '@/components/operations/formBuilder/questionTypes'
import { docFromForm, toDraftPayload } from '@/components/operations/formBuilder/builderDoc'
import { signatureOf } from '@/components/operations/formBuilder/useDraftAutosave'
import { DraftConflictError, normalizeForm, parseFormSaveError, parseFormSubmitError, submitPublicForm, updateFormDefinition } from '@/api/formsApi'
import contract from '@/test/fixtures/formsBuilderContract.json'

/**
 * The builder against responses RECORDED from the Laravel API (scratch server, `capture_builder_fixtures.py`): a form with every
 * block type is saved, published, shown publicly, answered and read back. What the builder sends and what it understands is
 * checked against what the server really sends, not against what the frontend assumes.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)
const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

beforeEach(() => vi.clearAllMocks())

const created = () => normalizeForm(contract.createResponse.data as never)

describe('saving a form with every block', () => {
  it('the server stored all 21 blocks in order, with their settings, and the editor reads them back', () => {
    const form = created()

    expect(form.questions).toHaveLength(21)
    expect(form.questions.map((q) => q.type)).toEqual(contract.createRequest.questions.map((q) => q.type))
    expect(form.draft_revision).toEqual(expect.any(Number))
    const name = form.questions.find((q) => q.label === 'الاسم')!
    expect(name).toMatchObject({ required: true, placeholder: 'الاسم الكامل', help_text: 'كما في الهوية', config: { validation: { min_length: 2, max_length: 40 } } })
    expect(form.questions.find((q) => q.label === 'احتمال التوصية')!.config).toEqual({ scale: { min: 1, max: 10, min_label: 'لا أوصي', max_label: 'أوصي بشدة' } })
    expect(form.questions.filter((q) => q.has_answers !== undefined)).toHaveLength(21)
  })

  it('loading the saved form into the editor and saving it again changes nothing (no phantom edits)', () => {
    const form = created()
    const doc = docFromForm(form)
    const sent = toDraftPayload(doc).questions

    expect(sent.map((q) => q.id)).toEqual(form.questions.map((q) => q.id))
    expect(sent.map((q) => q.type)).toEqual(form.questions.map((q) => q.type))
    expect(sent.map((q) => q.config ?? null)).toEqual(form.questions.map((q) => q.config ?? null))
    expect(sent.map((q) => q.label)).toEqual(form.questions.map((q) => q.label))
    // The editor's idea of "saved" is a signature of content: reloading what the server returned must equal what it was sent.
    const after = docFromForm(normalizeForm(contract.saveUnchangedResponse.data as never))
    expect(signatureOf(after)).toBe(signatureOf(doc))
  })

  it('sends the base revision and the new fields, and reads the new revision back', async () => {
    api.put.mockResolvedValueOnce({ data: contract.saveEditedResponse })
    const doc = docFromForm(created())

    const saved = await updateFormDefinition(1, toDraftPayload(doc), { baseRevision: contract.saveEditedRequest.base_revision })

    const body = api.put.mock.calls[0][1] as Record<string, unknown>
    expect(body.base_revision).toBe(contract.saveEditedRequest.base_revision)
    expect(body).not.toHaveProperty('force')
    const first = (body.questions as Record<string, unknown>[])[1]
    expect(first).toMatchObject({ placeholder: 'الاسم الكامل', help_text: 'كما في الهوية', config: { validation: { min_length: 2, max_length: 40 } } })
    expect(saved.draft_revision).toBe(contract.saveEditedResponse.data.draft_revision)
    expect(saved.questions[1].label).toBe('الاسم الثلاثي')
  })

  it('a stale save becomes a DraftConflictError carrying the current draft', async () => {
    api.put.mockRejectedValueOnce(httpError(contract.conflictStatus, contract.conflictResponse))

    const error = await updateFormDefinition(1, toDraftPayload(docFromForm(created())), { baseRevision: 1 }).catch((e) => e)

    expect(error).toBeInstanceOf(DraftConflictError)
    expect((error as DraftConflictError).current.draft_revision).toBe(contract.conflictResponse.data.draft_revision)
    expect((error as DraftConflictError).current.questions[1].label).toBe('الاسم الثلاثي')
  })

  it('an explicit overwrite is sent as force, and other errors pass through untouched', async () => {
    api.put.mockResolvedValueOnce({ data: contract.forceResponse })
    await updateFormDefinition(1, toDraftPayload(docFromForm(created())), { baseRevision: 5, force: true })
    expect(api.put.mock.calls[0][1]).toMatchObject({ base_revision: 5, force: true })

    const boom = httpError(500, {})
    api.put.mockRejectedValueOnce(boom)
    await expect(updateFormDefinition(1, {}, {})).rejects.toBe(boom)
  })

  it('the server\'s refusal of nonsense settings is shown per question, in its own words', () => {
    const parsed = parseFormSaveError(httpError(422, contract.invalidConfigResponse))

    expect(Object.keys(parsed.questionErrors).map(Number).sort()).toEqual([0, 1])
    expect(parsed.questionErrors[0]).toContain('الحد الأعلى')
    expect(parsed.questionErrors[1]).toContain('نص السؤال')
  })
})

describe('the public form and the answers', () => {
  const publicForm = () => normalizeForm(contract.publicShowResponse.data as never)

  it('the published form carries each block\'s settings and nothing about ownership', () => {
    const form = publicForm()
    expect(JSON.stringify(contract.publicShowResponse)).not.toMatch(/owner|created_by|department|collaborator/)
    expect(form.questions).toHaveLength(21)
    expect(form.questions.find((q) => q.type === 'description')!.description).toBe('اقرأ الأسئلة التالية بعناية')
    expect(form.questions.find((q) => q.label === 'المستوى')).toMatchObject({ type: 'select', placeholder: 'اختر' })
  })

  it('fills in and sends the whole form: two pages, every type, files as multipart', async () => {
    api.post.mockResolvedValue({ data: contract.submitOkResponse })
    const form = publicForm()
    const id = Object.fromEntries(form.questions.map((q) => [q.label, q.id]))
    render(<FormRenderer form={form} onSubmitAnswers={(a) => submitPublicForm(form.slug, a)} />)

    expect(screen.getByText('الصفحة 1 من 2')).toBeTruthy()
    await userEvent.type(screen.getByLabelText(/^الاسم/), 'سارة العتيبي')
    await userEvent.type(screen.getByLabelText(/ملاحظات/), 'سطر')
    await userEvent.type(screen.getByLabelText(/البريد/), 'sara@example.com')
    await userEvent.type(screen.getByLabelText(/الجوال/), '+966501234567')
    await userEvent.type(screen.getByLabelText(/العمر/), '29')
    await userEvent.type(screen.getByLabelText(/الموقع/), 'https://example.com/me')
    await userEvent.click(screen.getByRole('button', { name: 'التالي' }))

    expect(screen.getByText('الصفحة 2 من 2')).toBeTruthy()
    await userEvent.type(screen.getByLabelText(/تاريخ الميلاد/), '1996-04-12')
    await userEvent.type(screen.getByLabelText(/وقت التواصل/), '14:30')
    await userEvent.click(within(screen.getByRole('group', { name: /المدينة/ })).getByLabelText('جدة'))
    await userEvent.click(within(screen.getByRole('group', { name: /الاهتمامات/ })).getByLabelText('برمجة'))
    await userEvent.click(within(screen.getByRole('group', { name: /الاهتمامات/ })).getByLabelText('تصميم'))
    await userEvent.selectOptions(screen.getByLabelText(/المستوى/), 'متقدم')
    await userEvent.click(within(screen.getByRole('group', { name: /هل لديك خبرة/ })).getByLabelText('نعم'))
    await userEvent.click(within(screen.getByRole('group', { name: /التقييم/ })).getByLabelText('4 من 5'))
    await userEvent.click(within(screen.getByRole('group', { name: /احتمال التوصية/ })).getByLabelText('9'))
    await userEvent.upload(screen.getByLabelText(/السيرة الذاتية/), new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }))
    await userEvent.upload(screen.getByLabelText(/صورة شخصية/), new File(['x'], 'me.png', { type: 'image/png' }))
    await userEvent.click(screen.getByLabelText(/أوافق على الشروط/))
    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(api.post).toHaveBeenCalled())
    const [path, body] = api.post.mock.calls[0] as [string, FormData]
    expect(path).toBe(`/forms/${form.slug}/submit`)
    expect(body).toBeInstanceOf(FormData)
    // The same fields, under the same names, as the ones the recorded successful submission used.
    const sentNames = Array.from(new Set(Array.from(body.keys()).map((k) => k.replace(/\[\]$/, ''))))
    const recordedNames = Array.from(new Set(contract.submitOkFields.map(([k]) => (k as string).replace(/\[\]$/, '').replace(/answers\[(\d+)\]/, (_m, n) => `answers[${n}]`))))
    const recordedLabelOf = (k: string) => Object.entries(id).find(([, v]) => `answers[${v}]` === k)?.[0]
    expect(sentNames.map(recordedLabelOf).sort()).toEqual(recordedNames.map(recordedLabelOf).sort())
    expect(body.get(`answers[${id['هل لديك خبرة؟']}]`)).toBe('yes')
    expect(body.get(`answers[${id['أوافق على الشروط']}]`)).toBe('yes')
    expect(body.getAll(`answers[${id['الاهتمامات']}][]`)).toEqual(['برمجة', 'تصميم'])
    expect((body.get(`answers[${id['صورة شخصية']}]`) as File).name).toBe('me.png')
    expect(await screen.findByRole('status')).toHaveTextContent('تم استلام إجاباتك')
  })

  it('the server\'s refusals land next to the right question', () => {
    const form = publicForm()
    const parsed = parseFormSubmitError(httpError(422, contract.submitInvalidResponse))
    const byId = Object.fromEntries(form.questions.map((q) => [q.id, q.label]))

    expect(Object.keys(parsed.fieldErrors).map((k) => byId[Number(k)]).sort()).toEqual(['أوافق على الشروط', 'الاسم', 'العمر', 'الموقع'].sort())
  })
})

describe('reading the responses', () => {
  it('each answer arrives in words as well as raw, and attachments are never given by path', () => {
    const row = contract.submissionsResponse.data.data[0] as { answers: { question_label: string; question_type: string; display_value: string | null; has_file: boolean; file_name: string | null; value: unknown }[] }
    const byLabel = Object.fromEntries(row.answers.map((a) => [a.question_label, a]))

    expect(row.answers).toHaveLength(17)
    expect(row.answers.some((a) => ['section', 'description', 'page_break'].includes(a.question_type))).toBe(false)
    expect(byLabel['هل لديك خبرة؟'].display_value).toBe('نعم')
    expect(byLabel['أوافق على الشروط'].display_value).toBe('موافق')
    expect(byLabel['التقييم'].display_value).toBe('4 / 5')
    expect(byLabel['الاهتمامات'].display_value).toBe('برمجة، تصميم')
    expect(byLabel['صورة شخصية']).toMatchObject({ has_file: true, file_name: 'me.png' })
    expect(JSON.stringify(contract.submissionsResponse)).not.toMatch(/file_path|\/storage\/|private\//)
  })
})

describe('every block the builder advertises is carried end to end', () => {
  it('each library type was saved, published, answered (unless it is structural) and read back by the real server', () => {
    const savedTypes = new Set(created().questions.map((q) => q.type))
    const publishedTypes = new Set(normalizeForm(contract.publicShowResponse.data as never).questions.map((q) => q.type))
    const answered = new Set((contract.submissionsResponse.data.data[0] as { answers: { question_type: string }[] }).answers.map((a) => a.question_type))

    for (const type of LIBRARY_TYPES) {
      expect(savedTypes.has(type), `${type} saved`).toBe(true)
      expect(publishedTypes.has(type), `${type} public`).toBe(true)
      expect(answered.has(type), `${type} answered`).toBe(!TYPE_SPECS[type].structural)
    }
  })

  it('the responses screen shows the answers in words', async () => {
    api.get.mockResolvedValueOnce({ data: contract.submissionsResponse })
    render(<FormResponsesPanel formId={1} />)

    const open = await screen.findByRole('button', { name: /عرض إجابات الإرسال/ })
    await userEvent.click(open)

    expect(screen.getByText('نعم')).toBeTruthy()
    expect(screen.getByText('موافق')).toBeTruthy()
    expect(screen.getByText('4 / 5')).toBeTruthy()
    expect(screen.getByText('برمجة، تصميم')).toBeTruthy()
    expect(screen.getByRole('button', { name: /تنزيل me\.png/ })).toBeTruthy()
  })
})
