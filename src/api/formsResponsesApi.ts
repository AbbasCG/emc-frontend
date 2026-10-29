import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { unwrapData } from './unwrap'
import { OWN_ERRORS } from './formsApi'
import type { FormAnswerRow, QuestionType } from '@/types/operations'

/**
 * Forms Phase 4 client: managing the responses of a form. The filtered table, one response, the review workflow (status,
 * assignment, internal notes, history), corrections and exports.
 *
 * The server decides everything that matters (who may read, review, correct or export; which rows an export holds); this module only
 * carries the questions and the answers. Every call turns the global error toast off and lets the failure propagate;
 * `parseFormActionError` (formsAdminApi) turns one into words, and `responseFieldErrors` pulls the per-question messages out of a 422.
 */

type RawRecord = Record<string, unknown>

export const RESPONSE_STATUSES = ['new', 'in_review', 'needs_followup', 'completed', 'archived'] as const
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number]

export type PersonRef = { id: number; name: string }

export type ResponseRow = {
  id: number
  form_id: number
  form_version_id: number | null
  /** The number of the published version the respondent answered, when known. */
  form_version: number | null
  status: ResponseStatus
  status_label: string
  submitted_at: string
  submitter_label: string | null
  answers_preview?: string
  assignee: PersonRef | null
  assigned_at: string | null
  corrected: boolean
  corrected_at: string | null
  /** `public` is the plain address; `link` came through a share link, named by its label. */
  source: { type: 'public' | 'link'; label: string | null }
  share_link?: { id: number; label: string } | null
  answers?: FormAnswerRow[]
}

export type ResponseDetail = ResponseRow & { abilities: { review: boolean; correct: boolean } }

export type ResponseFilters = {
  search: string
  status: ResponseStatus[]
  /** '' = anyone, 'none' = unassigned, 'me', or an employee id. */
  assignee: string
  /** A published version id, or ''. */
  version: string
  from: string
  to: string
  /** '' = any, 'public', 'link', or a share link id. */
  source: string
  corrected: boolean
}

export const EMPTY_FILTERS: ResponseFilters = { search: '', status: [], assignee: '', version: '', from: '', to: '', source: '', corrected: false }

export type ResponsesPage = {
  rows: ResponseRow[]
  currentPage: number
  lastPage: number
  total: number
  /** How many responses each status would show with the other filters applied. */
  statusCounts: Record<ResponseStatus, number>
}

export type ExportColumn = { key: string; label: string; group: 'meta' | 'question'; type: QuestionType | 'number' | null; removed: boolean; default: boolean }

export type ResponseOptions = {
  statuses: { value: ResponseStatus; label: string }[]
  versions: { id: number; number: number; published_at: string | null; responses: number }[]
  links: { id: number; label: string }[]
  columns: ExportColumn[]
  /** People who have a response assigned (for the filter). */
  assignees: PersonRef[]
  /** People a response may be assigned to; only given to reviewers. */
  assignable: PersonRef[]
}

export type ResponseNote = { id: number; body: string; author: PersonRef | null; created_at: string }

export type CorrectionLine = {
  id: number
  question_id: number
  question_label: string | null
  question_type: QuestionType | null
  previous: string | string[] | null
  new: string | string[] | null
  previous_display: string | null
  new_display: string | null
  reason: string | null
  corrected_by: PersonRef | null
  created_at: string
}

export type HistoryLine = {
  id: number
  type: 'submitted' | 'status_changed' | 'assigned' | 'unassigned' | 'note_added' | 'corrected'
  label: string
  actor: PersonRef | null
  from: string | null
  to: string | null
  meta: { count?: number; questions?: string[] } | null
  corrections: CorrectionLine[]
  created_at: string
}

export type SortKey = 'submitted_at' | 'id' | 'status'

export type ExportFormat = 'xlsx' | 'csv' | 'pdf'
export type ExportStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired'

export type ExportRecord = {
  id: number
  format: ExportFormat
  status: ExportStatus
  ready: boolean
  row_count: number | null
  file_name: string | null
  file_size: number | null
  error: string | null
  expires_at: string | null
}

