import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  dedupeLearningPaths,
  parseInstructorLearningPathList,
  filterPathsForInstructorUser,
  fetchPublicLearningPaths,
  fetchPublicLearningPath,
  fetchAdminLearningPaths,
  fetchAdminLearningPath,
  createLearningPath,
  updateLearningPath,
  deleteLearningPath,
  updateLearningPathStatus,
  updateLearningPathCourses,
  enrollInLearningPath,
  fetchEnrollmentStatus,
  fetchStudentLearningPaths,
  fetchStudentLearningPath,
  fetchAdminLearningPathDetail,
  fetchAdminLearningPathStudents,
  fetchInstructorOptions,
  fetchInstructorLearningPaths,
  fetchInstructorLearningPath,
  updateInstructorCurriculum,
  addInstructorLearningPathItem,
  removeInstructorLearningPathItem,
  fetchInstructorPathSessions,
  fetchInstructorPathStudents,
  type LearningPath,
  type StudentEnrollment,
} from '@/api/learningPathsApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

/** Minimal but complete LearningPath fixture (Arabic-first realistic values). */
function makePath(id: number, overrides: Partial<LearningPath> = {}): LearningPath {
  return {
    id,
    title: `مسار البرمجة ${id}`,
    slug: `programming-path-${id}`,
    short_description: 'وصف مختصر',
    full_description: 'وصف كامل للمسار التعليمي',
    featured_image: null,
    duration: '3',
    duration_unit: 'months',
    language: 'العربية',
    level: 'beginner',
    certificate_name: 'شهادة إتمام',
    price: 1500,
    discount_price: null,
    status: 'published',
    is_featured: false,
    enrollment_open: true,
    learning_outcomes: ['إتقان الأساسيات'],
    requirements: ['حاسوب شخصي'],
    courses_count: 3,
    students_count: 20,
    instructor: null,
    instructor_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  }
}

/** Object shape that passes axios.isAxiosError (isAxiosError flag check). */
function axiosErr(status: number, data?: unknown): unknown {
  return { isAxiosError: true, response: { status, data } }
}

/* ── Pure helpers ── */

describe('dedupeLearningPaths', () => {
  it('drops duplicate ids while preserving API order', () => {
    const rows = [makePath(1), makePath(2), makePath(1), makePath(3), makePath(2)]
    expect(dedupeLearningPaths(rows).map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('drops rows with non-finite or non-positive ids', () => {
    const bad1 = makePath(0)
    const bad2 = makePath(Number.NaN)
    const bad3 = makePath(-4)
    expect(dedupeLearningPaths([bad1, bad2, bad3, makePath(7)]).map((p) => p.id)).toEqual([7])
  })

  it('returns an empty array for an empty input', () => {
    expect(dedupeLearningPaths([])).toEqual([])
  })
})

describe('parseInstructorLearningPathList', () => {
  it('accepts a bare array payload', () => {
    const rows = [makePath(1)]
    expect(parseInstructorLearningPathList(rows)).toEqual(rows)
  })

  it('unwraps { data: [...] }', () => {
    const rows = [makePath(1), makePath(2)]
    expect(parseInstructorLearningPathList({ data: rows })).toEqual(rows)
  })

  it('finds the list under nested keys: paths / learning_paths / items / data', () => {
    const rows = [makePath(3)]
    expect(parseInstructorLearningPathList({ data: { paths: rows } })).toEqual(rows)
    expect(parseInstructorLearningPathList({ data: { learning_paths: rows } })).toEqual(rows)
    expect(parseInstructorLearningPathList({ data: { items: rows } })).toEqual(rows)
    expect(parseInstructorLearningPathList({ data: { data: rows } })).toEqual(rows)
  })

  it('returns [] for malformed payloads without crashing', () => {
    expect(parseInstructorLearningPathList(null)).toEqual([])
    expect(parseInstructorLearningPathList('نص')).toEqual([])
    expect(parseInstructorLearningPathList({ data: { foo: 1 } })).toEqual([])
    expect(parseInstructorLearningPathList(42)).toEqual([])
  })
})

describe('filterPathsForInstructorUser', () => {
  const mine = makePath(1, {
    instructor: { id: 9, user_id: 55, name: 'أ. سارة', title: null, avatar_url: null },
  })
  const other = makePath(2, {
    instructor: { id: 10, user_id: 77, name: 'أ. خالد', title: null, avatar_url: null },
  })
  const noMeta = makePath(3, { instructor: null })

  it('returns everything when userId is missing', () => {
    expect(filterPathsForInstructorUser([mine, other], undefined)).toEqual([mine, other])
    expect(filterPathsForInstructorUser([mine, other], null)).toEqual([mine, other])
  })

  it('keeps matching paths and paths without instructor metadata, drops mismatches', () => {
    expect(filterPathsForInstructorUser([mine, other, noMeta], 55).map((p) => p.id)).toEqual([1, 3])
  })
})

/* ── Public API ── */

describe('fetchPublicLearningPaths', () => {
  it('calls GET /learning-paths silently with params and returns data + meta', async () => {
    const rows = [makePath(1)]
    const meta = { total: 1, current_page: 1, last_page: 1, per_page: 12 }
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: rows, meta } })

    const res = await fetchPublicLearningPaths({ search: 'برمجة', featured: true })
    expect(mockedApi.get).toHaveBeenCalledWith('/learning-paths', {
      params: { search: 'برمجة', featured: true },
      skipErrorToast: true,
    })
    expect(res).toEqual({ data: rows, meta })
  })

  it('falls back to empty data and default meta (per_page 12) on a hollow body', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    const res = await fetchPublicLearningPaths()
    expect(res).toEqual({ data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 12 } })
  })

  it('propagates transport errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchPublicLearningPaths()).rejects.toThrow('Network Error')
  })
})

