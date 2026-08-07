import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  adminListSessions,
  adminGetSessionLinkOpens,
  adminCreateSession,
  adminUpdateSession,
  adminDeleteSession,
  adminListAttendance,
  adminAttendanceDetail,
  adminListAssignments,
  adminStoreAssignment,
  adminUpdateAssignment,
  adminDeleteAssignment,
  adminGetAssignmentDetail,
  adminListMaterials,
  adminStoreMaterial,
  adminUpdateMaterial,
  adminDeleteMaterial,
  adminFetchMaterialBlob,
  adminListEvaluations,
  adminListProgress,
  adminFetchStudentDetail,
  type AdminSession,
  type SessionLinkOpenStudent,
} from '@/api/adminLmsApi'
import type { LmsSession } from '../types/lms'

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

/* ── sessions ── */

describe('admin sessions', () => {
  const session: AdminSession = {
    id: 1,
    course_name: 'دورة البرمجة',
    status: 'scheduled',
    course_title: 'دورة البرمجة',
    instructor_name: 'أ. محمد',
    session_date: '2026-08-10',
    start_time: '18:00',
    status_label_ar: 'مجدولة',
    link_open_count: 2,
  }

  it('adminListSessions requests per_page 200 and unwraps the { data: [...] } envelope', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [session] } })
    const rows = await adminListSessions()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/sessions', { params: { per_page: 200 } })
    expect(rows).toEqual([session])
  })

  it('adminListSessions returns [] for a malformed payload instead of crashing', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { not: 'a-list' } } })
    await expect(adminListSessions()).resolves.toEqual([])
  })

  it('adminListSessions propagates request errors', async () => {
    const boom = new Error('500')
    mockedApi.get.mockRejectedValueOnce(boom)
    await expect(adminListSessions()).rejects.toBe(boom)
  })

  it('adminGetSessionLinkOpens returns the inner data array', async () => {
    const students: SessionLinkOpenStudent[] = [
      { id: 3, name: 'أحمد علي', email: 'a@example.com', opened_at: '2026-08-10T18:05:00Z' },
    ]
    mockedApi.get.mockResolvedValueOnce({ data: { data: students } })
    const rows = await adminGetSessionLinkOpens(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/sessions/1/link-opens')
    expect(rows).toEqual(students)
  })

  it('adminGetSessionLinkOpens returns [] for null bodies and non-array data', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    await expect(adminGetSessionLinkOpens(1)).resolves.toEqual([])
    mockedApi.get.mockResolvedValueOnce({ data: { data: 'junk' } })
    await expect(adminGetSessionLinkOpens(1)).resolves.toEqual([])
  })

  it('adminCreateSession POSTs the body and unwraps the created session', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: session } })
    const body: Partial<LmsSession> = { title: 'جلسة تعريفية', course_id: 5, status: 'scheduled' }
    const created = await adminCreateSession(body)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/lms/sessions', body)
    expect(created).toEqual(session)
  })

  it('adminUpdateSession PUTs to the session route', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: session } })
    await adminUpdateSession(4, { status: 'cancelled' })
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/lms/sessions/4', { status: 'cancelled' })
  })

  it('adminDeleteSession DELETEs the session route', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteSession(4)
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/lms/sessions/4')
  })
})

/* ── attendance / evaluations / progress lists ── */

describe('attendance, evaluations and progress lists', () => {
  it('adminListAttendance unwraps a bare array payload', async () => {
    const row = { id: 1, label: 'جلسة 1', subtitle: 'دورة البرمجة', status: 'completed', updated_at: null }
    mockedApi.get.mockResolvedValueOnce({ data: [row] })
    await expect(adminListAttendance()).resolves.toEqual([row])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/attendance')
  })

  it('adminAttendanceDetail unwraps the nested envelope', async () => {
    const row = { student_id: 2, student_name: 'أحمد علي', status: 'present' }
    mockedApi.get.mockResolvedValueOnce({ data: { data: [row] } })
    await expect(adminAttendanceDetail(7)).resolves.toEqual([row])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/attendance/7')
  })

  it('adminListEvaluations and adminListProgress hit their routes and tolerate junk', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: 'junk' })
    await expect(adminListEvaluations()).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/evaluations')

    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await expect(adminListProgress()).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/progress')
  })
})

