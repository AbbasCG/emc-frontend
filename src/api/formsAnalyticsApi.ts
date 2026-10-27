import apiClient from './axios'
import { unwrapData } from './unwrap'
import { OWN_ERRORS, bodyOf } from './formsApi'
import type { FormStatus } from '@/types/operations'

/**
 * Smart Forms Phase 7 client: a form's analytics, its CSV summary, and the overview across forms.
 *
 * Every number comes from the server, computed from stored responses over the same filters as the response table. Nothing is
 * derived here except formatting. A figure the platform cannot measure arrives as null and is shown as "not measurable".
 */

type RawRecord = Record<string, unknown>

export type AnalyticsFilters = {
  from?: string
  to?: string
  status?: string[]
  version?: number
  source?: 'public' | 'link'
}

export type ChoiceOption = { value: string; label: string; count: number; percent: number | null; retired?: boolean }

export type QuestionStats =
  | { kind: 'choice'; multiple?: boolean; options: ChoiceOption[] }
  | {
      kind: 'numeric'
      count: number
      average: number | null
      min: number | null
      max: number | null
      scale: { min: number; max: number } | null
      distribution: { value: string; count: number; percent: number | null }[] | null
    }
  | { kind: 'range'; earliest: string | null; latest: string | null }
  | { kind: 'count' | 'consent' | 'files' }

export type QuestionAnalytics = {
  id: number
  label: string
  type: string
  removed: boolean
  answered: number
  eligible: number
  answer_rate: number | null
  stats: QuestionStats
}

export type FormAnalytics = {
  timezone: string
  totals: {
    responses: number
    signed_in: number
    anonymous: number
    via_share_link: number
    first_response_at: string | null
    last_response_at: string | null
    by_status: Record<string, number>
  }
  completion: { rate: number | null; reason: string; note: string }
  series: { granularity: 'day' | 'week' | 'month'; points: { period: string; count: number }[] }
  comparison: { current: number; previous: number; previous_from: string; previous_to: string; change_percent: number | null } | null
  questions: QuestionAnalytics[]
}

export type AnalyticsOverviewRow = {
  id: number
  title: string
  status: FormStatus
  department: { id: number; name: string } | null
  responses: number
  open: number
  last_response_at: string | null
}

export type AnalyticsOverview = {
  totals: { forms: number; active_forms: number; responses: number; open: number }
  forms: AnalyticsOverviewRow[]
  departments: { id: number; name: string; name_ar?: string | null }[]
}

/** The query string the server reads: statuses as a comma list, empty filters left out. */
export function analyticsParams(filters: AnalyticsFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.status && filters.status.length > 0) params.status = filters.status.join(',')
  if (filters.version) params.version = String(filters.version)
  if (filters.source) params.source = filters.source

  return params
}

export async function fetchFormAnalytics(formId: number, filters: AnalyticsFilters = {}): Promise<FormAnalytics> {
  const res = await apiClient.get<unknown>(`/operations/forms/${formId}/analytics`, { ...OWN_ERRORS, params: analyticsParams(filters) })
  return unwrapData<FormAnalytics>(res.data)
}

/** The summary as a CSV file, saved through the browser. */
export async function downloadFormAnalyticsCsv(formId: number, filters: AnalyticsFilters = {}): Promise<void> {
  const res = await apiClient.get<Blob>(`/operations/forms/${formId}/analytics/export`, { ...OWN_ERRORS, params: analyticsParams(filters), responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `form-${formId}-analytics.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function fetchAnalyticsOverview(filters: { department_id?: number | null; from?: string; to?: string } = {}): Promise<AnalyticsOverview> {
  const params: Record<string, string> = {}
  if (filters.department_id) params.department_id = String(filters.department_id)
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  const res = await apiClient.get<unknown>('/operations/form-analytics/overview', { ...OWN_ERRORS, params })
  const body = (res.data ?? {}) as RawRecord
  const data = (body.data ?? {}) as Omit<AnalyticsOverview, 'departments'>
  const meta = (body.meta ?? {}) as RawRecord

  return { totals: data.totals, forms: data.forms ?? [], departments: Array.isArray(meta.departments) ? (meta.departments as AnalyticsOverview['departments']) : [] }
}

export function parseAnalyticsError(error: unknown): string {
  const { status } = bodyOf(error)
  if (status === 403) return 'لا تملك صلاحية الاطلاع على ردود هذا النموذج، ولذلك لا تظهر تحليلاته.'
  if (status === 404) return 'النموذج غير موجود أو حُذف.'
  if (status === 422) return 'المرشحات غير صالحة. تأكد من أن تاريخ النهاية لا يسبق تاريخ البداية.'
  if (status === 429) return 'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.'
  if (status === null) return 'تعذّر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.'
  return 'تعذّر تحميل التحليلات. حاول مرة أخرى.'
}
