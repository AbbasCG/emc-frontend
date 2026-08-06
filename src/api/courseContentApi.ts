import apiClient from './axios'

/* ══════════════════════════════════════════════════════════════════
   TYPES — canonical shapes for instructor course-content management.
   Course content (modules/lessons) is COURSE-GLOBAL, not class-owned —
   the backend InstructorCourseContentController operates on
   /instructor/courses/{course}/... routes, never /classes/{group}/...
   Callers must derive course_id from the already-loaded class detail
   and never imply modules/lessons belong to a specific class.
══════════════════════════════════════════════════════════════════ */

export const CONTENT_STATUS_VALUES = ['active', 'inactive', 'draft'] as const
export type ContentStatus = (typeof CONTENT_STATUS_VALUES)[number]

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  draft: 'مسودة',
}

export type CourseModuleRow = {
  id: number
  course_id: number
  title: string
  description: string | null
  status: ContentStatus
  sort_order: number
  is_active: boolean | null
  lessons_count?: number
  lessons?: LessonRow[]
}

export type LessonRow = {
  id: number
  module_id: number
  title: string
  description: string | null
  content: string | null
  video_url: string | null
  duration_minutes: number | null
  status: ContentStatus
  sort_order: number
}

export type ValidationErrors = Record<string, string[]>

class ApiFieldError extends Error {
  errors: ValidationErrors
  constructor(errors: ValidationErrors) {
    super('Validation failed')
    this.errors = errors
  }
}

export function fieldErrorsFrom(err: unknown): ValidationErrors | null {
  const res = (err as { response?: { status?: number; data?: { errors?: ValidationErrors } } })?.response
  if (res?.status === 422 && res.data?.errors) return res.data.errors
  return null
}

async function withFieldErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const errors = fieldErrorsFrom(err)
    if (errors) throw new ApiFieldError(errors)
    throw err
  }
}

export { ApiFieldError }

/* ── Modules ─────────────────────────────────────────────────────── */

export async function fetchCourseModules(courseId: number): Promise<CourseModuleRow[]> {
  const res = await apiClient.get<{ data: CourseModuleRow[] }>(`/instructor/courses/${courseId}/modules`, { params: { skipErrorToast: true } })
  return res.data.data ?? []
}

export async function createCourseModule(courseId: number, payload: { title: string; description?: string; status?: ContentStatus }): Promise<CourseModuleRow> {
  return withFieldErrors(async () => {
    const res = await apiClient.post<{ data: CourseModuleRow }>(`/instructor/courses/${courseId}/modules`, payload)
    return res.data.data
  })
}

export async function updateCourseModule(moduleId: number, payload: Partial<{ title: string; description: string; status: ContentStatus }>): Promise<CourseModuleRow> {
  return withFieldErrors(async () => {
    const res = await apiClient.put<{ data: CourseModuleRow }>(`/instructor/modules/${moduleId}`, payload)
    return res.data.data
  })
}

export async function deleteCourseModule(moduleId: number): Promise<void> {
  await apiClient.delete(`/instructor/modules/${moduleId}`)
}

export async function reorderCourseModules(courseId: number, orderedIds: number[]): Promise<void> {
  await withFieldErrors(() => apiClient.post(`/instructor/courses/${courseId}/modules/reorder`, { ids: orderedIds }))
}

/* ── Lessons ─────────────────────────────────────────────────────── */

/** Modules already return nested lessons (indexModules() eager-loads them) — no separate endpoint needed. */
export async function fetchLessons(courseId: number, moduleId?: number): Promise<LessonRow[]> {
  const modules = await fetchCourseModules(courseId)
  const all = modules.flatMap((m) => m.lessons ?? [])
  return moduleId ? all.filter((l) => l.module_id === moduleId) : all
}

export async function createLesson(courseId: number, payload: { module_id: number; title: string; description?: string; video_url?: string; duration_minutes?: number; status?: ContentStatus }): Promise<LessonRow> {
  return withFieldErrors(async () => {
    const res = await apiClient.post<{ data: LessonRow }>(`/instructor/courses/${courseId}/lessons`, payload)
    return res.data.data
  })
}

