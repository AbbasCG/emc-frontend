import axios from 'axios'
import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { unwrapData } from './unwrap'
import type {
  FormQuestion,
  FormSubmissionRow,
  FormSubmissionsPage,
  FormTypeSlug,
  OpsFormDefinition,
} from '@/types/operations'

/**
 * Forms API client.
 *
 * The server stores `type` / `is_required`; the editor and the public form speak `form_type` / `required`.
 * The server answers with both spellings, and this module is the only place that maps between the two, so no
 * screen has to know. Every failure propagates to the caller (nothing is swallowed here) with the global error
 * toast turned off for the calls whose screens show their own message next to the field that caused it.
 */

export const OWN_ERRORS = { skipErrorToast: true } as const

type RawRecord = Record<string, unknown>

export function normalizeQuestion(raw: RawRecord): FormQuestion {
  return {
    ...(raw as unknown as FormQuestion),
    required: Boolean(raw.required ?? raw.is_required ?? false),
    options: Array.isArray(raw.options) ? (raw.options as string[]) : undefined,
  }
}

export function normalizeForm(raw: RawRecord): OpsFormDefinition {
  const questions = Array.isArray(raw.questions) ? (raw.questions as RawRecord[]).map(normalizeQuestion) : []
  const formType = (raw.form_type ?? raw.type ?? 'suggestion') as FormTypeSlug

  return { ...(raw as unknown as OpsFormDefinition), form_type: formType, questions }
}

/** What the server expects for one question. A non-positive id is an unsaved question: it is sent without an id. */
function toQuestionPayload(q: FormQuestion, index: number, referenced: Set<number>): RawRecord {
  const body: RawRecord = {
    label: q.label,
    type: q.type,
    required: q.required,
    is_required: q.required,
    sort_order: index + 1,
  }
  if (q.id > 0) body.id = q.id
  // A question that is not stored yet has no id to send, but a rule of another question may read it: it says which one it is (its
  // temporary id), so the server can point the rule at the row it creates.
  else if (referenced.has(q.id)) body.ref = q.id
  if (q.options && q.options.length > 0) body.options = q.options
  // Always sent, so clearing a property in the editor clears it on the server too.
  body.description = q.description ?? null
  body.placeholder = q.placeholder ?? null
  body.help_text = q.help_text ?? null
  body.config = q.config ?? null
  // The visibility rule. Left out when the caller did not say (so a client that knows nothing of rules changes nothing); `null`
  // removes the rule.
  if (q.logic !== undefined) body.logic = q.logic

  return body
}

/** How the editor identifies the draft it started from, so a save from a stale copy can be refused. */
export type DraftSaveOptions = { baseRevision?: number; force?: boolean }

/** The server refused a save because someone else changed the draft first. Carries the draft as it is now. */
export class DraftConflictError extends Error {
  readonly current: OpsFormDefinition

  constructor(current: OpsFormDefinition) {
    super('تم تعديل مسودة النموذج من قبل شخص آخر.')
    this.name = 'DraftConflictError'
    this.current = current
  }
}

/** The editor's draft as the request body. Only the keys that are present are sent. */
export function toFormPayload(draft: Partial<OpsFormDefinition>, options: DraftSaveOptions = {}): RawRecord {
  const body: RawRecord = {}
  for (const key of ['title', 'description', 'slug', 'status', 'department_id'] as const) {
    if (draft[key] !== undefined) body[key] = draft[key]
  }
  if (draft.form_type !== undefined) {
    body.form_type = draft.form_type
    body.type = draft.form_type
  }
  if (draft.questions !== undefined) {
    const referenced = new Set<number>(draft.questions.flatMap((q) => (q.logic?.conditions ?? []).map((c) => c.question)).filter((id) => id <= 0))
    body.questions = draft.questions.map((q, i) => toQuestionPayload(q, i, referenced))
  }
  if (draft.flow !== undefined) body.flow = draft.flow
  if (options.baseRevision !== undefined) body.base_revision = options.baseRevision
  if (options.force) body.force = true

  return body
}

export async function fetchFormDefinitions(): Promise<OpsFormDefinition[]> {
  const res = await apiClient.get<unknown>('/operations/forms')
  return asList<RawRecord>(res.data).map(normalizeForm)
}

export async function fetchFormDefinition(id: number): Promise<OpsFormDefinition> {
  const res = await apiClient.get<unknown>(`/operations/forms/${id}`)
  return normalizeForm(unwrapLms<RawRecord>(res.data))
}

