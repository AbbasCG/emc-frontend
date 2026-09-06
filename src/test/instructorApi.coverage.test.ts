import { describe, it, expect, vi, beforeEach, afterAll, type MockInstance } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchInstructorLmsDashboard,
  fetchInstructorDashboardStats,
  fetchInstructorSessions,
  fetchInstructorCourses,
  fetchInstructorStudents,
  fetchInstructorAllStudents,
  fetchInstructorCourseStudents,
  putInstructorAttendance,
  fetchAttendanceDashboard,
  downloadAttendanceExport,
  downloadAttendanceExportPdf,
  downloadAttendanceExportExcel,
  fetchAttendanceReports,
  fetchAttendanceSettings,
  updateAttendanceSettings,
  usersToAttendanceRows,
  mergeAttendanceRows,
  fetchInstructorAttendanceSession,
  fetchInstructorAssignmentsQueue,
  fetchSubmissionDetail,
  reviewInstructorSubmission,
  fetchAssignmentDashboard,
  fetchMissingSubmissions,
  bulkReviewSubmissions,
  type AttendanceSettingsData,
  type InstructorStudentRow,
} from '@/api/instructorApi'
import type { AttendanceRow } from '@/types/lms'
import type { User } from '@/types'

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

/* ── fetchInstructorLmsDashboard ─────────────────────────────────────────── */

describe('fetchInstructorLmsDashboard', () => {
  it('normalizes the canonical dashboard object (coerces numeric strings, parses sessions)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          assigned_courses: [{ id: 1, title: 'دورة المحادثة' }],
          upcoming_sessions: [{ id: 5, course_id: 1, title: 'جلسة تعارف', starts_at: '2030-05-01T10:00:00Z' }],
          class_groups: [{ id: 2, name: 'فوج أ' }],
          student_count: '12',
          attendance_pending_count: 2,
          submissions_pending_count: '3',
          oral_pending_count: 1,
          placement_pending_count: 0,
          admin_notes_placeholder: 'ملاحظة إدارية',
        },
      },
    })

    const dash = await fetchInstructorLmsDashboard()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/dashboard', expect.objectContaining({ skipErrorToast: true }))
    expect(dash.assigned_courses).toEqual([{ id: 1, title: 'دورة المحادثة' }])
    expect(dash.upcoming_sessions).toHaveLength(1)
    expect(dash.upcoming_sessions[0]).toMatchObject({ id: 5, course_id: 1, title: 'جلسة تعارف', status: 'scheduled' })
    expect(dash.class_groups).toEqual([{ id: 2, name: 'فوج أ' }])
    expect(dash.student_count).toBe(12)
    expect(dash.attendance_pending_count).toBe(2)
    expect(dash.submissions_pending_count).toBe(3)
    expect(dash.oral_pending_count).toBe(1)
    expect(dash.placement_pending_count).toBe(0)
    expect(dash.admin_notes_placeholder).toBe('ملاحظة إدارية')
  })

  it('accepts alternate backend key names (courses/sessions/classes/students_count/pending_*)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          courses: [{ id: 9, title: 'دورة النحو' }],
          sessions: [],
          classes: [{ id: 4, name: 'فوج ب' }],
          students_count: 7,
          pending_attendance: 1,
          pending_submissions: 2,
        },
      },
    })

    const dash = await fetchInstructorLmsDashboard()
    expect(dash.assigned_courses).toEqual([{ id: 9, title: 'دورة النحو' }])
    expect(dash.class_groups).toEqual([{ id: 4, name: 'فوج ب' }])
    expect(dash.student_count).toBe(7)
    expect(dash.attendance_pending_count).toBe(1)
    expect(dash.submissions_pending_count).toBe(2)
    expect(dash.oral_pending_count).toBeNull()
    expect(dash.class_groups_count).toBeNull()
    expect(dash.placement_pending_count).toBeNull()
    expect(dash.admin_notes_placeholder).toBeNull()
  })

  it('falls through to unwrapLms for a non-object payload (returns it unchanged)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const dash = await fetchInstructorLmsDashboard()
    expect(dash).toBeNull()
  })

  it('propagates network errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchInstructorLmsDashboard()).rejects.toThrow('Network Error')
  })
})

/* ── fetchInstructorDashboardStats ───────────────────────────────────────── */