export async function updateLesson(lessonId: number, payload: Partial<{ title: string; description: string; video_url: string; duration_minutes: number; status: ContentStatus }>): Promise<LessonRow> {
  return withFieldErrors(async () => {
    const res = await apiClient.put<{ data: LessonRow }>(`/instructor/lessons/${lessonId}`, payload)
    return res.data.data
  })
}

export async function deleteLesson(lessonId: number): Promise<void> {
  await apiClient.delete(`/instructor/lessons/${lessonId}`)
}

export async function reorderLessons(courseId: number, moduleId: number, orderedIds: number[]): Promise<void> {
  await withFieldErrors(() => apiClient.post(`/instructor/courses/${courseId}/modules/${moduleId}/lessons/reorder`, { ids: orderedIds }))
}

/* ── Materials ───────────────────────────────────────────────────── */

export type MaterialScope = 'course' | 'module' | 'lesson' | 'session' | 'class'

export const MATERIAL_SCOPE_LABELS: Record<MaterialScope, string> = {
  course: 'على مستوى الدورة',
  module: 'مرتبط بالوحدة',
  lesson: 'مرتبط بالدرس',
  session: 'مرتبط بالجلسة',
  class: 'خاص بالصف',
}

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  document: 'مستند', pdf: 'ملف PDF', image: 'صورة', video: 'فيديو',
  link: 'رابط', file: 'ملف', slides: 'عرض تقديمي', audio: 'صوت', other: 'أخرى',
}

export type CourseMaterialRow = {
  id: number
  course_id: number
  class_group_id: number | null
  module_id: number | null
  lesson_id: number | null
  session_id: number | null
  course_session_id: number | null
  title: string
  description: string | null
  type: string
  mime_type: string | null
  original_filename: string | null
  size_human: string | null
  is_visible: boolean
  sort_order: number
  scope: MaterialScope
  preview_url: string | null
  download_url: string | null
  external_url: string | null
}

export async function fetchCourseMaterials(courseId: number): Promise<CourseMaterialRow[]> {
  const res = await apiClient.get<{ data: CourseMaterialRow[] }>(`/instructor/courses/${courseId}/materials`, { params: { skipErrorToast: true } })
  return res.data.data ?? []
}

export type CourseMaterialPayload = {
  title: string
  description?: string
  type?: string
  is_visible?: boolean
  module_id?: number | null
  lesson_id?: number | null
  class_group_id?: number | null
  session_id?: number | null
  course_session_id?: number | null
  external_url?: string
  file?: File
}

export function toMaterialFormData(payload: CourseMaterialPayload): FormData {
  const fd = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return // never send empty strings as FK ids
    if (key === 'file' && value instanceof File) {
      fd.append('file', value)
    } else if (typeof value === 'boolean') {
      fd.append(key, value ? '1' : '0')
    } else {
      fd.append(key, String(value))
    }
  })
  return fd
}