/**
 * A share link's token travels in a header, never in the query string, so it does not end up in server logs or referrers. The
 * server judges it against THIS form; a wrong, expired, revoked or used-up token is answered with the reason, and a form that
 * needs a link says so without showing anything about itself.
 */
const shareHeaders = (token?: string | null) => (token ? { headers: { 'X-Form-Share': token } } : {})

export async function fetchPublicFormBySlug(slug: string, shareToken?: string | null): Promise<OpsFormDefinition> {
  const url = `/forms/${encodeURIComponent(slug)}`
  const res = await (shareToken ? apiClient.get<unknown>(url, shareHeaders(shareToken)) : apiClient.get<unknown>(url))
  return normalizeForm(unwrapLms<RawRecord>(res.data))
}

/**
 * Sends the answers, keyed by question id. A file in any answer switches the request to multipart, with lists as
 * `answers[id][]`; otherwise it is plain JSON.
 */
export async function submitPublicForm(slug: string, answers: Record<string, unknown>, shareToken?: string | null): Promise<void> {
  const hasFile = Object.values(answers).some((v) => v instanceof File)
  const config = { ...OWN_ERRORS, ...shareHeaders(shareToken) }
  if (!hasFile) {
    await apiClient.post(`/forms/${encodeURIComponent(slug)}/submit`, { answers }, config)
    return
  }

  const body = new FormData()
  for (const [id, value] of Object.entries(answers)) {
    if (value === undefined || value === null || value === '') continue
    if (value instanceof File) body.append(`answers[${id}]`, value)
    else if (Array.isArray(value)) value.forEach((item) => body.append(`answers[${id}][]`, String(item)))
    else body.append(`answers[${id}]`, String(value))
  }
  await apiClient.post(`/forms/${encodeURIComponent(slug)}/submit`, body, config)
}

export async function createFormDefinition(body: Partial<OpsFormDefinition>): Promise<OpsFormDefinition> {
  const res = await apiClient.post<unknown>('/operations/forms', toFormPayload(body), OWN_ERRORS)
  return normalizeForm(unwrapLms<RawRecord>(res.data))
}

export async function updateFormDefinition(
  id: number,
  body: Partial<OpsFormDefinition>,
  options: DraftSaveOptions = {},
): Promise<OpsFormDefinition> {
  try {
    const res = await apiClient.put<unknown>(`/operations/forms/${id}`, toFormPayload(body, options), OWN_ERRORS)
    return normalizeForm(unwrapLms<RawRecord>(res.data))
  } catch (error) {
    // 409 draft_conflict: hand the caller the draft as it is now, so it can offer to load it or to overwrite it on purpose.
    const { status, body: errorBody } = bodyOf(error)
    const current = (errorBody as { code?: unknown; data?: unknown }).data
    if (status === 409 && (errorBody as { code?: unknown }).code === 'draft_conflict' && current && typeof current === 'object') {
      throw new DraftConflictError(normalizeForm(current as RawRecord))
    }
    throw error
  }
}

/** The first page of responses, as a plain list. */
export async function fetchFormSubmissions(formId: number): Promise<FormSubmissionRow[]> {
  const res = await apiClient.get<unknown>(`/operations/forms/${formId}/submissions`)
  return asList<FormSubmissionRow>(res.data)
}

/** One page of responses with the paging facts the table needs. */
export async function fetchFormSubmissionsPage(formId: number, page = 1): Promise<FormSubmissionsPage> {
  const res = await apiClient.get<unknown>(`/operations/forms/${formId}/submissions`, { params: { page } })
  const inner = unwrapData<{ data?: unknown; meta?: { current_page?: number; last_page?: number; total?: number } }>(res.data)
  const rows = Array.isArray(inner?.data) ? (inner.data as FormSubmissionRow[]) : asList<FormSubmissionRow>(res.data)
  const meta = inner?.meta ?? {}

  return {
    rows,
    currentPage: meta.current_page ?? page,
    lastPage: meta.last_page ?? 1,
    total: meta.total ?? rows.length,
  }
}