describe('fetchInstructorDashboardStats', () => {
  it('prefers backend-computed dashboard counters when the dashboard endpoint succeeds', async () => {
    mockedApi.get.mockImplementation(async (url: string) => {
      if (url === '/instructor/dashboard') {
        return {
          data: {
            data: {
              assigned_courses: [],
              upcoming_sessions: [],
              student_count: 12,
              attendance_pending_count: 2,
              submissions_pending_count: 3,
              oral_pending_count: 1,
              placement_pending_count: 4,
            },
          },
        }
      }
      if (url === '/instructor/courses') return { data: { data: [{ id: 1, title: 'دورة المحادثة' }] } }
      return { data: { data: [] } }
    })

    const stats = await fetchInstructorDashboardStats()
    expect(stats.dashboard).not.toBeNull()
    expect(stats.courses).toHaveLength(1)
    expect(stats.studentsCount).toBe(12)
    expect(stats.submissionsPending).toBe(3)
    expect(stats.attendancePending).toBe(2)
    expect(stats.oralPending).toBe(1)
    expect(stats.placementPending).toBe(4)
  })

  it('computes fallbacks from courses/students/submissions when the dashboard endpoint fails', async () => {
    mockedApi.get.mockImplementation(async (url: string) => {
      if (url === '/instructor/dashboard') throw new Error('dashboard down')
      if (url === '/instructor/courses') {
        return {
          data: {
            data: [
              { id: 1, title: 'أ', oral_pending_count: 2, written_tests_count: 5 },
              { id: 2, title: 'ب', waiting_oral_count: 3, placement_completed_count: 1 },
            ],
          },
        }
      }
      if (url === '/instructor/students') {
        return { data: { data: [{ id: 1, name: 'سارة' }, { id: 2, name: 'ياسر' }] } }
      }
      if (url === '/instructor/submissions') {
        return {
          data: {
            data: [
              { id: 10, student_id: 4, student_name: 'سارة', status: 'pending', submitted_at: '2026-01-01T00:00:00Z' },
            ],
          },
        }
      }
      return { data: { data: [] } }
    })

    const stats = await fetchInstructorDashboardStats()
    expect(stats.dashboard).toBeNull()
    expect(stats.studentsCount).toBe(2)
    expect(stats.submissionsPending).toBe(1) // one pending_review row
    expect(stats.attendancePending).toBe(0)
    expect(stats.oralPending).toBe(5) // 2 + waiting_oral_count 3
    expect(stats.placementPending).toBe(6) // written_tests_count 5 + placement_completed_count 1
  })
})

/* ── fetchInstructorSessions ─────────────────────────────────────────────── */

describe('fetchInstructorSessions', () => {
  it('parses sessions from the sessions endpoint and forwards params', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 5, course_id: 3, title: 'جلسة مراجعة', starts_at: '2030-05-01T10:00:00Z' }] },
    })
    const sessions = await fetchInstructorSessions({ course_id: 3, status: 'scheduled' })
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/instructor/sessions',
      expect.objectContaining({ params: { course_id: 3, status: 'scheduled' }, skipErrorToast: true }),
    )
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ id: 5, course_id: 3, status: 'scheduled' })
  })

  it('falls back to dashboard upcoming_sessions when the endpoint returns nothing (no course filter)', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: [] } }) // /instructor/sessions
      .mockResolvedValueOnce({
        data: { data: { upcoming_sessions: [{ id: 7, title: 'جلسة قادمة', starts_at: '2030-06-01T10:00:00Z' }] } },
      }) // /instructor/dashboard
    const sessions = await fetchInstructorSessions()
    expect(mockedApi.get).toHaveBeenCalledTimes(2)
    expect(sessions.map((s) => s.id)).toEqual([7])
  })

  it('does NOT hit the dashboard fallback when a course filter is set', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    const sessions = await fetchInstructorSessions({ course_id: 3 })
    expect(sessions).toEqual([])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('returns [] when both the endpoint and the dashboard fallback are empty/broken', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockRejectedValueOnce(new Error('dash down'))
    const sessions = await fetchInstructorSessions()
    expect(sessions).toEqual([])
  })
})

/* ── fetchInstructorCourses ──────────────────────────────────────────────── */

