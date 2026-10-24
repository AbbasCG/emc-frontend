import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { unwrapData } from './unwrap'
import { OWN_ERRORS, bodyOf, firstMessage, normalizeForm, normalizeQuestion } from './formsApi'
import type {
  FormActivityRow,
  FormCollaboratorLevel,
  FormCollaboratorRow,
  FormEmployee,
  FormResponsesVisibility,
  FormVersionDetail,
  FormVersionRow,
  FormVisibility,
  OpsFormDefinition,
  PagedRows,
} from '@/types/operations'

/**
 * Forms Phase 1 client: publishing and status, availability settings, ownership, versions, collaborators and history.
 *
 * Every call turns the global error toast off (the screens show the reason next to the action) and lets the failure
 * propagate. `parseFormActionError` turns one into a sentence.
 */

type RawRecord = Record<string, unknown>

const formUrl = (id: number) => `/operations/forms/${id}`

async function postForm(id: number, path: string, body?: Record<string, unknown>): Promise<OpsFormDefinition> {
  const res = await apiClient.post<unknown>(`${formUrl(id)}${path}`, body ?? {}, OWN_ERRORS)
  return normalizeForm(unwrapLms<RawRecord>(res.data))
}

/** Freezes the draft into a new version and makes it the one respondents see. */
export const publishForm = (id: number, note?: string) => postForm(id, '/publish', note ? { note } : {})
export const closeForm = (id: number) => postForm(id, '/close')
/** Reopens a closed form on the version it already has; unpublished edits stay in the draft. */
export const reopenForm = (id: number) => postForm(id, '/reopen')
export const unpublishForm = (id: number) => postForm(id, '/unpublish')
export const archiveForm = (id: number) => postForm(id, '/archive')
export const unarchiveForm = (id: number) => postForm(id, '/unarchive')

/** The draft as a respondent would see it. Nothing is stored. */
export async function previewForm(id: number): Promise<OpsFormDefinition> {
  const res = await apiClient.get<unknown>(`${formUrl(id)}/preview`, OWN_ERRORS)
  return normalizeForm(unwrapLms<RawRecord>(res.data))
}

export type FormSettingsPatch = Partial<{
  visibility: FormVisibility
  responses_visibility: FormResponsesVisibility
  opens_at: string | null
  closes_at: string | null
  max_submissions: number | null
  per_respondent_limit: number | null
  allow_anonymous: boolean
}>

export async function updateFormSettings(id: number, body: FormSettingsPatch): Promise<OpsFormDefinition> {
  const res = await apiClient.put<unknown>(`${formUrl(id)}/settings`, body, OWN_ERRORS)
  return normalizeForm(unwrapLms<RawRecord>(res.data))
}

export type OwnershipTransfer = { owner_id: number; keep_access?: 'none' | FormCollaboratorLevel; keep_responses?: boolean }

/** `accessRemoved` is true when the previous owner no longer has any access, so nothing about the form comes back. */
export async function transferFormOwnership(
  id: number,
  body: OwnershipTransfer,
): Promise<{ accessRemoved: true } | { accessRemoved: false; form: OpsFormDefinition }> {
  const res = await apiClient.post<unknown>(`${formUrl(id)}/ownership`, body, OWN_ERRORS)
  const data = unwrapLms<RawRecord>(res.data)

  return data.access_removed === true ? { accessRemoved: true } : { accessRemoved: false, form: normalizeForm(data) }
}

type PagedBody<T> = { data?: T[]; meta?: { current_page?: number; last_page?: number; total?: number } }

function pagedRows<T>(payload: unknown, page: number): PagedRows<T> {
  const inner = unwrapData<PagedBody<T>>(payload)
  const rows = Array.isArray(inner?.data) ? inner.data : []
  const meta = inner?.meta ?? {}

  return { rows, currentPage: meta.current_page ?? page, lastPage: meta.last_page ?? 1, total: meta.total ?? rows.length }
}