const formUrl = (id: number) => `/operations/forms/${id}`

/** The filters as query parameters: only what is set, so an empty filter sends nothing. */
export function filterParams(filters: ResponseFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (filters.search.trim()) out.search = filters.search.trim()
  if (filters.status.length > 0) out.status = filters.status
  if (filters.assignee) out.assignee = filters.assignee
  if (filters.version) out.version = Number(filters.version)
  if (filters.from) out.from = filters.from
  if (filters.to) out.to = filters.to
  if (filters.source) out.source = filters.source
  if (filters.corrected) out.corrected = 1

  return out
}

export function activeFilterCount(filters: ResponseFilters): number {
  return Object.keys(filterParams(filters)).length
}

function normalizeRow(raw: RawRecord): ResponseRow {
  const answers = Array.isArray(raw.answers) ? (raw.answers as FormAnswerRow[]) : undefined

  return {
    ...(raw as unknown as ResponseRow),
    status: (raw.status ?? 'new') as ResponseStatus,
    status_label: String(raw.status_label ?? ''),
    assignee: (raw.assignee as PersonRef | null | undefined) ?? null,
    assigned_at: (raw.assigned_at as string | null | undefined) ?? null,
    corrected: Boolean(raw.corrected),
    corrected_at: (raw.corrected_at as string | null | undefined) ?? null,
    source: (raw.source as ResponseRow['source'] | undefined) ?? { type: raw.share_link ? 'link' : 'public', label: (raw.share_link as { label?: string } | null | undefined)?.label ?? null },
    form_version: (raw.form_version as number | null | undefined) ?? null,
    submitter_label: (raw.submitter_label as string | null | undefined) ?? null,
    answers,
  }
}

const zeroCounts = (): Record<ResponseStatus, number> => ({ new: 0, in_review: 0, needs_followup: 0, completed: 0, archived: 0 })

/** One page of the table, filtered and sorted by the server. */
export async function fetchResponses(
  formId: number,
  opts: { page: number; perPage?: number; filters: ResponseFilters; sort?: SortKey; direction?: 'asc' | 'desc' },
): Promise<ResponsesPage> {
  const params = { ...filterParams(opts.filters), page: opts.page, per_page: opts.perPage ?? 20, sort: opts.sort, direction: opts.direction }
  const res = await apiClient.get<unknown>(`${formUrl(formId)}/submissions`, { params, ...OWN_ERRORS })
  const inner = unwrapData<{ data?: RawRecord[]; meta?: { current_page?: number; last_page?: number; total?: number }; status_counts?: Partial<Record<ResponseStatus, number>> }>(res.data)
  const rows = Array.isArray(inner?.data) ? inner.data.map(normalizeRow) : []
  const meta = inner?.meta ?? {}

  return {
    rows,
    currentPage: meta.current_page ?? opts.page,
    lastPage: meta.last_page ?? 1,
    total: meta.total ?? rows.length,
    statusCounts: { ...zeroCounts(), ...(inner?.status_counts ?? {}) },
  }
}

/** What the filter and export controls offer. `version` narrows the export columns to that version's questions. */
export async function fetchResponseOptions(formId: number, version?: number | null): Promise<ResponseOptions> {
  const res = await apiClient.get<unknown>(`${formUrl(formId)}/response-options`, { params: version ? { version } : undefined, ...OWN_ERRORS })
  const raw = unwrapLms<Partial<ResponseOptions>>(res.data)

  return {
    statuses: raw.statuses ?? [],
    versions: raw.versions ?? [],
    links: raw.links ?? [],
    columns: raw.columns ?? [],
    assignees: raw.assignees ?? [],
    assignable: raw.assignable ?? [],
  }
}

export async function fetchResponse(formId: number, id: number): Promise<ResponseDetail> {
  const res = await apiClient.get<unknown>(`${formUrl(formId)}/submissions/${id}`, OWN_ERRORS)
  const raw = unwrapLms<RawRecord>(res.data)
  // Only the response that was asked for counts: anything else is not a usable answer and the caller keeps what it has.
  if (Number(raw?.id) !== id) throw new Error('Unexpected response payload')

  return { ...normalizeRow(raw), abilities: (raw.abilities as ResponseDetail['abilities'] | undefined) ?? { review: false, correct: false } }
}