describe('fetchInstructorCourses', () => {
  it('unwraps { data: [...] } envelopes', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 1, title: 'دورة المحادثة' }] } })
    const courses = await fetchInstructorCourses()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses')
    expect(courses).toEqual([{ id: 1, title: 'دورة المحادثة' }])
  })

  it('accepts a bare array payload and returns [] for junk', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 2, title: 'دورة النحو' }] })
    await expect(fetchInstructorCourses()).resolves.toEqual([{ id: 2, title: 'دورة النحو' }])

    mockedApi.get.mockResolvedValueOnce({ data: 'junk' })
    await expect(fetchInstructorCourses()).resolves.toEqual([])
  })
})

/* ── fetchInstructorStudents (User rows) ─────────────────────────────────── */

describe('fetchInstructorStudents', () => {
  it('normalizes id/name/email variants, trims, and drops rows without a positive id', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, name: ' أحمد ', email: ' a@b.c ' },
          { student_id: 2, full_name: 'سارة', student_email: 's@x.com' },
          { user_id: 3 }, // no name → placeholder
          { name: 'بدون معرف' }, // id 0 → dropped
          'garbage',
        ],
      },
    })

    const users = await fetchInstructorStudents({ course_id: 3 })
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/instructor/students',
      expect.objectContaining({ params: { course_id: 3 }, skipErrorToast: true }),
    )
    expect(users).toHaveLength(3)
    expect(users[0]).toMatchObject({ id: 1, name: 'أحمد', email: 'a@b.c' })
    expect(users[1]).toMatchObject({ id: 2, name: 'سارة', email: 's@x.com' })
    expect(users[2]).toMatchObject({ id: 3, name: 'طالب #3' })
  })
})

/* ── fetchInstructorAllStudents / fetchInstructorCourseStudents ──────────── */

describe('instructor student rows (normalizeInstructorStudentRow)', () => {
  it('reads the canonical nested Resource shape first (0-scores survive ?? composition)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            written_score: 9, // legacy field must LOSE to canonical 0
            student: { id: 11, name: 'أحمد علي', email: 'ahmed@example.com', avatar_url: 'https://cdn/a.png' },
            course: { id: 3, title: 'دورة المحادثة' },
            registration: { status: 'active' },
            placement: {
              written: { score: 0, total: 20, level: 'A1' },
              oral: { score: 15, level: 'B1' },
              final_level: 'A2',
              status: 'completed',
            },
            progress: { is_assigned: true },
            class_assignment: {
              status: 'assigned', class_group_id: 8, class_name: 'فوج أ',
              level_code: 'A2', assigned_at: '2026-02-01', instructor_name: 'م. سالم',
            },
            oral_booking: { starts_at: '2026-03-01T10:00:00Z' },
            instructor_notes: 'ملاحظات',
            enrolled_at: '2026-01-15',
            attempt_id: 77,
          },
        ],
      },
    })

    const [row] = await fetchInstructorAllStudents()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/students', expect.objectContaining({ skipErrorToast: true }))
    expect(row).toMatchObject({
      id: 11,
      name: 'أحمد علي',
      email: 'ahmed@example.com',
      course_id: 3,
      course_title: 'دورة المحادثة',
      enrollment_status: 'active',
      placement_status: 'completed',
      written_score: 0,
      total_questions: 20,
      written_level: 'A1',
      oral_booking_at: '2026-03-01T10:00:00Z',
      final_level: 'A2',
      oral_score: 15,
      instructor_notes: 'ملاحظات',
      enrolled_at: '2026-01-15',
      avatar_url: 'https://cdn/a.png',
      attempt_id: 77,
      is_assigned: true,
    })
    expect(row.class_assignment).toEqual({
      status: 'assigned', class_group_id: 8, class_name: 'فوج أ',
      level_code: 'A2', assigned_at: '2026-02-01', instructor_name: 'م. سالم',
    })
  })

  it('falls back to legacy flat + placement_attempt fields when canonical is absent', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 5,
            name: 'سارة',
            email: 's@x.com',
            course: { title: 'دورة النحو' },
            status: 'pending',
            placement_attempt: {
              id: 9, score: 7, total_questions: 10, estimated_level: 'B1',
              status: 'completed', final_level: 'B2', oral_score: 8,
            },
            created_at: '2026-01-01',
            profile_photo_url: 'p.png',
          },
        ],
      },
    })

    const [row] = await fetchInstructorAllStudents()
    expect(row).toMatchObject({
      id: 5,
      name: 'سارة',
      course_title: 'دورة النحو',
      enrollment_status: 'pending',
      placement_status: 'completed',
      written_score: 7, // from att.score
      total_questions: 10,
      written_level: 'B1', // from att.estimated_level
      final_level: 'B2',
      oral_score: 8,
      enrolled_at: '2026-01-01', // created_at fallback
      avatar_url: 'p.png',
      attempt_id: 9, // from att.id
    })
    // no class_assignment in payload → normalized empty assignment
    expect(row.class_assignment).toMatchObject({ status: 'waiting_class_assignment', class_group_id: null })
    expect(row.is_assigned).toBeUndefined()
  })

  it('an oral_booking object without starts_at yields null even if a flat oral_booking_at exists (current behavior)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 6, name: 'ن', oral_booking: {}, oral_booking_at: '2026-04-01T10:00:00Z' }] },
    })
    const [row] = await fetchInstructorAllStudents()
    expect(row.oral_booking_at).toBeNull()
  })

  it('never crashes on primitive/null rows — returns the zeroed safe row', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [null, 'garbage', 42] } })
    const rows = await fetchInstructorAllStudents()
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row).toMatchObject({ id: 0, name: '', email: '', course_id: null, written_score: null })
      expect(row.class_assignment).toMatchObject({ status: 'waiting_class_assignment' })
    }
  })

  it('fetchInstructorCourseStudents targets the course-scoped endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    const rows: InstructorStudentRow[] = await fetchInstructorCourseStudents(7)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/7/students', expect.objectContaining({ skipErrorToast: true }))
    expect(rows).toEqual([])
  })
})