describe('fetchPublicLearningPath', () => {
  it('unwraps { data } from GET /learning-paths/{slug}', async () => {
    const path = makePath(4)
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(fetchPublicLearningPath('programming-path-4')).resolves.toEqual(path)
    expect(mockedApi.get).toHaveBeenCalledWith('/learning-paths/programming-path-4', { skipErrorToast: true })
  })

  it('returns null on any error (404 etc.)', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(404))
    await expect(fetchPublicLearningPath('missing')).resolves.toBeNull()
  })
})

/* ── Admin API ── */

describe('admin list/detail/CRUD', () => {
  it('fetchAdminLearningPaths returns data + meta and defaults per_page to 20', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    const res = await fetchAdminLearningPaths({ status: 'draft' })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/learning-paths', {
      params: { status: 'draft' },
      skipErrorToast: true,
    })
    expect(res.meta).toEqual({ total: 0, current_page: 1, last_page: 1, per_page: 20 })
    expect(res.data).toEqual([])
  })

  it('fetchAdminLearningPath unwraps detail and returns null on error', async () => {
    const path = makePath(5)
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(fetchAdminLearningPath(5)).resolves.toEqual(path)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/learning-paths/5', { skipErrorToast: true })

    mockedApi.get.mockRejectedValueOnce(axiosErr(403))
    await expect(fetchAdminLearningPath(5)).resolves.toBeNull()
  })

  it('createLearningPath posts payload and unwraps the created path', async () => {
    const created = makePath(9)
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: created } })
    await expect(createLearningPath({ title: 'مسار جديد' })).resolves.toEqual(created)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/learning-paths', { title: 'مسار جديد' })
  })

  it('createLearningPath propagates validation errors', async () => {
    mockedApi.post.mockRejectedValueOnce(axiosErr(422, { errors: { title: ['مطلوب'] } }))
    await expect(createLearningPath({})).rejects.toBeTruthy()
  })

  it('updateLearningPath uses PUT for plain objects', async () => {
    const updated = makePath(3)
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: updated } })
    await expect(updateLearningPath(3, { title: 'محدّث' })).resolves.toEqual(updated)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/learning-paths/3', { title: 'محدّث' })
    expect(mockedApi.post).not.toHaveBeenCalled()
  })

  it('updateLearningPath method-spoofs (_method=PUT via POST) for FormData', async () => {
    const updated = makePath(3)
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: updated } })
    const fd = new FormData()
    fd.append('title', 'مسار بصورة')
    await expect(updateLearningPath(3, fd)).resolves.toEqual(updated)
    const [url, sent] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/admin/learning-paths/3')
    expect(sent.get('_method')).toBe('PUT')
    expect(sent.get('title')).toBe('مسار بصورة')
    expect(mockedApi.put).not.toHaveBeenCalled()
  })

  it('deleteLearningPath calls DELETE /admin/learning-paths/{id}', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteLearningPath(8)
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/learning-paths/8')
  })

  it('updateLearningPathStatus PATCHes the status endpoint', async () => {
    const path = makePath(6, { status: 'archived' })
    mockedApi.patch.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(updateLearningPathStatus(6, 'archived')).resolves.toEqual(path)
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/learning-paths/6/status', { status: 'archived' })
  })

  it('updateLearningPathCourses posts the full ordered course id list', async () => {
    const path = makePath(6)
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(updateLearningPathCourses(6, [3, 1, 2])).resolves.toEqual(path)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/learning-paths/6/courses', { course_ids: [3, 1, 2] })
  })
})

