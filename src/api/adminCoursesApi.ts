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

export type CourseUpsertPayload = {
  title: string
  slug?: string
  description?: string
  short_description?: string
  type: 'free' | 'paid'
  price?: number | string
  is_online?: boolean
  location?: string | null
  capacity?: number | null
  status?: string | null
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
  /** دورة | ورشة | برنامج | مسار — stored as backend expects */
  program_kind?: string | null
  is_published?: boolean
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

/** Create or update a course/program/workshop row. Tries /admin/courses then /courses. */
export async function upsertCourse(payload: CourseUpsertPayload, courseId?: number): Promise<Course> {
  const body = { ...payload }
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

export async function assignInstructorToCourse(courseId: number, instructorUserId: number): Promise<void> {
  const body = { instructor_id: instructorUserId }
  const attempts = [
    () => apiClient.patch(`/courses/${courseId}`, body),
    () => apiClient.put(`/courses/${courseId}`, body),
    () => apiClient.post(`/admin/courses/${courseId}/assign-instructor`, body),
    () => apiClient.post(`/courses/${courseId}/instructor`, body),
    () => apiClient.patch(`/admin/courses/${courseId}`, body),
  ]
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