/* ── putInstructorAttendance ─────────────────────────────────────────────── */

describe('putInstructorAttendance', () => {
  it('PUTs { attendances } to the session endpoint', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: {} })
    await putInstructorAttendance(4, [{ student_id: 1, status: 'present', notes: 'في الوقت' }])
    expect(mockedApi.put).toHaveBeenCalledWith('/instructor/attendance/4', {
      attendances: [{ student_id: 1, status: 'present', notes: 'في الوقت' }],
    })
  })

  it('propagates errors', async () => {
    mockedApi.put.mockRejectedValueOnce(new Error('403'))
    await expect(putInstructorAttendance(4, [])).rejects.toThrow('403')
  })
})

/* ── attendance dashboard / reports / settings ───────────────────────────── */

describe('fetchAttendanceDashboard', () => {
  it('returns the payload data when present', async () => {
    const payload = {
      today_sessions: 3, today_attendance_marked: 1,
      week_present: 10, week_absent: 2, week_late: 1, week_excused: 0,
      month_present: 40, month_absent: 5, month_late: 3, month_excused: 2,
      current_attendance_percentage: 88,
      at_risk_students: [{ user_id: 1, name: 'أحمد', attendance_percentage: 40 }],
      top_attendance: [], worst_attendance: [],
    }
    mockedApi.get.mockResolvedValueOnce({ data: { data: payload } })
    const res = await fetchAttendanceDashboard()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/attendance/dashboard', expect.objectContaining({ skipErrorToast: true }))
    expect(res).toEqual(payload)
  })

  it('returns the zeroed fallback when data is missing', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const res = await fetchAttendanceDashboard()
    expect(res.today_sessions).toBe(0)
    expect(res.current_attendance_percentage).toBe(0)
    expect(res.at_risk_students).toEqual([])
    expect(res.top_attendance).toEqual([])
    expect(res.worst_attendance).toEqual([])
  })
})

