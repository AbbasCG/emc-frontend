import axios from 'axios'
import apiClient from '@/api/axios'
import { getApiErrorMessage } from '@/api/apiErrors'
import { unwrapData } from '@/api/unwrap'
import type { Course } from '@/types'

const silent = { skipErrorToast: true as const }

function coerceList(payload: unknown, keys: string[]): unknown[] {
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const o = inner as Record<string, unknown>
    for (const k of keys) {
      const v = o[k]
      if (Array.isArray(v)) return v
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// Admin registrations index (for per-course counts & “new” KPIs)
// ---------------------------------------------------------------------------

export type AdminRegistrationRow = {
  id: number
  course_id: number
  created_at?: string | null
  status?: string | null
}

function normalizeAdminRegistration(raw: unknown): AdminRegistrationRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const nested =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ? (o.course as Record<string, unknown>) : null
  const id = Number(o.id ?? o.registration_id)
  const course_id = Number(o.course_id ?? nested?.id ?? o.courseId)
  if (!Number.isFinite(id) || !Number.isFinite(course_id)) return null
  const created = o.created_at ?? o.registered_at ?? o.enrolled_at ?? o.createdAt
  return {
    id,
    course_id,
    created_at: created != null && String(created).trim() !== '' ? String(created) : null,
    status: o.status != null ? String(o.status) : null,
  }
}

/**
 * Tries common admin / catalog registration list endpoints. Returns [] if none respond.
 */
export async function fetchAdminRegistrationsIndex(): Promise<AdminRegistrationRow[]> {
  const paths = ['/admin/registrations', '/registrations']
  for (const path of paths) {
    try {
      const res = await apiClient.get<unknown>(path, silent)
      const rows = coerceList(res.data, ['data', 'registrations', 'items']).map(normalizeAdminRegistration).filter(
        (x): x is AdminRegistrationRow => x != null,
      )
      if (rows.length > 0 || paths.indexOf(path) === paths.length - 1) return rows
    } catch {
      /* try next */
    }
  }
  return []
}

export function countRegistrationsByCourse(rows: AdminRegistrationRow[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const r of rows) {
    m.set(r.course_id, (m.get(r.course_id) ?? 0) + 1)
  }
  return m
}

/** Registrations created in the last `days` (requires parseable created_at). */
export function countNewRegistrations(rows: AdminRegistrationRow[], days = 7): number {
  const cutoff = Date.now() - days * 86_400_000
  let n = 0
  for (const r of rows) {
    if (!r.created_at) continue
    const t = Date.parse(r.created_at)
    if (Number.isFinite(t) && t >= cutoff) n += 1
  }
  return n
}

// ---------------------------------------------------------------------------
// Course upsert + instructor assignment (multiple backend conventions)
// ---------------------------------------------------------------------------

/** Payload for POST/PUT /api/admin/courses — field names match Laravel AdminCourseController validation */
export type CourseUpsertPayload = {
  title: string
  slug?: string
  description?: string
  short_description?: string
  type: 'free' | 'paid'
  price?: number | string
  is_free?: boolean
  is_online?: boolean
  location?: string | null
  capacity?: number | null
  status?: 'draft' | 'published' | 'archived' | string | null
  registration_open?: boolean
  start_date?: string | null
  end_date?: string | null
  study_time?: string | null
  study_days?: string | null
  meeting_link?: string | null
  location_type?: string | null
  instructor_id?: number | null
  track_id?: number | null
  department_id?: number | null
  program_type?: 'course' | 'workshop' | 'one_session' | 'full_program' | null
  course_image?: string | null
  duration?: string | null
  training_hours?: number | null
  target_audience?: string | null
  language?: string | null
  level?: string | null
  certificate?: string | null
  end_time?: string | null
  learning_outcomes?: string[]
  requirements?: string[]
  curriculum_topics?: string[]
  keywords?: string[]
  notes?: string | null
  /** Laravel may expect this alias alongside `location_type` */
  delivery_type?: string | null
  start_time?: string | null
  /** Related titles — plain strings; persisted as course_features rows on backend */
  features?: string[]
}

function unwrapCourse(res: unknown): Course {
  const data = unwrapData<unknown>(res)
  return (data && typeof data === 'object' ? data : res) as Course
}

async function firstSuccessfulCourseRequest(
  builders: Array<() => Promise<{ data: unknown }>>,
): Promise<Course> {
  let lastErr: unknown
  for (const b of builders) {
    try {
      const res = await b()
      return unwrapCourse(res.data)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(getApiErrorMessage(lastErr))
}

function appendScalar(fd: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return
  if (typeof value === 'boolean') {
    fd.append(key, value ? '1' : '0')
    return
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    fd.append(key, String(value))
    return
  }
  if (typeof value === 'string') {
    if (value === '') return
    fd.append(key, value)
  }
}

function appendStringArray(fd: FormData, key: string, values: string[] | undefined) {
  if (!values?.length) return
  values.forEach((item, i) => {
    if (item.trim()) fd.append(`${key}[${i}]`, item)
  })
}

const ARRAY_KEYS_KEEP_EMPTY = new Set([
  'features',
  'learning_outcomes',
  'requirements',
  'curriculum_topics',
  'keywords',
])

/**
 * Remove null/undefined, empty strings, and empty arrays (except known list fields) so Laravel receives clean input.
 */
export function sanitizeCoursePayload(payload: CourseUpsertPayload): CourseUpsertPayload {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload) as [keyof CourseUpsertPayload, unknown][]) {
    if (v === undefined) continue
    if (v === null) continue
    if (typeof v === 'string' && v.trim() === '') continue
    if (Array.isArray(v) && v.length === 0 && !ARRAY_KEYS_KEEP_EMPTY.has(k as string)) continue
    out[k as string] = v
  }
  return out as CourseUpsertPayload
}

function courseToFormData(payload: CourseUpsertPayload, imageFile?: File | null): FormData {
  const fd = new FormData()
  const { features, learning_outcomes, requirements, curriculum_topics, keywords, ...rest } = payload
  const flat = rest as Record<string, unknown>
  for (const [key, value] of Object.entries(flat)) {
    if (key === 'course_image' && imageFile) continue
    appendScalar(fd, key, value)
  }
  appendStringArray(fd, 'features', features)
  appendStringArray(fd, 'learning_outcomes', learning_outcomes)
  appendStringArray(fd, 'requirements', requirements)
  appendStringArray(fd, 'curriculum_topics', curriculum_topics)
  appendStringArray(fd, 'keywords', keywords)
  if (imageFile) {
    fd.append('course_image', imageFile)
  }
  return fd
}

export type UpsertCourseOptions = {
  /** Send as multipart — use when uploading a cover image file */
  imageFile?: File | null
}

/** Create or update a course/program/workshop row. JSON by default; multipart when `imageFile` is set. */
export async function upsertCourse(
  payload: CourseUpsertPayload,
  courseId?: number,
  options?: UpsertCourseOptions,
): Promise<Course> {
  const imageFile = options?.imageFile ?? null
  const enriched: CourseUpsertPayload = {
    ...payload,
    delivery_type: payload.delivery_type ?? payload.location_type ?? null,
  }
  const body = sanitizeCoursePayload(enriched)

  if (imageFile) {
    const fd = courseToFormData(body, imageFile)
    if (courseId != null) {
      fd.append('_method', 'PUT')
      return firstSuccessfulCourseRequest([
        () => apiClient.post<unknown>(`/admin/courses/${courseId}`, fd),
        () => apiClient.post<unknown>(`/courses/${courseId}`, fd),
      ])
    }
    return firstSuccessfulCourseRequest([
      () => apiClient.post<unknown>('/admin/courses', fd),
      () => apiClient.post<unknown>('/courses', fd),
    ])
  }

  if (courseId != null) {
    return firstSuccessfulCourseRequest([
      () => apiClient.put<unknown>(`/admin/courses/${courseId}`, body),
      () => apiClient.patch<unknown>(`/admin/courses/${courseId}`, body),
      () => apiClient.put<unknown>(`/courses/${courseId}`, body),
      () => apiClient.patch<unknown>(`/courses/${courseId}`, body),
    ])
  }
  return firstSuccessfulCourseRequest([
    () => apiClient.post<unknown>('/admin/courses', body),
    () => apiClient.post<unknown>('/courses', body),
  ])
}

export async function deleteCourse(courseId: number): Promise<void> {
  const attempts = [() => apiClient.delete(`/admin/courses/${courseId}`), () => apiClient.delete(`/courses/${courseId}`)]
  let last: unknown
  for (const run of attempts) {
    try {
      await run()
      return
    } catch (e) {
      last = e
    }
  }
  throw last instanceof Error ? last : new Error(getApiErrorMessage(last))
}

/**
 * Attach `instructors.id` to a course (`courses.instructor_id`).
 * Prefer dedicated admin route — attempts are silent so Axios does not toast each 404/405 while probing fallbacks.
 */
export async function assignInstructorToCourse(courseId: number, instructorId: number): Promise<void> {
  const body = { instructor_id: instructorId }
  /** No trailing slashes; only admin-scoped URLs (avoid public `/courses/` which triggers wrong handlers / 405 toasts). */
  const attempts: Array<() => Promise<unknown>> = [
    () => apiClient.post(`/admin/courses/${courseId}/assign-instructor`, body, silent),
    () => apiClient.patch(`/admin/courses/${courseId}`, body, silent),
    () => apiClient.put(`/admin/courses/${courseId}`, body, silent),
    () => apiClient.post(`/admin/courses/${courseId}/instructor`, body, silent),
  ]
  let last: unknown
  for (const run of attempts) {
    try {
      await run()
      return
    } catch (e) {
      last = e
      if (axios.isAxiosError(e)) {
        // eslint-disable-next-line no-console -- temporary: identify failing URLs from Network / console
        console.log(e.config?.method, e.config?.url, e.response?.status, e.response?.data)
      }
    }
  }
  throw last instanceof Error ? last : new Error(getApiErrorMessage(last))
}

export async function patchCourseSchedule(
  courseId: number,
  body: {
    start_date?: string | null
    end_date?: string | null
    study_time?: string | null
    meeting_link?: string | null
  },
): Promise<Course> {
  return firstSuccessfulCourseRequest([
    () => apiClient.patch<unknown>(`/admin/courses/${courseId}`, body),
    () => apiClient.put<unknown>(`/admin/courses/${courseId}`, body),
    () => apiClient.patch<unknown>(`/courses/${courseId}`, body),
  ])
}

export async function patchCoursePublishState(courseId: number, isPublished: boolean): Promise<Course> {
  return firstSuccessfulCourseRequest([
    () => apiClient.patch<unknown>(`/admin/courses/${courseId}`, { is_published: isPublished, status: isPublished ? 'published' : 'draft' }),
    () => apiClient.patch<unknown>(`/courses/${courseId}`, { is_published: isPublished, status: isPublished ? 'published' : 'draft' }),
  ])
}

// ---------------------------------------------------------------------------
// Departments (for form select)
// ---------------------------------------------------------------------------

export type OpsDepartmentOption = { id: number; name: string }

export async function fetchDepartmentOptions(): Promise<OpsDepartmentOption[]> {
  try {
    const res = await apiClient.get<unknown>('/operations/departments', silent)
    const list = coerceList(res.data, ['data', 'departments', 'items'])
    const out: OpsDepartmentOption[] = []
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const o = raw as Record<string, unknown>
      const id = Number(o.id)
      if (!Number.isFinite(id)) continue
      const name = String(o.name ?? o.title ?? o.slug ?? `إدارة ${id}`)
      out.push({ id, name })
    }
    return out
  } catch {
    return []
  }
}