/** Fetches an attachment through the authorized endpoint and hands it to the browser as a download. */
export async function downloadFormAnswerFile(formId: number, submissionId: number, answerId: number, fileName: string): Promise<void> {
  const res = await apiClient.get<Blob>(
    `/operations/forms/${formId}/submissions/${submissionId}/answers/${answerId}/file`,
    { responseType: 'blob', ...OWN_ERRORS },
  )
  const url = URL.createObjectURL(res.data)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── Reading failures ────────────────────────────────────────────────────────

export type ErrorBody = { message?: unknown; errors?: Record<string, unknown> }

export function bodyOf(error: unknown): { status: number | null; body: ErrorBody } {
  if (!axios.isAxiosError(error)) return { status: null, body: {} }
  return { status: error.response?.status ?? null, body: (error.response?.data ?? {}) as ErrorBody }
}

export function firstMessage(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null
  return typeof value === 'string' ? value : null
}

export type FormSubmitError = {
  kind: 'validation' | 'not_found' | 'throttled' | 'network' | 'server' | 'unavailable'
  message: string
  /** First message per question id, from the server's `answers.<id>` / `answers.<id>.<n>` errors. */
  fieldErrors: Record<number, string>
}

/** Turns a failed public submission into what the form can show: a message and the errors per question. */
export function parseFormSubmitError(error: unknown): FormSubmitError {
  const { status, body } = bodyOf(error)

  if (status === 422) {
    const fieldErrors: Record<number, string> = {}
    let general: string | null = null
    for (const [key, value] of Object.entries(body.errors ?? {})) {
      const message = firstMessage(value)
      if (!message) continue
      const match = /^answers\.(\d+)(?:\.|$)/.exec(key)
      if (match) fieldErrors[Number(match[1])] ??= message
      else general ??= message
    }
    const count = Object.keys(fieldErrors).length
    return {
      kind: 'validation',
      fieldErrors,
      message: general ?? (count > 0 ? 'راجع الحقول المحددة أدناه ثم أعد الإرسال.' : 'تعذّر قبول الإجابات. راجع الحقول وأعد المحاولة.'),
    }
  }
  // The form refused the answer itself (closed, not open yet, ended, full, sign-in needed): the server says which, in words.
  if ((status === 403 || status === 401) && typeof body.message === 'string' && typeof (body as { code?: unknown }).code === 'string') {
    return { kind: 'unavailable', fieldErrors: {}, message: body.message }
  }
  if (status === 404) return { kind: 'not_found', fieldErrors: {}, message: 'هذا النموذج لم يعد متاحاً لاستقبال الإجابات.' }
  if (status === 429) return { kind: 'throttled', fieldErrors: {}, message: 'تم إرسال عدد كبير من الطلبات. انتظر دقيقة ثم أعد المحاولة.' }
  if (status === null) return { kind: 'network', fieldErrors: {}, message: 'تعذّر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.' }

  return { kind: 'server', fieldErrors: {}, message: 'حدث خطأ أثناء الإرسال. لم تُحفظ إجاباتك، حاول مرة أخرى.' }
}

export type FormSaveError = {
  message: string
  /** Server errors for the title / link / department, keyed by field. */
  fieldErrors: Record<string, string>
  /** Server errors per question, keyed by its position in the list that was sent. */
  questionErrors: Record<number, string>
}

/** Turns a failed save into a message plus the errors per field and per question. */
export function parseFormSaveError(error: unknown): FormSaveError {
  const { status, body } = bodyOf(error)
  const result: FormSaveError = { message: '', fieldErrors: {}, questionErrors: {} }

  if (status === 422) {
    for (const [key, value] of Object.entries(body.errors ?? {})) {
      const message = firstMessage(value)
      if (!message) continue
      const q = /^questions\.(\d+)(?:\.|$)/.exec(key)
      if (q) result.questionErrors[Number(q[1])] ??= message
      else result.fieldErrors[key] ??= message
    }
    const first = Object.values(result.fieldErrors)[0] ?? Object.values(result.questionErrors)[0]
    result.message = first ? `لم يُحفظ النموذج: ${first}` : 'لم يُحفظ النموذج. راجع الحقول وأعد المحاولة.'
    return result
  }
  if (status === 403) result.message = 'لا تملك صلاحية تعديل هذا النموذج. لم يُحفظ شيء.'
  else if (status === 404) result.message = 'النموذج غير موجود أو حُذف. لم يُحفظ شيء.'
  else if (status === 429) result.message = 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.'
  else if (status === null) result.message = 'تعذّر الاتصال بالخادم. لم يُحفظ شيء، تحقق من الاتصال وأعد المحاولة.'
  else result.message = 'حدث خطأ في الخادم. لم يُحفظ شيء، حاول مرة أخرى.'

  return result
}