describe('fetchAttendanceReports', () => {
  it('returns summary/data/meta as delivered by the backend', async () => {
    const body = {
      summary: {
        total: 2, present_count: 1, absent_count: 1, late_count: 0, excused_count: 0,
        attendance_percentage: 50, current_attendance_streak: 1, current_absence_streak: 0, risk_level: 'medium' as const,
      },
      data: [
        {
          id: 1, student_name: 'أحمد', student_email: 'a@b.c', course_title: 'دورة',
          session_title: 'جلسة', date: '2026-02-01', status: 'present', status_label: 'حاضر', notes: null,
        },
      ],
      meta: { total: 2, per_page: 25, current_page: 1, last_page: 1, from: '2026-02-01', to: '2026-02-28' },
    }
    mockedApi.get.mockResolvedValueOnce({ data: body })
    const res = await fetchAttendanceReports({ course_id: 3, month: 2, year: 2026 })
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/instructor/attendance/reports',
      expect.objectContaining({ params: { course_id: 3, month: 2, year: 2026 }, skipErrorToast: true }),
    )
    expect(res).toEqual(body)
  })

  it('returns safe defaults when the body is empty', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const res = await fetchAttendanceReports()
    expect(res.summary).toMatchObject({ total: 0, attendance_percentage: 0, risk_level: 'low' })
    expect(res.data).toEqual([])
    expect(res.meta).toEqual({ total: 0, per_page: 25, current_page: 1, last_page: 1, from: '', to: '' })
  })

  it('ignores a non-array data field', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { not: 'an array' } } })
    const res = await fetchAttendanceReports()
    expect(res.data).toEqual([])
  })
})

describe('attendance settings', () => {
  const settings: AttendanceSettingsData = {
    late_threshold_minutes: 10,
    auto_absent_after_minutes: 30,
    minimum_attendance_percentage: 75,
    at_risk_percentage: 60,
    repeated_absence_threshold: 3,
    low_attendance_notification_threshold: 70,
    certificate_attendance_percentage: 80,
  }

  it('fetchAttendanceSettings unwraps { data }', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: settings } })
    await expect(fetchAttendanceSettings()).resolves.toEqual(settings)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/attendance/settings', expect.objectContaining({ skipErrorToast: true }))
  })

  it('updateAttendanceSettings PUTs to the admin endpoint and unwraps the echo', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: settings } })
    await expect(updateAttendanceSettings(settings)).resolves.toEqual(settings)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/attendance-settings', settings)
  })
})

/* ── authenticated CSV/PDF/Excel exports ─────────────────────────────────── */

/** The download helper appends a temporary <a> to the body; grab the last one it appended. */
function lastAppendedAnchor(spy: MockInstance<typeof document.body.appendChild>): HTMLAnchorElement {
  const anchors = spy.mock.calls
    .map(([node]) => node)
    .filter((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
  const anchor = anchors.at(-1)
  if (!anchor) throw new Error('no anchor was appended to document.body')
  return anchor
}

describe('attendance exports (authenticated blob downloads)', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('downloadAttendanceExport fetches a blob with filters and saves a dated .csv', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['csv-bytes']) })
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    await downloadAttendanceExport({ course_id: 3, status: 'absent' })

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/instructor/attendance/export',
      expect.objectContaining({ params: { course_id: 3, status: 'absent' }, responseType: 'blob' }),
    )
    expect(lastAppendedAnchor(appendSpy).download).toMatch(/^attendance-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    appendSpy.mockRestore()
  })

  it('downloadAttendanceExportPdf targets export-pdf with a .pdf filename', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['pdf-bytes']) })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await downloadAttendanceExportPdf()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/attendance/export-pdf', expect.objectContaining({ responseType: 'blob' }))
    expect(lastAppendedAnchor(appendSpy).download).toMatch(/\.pdf$/)
    appendSpy.mockRestore()
  })

  it('downloadAttendanceExportExcel targets export-excel with a .xlsx filename', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['xlsx-bytes']) })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await downloadAttendanceExportExcel()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/attendance/export-excel', expect.objectContaining({ responseType: 'blob' }))
    expect(lastAppendedAnchor(appendSpy).download).toMatch(/\.xlsx$/)
    appendSpy.mockRestore()
  })
})

/* ── attendance row helpers ──────────────────────────────────────────────── */

describe('usersToAttendanceRows', () => {
  it('maps users to unmarked rows, placeholder-naming blank users', () => {
    const users: User[] = [
      { id: 1, name: 'أحمد', email: 'a@b.c', avatar_url: 'a.png' },
      { id: 3, name: '   ', email: 'x@y.z' },
    ]
    const rows = usersToAttendanceRows(users)
    expect(rows[0]).toEqual({ student_id: 1, student_name: 'أحمد', email: 'a@b.c', avatar_url: 'a.png', status: null, notes: null })
    expect(rows[1]).toEqual({ student_id: 3, student_name: 'طالب #3', email: 'x@y.z', avatar_url: null, status: null, notes: null })
  })
})