async function detailFrom(res: { data: unknown }): Promise<ResponseDetail> {
  const raw = unwrapLms<RawRecord>(res.data)

  return { ...normalizeRow(raw), abilities: (raw.abilities as ResponseDetail['abilities'] | undefined) ?? { review: false, correct: false } }
}

export async function changeResponseStatus(formId: number, id: number, status: ResponseStatus): Promise<ResponseDetail> {
  return detailFrom(await apiClient.put<unknown>(`${formUrl(formId)}/submissions/${id}/status`, { status }, OWN_ERRORS))
}

export async function assignResponse(formId: number, id: number, assigneeId: number | null): Promise<ResponseDetail> {
  return detailFrom(await apiClient.put<unknown>(`${formUrl(formId)}/submissions/${id}/assignment`, { assignee_id: assigneeId }, OWN_ERRORS))
}

export async function fetchResponseNotes(formId: number, id: number): Promise<ResponseNote[]> {
  const res = await apiClient.get<unknown>(`${formUrl(formId)}/submissions/${id}/notes`, OWN_ERRORS)
  return unwrapLms<ResponseNote[]>(res.data) ?? []
}

export async function addResponseNote(formId: number, id: number, body: string): Promise<ResponseNote[]> {
  const res = await apiClient.post<unknown>(`${formUrl(formId)}/submissions/${id}/notes`, { body }, OWN_ERRORS)
  return unwrapLms<ResponseNote[]>(res.data) ?? []
}

export async function fetchResponseHistory(formId: number, id: number): Promise<HistoryLine[]> {
  const res = await apiClient.get<unknown>(`${formUrl(formId)}/submissions/${id}/history`, OWN_ERRORS)
  return unwrapLms<HistoryLine[]>(res.data) ?? []
}

/** Corrects answers: question id -> new value. The server keeps the original and records who, when and why. */
export async function correctResponse(
  formId: number,
  id: number,
  corrections: Record<number, string | string[] | null>,
  reason?: string,
): Promise<{ changed: number; response: ResponseDetail }> {
  const res = await apiClient.put<{ changed?: number }>(`${formUrl(formId)}/submissions/${id}/answers`, { corrections, ...(reason?.trim() ? { reason: reason.trim() } : {}) }, OWN_ERRORS)

  return { changed: res.data.changed ?? 0, response: await detailFrom(res) }
}

/** The server's per-question messages for a refused correction, keyed by question id. */
export function responseFieldErrors(error: unknown): Record<number, string> {
  const out: Record<number, string> = {}
  const errors = (error as { response?: { data?: { errors?: Record<string, unknown> } } })?.response?.data?.errors ?? {}
  for (const [key, value] of Object.entries(errors)) {
    const match = /^(?:answers|corrections)\.(\d+)$/.exec(key)
    const message = Array.isArray(value) ? value[0] : value
    if (match && typeof message === 'string') out[Number(match[1])] = message
  }

  return out
}

/** Asks for an export. Small ones come back ready; large ones are built in the background and must be polled. */
export async function createResponseExport(formId: number, body: { format: ExportFormat; columns: string[]; filters: ResponseFilters }): Promise<ExportRecord> {
  const res = await apiClient.post<unknown>(`${formUrl(formId)}/exports`, { format: body.format, columns: body.columns, filters: filterParams(body.filters) }, OWN_ERRORS)
  return unwrapLms<ExportRecord>(res.data)
}

export async function fetchResponseExport(formId: number, exportId: number): Promise<ExportRecord> {
  const res = await apiClient.get<unknown>(`${formUrl(formId)}/exports/${exportId}`, OWN_ERRORS)
  return unwrapLms<ExportRecord>(res.data)
}

/** Fetches the finished file through the authenticated endpoint and hands it to the browser as a download. */
export async function downloadResponseExport(formId: number, exportId: number, fileName: string): Promise<void> {
  const res = await apiClient.get<Blob>(`${formUrl(formId)}/exports/${exportId}/download`, { responseType: 'blob', ...OWN_ERRORS })
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