describe('fetchAdminLearningPathDetail / fetchAdminLearningPathStudents', () => {
  it('returns detail with defaulted students/counts when the backend omits them', async () => {
    const path = makePath(2)
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(fetchAdminLearningPathDetail(2)).resolves.toEqual({
      data: path,
      students: [],
      counts: { courses: 0, students: 0, active_students: 0, completed_students: 0 },
    })
  })

  it('passes through provided students and counts', async () => {
    const path = makePath(2)
    const students = [{
      user_id: 1, name: 'طالبة', email: 's@e.com', phone: null, avatar_url: null,
      enrollment_status: 'active' as const, enrolled_at: '2026-01-01', completed_at: null,
      progress_percentage: 40, courses_completed: 1, total_courses: 3,
    }]
    const counts = { courses: 3, students: 1, active_students: 1, completed_students: 0 }
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: path, students, counts } })
    await expect(fetchAdminLearningPathDetail(2)).resolves.toEqual({ data: path, students, counts })
  })

  it('detail returns null on error; students list falls back to []', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(500))
    await expect(fetchAdminLearningPathDetail(2)).resolves.toBeNull()

    mockedApi.get.mockRejectedValueOnce(axiosErr(500))
    await expect(fetchAdminLearningPathStudents(2)).resolves.toEqual([])
  })

  it('fetchAdminLearningPathStudents unwraps the data array', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [] } })
    await expect(fetchAdminLearningPathStudents(2)).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/learning-paths/2/students', { skipErrorToast: true })
  })
})

/* ── Student API ── */

describe('enrollInLearningPath', () => {
  it('posts to the enroll endpoint and returns the body on success', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, message: 'تم التسجيل بنجاح' } })
    await expect(enrollInLearningPath('path-1')).resolves.toEqual({ success: true, message: 'تم التسجيل بنجاح' })
    expect(mockedApi.post).toHaveBeenCalledWith('/learning-paths/path-1/enroll', {}, { skipErrorToast: true })
  })

  it('maps a 409 conflict to { success:false, enrolled:true } with the backend message', async () => {
    mockedApi.post.mockRejectedValueOnce({ response: { status: 409, data: { message: 'أنت مسجّل بالفعل' } } })
    await expect(enrollInLearningPath('path-1')).resolves.toEqual({
      success: false,
      enrolled: true,
      message: 'أنت مسجّل بالفعل',
    })
  })

  it('rethrows non-409 errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'))
    await expect(enrollInLearningPath('path-1')).rejects.toThrow('Network Error')
  })
})

describe('fetchEnrollmentStatus', () => {
  it('returns enrolled + enrollment from the body', async () => {
    const enrollment = { id: 1, status: 'active', enrolled_at: '2026-01-01', completed_at: null }
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, enrolled: true, enrollment } })
    await expect(fetchEnrollmentStatus('path-1')).resolves.toEqual({ enrolled: true, enrollment })
    expect(mockedApi.get).toHaveBeenCalledWith('/learning-paths/path-1/enrollment-status', { skipErrorToast: true })
  })

  it('falls back to not-enrolled on error', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(401))
    await expect(fetchEnrollmentStatus('path-1')).resolves.toEqual({ enrolled: false, enrollment: null })
  })
})

describe('fetchStudentLearningPaths', () => {
  function makeEnrollment(pathId: number, enrollmentId: number): StudentEnrollment {
    return {
      enrollment_id: enrollmentId,
      enrollment_status: 'active',
      enrolled_at: '2026-01-01',
      completed_at: null,
      learning_path: makePath(pathId),
    }
  }

  it('dedupes rows by learning_path.id, keeping the first occurrence', async () => {
    const rows = [makeEnrollment(1, 10), makeEnrollment(1, 11), makeEnrollment(2, 12)]
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: rows } })
    const res = await fetchStudentLearningPaths()
    expect(res.map((r) => r.enrollment_id)).toEqual([10, 12])
    expect(mockedApi.get).toHaveBeenCalledWith('/student/learning-paths', { skipErrorToast: true })
  })

  it('drops rows with no learning_path id and survives a hollow body', async () => {
    const broken = { ...makeEnrollment(1, 10), learning_path: undefined } as unknown as StudentEnrollment
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [broken] } })
    await expect(fetchStudentLearningPaths()).resolves.toEqual([])

    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    await expect(fetchStudentLearningPaths()).resolves.toEqual([])
  })

  it('returns [] on error', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(500))
    await expect(fetchStudentLearningPaths()).resolves.toEqual([])
  })
})