describe('mergeAttendanceRows', () => {
  const roster: AttendanceRow[] = [
    { student_id: 1, student_name: 'ياسر', email: 'y@x.com', avatar_url: null, status: null, notes: null },
    { student_id: 2, student_name: 'أحمد', email: null, avatar_url: 'a.png', status: null, notes: null },
  ]

  it('returns saved rows untouched when the roster is empty', () => {
    const saved: AttendanceRow[] = [{ student_id: 9, student_name: 'س', status: 'present' }]
    expect(mergeAttendanceRows(saved, [])).toBe(saved)
  })

  it('keeps roster names/emails when saved rows are sparse, sorts by Arabic name', () => {
    const saved: AttendanceRow[] = [
      { student_id: 1, student_name: '  ', email: null, avatar_url: null, status: 'present', notes: null },
    ]
    const merged = mergeAttendanceRows(saved, roster)
    expect(merged.map((r) => r.student_name)).toEqual(['أحمد', 'ياسر']) // أ sorts before ي
    const yaser = merged.find((r) => r.student_id === 1)
    expect(yaser).toMatchObject({ student_name: 'ياسر', email: 'y@x.com', status: 'present' })
    const ahmed = merged.find((r) => r.student_id === 2)
    expect(ahmed).toMatchObject({ status: null, avatar_url: 'a.png' })
  })

  it('adds saved students missing from the roster with a placeholder name', () => {
    const saved: AttendanceRow[] = [{ student_id: 9, student_name: '', status: 'late' }]
    const merged = mergeAttendanceRows(saved, roster)
    const extra = merged.find((r) => r.student_id === 9)
    expect(extra).toMatchObject({ student_name: 'طالب #9', status: 'late' })
  })
})

/* ── fetchInstructorAttendanceSession ────────────────────────────────────── */

describe('fetchInstructorAttendanceSession', () => {
  it('normalizes a bare array payload (id variants, Arabic status, avatar fallbacks)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { student_id: 1, student_name: 'أحمد', status: 'حاضر', avatar: 'a.png', note: 'مبكر' },
          { user_id: 2, name: 'سارة', attendance_status: 'absent' },
          { student: { id: 3, full_name: 'ياسر', email: 'y@x.com', avatar_url: 's.png' }, status: 'متأخر' },
          { id: 4, status: 'excused' },
          { status: 'present' }, // no id → dropped
          null,
        ],
      },
    })

    const res = await fetchInstructorAttendanceSession(12)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/attendance/12', expect.objectContaining({ skipErrorToast: true }))
    expect(res.is_locked).toBe(false)
    expect(res.rows).toHaveLength(4)
    expect(res.rows[0]).toMatchObject({ student_id: 1, student_name: 'أحمد', status: 'present', avatar_url: 'a.png', notes: 'مبكر' })
    expect(res.rows[1]).toMatchObject({ student_id: 2, student_name: 'سارة', status: 'absent' })
    expect(res.rows[2]).toMatchObject({ student_id: 3, student_name: 'ياسر', email: 'y@x.com', status: 'late', avatar_url: 's.png' })
    expect(res.rows[3]).toMatchObject({ student_id: 4, student_name: 'طالب #4', status: 'excused' })
  })

  it('reads lock metadata and records from an object payload', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          is_locked: true,
          locked_at: '2026-02-01T10:00:00Z',
          locked_by: 'م. سالم',
          records: [{ student_id: 1, student_name: 'أحمد', status: 'present' }],
        },
      },
    })
    const res = await fetchInstructorAttendanceSession(12)
    expect(res).toMatchObject({ is_locked: true, locked_at: '2026-02-01T10:00:00Z', locked_by: 'م. سالم' })
    expect(res.rows).toHaveLength(1)
  })

  it('swallows request errors and returns the empty unlocked result', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchInstructorAttendanceSession(12)).resolves.toEqual({
      rows: [], is_locked: false, locked_at: null, locked_by: null,
    })
  })
})

/* ── submissions queue ───────────────────────────────────────────────────── */