export async function fetchFormVersions(id: number, page = 1): Promise<PagedRows<FormVersionRow>> {
  const res = await apiClient.get<unknown>(`${formUrl(id)}/versions`, { params: { page }, ...OWN_ERRORS })
  return pagedRows<FormVersionRow>(res.data, page)
}

export async function fetchFormVersion(id: number, versionId: number): Promise<FormVersionDetail> {
  const res = await apiClient.get<unknown>(`${formUrl(id)}/versions/${versionId}`, OWN_ERRORS)
  const raw = unwrapLms<RawRecord>(res.data)
  const questions = Array.isArray(raw.questions) ? (raw.questions as RawRecord[]).map(normalizeQuestion) : []

  return { ...(raw as unknown as FormVersionDetail), questions }
}

/** Rebuilds the DRAFT from an old version. Nothing is published and no version or answer changes. */
export const restoreFormVersion = (id: number, versionId: number) => postForm(id, `/versions/${versionId}/restore`)

export async function fetchFormCollaborators(id: number): Promise<FormCollaboratorRow[]> {
  const res = await apiClient.get<unknown>(`${formUrl(id)}/collaborators`, OWN_ERRORS)
  return asList<FormCollaboratorRow>(res.data)
}

/** Employees who could still be added, found by name (two characters or more). */
export async function searchFormCollaboratorCandidates(id: number, query: string): Promise<FormEmployee[]> {
  const res = await apiClient.get<unknown>(`${formUrl(id)}/collaborator-candidates`, { params: { q: query }, ...OWN_ERRORS })
  return asList<FormEmployee>(res.data)
}

export async function addFormCollaborator(
  id: number,
  body: { user_id: number; access_level: FormCollaboratorLevel; can_view_responses: boolean; can_correct_responses?: boolean },
): Promise<FormCollaboratorRow> {
  const res = await apiClient.post<unknown>(`${formUrl(id)}/collaborators`, body, OWN_ERRORS)
  return unwrapLms<FormCollaboratorRow>(res.data)
}

export async function updateFormCollaborator(
  id: number,
  collaboratorId: number,
  body: { access_level: FormCollaboratorLevel; can_view_responses: boolean; can_correct_responses?: boolean },
): Promise<FormCollaboratorRow> {
  const res = await apiClient.put<unknown>(`${formUrl(id)}/collaborators/${collaboratorId}`, body, OWN_ERRORS)
  return unwrapLms<FormCollaboratorRow>(res.data)
}

export async function removeFormCollaborator(id: number, collaboratorId: number): Promise<void> {
  await apiClient.delete(`${formUrl(id)}/collaborators/${collaboratorId}`, OWN_ERRORS)
}

export async function fetchFormActivity(id: number, page = 1): Promise<PagedRows<FormActivityRow>> {
  const res = await apiClient.get<unknown>(`${formUrl(id)}/activity`, { params: { page }, ...OWN_ERRORS })
  return pagedRows<FormActivityRow>(res.data, page)
}

/** One readable sentence for a failed publish / close / share / restore, from what the server said. */
export function parseFormActionError(error: unknown): string {
  const { status, body } = bodyOf(error)
  if (status === 422) {
    for (const value of Object.values(body.errors ?? {})) {
      const message = firstMessage(value)
      if (message) return message
    }
    return 'تعذّر تنفيذ العملية. راجع البيانات وأعد المحاولة.'
  }
  if (status === 403) return 'لا تملك صلاحية تنفيذ هذه العملية على هذا النموذج.'
  if (status === 404) return 'النموذج أو العنصر المطلوب غير موجود أو حُذف.'
  if (status === 429) return 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.'
  if (status === null) return 'تعذّر الاتصال بالخادم. لم تتم العملية، تحقق من الاتصال وأعد المحاولة.'

  return 'حدث خطأ في الخادم. لم تتم العملية، حاول مرة أخرى.'
}