describe('fetchStudentLearningPath', () => {
  it('maps the flat enrollment body into a StudentEnrollment', async () => {
    const path = makePath(1)
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        enrollment_id: 44,
        enrollment_status: 'completed',
        enrolled_at: '2026-01-01',
        completed_at: '2026-03-01',
        data: path,
      },
    })
    await expect(fetchStudentLearningPath(1)).resolves.toEqual({
      enrollment: {
        enrollment_id: 44,
        enrollment_status: 'completed',
        enrolled_at: '2026-01-01',
        completed_at: '2026-03-01',
        learning_path: path,
      },
      forbidden: false,
      notFound: false,
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/student/learning-paths/1', { skipErrorToast: true })
  })

  it('maps 403 to forbidden with the backend message', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(403, { message: 'ممنوع الوصول' }))
    await expect(fetchStudentLearningPath(1)).resolves.toEqual({
      enrollment: null, forbidden: true, notFound: false, message: 'ممنوع الوصول',
    })
  })

  it('maps 403 without a body message to the Arabic fallback', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(403, {}))
    const res = await fetchStudentLearningPath(1)
    expect(res.forbidden).toBe(true)
    expect(res.message).toBe('لا يمكنك الوصول إلى هذا المسار التعليمي.')
  })

  it('maps 404 to notFound with an Arabic message', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(404))
    await expect(fetchStudentLearningPath(1)).resolves.toEqual({
      enrollment: null, forbidden: false, notFound: true, message: 'لم يُعثر على المسار.',
    })
  })

  it('maps any other failure (incl. non-axios errors) to notFound without a message', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchStudentLearningPath(1)).resolves.toEqual({
      enrollment: null, forbidden: false, notFound: true,
    })
  })
})

/* ── Instructor options (admin selects) ── */

describe('fetchInstructorOptions', () => {
  it('maps rows including nested user fallback and null-coalesced email', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: '5', user: { name: 'أ. أحمد', email: 'ahmad@emc.sa' }, title: 'مدرب أول', avatar_url: 'a.png' },
          { id: 6, name: 'أ. ليلى', title: null, avatar_url: null },
        ],
      },
    })
    const res = await fetchInstructorOptions('أحمد')
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/instructors', {
      params: { search: 'أحمد', per_page: 100 },
      skipErrorToast: true,
    })
    expect(res).toEqual([
      { id: 5, name: 'أ. أحمد', email: 'ahmad@emc.sa', title: 'مدرب أول', avatar_url: 'a.png' },
      { id: 6, name: 'أ. ليلى', email: null, title: null, avatar_url: null },
    ])
  })

  it('sends search as undefined for an empty string and defaults data to []', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchInstructorOptions('')).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/instructors', {
      params: { search: undefined, per_page: 100 },
      skipErrorToast: true,
    })
  })

  it('returns [] on error', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(500))
    await expect(fetchInstructorOptions()).resolves.toEqual([])
  })
})

/* ── Instructor API ── */

describe('fetchInstructorLearningPaths', () => {
  it('parses and dedupes the list without client-side user filtering', async () => {
    const p1 = makePath(1, { instructor: { id: 1, user_id: 999, name: 'غيري', title: null, avatar_url: null } })
    mockedApi.get.mockResolvedValueOnce({ data: { data: [p1, p1, makePath(2)] } })
    // userId 55 ≠ 999 — the path must still be kept (backend already filtered)
    const res = await fetchInstructorLearningPaths(55)
    expect(res.forbidden).toBe(false)
    expect(res.paths.map((p) => p.id)).toEqual([1, 2])
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/learning-paths', { skipErrorToast: true })
  })

  it('maps 403 to forbidden with backend message, or Arabic fallback when absent', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(403, { message: 'صلاحيات غير كافية' }))
    await expect(fetchInstructorLearningPaths()).resolves.toEqual({
      paths: [], forbidden: true, message: 'صلاحيات غير كافية',
    })

    mockedApi.get.mockRejectedValueOnce(axiosErr(403))
    await expect(fetchInstructorLearningPaths()).resolves.toEqual({
      paths: [], forbidden: true, message: 'لا تملك صلاحية عرض مسارات التعلّم.',
    })
  })

  it('maps 404 to notFound with an Arabic message', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(404))
    await expect(fetchInstructorLearningPaths()).resolves.toEqual({
      paths: [], forbidden: false, notFound: true, message: 'لا توجد مسارات مرتبطة بك.',
    })
  })

  it('maps other failures to loadError with an Arabic fallback message', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('timeout'))
    await expect(fetchInstructorLearningPaths()).resolves.toEqual({
      paths: [], forbidden: false, loadError: true, message: 'تعذر تحميل مسارات التعلّم.',
    })
  })
})