describe('fetchInstructorAssignmentsQueue', () => {
  it('normalizes nested assignment/student/course rows and sorts newest first', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 11,
            student_id: 3,
            assignment: { id: 4, title: 'واجب الكتابة', max_score: 20, course: { id: 7, title: 'دورة المحادثة' } },
            student: { name: 'سارة', email: 's@x.com', avatar: 'a.png' },
            submitted_at: '2026-01-01T00:00:00Z',
            status: 'submitted',
            grade: 15,
          },
          {
            id: 12,
            student_id: 4,
            student: { name: 'أحمد' },
            workshop: { title: 'ورشة الخط' },
            submitted_at: '2026-02-01T00:00:00Z',
            status: 'graded',
            score: 18,
            max_score: 20,
          },
        ],
      },
    })

    const rows = await fetchInstructorAssignmentsQueue({ course_id: 7, status: 'pending_review', per_page: 50 })
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/instructor/submissions',
      expect.objectContaining({ params: { per_page: 50, course_id: 7, status: 'pending_review' } }),
    )
    // newest submitted_at first
    expect(rows.map((r) => r.id)).toEqual([12, 11])
    expect(rows[1]).toMatchObject({
      id: 11,
      assignment_id: 4,
      assignment_title: 'واجب الكتابة',
      course_id: 7,
      course_name: 'دورة المحادثة',
      student_name: 'سارة',
      student_email: 's@x.com',
      student_avatar: 'a.png',
      status: 'pending_review', // plain "submitted" maps to pending_review
      score: 15,
      max_score: 20,
    })
    expect(rows[0]).toMatchObject({ status: 'reviewed', course_name: 'ورشة الخط', score: 18 })
  })

  it('omits the status param for the synthetic not_submitted filter and uses per_page 100 by default', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ student_id: 8, status: 'not_submitted', assignment_title: 'واجب' }] },
    })
    const rows = await fetchInstructorAssignmentsQueue({ status: 'not_submitted' })
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/instructor/submissions',
      expect.objectContaining({ params: { per_page: 100 } }),
    )
    // not_submitted rows synthesize id from student_id
    expect(rows[0]).toMatchObject({ id: 8, student_id: 8, status: 'not_submitted', student_name: '—' })
  })

  it('falls back to /instructor/assignments when the submissions queue fails', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('submissions down'))
      .mockResolvedValueOnce({
        data: { submissions: [{ id: 2, student_id: 1, student_name: 'أحمد', status: 'pending_review' }] },
      })
    const rows = await fetchInstructorAssignmentsQueue()
    expect(mockedApi.get).toHaveBeenLastCalledWith('/instructor/assignments', expect.objectContaining({ skipErrorToast: true }))
    expect(rows.map((r) => r.id)).toEqual([2])
  })

  it('also falls back when the primary succeeds but yields zero parseable rows', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })
    await expect(fetchInstructorAssignmentsQueue()).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenCalledTimes(2)
  })

  it('rejects when both endpoints fail', async () => {
    mockedApi.get.mockRejectedValue(new Error('all down'))
    await expect(fetchInstructorAssignmentsQueue()).rejects.toThrow('all down')
  })
})

/* ── submission detail + review ──────────────────────────────────────────── */

describe('fetchSubmissionDetail', () => {
  it('normalizes the full detail with nested assignment/course/learning_path', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 11,
          student_id: 3,
          student: { name: 'سارة', email: 's@x.com' },
          assignment: { id: 4, title: 'واجب الكتابة', max_score: 20, due_date: '2026-02-10', course: { id: 7, title: 'دورة', slug: 'dawra' } },
          learning_path: { id: 2, title: 'مسار المبتدئين', slug: 'beginners' },
          status: 'needs_revision',
          text_answer: 'إجابة الطالب النصية',
          attachment_url: 'https://cdn/file.pdf',
          instructor_feedback: 'يرجى التحسين',
          submitted_at: '2026-02-05T00:00:00Z',
        },
      },
    })

    const detail = await fetchSubmissionDetail(11)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/submissions/11', expect.objectContaining({ skipErrorToast: true }))
    expect(detail).toMatchObject({
      id: 11,
      status: 'needs_revision',
      body_text: 'إجابة الطالب النصية',
      file_url: 'https://cdn/file.pdf',
      feedback: 'يرجى التحسين',
      max_score: 20,
      learning_path: { id: 2, title: 'مسار المبتدئين', slug: 'beginners' },
      assignment: { id: 4, title: 'واجب الكتابة', max_score: 20, due_date: '2026-02-10' },
      course: { id: 7, title: 'دورة', slug: 'dawra' },
    })
  })

  it('falls through to the raw unwrap when the row cannot be normalized', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: null } })
    const detail = await fetchSubmissionDetail(11)
    expect(detail).toBeNull()
  })
})

