import apiClient from './axios'
import { unwrapData } from './unwrap'
import { OWN_ERRORS, bodyOf, firstMessage, normalizeQuestion } from './formsApi'
import type { FormFlow, FormPerson, FormTypeSlug, OpsFormDefinition } from '@/types/operations'

/**
 * Smart Forms Phase 6 client: the template library, using a template, saving a form as a template, and duplicating a form.
 *
 * Templates are identified by a string: `system:<key>` for a built-in template, the number for a saved one. Every call turns the
 * global error toast off (the screens say what went wrong next to the action) and lets the failure propagate.
 */

type RawRecord = Record<string, unknown>

export type TemplateCategory = 'education' | 'feedback' | 'community' | 'hr' | 'finance' | 'partnerships' | 'events' | 'support' | 'general'
export type TemplateVisibility = 'private' | 'department' | 'organization'
export type TemplateSource = 'system' | 'saved'

export const TEMPLATE_CATEGORY_AR: Record<TemplateCategory, string> = {
  education: 'التعليم والدورات',
  feedback: 'التقييم والملاحظات',
  community: 'المجتمع والتطوع',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  partnerships: 'الشراكات',
  events: 'الفعاليات',
  support: 'الدعم والتواصل',
  general: 'عام',
}

export const TEMPLATE_VISIBILITY_AR: Record<TemplateVisibility, string> = {
  private: 'خاص بك',
  department: 'مشترك مع القسم',
  organization: 'متاح للمؤسسة',
}

export type FormTemplateSummary = {
  id: string
  source: TemplateSource
  key: string | null
  name: string
  description: string | null
  category: TemplateCategory
  form_type: FormTypeSlug | null
  /** For a built-in template that overlaps a workflow the platform already runs: where the real work happens. */
  domain_notice: string | null
  visibility: TemplateVisibility
  department: { id: number; name: string } | null
  owner: FormPerson | null
  is_mine?: boolean
  question_count: number
  block_count: number
  uses_count: number | null
  updated_at: string | null
  abilities: { edit: boolean; delete: boolean }
}

export type TemplateDepartment = { id: number; name: string; name_ar?: string | null }

export type TemplateLibrary = {
  templates: FormTemplateSummary[]
  canCreate: boolean
  canShareOrganization: boolean
  departments: TemplateDepartment[]
}

export type TemplateDefinition = {
  title: string
  description: string | null
  type: string | null
  flow: FormFlow | null
  questions: RawRecord[]
}

export type FormTemplateDetail = FormTemplateSummary & { definition: TemplateDefinition }

export type TemplateFilters = { category?: TemplateCategory | null; search?: string; source?: 'system' | 'saved' | 'mine' | null }

const templateUrl = (id: string) => `/operations/form-templates/${encodeURIComponent(id)}`

export async function fetchTemplateLibrary(filters: TemplateFilters = {}): Promise<TemplateLibrary> {
  const params: Record<string, string> = {}
  if (filters.category) params.category = filters.category
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.source) params.source = filters.source
  const res = await apiClient.get<unknown>('/operations/form-templates', { ...OWN_ERRORS, params })
  const body = (res.data ?? {}) as RawRecord
  const meta = (body.meta ?? {}) as RawRecord

  return {
    templates: Array.isArray(body.data) ? (body.data as FormTemplateSummary[]) : [],
    canCreate: meta.can_create === true,
    canShareOrganization: meta.can_share_organization === true,
    departments: Array.isArray(meta.departments) ? (meta.departments as TemplateDepartment[]) : [],
  }
}

export async function fetchTemplate(id: string): Promise<FormTemplateDetail> {
  const res = await apiClient.get<unknown>(templateUrl(id), OWN_ERRORS)
  return unwrapData<FormTemplateDetail>(res.data)
}

/**
 * A template's structure as a form the renderer can show (the preview). Blocks carry their template ref as id, and the rules
 * already name blocks by those refs, so conditional logic works in the preview exactly as it will in the form.
 */
export function templateAsForm(detail: FormTemplateDetail): OpsFormDefinition {
  const d = detail.definition
  return {
    id: 0,
    title: d.title || detail.name,
    description: d.description,
    slug: '',
    form_type: (d.type ?? 'suggestion') as FormTypeSlug,
    flow: d.flow,
    questions: d.questions.map((q, i) => normalizeQuestion({ ...q, id: Number(q.ref ?? -(i + 1)), sort_order: i + 1 })),
  }
}

export type NewFormFromTemplate = { id: number; title: string; status: string }

export async function createFormFromTemplate(id: string, body: { title?: string; department_id?: number | null } = {}): Promise<NewFormFromTemplate> {
  const res = await apiClient.post<unknown>(`${templateUrl(id)}/use`, body, OWN_ERRORS)
  return unwrapData<NewFormFromTemplate>(res.data)
}

export async function duplicateForm(formId: number, body: { title?: string; department_id?: number | null } = {}): Promise<NewFormFromTemplate> {
  const res = await apiClient.post<unknown>(`/operations/forms/${formId}/duplicate`, body, OWN_ERRORS)
  return unwrapData<NewFormFromTemplate>(res.data)
}

export type TemplateInput = {
  name: string
  description?: string | null
  category?: TemplateCategory
  visibility?: TemplateVisibility
  department_id?: number | null
}

export async function saveFormAsTemplate(formId: number, body: TemplateInput): Promise<FormTemplateSummary> {
  const res = await apiClient.post<unknown>('/operations/form-templates', { ...body, form_id: formId }, OWN_ERRORS)
  return unwrapData<FormTemplateSummary>(res.data)
}

export async function updateTemplate(id: string, body: Partial<TemplateInput> & { from_form_id?: number }): Promise<FormTemplateSummary> {
  const res = await apiClient.put<unknown>(templateUrl(id), body, OWN_ERRORS)
  return unwrapData<FormTemplateSummary>(res.data)
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(templateUrl(id), OWN_ERRORS)
}

/** One sentence for a failed template action, and the field messages of a 422. */
export function parseTemplateError(error: unknown): { message: string; fieldErrors: Record<string, string> } {
  const { status, body } = bodyOf(error)
  const fieldErrors: Record<string, string> = {}
  if (status === 422) {
    for (const [key, value] of Object.entries(body.errors ?? {})) {
      const message = firstMessage(value)
      if (message) fieldErrors[key] ??= message
    }
    const first = Object.values(fieldErrors)[0]
    return { message: first ?? 'راجع الحقول وأعد المحاولة.', fieldErrors }
  }
  if (status === 403) return { message: 'لا تملك صلاحية تنفيذ هذا الإجراء.', fieldErrors }
  if (status === 404) return { message: 'القالب أو النموذج غير موجود، أو لم يعد متاحاً لك.', fieldErrors }
  if (status === 429) return { message: 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.', fieldErrors }
  if (status === null) return { message: 'تعذّر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.', fieldErrors }
  return { message: 'حدث خطأ في الخادم. حاول مرة أخرى.', fieldErrors }
}