/* ── assignments ── */

describe('admin assignments', () => {
  it('adminListAssignments unwraps the list', async () => {
    const a = { id: 1, assignment_id: 1, title: 'واجب أسبوعي', status: 'pending' }
    mockedApi.get.mockResolvedValueOnce({ data: { data: [a] } })
    await expect(adminListAssignments()).resolves.toEqual([a])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/assignments')
  })

  it('adminStoreAssignment POSTs and unwraps', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 8, title: 'واجب جديد' } } })
    const out = await adminStoreAssignment({ title: 'واجب جديد', course_id: 5 })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/lms/assignments', { title: 'واجب جديد', course_id: 5 })
    expect(out).toEqual({ id: 8, title: 'واجب جديد' })
  })

  it('adminUpdateAssignment PUTs and adminDeleteAssignment DELETEs', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 8 } } })
    await adminUpdateAssignment(8, { max_score: 100 })
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/lms/assignments/8', { max_score: 100 })

    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteAssignment(8)
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/lms/assignments/8')
  })

  it('adminGetAssignmentDetail returns the full detail when the server sends everything', async () => {
    const detail = {
      assignment: { id: 3, title: 'واجب البرمجة', due_date: '2026-08-20', max_score: 100 },
      course: { id: 5, title: 'دورة البرمجة', slug: 'programming' },
      instructor: { id: 2, name: 'أ. سارة', email: 's@example.com' },
      stats: { submissions_count: 4, pending_submissions_count: 1 },
      submissions: [{ id: 9, student_name: 'أحمد علي', status: 'submitted' }],
      students: [{ user_id: 1, name: 'أحمد علي', submitted: true }],
    }
    mockedApi.get.mockResolvedValueOnce({ data: { data: detail } })
    const out = await adminGetAssignmentDetail(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/assignments/3')
    expect(out).toEqual(detail)
  })

  it('adminGetAssignmentDetail fills safe defaults for a sparse payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const out = await adminGetAssignmentDetail(3)
    expect(out).toEqual({
      assignment: {},
      course: null,
      instructor: null,
      stats: {},
      submissions: [],
      students: [],
    })
  })

  it('adminGetAssignmentDetail coerces non-array submissions/students to []', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { assignment: { id: 3 }, stats: {}, submissions: 'junk', students: null } },
    })
    const out = await adminGetAssignmentDetail(3)
    expect(out.submissions).toEqual([])
    expect(out.students).toEqual([])
  })
})

/* ── materials ── */

describe('admin materials', () => {
  it('adminListMaterials unwraps the list', async () => {
    const m = { id: 1, title: 'ملف المحاضرة', kind: 'pdf' }
    mockedApi.get.mockResolvedValueOnce({ data: { data: [m] } })
    await expect(adminListMaterials()).resolves.toEqual([m])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/materials')
  })

  it('adminStoreMaterial sends JSON bodies without a multipart header', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 2, title: 'رابط' } } })
    await adminStoreMaterial({ title: 'رابط', kind: 'link' })
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/lms/materials', { title: 'رابط', kind: 'link' })
  })

  it('adminStoreMaterial sends FormData as multipart', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 2 } } })
    const fd = new FormData()
    fd.append('title', 'ملف')
    await adminStoreMaterial(fd)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/lms/materials', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })

  it('adminUpdateMaterial spoofs PATCH via POST for FormData bodies', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 7 } } })
    const fd = new FormData()
    fd.append('title', 'ملف محدث')
    await adminUpdateMaterial(7, fd)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/lms/materials/7?_method=PATCH', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    expect(mockedApi.patch).not.toHaveBeenCalled()
  })

  it('adminUpdateMaterial uses a plain PATCH for JSON bodies', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 7, title: 'محدث' } } })
    const out = await adminUpdateMaterial(7, { title: 'محدث' })
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/lms/materials/7', { title: 'محدث' })
    expect(out).toEqual({ id: 7, title: 'محدث' })
  })

  it('adminDeleteMaterial DELETEs the material route', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteMaterial(7)
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/lms/materials/7')
  })
})