export async function createCourseMaterial(courseId: number, payload: CourseMaterialPayload): Promise<CourseMaterialRow> {
  return withFieldErrors(async () => {
    const res = await apiClient.post<{ data: CourseMaterialRow }>(`/instructor/courses/${courseId}/materials`, toMaterialFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  })
}

export async function updateCourseMaterial(materialId: number, payload: Partial<CourseMaterialPayload>): Promise<CourseMaterialRow> {
  return withFieldErrors(async () => {
    const fd = toMaterialFormData(payload as CourseMaterialPayload)
    fd.append('_method', 'PUT')
    const res = await apiClient.post<{ data: CourseMaterialRow }>(`/instructor/materials/${materialId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  })
}

export async function deleteCourseMaterial(materialId: number): Promise<void> {
  await apiClient.delete(`/instructor/materials/${materialId}`)
}

async function downloadAuthenticatedBlob(url: string, filename: string): Promise<void> {
  const res = await apiClient.get(url, { responseType: 'blob' } as Record<string, unknown>)
  const blobUrl = URL.createObjectURL(new Blob([res.data as BlobPart]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}

export async function downloadCourseMaterial(material: CourseMaterialRow): Promise<void> {
  await downloadAuthenticatedBlob(`/materials/${material.id}/download`, material.original_filename ?? material.title)
}

/** Returns a short-lived, authenticated object URL — caller must revoke it (URL.revokeObjectURL) after use. */
export async function fetchAuthenticatedPreviewBlobUrl(materialId: number, kind: 'preview' | 'stream'): Promise<string> {
  const res = await apiClient.get(`/materials/${materialId}/${kind}`, { responseType: 'blob' } as Record<string, unknown>)
  return URL.createObjectURL(new Blob([res.data as BlobPart]))
}

/* ── Curriculum analytics ────────────────────────────────────────── */

export type CurriculumAnalyticsSummary = {
  eligible_students: number
  not_started_students: number
  in_progress_students: number
  completed_students: number
  average_course_progress_percentage: number
  modules_count: number
  lessons_count: number
  materials_count: number
  downloads_count: number
  previews_count: number
  streams_count: number
}

export type CurriculumAnalyticsModuleRow = {
  id: number; title: string; eligible_lessons: number
  completed_student_lessons: number; possible_student_lessons: number; completion_percentage: number
}

export type CurriculumAnalyticsLessonRow = {
  id: number; module_id: number; title: string
  eligible_students: number; completed_students: number; completion_percentage: number
}

export type CurriculumAnalyticsMaterialRow = {
  id: number; title: string; scope: MaterialScope
  downloads_count: number; previews_count: number; streams_count: number; total_interactions: number
}

export type CurriculumAnalytics = {
  summary: CurriculumAnalyticsSummary
  modules: CurriculumAnalyticsModuleRow[]
  lessons: CurriculumAnalyticsLessonRow[]
  materials: CurriculumAnalyticsMaterialRow[]
}

export async function fetchCurriculumAnalytics(groupId: number): Promise<CurriculumAnalytics> {
  const res = await apiClient.get<{ data: CurriculumAnalytics }>(`/instructor/classes/${groupId}/curriculum/analytics`, { params: { skipErrorToast: true } })
  return res.data.data
}

/* ── Pure helpers (extracted for direct unit testing, zero behavior change) ── */

/** Lessons belonging to the selected module, or [] if no module/module not found. */
export function filterLessonsForModule(modules: CourseModuleRow[], moduleId: number | ''): LessonRow[] {
  if (!moduleId) return []
  const mod = modules.find((m) => m.id === moduleId)
  return mod?.lessons ?? []
}

/**
 * Given a module change, returns the lessonId that should remain selected —
 * '' if the current lesson doesn't belong to the newly selected module.
 */
export function resolveLessonAfterModuleChange(modules: CourseModuleRow[], newModuleId: number | '', currentLessonId: number | ''): number | '' {
  const newMod = modules.find((m) => m.id === newModuleId)
  if (!newMod?.lessons?.some((l) => l.id === currentLessonId)) return ''
  return currentLessonId
}

export type MaterialScopeChoice = 'course' | 'module' | 'lesson' | 'class'

/**
 * Maps a UI scope choice to the real FK payload the backend expects.
 * Course-wide scope NEVER silently attaches class_group_id — only the
 * explicit 'class' choice does.
 */
export function resolveMaterialScopePayload(
  scopeChoice: MaterialScopeChoice,
  moduleId: number | '',
  lessonId: number | '',
  classGroupId: number,
): Pick<CourseMaterialPayload, 'module_id' | 'lesson_id' | 'class_group_id'> {
  return {
    module_id: scopeChoice === 'module' || scopeChoice === 'lesson' ? (moduleId || null) : null,
    lesson_id: scopeChoice === 'lesson' ? (lessonId || null) : null,
    class_group_id: scopeChoice === 'class' ? classGroupId : null,
  }
}

/** Inverse of resolveMaterialScopePayload — derives the UI scope choice from a saved material. */
export function scopeChoiceFromMaterial(m: Pick<CourseMaterialRow, 'class_group_id' | 'lesson_id' | 'module_id'>): MaterialScopeChoice {
  if (m.class_group_id) return 'class'
  if (m.lesson_id) return 'lesson'
  if (m.module_id) return 'module'
  return 'course'
}
