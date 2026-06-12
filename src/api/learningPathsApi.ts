import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

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
  created_at: string
  updated_at: string
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
    return body.data ?? []
  } catch {
    return []
  }
}

export async function fetchStudentLearningPath(id: number): Promise<StudentEnrollment | null> {
  try {
    const res = await apiClient.get(`/student/learning-paths/${id}`, silent)
    const body = res.data as { success: boolean; enrollment_id: number; enrollment_status: string; enrolled_at: string; completed_at: string | null; data: LearningPath }
    return {
      enrollment_id: body.enrollment_id,
      enrollment_status: body.enrollment_status as 'active' | 'completed' | 'dropped',
      enrolled_at: body.enrolled_at,
      completed_at: body.completed_at,
      learning_path: body.data,
    }
  } catch {
    return null
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

export async function fetchInstructorLearningPaths(): Promise<LearningPath[]> {
  try {
    const res = await apiClient.get('/instructor/learning-paths', silent)
    const body = res.data as { success: boolean; data: LearningPath[] }
    return body.data ?? []
  } catch {
    return []
  }
}

export async function fetchInstructorLearningPath(id: number): Promise<LearningPath | null> {
  try {
    const res = await apiClient.get(`/instructor/learning-paths/${id}`, silent)
    return unwrapData<LearningPath>(res.data)
  } catch {
    return null
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