/* ── adminFetchMaterialBlob ── */

describe('adminFetchMaterialBlob', () => {
  it('returns the blob as-is with the mime from the content-type header (parameters stripped)', async () => {
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' })
    mockedApi.get.mockResolvedValueOnce({
      data: blob,
      headers: { 'content-type': 'application/pdf; charset=utf-8' },
      status: 200,
    })
    const out = await adminFetchMaterialBlob(7, 'file')
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/materials/7/file', { responseType: 'blob' })
    expect(out.mime).toBe('application/pdf')
    expect(out.blob).toBe(blob)
  })

  it('re-wraps a typeless blob with the header mime (download mode)', async () => {
    const blob = new Blob(['png-bytes'])
    mockedApi.get.mockResolvedValueOnce({
      data: blob,
      headers: { 'content-type': 'image/png' },
      status: 200,
    })
    const out = await adminFetchMaterialBlob(7, 'download')
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/materials/7/download', { responseType: 'blob' })
    expect(out.blob).not.toBe(blob)
    expect(out.blob.type).toBe('image/png')
    expect(out.mime).toBe('image/png')
  })

  it('falls back to the blob type when no content-type header is present', async () => {
    const blob = new Blob(['video-bytes'], { type: 'video/mp4' })
    mockedApi.get.mockResolvedValueOnce({ data: blob, headers: {}, status: 200 })
    const out = await adminFetchMaterialBlob(7, 'file')
    expect(out.mime).toBe('video/mp4')
    expect(out.blob).toBe(blob)
  })

  it('throws the server message with the response status when the "blob" is a JSON error body', async () => {
    const blob = new Blob(['{"message":"الملف غير موجود"}'], { type: 'application/json' })
    mockedApi.get.mockResolvedValueOnce({
      data: blob,
      headers: { 'content-type': 'application/json' },
      status: 404,
    })
    try {
      await adminFetchMaterialBlob(7, 'file')
      expect.unreachable('expected adminFetchMaterialBlob to throw')
    } catch (err) {
      expect((err as Error).message).toBe('الملف غير موجود')
      expect((err as Error & { response?: { status?: number } }).response?.status).toBe(404)
    }
  })

  it('uses the Arabic default message when the JSON error body is unparseable', async () => {
    const blob = new Blob(['not-json-at-all'], { type: 'application/json' })
    mockedApi.get.mockResolvedValueOnce({
      data: blob,
      headers: { 'content-type': 'application/json' },
      status: 500,
    })
    await expect(adminFetchMaterialBlob(7, 'download')).rejects.toThrow('تعذّر تحميل الملف.')
  })
})

/* ── student detail ── */

describe('adminFetchStudentDetail', () => {
  const detail = {
    student: { id: 2, name: 'أحمد علي', email: 'a@example.com' },
    summary: {
      total_courses: 3, completed_courses: 1, in_progress_courses: 2, avg_progress: 55,
      total_sessions: 10, attended_sessions: 8, missed_sessions: 2, attendance_pct: 80,
      assignments_submitted: 4, assignments_pending: 1, avg_assignment_score: 88,
      certificates_count: 1, last_activity_at: '2026-08-01', risk_level: 'on_track',
    },
    courses: [],
    learning_paths: [],
    attendance: [],
    assignments: [],
    evaluations: [],
    activity: [],
  }

  it('unwraps a { data } envelope', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: detail } })
    const out = await adminFetchStudentDetail(2)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/lms/progress/students/2')
    expect(out).toEqual(detail)
  })

  it('accepts a bare payload without an envelope', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: detail })
    await expect(adminFetchStudentDetail(2)).resolves.toEqual(detail)
  })

  it('propagates request errors', async () => {
    const boom = new Error('404')
    mockedApi.get.mockRejectedValueOnce(boom)
    await expect(adminFetchStudentDetail(2)).rejects.toBe(boom)
  })
})
