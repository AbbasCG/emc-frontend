import axios from 'axios'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

const FORBIDDEN_PATHS_MSG = 'لا تملك صلاحية عرض مسارات التعلّم.'
const FORBIDDEN_PATH_MSG = 'لا تملك صلاحية عرض هذا المسار.'
const FORBIDDEN_STUDENT_PATH_MSG = 'لا يمكنك الوصول إلى هذا المسار التعليمي.'

function axiosStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined
}

function axiosMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback
  const msg = err.response?.data
  if (msg && typeof msg === 'object' && 'message' in msg && msg.message) {
    return String(msg.message)
  }
  return fallback
}

/** Drop duplicate path rows while preserving API order. */
export function dedupeLearningPaths(paths: LearningPath[]): LearningPath[] {
  const seen = new Set<number>()
  const out: LearningPath[] = []
  for (const p of paths) {
    if (!Number.isFinite(p.id) || p.id <= 0) continue
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

/** Parse instructor list payload — never merge with public/catalog data. */
export function parseInstructorLearningPathList(payload: unknown): LearningPath[] {
  const unwrapped = unwrapData<unknown>(payload)
  if (Array.isArray(unwrapped)) return unwrapped as LearningPath[]
  if (unwrapped && typeof unwrapped === 'object') {
    const o = unwrapped as Record<string, unknown>
    for (const key of ['data', 'paths', 'learning_paths', 'items']) {
      const v = o[key]
      if (Array.isArray(v)) return v as LearningPath[]
    }
  }
  if (payload && typeof payload === 'object') {
    const raw = payload as Record<string, unknown>
    if (Array.isArray(raw.data)) return raw.data as LearningPath[]
  }
  return []
}

/** Keep only paths assigned to the signed-in instructor user (when metadata is present). */
export function filterPathsForInstructorUser(paths: LearningPath[], userId?: number | null): LearningPath[] {
  if (!userId) return paths
  return paths.filter((p) => {
    const instructorUserId = p.instructor?.user_id
    if (instructorUserId == null) return true
    return instructorUserId === userId
  })
}

export type InstructorLearningPathsResult = {
  paths: LearningPath[]
  forbidden: boolean
  notFound?: boolean
  loadError?: boolean
  message?: string
}

export type InstructorLearningPathResult = {
  path: LearningPath | null
  forbidden: boolean
  notFound: boolean
  message?: string
}

export type StudentLearningPathResult = {
  enrollment: StudentEnrollment | null
  forbidden: boolean
  notFound: boolean
  message?: string
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LearningPathCourse {
  id: number
  title: string
  slug: string
  short_description: string | null
  image_url: string | null
  duration: string | null
  level: string | null
  sort_order: number
  // Present only on instructor detail endpoint (enriched with per-course stats)
  sessions_count?: number
  materials_count?: number
  assignments_count?: number
  /** Optional WhatsApp community link for this course */
  whatsapp_community_url?: string | null
}

export interface LearningPathInstructor {
  id: number
  user_id: number
  name: string
  title: string | null
  avatar_url: string | null
}

export interface LearningPath {
  id: number
  title: string
  slug: string
  short_description: string | null
  full_description: string | null
  featured_image: string | null
  duration: string | null
  duration_unit: string
  language: string | null
  level: string | null
  certificate_name: string | null
  price: number | null
  discount_price: number | null
  status: 'draft' | 'published' | 'archived'
  is_featured: boolean
  enrollment_open: boolean
  learning_outcomes: string[]
  requirements: string[]
  courses_count: number
  students_count: number
  instructor: LearningPathInstructor | null
  instructor_id: number | null
  courses?: LearningPathCourse[]
  /** True when the current user is the path's primary instructor (not just a course instructor). Only present on instructor detail endpoint. */
  is_path_instructor?: boolean
  created_at: string
  updated_at: string

  /** Schedule metadata — all optional/nullable */
  study_days_per_week?: number | null
  study_days?: string[] | null
  study_time?: string | null
  schedule_note?: string | null
}

export interface InstructorPathSession {
  id: number
  title: string | null
  description: string | null
  course_id: number
  course_title: string | null
  session_date: string | null
  start_time: string | null
  end_time: string | null
  meeting_url: string | null
  recording_url: string | null
  status: string
  location: string | null
}

export interface StudentEnrollment {
  enrollment_id: number
  enrollment_status: 'active' | 'completed' | 'dropped'
  enrolled_at: string
  completed_at: string | null
  learning_path: LearningPath
}

export interface EnrollmentStatus {
  enrolled: boolean
  enrollment: {
    id: number
    status: string
    enrolled_at: string
    completed_at: string | null
  } | null
}

export interface LearningPathListMeta {
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export interface LearningPathListResponse {
  data: LearningPath[]
  meta: LearningPathListMeta
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchPublicLearningPaths(params?: {
  search?: string
  level?: string
  language?: string
  featured?: boolean
  page?: number
  per_page?: number
}): Promise<LearningPathListResponse> {
  const res = await apiClient.get('/learning-paths', { params, ...silent })
  const body = res.data as { success: boolean; data: LearningPath[]; meta: LearningPathListMeta }
  return { data: body.data ?? [], meta: body.meta ?? { total: 0, current_page: 1, last_page: 1, per_page: 12 } }
}

export async function fetchPublicLearningPath(slug: string): Promise<LearningPath | null> {
  try {
    const res = await apiClient.get(`/learning-paths/${slug}`, silent)
    return unwrapData<LearningPath>(res.data)
  } catch {
    return null
  }
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function fetchAdminLearningPaths(params?: {
  search?: string
  status?: string
  is_featured?: boolean
  instructor_id?: number
  page?: number
  per_page?: number
}): Promise<LearningPathListResponse> {
  const res = await apiClient.get('/admin/learning-paths', { params, ...silent })
  const body = res.data as { success: boolean; data: LearningPath[]; meta: LearningPathListMeta }
  return { data: body.data ?? [], meta: body.meta ?? { total: 0, current_page: 1, last_page: 1, per_page: 20 } }
}

export async function fetchAdminLearningPath(id: number): Promise<LearningPath | null> {
  try {
    const res = await apiClient.get(`/admin/learning-paths/${id}`, silent)
    return unwrapData<LearningPath>(res.data)
  } catch {
    return null
  }
}

export async function createLearningPath(data: FormData | Record<string, unknown>): Promise<LearningPath> {
  const res = await apiClient.post('/admin/learning-paths', data)
  return unwrapData<LearningPath>(res.data)
}

export async function updateLearningPath(
  id: number,
  data: FormData | Record<string, unknown>,
): Promise<LearningPath> {
  const isFormData = data instanceof FormData
  if (isFormData) {
    data.append('_method', 'PUT')
    const res = await apiClient.post(`/admin/learning-paths/${id}`, data)
    return unwrapData<LearningPath>(res.data)
  }
  const res = await apiClient.put(`/admin/learning-paths/${id}`, data)
  return unwrapData<LearningPath>(res.data)
}

export async function deleteLearningPath(id: number): Promise<void> {
  await apiClient.delete(`/admin/learning-paths/${id}`)
}

export async function updateLearningPathCourses(
  id: number,
  courseIds: number[],
): Promise<LearningPath> {
  const res = await apiClient.post(`/admin/learning-paths/${id}/courses`, { course_ids: courseIds })
  return unwrapData<LearningPath>(res.data)
}

// ─── Student API ──────────────────────────────────────────────────────────────

export async function enrollInLearningPath(slug: string): Promise<{ success: boolean; enrolled?: boolean; message?: string }> {
  try {
    const res = await apiClient.post(`/learning-paths/${slug}/enroll`, {}, silent)
    return res.data as { success: boolean; message?: string }
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { enrolled?: boolean; message?: string } } }
    if (e?.response?.status === 409) {
      return { success: false, enrolled: true, message: e.response?.data?.message }
    }
    throw err
  }
}

export async function fetchEnrollmentStatus(slug: string): Promise<EnrollmentStatus> {
  try {
    const res = await apiClient.get(`/learning-paths/${slug}/enrollment-status`, silent)
    const body = res.data as { success: boolean } & EnrollmentStatus
    return { enrolled: body.enrolled, enrollment: body.enrollment }
  } catch {
    return { enrolled: false, enrollment: null }
  }
}

export async function fetchStudentLearningPaths(): Promise<StudentEnrollment[]> {
  try {
    const res = await apiClient.get('/student/learning-paths', silent)
    const body = res.data as { success: boolean; data: StudentEnrollment[] }
    const rows = body.data ?? []
    const seen = new Set<number>()
    return rows.filter((row) => {
      const pid = row.learning_path?.id
      if (pid == null || seen.has(pid)) return false
      seen.add(pid)
      return true
    })
  } catch {
    return []
  }
}

export async function fetchStudentLearningPath(id: number): Promise<StudentLearningPathResult> {
  try {
    const res = await apiClient.get(`/student/learning-paths/${id}`, silent)
    const body = res.data as {
      success: boolean
      enrollment_id: number
      enrollment_status: string
      enrolled_at: string
      completed_at: string | null
      data: LearningPath
    }
    return {
      enrollment: {
        enrollment_id: body.enrollment_id,
        enrollment_status: body.enrollment_status as 'active' | 'completed' | 'dropped',
        enrolled_at: body.enrolled_at,
        completed_at: body.completed_at,
        learning_path: body.data,
      },
      forbidden: false,
      notFound: false,
    }
  } catch (err) {
    const status = axiosStatus(err)
    if (status === 403) {
      return {
        enrollment: null,
        forbidden: true,
        notFound: false,
        message: axiosMessage(err, FORBIDDEN_STUDENT_PATH_MSG),
      }
    }
    if (status === 404) {
      return { enrollment: null, forbidden: false, notFound: true, message: 'لم يُعثر على المسار.' }
    }
    return { enrollment: null, forbidden: false, notFound: true }
  }
}

// ─── Admin: Learning Path detail with students ────────────────────────────────

export interface LearningPathStudent {
  user_id: number
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  enrollment_status: 'active' | 'completed' | 'dropped'
  enrolled_at: string
  completed_at: string | null
  progress_percentage: number
  courses_completed: number
  total_courses: number
}

export interface LearningPathDetailResponse {
  data: LearningPath
  students: LearningPathStudent[]
  counts: {
    courses: number
    students: number
    active_students: number
    completed_students: number
  }
}

export async function fetchAdminLearningPathDetail(id: number): Promise<LearningPathDetailResponse | null> {
  try {
    const res = await apiClient.get(`/admin/learning-paths/${id}`, silent)
    const body = res.data as {
      success: boolean
      data: LearningPath
      students?: LearningPathStudent[]
      counts?: LearningPathDetailResponse['counts']
    }
    return {
      data: body.data,
      students: body.students ?? [],
      counts: body.counts ?? { courses: 0, students: 0, active_students: 0, completed_students: 0 },
    }
  } catch {
    return null
  }
}

export async function fetchAdminLearningPathStudents(id: number): Promise<LearningPathStudent[]> {
  try {
    const res = await apiClient.get(`/admin/learning-paths/${id}/students`, silent)
    const body = res.data as { success: boolean; data: LearningPathStudent[] }
    return body.data ?? []
  } catch {
    return []
  }
}

// ─── Instructor Options (for admin selects) ───────────────────────────────────

export interface InstructorOption {
  id: number
  name: string
  email: string | null
  title: string | null
  avatar_url: string | null
}

export async function fetchInstructorOptions(search?: string): Promise<InstructorOption[]> {
  try {
    const res = await apiClient.get('/admin/instructors', {
      params: { search: search || undefined, per_page: 100 },
      ...silent,
    })
    const raw = (res.data as { data?: unknown[] }).data ?? []
    return raw.map((d: unknown) => {
      const o = d as Record<string, unknown>
      const user = o.user && typeof o.user === 'object' ? (o.user as Record<string, unknown>) : null
      return {
        id:         Number(o.id),
        name:       String(o.name ?? user?.name ?? ''),
        email:      String(o.email ?? user?.email ?? '') || null,
        title:      o.title ? String(o.title) : null,
        avatar_url: (o.avatar_url ?? null) as string | null,
      }
    })
  } catch {
    return []
  }
}

// ─── Instructor API ───────────────────────────────────────────────────────────

export async function fetchInstructorLearningPaths(_userId?: number | null): Promise<InstructorLearningPathsResult> {
  try {
    const res = await apiClient.get('/instructor/learning-paths', silent)
    const list = parseInstructorLearningPathList(res.data)
    // Backend already filters to paths where this instructor is assigned
    // (primary instructor OR teaches a course in the path). Client-side
    // filtering by instructor.user_id incorrectly drops paths where the
    // instructor teaches courses but isn't the path's primary instructor.
    const paths = dedupeLearningPaths(list)
    return { paths, forbidden: false }
  } catch (err) {
    const status = axiosStatus(err)
    if (status === 403) {
      return { paths: [], forbidden: true, message: axiosMessage(err, FORBIDDEN_PATHS_MSG) }
    }
    if (status === 404) {
      return { paths: [], forbidden: false, notFound: true, message: 'لا توجد مسارات مرتبطة بك.' }
    }
    return {
      paths: [],
      forbidden: false,
      loadError: true,
      message: axiosMessage(err, 'تعذر تحميل مسارات التعلّم.'),
    }
  }
}

export async function fetchInstructorLearningPath(id: number): Promise<InstructorLearningPathResult> {
  try {
    const res = await apiClient.get(`/instructor/learning-paths/${id}`, silent)
    return { path: unwrapData<LearningPath>(res.data), forbidden: false, notFound: false }
  } catch (err) {
    const status = axiosStatus(err)
    if (status === 403) {
      return {
        path: null,
        forbidden: true,
        notFound: false,
        message: axiosMessage(err, FORBIDDEN_PATH_MSG),
      }
    }
    if (status === 404) {
      return { path: null, forbidden: false, notFound: true, message: 'لم يُعثر على المسار.' }
    }
    return { path: null, forbidden: false, notFound: true }
  }
}

export async function updateInstructorCurriculum(id: number, courseIds: number[]): Promise<LearningPath> {
  const res = await apiClient.put(`/instructor/learning-paths/${id}/curriculum`, { course_ids: courseIds })
  return unwrapData<LearningPath>(res.data)
}

export async function addInstructorLearningPathItem(id: number, courseId: number): Promise<LearningPath> {
  const res = await apiClient.post(`/instructor/learning-paths/${id}/items`, { course_id: courseId })
  return unwrapData<LearningPath>(res.data)
}

export async function removeInstructorLearningPathItem(id: number, itemId: number): Promise<LearningPath> {
  const res = await apiClient.delete(`/instructor/learning-paths/${id}/items/${itemId}`)
  return unwrapData<LearningPath>(res.data)
}

export async function fetchInstructorPathSessions(id: number): Promise<InstructorPathSession[]> {
  try {
    const res = await apiClient.get(`/instructor/learning-paths/${id}/sessions`, silent)
    const body = res.data as { success: boolean; data: InstructorPathSession[] }
    return body.data ?? []
  } catch {
    return []
  }
}

export async function fetchInstructorPathStudents(id: number): Promise<Array<{
  enrollment_id: number
  user_id: number
  name: string | null
  email: string | null
  status: string
  enrolled_at: string
  completed_at: string | null
}>> {
  try {
    const res = await apiClient.get(`/instructor/learning-paths/${id}/students`, silent)
    const body = res.data as { success: boolean; data: unknown[] }
    return (body.data ?? []) as Array<{
      enrollment_id: number
      user_id: number
      name: string | null
      email: string | null
      status: string
      enrolled_at: string
      completed_at: string | null
    }>
  } catch {
    return []
  }
}