describe('reviewInstructorSubmission', () => {
  it('PUTs the review with score duplicated into the legacy grade field', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { data: { id: 9, student_id: 3, student_name: 'سارة', status: 'reviewed', score: 17 } },
    })
    const detail = await reviewInstructorSubmission(9, { score: 17, feedback: 'أحسنت', status: 'reviewed' })
    expect(mockedApi.put).toHaveBeenCalledWith('/instructor/submissions/9/review', {
      score: 17, feedback: 'أحسنت', status: 'reviewed', grade: 17,
    })
    expect(detail).toMatchObject({ id: 9, status: 'reviewed', score: 17 })
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('re-fetches the detail when the review response is not a parseable row', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: null } })
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 9, student_id: 3, student_name: 'سارة', status: 'reviewed' } },
    })
    const detail = await reviewInstructorSubmission(9, { score: 10, status: 'reviewed' })
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/submissions/9', expect.objectContaining({ skipErrorToast: true }))
    expect(detail).toMatchObject({ id: 9, status: 'reviewed' })
  })

  it('propagates put failures', async () => {
    mockedApi.put.mockRejectedValueOnce(new Error('422'))
    await expect(reviewInstructorSubmission(9, { score: 1, status: 'reviewed' })).rejects.toThrow('422')
  })
})

/* ── assignment dashboard / missing submissions / bulk review ────────────── */

describe('fetchAssignmentDashboard', () => {
  it('returns backend counters', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          assignments_total: 5, submissions_total: 30, pending_review: 4,
          graded: 20, needs_revision: 3, missing_submissions: 6,
        },
      },
    })
    await expect(fetchAssignmentDashboard()).resolves.toEqual({
      assignments_total: 5, submissions_total: 30, pending_review: 4,
      graded: 20, needs_revision: 3, missing_submissions: 6,
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/assignments/dashboard', expect.objectContaining({ skipErrorToast: true }))
  })

  it('zeroes every counter when the payload is empty', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchAssignmentDashboard()).resolves.toEqual({
      assignments_total: 0, submissions_total: 0, pending_review: 0,
      graded: 0, needs_revision: 0, missing_submissions: 0,
    })
  })
})

describe('fetchMissingSubmissions', () => {
  it('returns the rows array', async () => {
    const rows = [{
      assignment_id: 4, assignment_title: 'واجب الكتابة', course_title: 'دورة',
      deadline: '2026-02-10', missing_count: 2,
      students: [{ user_id: 1, name: 'أحمد', email: 'a@b.c' }],
    }]
    mockedApi.get.mockResolvedValueOnce({ data: { data: rows } })
    await expect(fetchMissingSubmissions()).resolves.toEqual(rows)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/assignments/missing-submissions', expect.objectContaining({ skipErrorToast: true }))
  })

  it('returns [] for a non-array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { nope: true } } })
    await expect(fetchMissingSubmissions()).resolves.toEqual([])
  })
})

describe('bulkReviewSubmissions', () => {
  it('PUTs the bulk payload and coerces result counters', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { updated_count: '3', skipped_count: 1 } })
    const res = await bulkReviewSubmissions({ submission_ids: [1, 2, 3], score: 10, feedback: 'جيد', status: 'reviewed' })
    expect(mockedApi.put).toHaveBeenCalledWith('/instructor/submissions/bulk-review', {
      submission_ids: [1, 2, 3], score: 10, feedback: 'جيد', status: 'reviewed',
    })
    expect(res).toEqual({ updated_count: 3, skipped_count: 1 })
  })

  it('defaults missing counters to 0', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: {} })
    await expect(bulkReviewSubmissions({ submission_ids: [], status: 'graded' })).resolves.toEqual({
      updated_count: 0, skipped_count: 0,
    })
  })
})