describe('fetchInstructorLearningPath', () => {
  it('unwraps the path on success', async () => {
    const path = makePath(4, { is_path_instructor: true })
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(fetchInstructorLearningPath(4)).resolves.toEqual({
      path, forbidden: false, notFound: false,
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/learning-paths/4', { skipErrorToast: true })
  })

  it('maps 403 / 404 / other errors', async () => {
    mockedApi.get.mockRejectedValueOnce(axiosErr(403))
    await expect(fetchInstructorLearningPath(4)).resolves.toEqual({
      path: null, forbidden: true, notFound: false, message: 'لا تملك صلاحية عرض هذا المسار.',
    })

    mockedApi.get.mockRejectedValueOnce(axiosErr(404))
    await expect(fetchInstructorLearningPath(4)).resolves.toEqual({
      path: null, forbidden: false, notFound: true, message: 'لم يُعثر على المسار.',
    })

    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchInstructorLearningPath(4)).resolves.toEqual({
      path: null, forbidden: false, notFound: true,
    })
  })
})

describe('instructor curriculum mutations', () => {
  it('updateInstructorCurriculum PUTs the course id list', async () => {
    const path = makePath(4)
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(updateInstructorCurriculum(4, [9, 8])).resolves.toEqual(path)
    expect(mockedApi.put).toHaveBeenCalledWith('/instructor/learning-paths/4/curriculum', { course_ids: [9, 8] })
  })

  it('addInstructorLearningPathItem posts a single course id', async () => {
    const path = makePath(4)
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(addInstructorLearningPathItem(4, 9)).resolves.toEqual(path)
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/learning-paths/4/items', { course_id: 9 })
  })

  it('removeInstructorLearningPathItem DELETEs the item route', async () => {
    const path = makePath(4)
    mockedApi.delete.mockResolvedValueOnce({ data: { success: true, data: path } })
    await expect(removeInstructorLearningPathItem(4, 77)).resolves.toEqual(path)
    expect(mockedApi.delete).toHaveBeenCalledWith('/instructor/learning-paths/4/items/77')
  })

  it('mutations propagate errors (no silent catch)', async () => {
    mockedApi.put.mockRejectedValueOnce(axiosErr(422))
    await expect(updateInstructorCurriculum(4, [])).rejects.toBeTruthy()
  })
})

describe('fetchInstructorPathSessions / fetchInstructorPathStudents', () => {
  it('sessions: unwraps data, defaults to [], and returns [] on error', async () => {
    const sessions = [{
      id: 1, title: 'جلسة تعريفية', description: null, course_id: 2, course_title: 'أساسيات',
      session_date: '2026-08-10', start_time: '18:00', end_time: '20:00',
      meeting_url: null, recording_url: null, status: 'scheduled', location: null,
    }]
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: sessions } })
    await expect(fetchInstructorPathSessions(4)).resolves.toEqual(sessions)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/learning-paths/4/sessions', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    await expect(fetchInstructorPathSessions(4)).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(axiosErr(500))
    await expect(fetchInstructorPathSessions(4)).resolves.toEqual([])
  })

  it('students: unwraps data, defaults to [], and returns [] on error', async () => {
    const students = [{
      enrollment_id: 1, user_id: 2, name: 'طالب', email: 't@e.com',
      status: 'active', enrolled_at: '2026-01-01', completed_at: null,
    }]
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: students } })
    await expect(fetchInstructorPathStudents(4)).resolves.toEqual(students)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/learning-paths/4/students', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    await expect(fetchInstructorPathStudents(4)).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(axiosErr(500))
    await expect(fetchInstructorPathStudents(4)).resolves.toEqual([])
  })
})
