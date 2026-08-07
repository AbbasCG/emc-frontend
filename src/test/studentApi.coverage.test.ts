import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import apiClient from '@/api/axios'
import {
  normalizeStudentProgressPayload,
  normalizeStudentLmsDashboard,
  fetchStudentLmsDashboardWithEnvelope,
  fetchStudentLmsDashboard,
  STUDENT_SCOPE_REFRESH_EVENT,
  notifyStudentScopeRefresh,
  coerceFlexibleList,
  fetchStudentCoursesList,
  normalizeRegistrationRow,
  fetchStudentRegistrations,
  openStudentSessionLink,
  fetchStudentSessions,
  downloadMaterial,
  fetchStudentMaterials,
  fetchStudentAssignments,
  submitStudentAssignment,
  fetchStudentProgress,
  fetchStudentAttendance,
  fetchStudentAttendanceSummary,
  fetchStudentAvailableCourses,
  fetchStudentReviews,
  submitStudentEvaluation,
} from '@/api/studentApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost/api' },
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

function silenceLog() {
  return vi.spyOn(console, 'log').mockImplementation(() => {})
}

/* ── normalizeStudentProgressPayload ── */

describe('normalizeStudentProgressPayload', () => {
  it('returns the safe empty payload for null / non-object bodies', () => {
    for (const bad of [null, undefined, 'junk', 42]) {
      const p = normalizeStudentProgressPayload(bad)
      expect(p.course_progress).toEqual([])
      expect(p.attendance_percent).toBe(0)
      expect(p.overall_assignment_completion).toBe(0)
      expect(p.track_progress).toBeUndefined()
    }
  })

  it('normalizes a realistic wrapped payload with course + track progress', () => {
    const payload = {
      data: {
        course_progress: [
          {
            course_id: 12,
            course_title: 'دورة اللغة الإنجليزية',
            slug: 'english',
            progress_percent: 45.5,
            sessions_completed: 3,
            sessions_total: 10,
            assignments_done: 2,
            assignments_total: 5,
          },
          { title: 'بدون معرف' }, // no id anywhere → dropped
        ],
        track_progress: [
          { track_id: 4, title: 'مسار اللغة', progress_percent: 30 },
          'junk',
        ],
        attendance_percent: '88',
        overall_assignment_completion: 75,
      },
    }
    const p = normalizeStudentProgressPayload(payload)
    expect(p.course_progress).toEqual([
      {
        course_id: 12,
        course_title: 'دورة اللغة الإنجليزية',
        slug: 'english',
        progress_percent: 45.5,
        sessions_completed: 3,
        sessions_total: 10,
        assignments_done: 2,
        assignments_total: 5,
      },
    ])
    expect(p.track_progress).toEqual([{ track_id: 4, title: 'مسار اللغة', progress_percent: 30 }])
    expect(p.attendance_percent).toBe(88)
    expect(p.overall_assignment_completion).toBe(75)
  })

  it('supports alternate keys nested under `progress`, clamps negatives and floors floats', () => {
    const payload = {
      progress: {
        courses: [
          {
            id: 3,
            title: 'دورة بايثون',
            percent: 40,
            completed_sessions: -2,
            total_sessions: 8.9,
            completed_assignments: 1,
            total_assignments: 4,
          },
        ],
        attendance: 90,
        assignment_completion: 60,
      },
    }
    const p = normalizeStudentProgressPayload(payload)
    expect(p.course_progress).toHaveLength(1)
    const row = p.course_progress[0]
    expect(row.course_id).toBe(3)
    expect(row.course_title).toBe('دورة بايثون')
    expect(row.progress_percent).toBe(40)
    expect(row.sessions_completed).toBe(0) // -2 clamped
    expect(row.sessions_total).toBe(8) // floored
    expect(p.attendance_percent).toBe(90)
    expect(p.overall_assignment_completion).toBe(60)
    expect(p.track_progress).toBeUndefined()
  })

  it('finds course_progress under a doubly-wrapped data envelope with Arabic title fallback', () => {
    const p = normalizeStudentProgressPayload({ data: { data: { course_progress: [{ id: 6 }] } } })
    expect(p.course_progress).toHaveLength(1)
    expect(p.course_progress[0].course_id).toBe(6)
    expect(p.course_progress[0].course_title).toBe('دورة')
    expect(p.course_progress[0].progress_percent).toBe(0)
  })

  it('reads tracks nested under progress object', () => {
    const p = normalizeStudentProgressPayload({ progress: { tracks: [{ id: 7, title: 'مسار', percent: 55 }] } })
    expect(p.track_progress).toEqual([{ track_id: 7, title: 'مسار', progress_percent: 55 }])
  })
})

describe('fetchStudentProgress', () => {
  it('GETs /student/progress and normalizes', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { course_progress: [], attendance_percent: 10 } } })
    const p = await fetchStudentProgress()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/progress', expect.objectContaining({ skipErrorToast: true }))
    expect(p.attendance_percent).toBe(10)
  })

  it('returns the safe empty payload on network failure (never rejects)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    const p = await fetchStudentProgress()
    expect(p.course_progress).toEqual([])
  })
})

/* ── normalizeStudentLmsDashboard ── */

describe('normalizeStudentLmsDashboard', () => {
  it('returns the fully-empty dashboard for null / primitive payloads', () => {
    for (const bad of [null, undefined, 'x']) {
      const d = normalizeStudentLmsDashboard(bad)
      expect(d.progress_percent).toBe(0)
      expect(d.attendance_percent).toBe(0)
      expect(d.pending_assignments).toEqual([])
      expect(d.current_courses).toEqual([])
      expect(d.active_courses).toEqual([])
      expect(d.recent_courses).toEqual([])
      expect(d.upcoming_sessions).toEqual([])
      expect(d.notifications).toEqual([])
      expect(d.counts).toEqual({
        enrolled_courses_count: 0,
        active_courses_count: 0,
        completed_courses_count: 0,
        pending_assignments_count: 0,
        upcoming_sessions_count: 0,
        unread_notifications_count: 0,
        certificates_count: 0,
        learning_paths_count: 0,
      })
    }
  })

  it('normalizes a realistic wrapped payload: stats counts, segmented sessions, placement course', () => {
    const payload = {
      data: {
        stats: {
          enrolled_courses_count: 4,
          active_courses_count: 3,
          completed_courses_count: 1,
          pending_assignments_count: '2',
          upcoming_sessions_count: 5,
          unread_notifications_count: 7,
          certificates_count: 1,
          learning_paths_count: 2,
          training_hours: 30,
        },
        progress_percent: 55,
        attendance_percent: 80,
        current_courses: [
          {
            id: 501, // enrollment pk — must NOT win over course_id
            course_id: 12,
            title: 'دورة اللغة الإنجليزية العامة',
            slug: 'general-english',
            progress: 45,
            status: 'active',
            start_date: '2026-09-01',
            start_time: '18:00',
            meeting_link: 'https://meet.example.com/abc',
            can_start_learning: false,
            placement_progress: { status: 'written_completed' },
            course_image: 'https://cdn.example.com/covers/eng.jpg',
            class_assignment: {
              class_group_id: 9,
              name: 'مجموعة المساء',
              level_code: 'B1',
              schedule_day: 'الأحد',
              schedule_time: '18:00',
              location_type: 'online',
              meeting_link: 'https://zoom.us/j/123',
              start_date: '2026-09-01',
              instructor_name: 'أ. محمد',
              assigned_at: '2026-08-01',
            },
          },
        ],
        live_sessions: [{ id: 71, title: 'جلسة مباشرة', status: 'live', course_id: 12 }],
        upcoming_sessions: [{ id: 72, status: 'scheduled', starts_at: '2030-05-01T10:00:00Z', course_id: 12 }],
        ended_sessions: [{ id: 73, status: 'completed', starts_at: '2020-01-01T10:00:00Z' }],
        all_sessions: [{ id: 74, status: 'scheduled', starts_at: '2030-06-01T10:00:00Z' }],
        pending_assignments: [{ id: 31, title: 'واجب القراءة', status: 'pending', due_date: '2026-08-15' }],
        certificates: [
          { id: 3, title: 'شهادة إتمام', course_name: 'دورة اللغة الإنجليزية العامة', issued_at: '2026-06-01', verification_code: 'EMC-123' },
        ],
        notifications: [{ is_read: false }, { is_read: true }],
      },
    }

    const d = normalizeStudentLmsDashboard(payload)

    expect(d.progress_percent).toBe(55)
    expect(d.attendance_percent).toBe(80)
    expect(d.counts).toEqual({
      enrolled_courses_count: 4,
      active_courses_count: 3,
      completed_courses_count: 1,
      pending_assignments_count: 2,
      upcoming_sessions_count: 5,
      unread_notifications_count: 7,
      certificates_count: 1,
      learning_paths_count: 2,
    })
    expect(d.training_hours).toBe(30)

    // course mapping — course_id wins over the enrollment row id
    expect(d.current_courses).toHaveLength(1)
    const c = d.current_courses[0]
    expect(c.id).toBe(12)
    expect(c.title).toBe('دورة اللغة الإنجليزية العامة')
    expect(c.slug).toBe('general-english')
    expect(c.progress_percent).toBe(45)
    expect(c.meeting_link).toBe('https://meet.example.com/abc')
    expect(c.cover_url).toBe('https://cdn.example.com/covers/eng.jpg')
    // placement: non-completed placement_progress.status implies required
    expect(c.requires_placement_test).toBe(true)
    expect(c.placement_status).toBe('written_completed')
    expect(c.can_start_learning).toBe(false)
    expect(c.class_assignment).toEqual({
      class_group_id: 9,
      name: 'مجموعة المساء',
      level_code: 'B1',
      schedule_day: 'الأحد',
      schedule_time: '18:00',
      location_type: 'online',
      meeting_link: 'https://zoom.us/j/123',
      start_date: '2026-09-01',
      instructor_name: 'أ. محمد',
      assigned_at: '2026-08-01',
    })

    // sessions: upcoming = live + scheduled, live first (no starts_at → epoch 0)
    expect(d.upcoming_sessions.map((s) => s.id)).toEqual([71, 72])
    expect(d.live_sessions?.map((s) => s.id)).toEqual([71])
    expect(d.ended_sessions?.map((s) => s.id)).toEqual([73])
    expect(d.all_sessions?.map((s) => s.id)).toEqual([74])
    // completed_sessions falls back to ended_sessions when no flat completed list
    expect(d.completed_sessions?.map((s) => s.id)).toEqual([73])

    expect(d.pending_assignments).toHaveLength(1)
    expect(d.pending_assignments[0].title).toBe('واجب القراءة')
    expect(d.pending_assignments[0].status).toBe('pending')

    expect(d.certificates).toHaveLength(1)
    expect(d.certificates?.[0]).toEqual({
      id: 3,
      title: 'شهادة إتمام',
      course_name: 'دورة اللغة الإنجليزية العامة',
      track_name: null,
      issued_at: '2026-06-01',
      verification_code: 'EMC-123',
    })
    expect(d.certificates_count).toBe(1)

    expect(d.notifications).toHaveLength(2)
  })

  it('derives every count and average when stats is missing', () => {
    const payload = {
      current_courses: [
        { id: 1, title: 'دورة أولى', status: 'completed', training_hours: 10 },
        { id: 2, title: 'دورة ثانية', status: 'active', training_hours: 5 },
      ],
      assignments: [
        { id: 41, title: 'واجب', status: 'pending' },
        { id: 42, title: 'واجب مسلم', status: 'submitted' },
      ],
      notifications: [{ is_read: false }, { read_at: null }, { read_at: '2026-01-01' }],
      progress: [
        { progress_percentage: 40, attendance_percentage: 80 },
        { progress_percentage: 60, attendance_percentage: 100 },
      ],
    }
    const d = normalizeStudentLmsDashboard(payload)

    expect(d.progress_percent).toBe(50) // avg(40, 60)
    expect(d.attendance_percent).toBe(90) // avg(80, 100)
    expect(d.training_hours).toBe(15) // summed from course rows

    expect(d.counts.enrolled_courses_count).toBe(2)
    expect(d.counts.completed_courses_count).toBe(1)
    expect(d.counts.pending_assignments_count).toBe(1) // only pending/late
    expect(d.counts.unread_notifications_count).toBe(2) // is_read:false + read_at:null
    expect(d.counts.upcoming_sessions_count).toBe(0)
    expect(d.counts.certificates_count).toBe(0)
    expect(d.counts.learning_paths_count).toBe(0)

    // active fallback = current minus completed
    expect(d.active_courses?.map((c) => c.id)).toEqual([2])
    expect(d.counts.active_courses_count).toBe(1)
    // recent fallback = first 6 current
    expect(d.recent_courses?.map((c) => c.id)).toEqual([1, 2])

    expect(d.certificates).toBeUndefined()
    expect(d.completed_sessions).toBeUndefined()
    expect(d.ended_sessions).toBeUndefined()
  })

  it('honors alternate stats keys (courses_enrolled / assignments_pending / certificates_earned / unread_notifications)', () => {
    const d = normalizeStudentLmsDashboard({
      stats: { courses_enrolled: 9, assignments_pending: 4, certificates_earned: 2, unread_notifications: '3' },
    })
    expect(d.counts.enrolled_courses_count).toBe(9)
    expect(d.counts.pending_assignments_count).toBe(4)
    expect(d.counts.certificates_count).toBe(2)
    expect(d.counts.unread_notifications_count).toBe(3)
  })

  it('keeps label-only certificate placeholders when no normalizable certificate exists', () => {
    const d = normalizeStudentLmsDashboard({ certificates: [{ label: 'الشهادات قريباً', note: 'قيد التفعيل' }] })
    expect(d.certificates).toBeUndefined()
    expect(d.certificates_placeholder).toEqual([{ label: 'الشهادات قريباً', note: 'قيد التفعيل' }])
  })

  it('parses a flat completed_sessions array on the row', () => {
    const d = normalizeStudentLmsDashboard({
      completed_sessions: [{ id: 90, status: 'completed', starts_at: '2020-02-02T10:00:00Z' }],
    })
    expect(d.completed_sessions?.map((s) => s.id)).toEqual([90])
  })
})

/* ── dashboard fetchers ── */

describe('fetchStudentLmsDashboard(WithEnvelope)', () => {
  it('returns the raw envelope alongside the normalized dashboard', async () => {
    const body = { data: { progress_percent: 33, current_courses: [] } }
    mockedApi.get.mockResolvedValueOnce({ data: body })
    const res = await fetchStudentLmsDashboardWithEnvelope()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/dashboard', expect.objectContaining({ skipErrorToast: true }))
    expect(res.ok).toBe(true)
    expect(res.envelope).toBe(body)
    expect(res.dashboard.progress_percent).toBe(33)
  })

  it('resolves ok:false with an empty dashboard on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    const res = await fetchStudentLmsDashboardWithEnvelope()
    expect(res.ok).toBe(false)
    expect(res.envelope).toBeNull()
    expect(res.dashboard.current_courses).toEqual([])
  })

  it('fetchStudentLmsDashboard returns just the dashboard', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { attendance_percent: 70 } } })
    const d = await fetchStudentLmsDashboard()
    expect(d.attendance_percent).toBe(70)
  })
})

/* ── scope refresh event ── */

describe('notifyStudentScopeRefresh', () => {
  it('dispatches the canonical CustomEvent on window', () => {
    const spy = vi.spyOn(window, 'dispatchEvent').mockReturnValue(true)
    notifyStudentScopeRefresh()
    expect(STUDENT_SCOPE_REFRESH_EVENT).toBe('emc-student-scope-refresh')
    expect(spy).toHaveBeenCalledTimes(1)
    const evt = spy.mock.calls[0][0] as CustomEvent
    expect(evt.type).toBe('emc-student-scope-refresh')
    spy.mockRestore()
  })

  it('swallows dispatch errors silently', () => {
    const spy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(() => notifyStudentScopeRefresh()).not.toThrow()
    spy.mockRestore()
  })
})

/* ── coerceFlexibleList ── */

describe('coerceFlexibleList', () => {
  it('returns a bare array as-is', () => {
    expect(coerceFlexibleList([1, 2], ['x'])).toEqual([1, 2])
  })

  it('unwraps a {data: []} envelope', () => {
    expect(coerceFlexibleList({ data: [7] }, ['items'])).toEqual([7])
  })

  it('finds the first matching keyed array', () => {
    expect(coerceFlexibleList({ registrations: [{ a: 1 }] }, ['registrations', 'data'])).toEqual([{ a: 1 }])
  })

  it('digs into paginator-style {key: {data: []}} shapes', () => {
    expect(coerceFlexibleList({ data: { items: { data: [5] } } }, ['items'])).toEqual([5])
  })

  it('returns [] for primitives, null, and non-matching objects', () => {
    expect(coerceFlexibleList(null, ['x'])).toEqual([])
    expect(coerceFlexibleList('junk', ['x'])).toEqual([])
    expect(coerceFlexibleList({ data: 'x' }, ['k'])).toEqual([])
    expect(coerceFlexibleList({ other: [1] }, ['k'])).toEqual([])
  })
})

/* ── fetchStudentCoursesList ── */

describe('fetchStudentCoursesList', () => {
  it('normalizes rows including placement written/oral progress fields', async () => {
    const log = silenceLog()
    mockedApi.get.mockResolvedValueOnce({
      data: {
        courses: [
          {
            id: 501,
            course_id: 12,
            title: 'دورة اللغة الإنجليزية العامة',
            slug: 'general-english',
            progress_percent: 45,
            status: 'active',
            start_date: '2026-09-01',
            end_date: '2026-12-01',
            is_ended: false,
            computed_status: 'ongoing',
            lifecycle_status: 'open',
            can_start_learning: false,
            placement_progress: {
              status: 'written_completed',
              written_test: { score: 18, total_questions: 20, percentage: 90, estimated_level: 'B2' },
              oral_assessment: {
                status: 'booked',
                starts_at: '2026-08-10T15:00:00Z',
                ends_at: '2026-08-10T15:30:00Z',
                final_level: 'B2',
                oral_score: 8,
              },
            },
            course_image: 'https://cdn.example.com/covers/eng.jpg',
          },
          'junk',
          { title: 'بدون معرف' },
        ],
      },
    })

    const rows = await fetchStudentCoursesList()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/courses', expect.objectContaining({ skipErrorToast: true }))
    expect(rows).toHaveLength(1)
    const r = rows[0]
    expect(r.id).toBe(12)
    expect(r.slug).toBe('general-english')
    expect(r.requires_placement_test).toBe(true)
    expect(r.placement_status).toBe('written_completed')
    expect(r.can_start_learning).toBe(false)
    expect(r.placement_score).toBe(18)
    expect(r.placement_total).toBe(20)
    expect(r.placement_percentage).toBe(90)
    expect(r.placement_estimated_level).toBe('B2')
    expect(r.oral_booking_status).toBe('booked')
    expect(r.oral_booking_starts_at).toBe('2026-08-10T15:00:00Z')
    expect(r.oral_booking_ends_at).toBe('2026-08-10T15:30:00Z')
    expect(r.oral_final_level).toBe('B2')
    expect(r.oral_score).toBe(8)
    expect(r.is_ended).toBe(false)
    expect(r.computed_status).toBe('ongoing')
    expect(r.lifecycle_status).toBe('open')
    expect(r.cover_url).toBe('https://cdn.example.com/covers/eng.jpg')
    log.mockRestore()
  })

  it('prefers nested course.id over the enrollment row id and falls back to a synthetic title', async () => {
    const log = silenceLog()
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 999, course: { id: 44 } }] })
    const rows = await fetchStudentCoursesList()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(44)
    expect(rows[0].title).toBe('course-44')
    log.mockRestore()
  })

  it('applies null/undefined defaults on a minimal row', async () => {
    const log = silenceLog()
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 5, title: 'دورة مصغّرة' }] })
    const [r] = await fetchStudentCoursesList()
    expect(r.requires_placement_test).toBe(false)
    expect(r.placement_status).toBeNull()
    expect(r.can_start_learning).toBeNull()
    expect(r.progress_percent).toBe(0)
    expect(r.slug).toBeUndefined()
    expect(r.start_date).toBeNull()
    expect(r.is_ended).toBeNull()
    expect(r.cover_url).toBeNull()
    expect(r.class_assignment).toBeNull()
    log.mockRestore()
  })

  it('returns [] on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentCoursesList()).resolves.toEqual([])
  })
})

/* ── normalizeRegistrationRow / fetchStudentRegistrations ── */

describe('normalizeRegistrationRow', () => {
  it('normalizes a full registration with nested course, instructor, payment and access block', () => {
    const row = normalizeRegistrationRow({
      id: 301,
      course_id: 12,
      status: 'confirmed',
      created_at: '2026-08-01T00:00:00Z',
      payment: { status: 'paid' },
      placement_progress: { status: 'pending' },
      course: {
        title: 'دورة اللغة الإنجليزية',
        slug: 'english',
        start_date: '2026-09-01',
        start_time: '18:00',
        end_date: '2026-12-01',
        end_time: '20:00',
        is_ended: false,
        computed_status: 'upcoming',
        lifecycle_status: 'open',
        meeting_link: 'https://meet.example.com/x',
        instructor: { name: 'أ. سارة' },
        cover_image: '  https://cdn.example.com/c.jpg  ',
      },
      access: {
        is_paid_course: true,
        payment_required: false,
        payment_status: 'paid',
        payment_completed: true,
        payment_url: '',
        enrollment_active: true,
        can_start_placement_test: true,
        placement_test_required: true,
        can_access_learning: false,
        block_reason: 'placement_test_required',
        registration_id: 301,
      },
    })

    expect(row).not.toBeNull()
    expect(row?.id).toBe(301)
    expect(row?.course_id).toBe(12)
    expect(row?.course_title).toBe('دورة اللغة الإنجليزية')
    expect(row?.slug).toBe('english')
    expect(row?.status).toBe('confirmed')
    expect(row?.enrolled_at).toBe('2026-08-01T00:00:00Z')
    expect(row?.payment_status).toBe('paid')
    expect(row?.start_date).toBe('2026-09-01')
    expect(row?.end_time).toBe('20:00')
    expect(row?.is_ended).toBe(false)
    expect(row?.computed_status).toBe('upcoming')
    expect(row?.lifecycle_status).toBe('open')
    expect(row?.meeting_link).toBe('https://meet.example.com/x')
    expect(row?.instructor_name).toBe('أ. سارة')
    expect(row?.course_cover_url).toBe('https://cdn.example.com/c.jpg') // trimmed
    expect(row?.requires_placement_test).toBe(true)
    expect(row?.placement_status).toBe('pending')
    expect(row?.access).toEqual({
      is_paid_course: true,
      payment_required: false,
      payment_status: 'paid',
      payment_completed: true,
      payment_url: null, // empty string → null
      enrollment_active: true,
      can_start_placement_test: true,
      placement_test_required: true,
      can_access_learning: false,
      block_reason: 'placement_test_required',
      registration_id: 301,
    })
  })

  it('rejects rows missing the registration id or the course id', () => {
    expect(normalizeRegistrationRow(null)).toBeNull()
    expect(normalizeRegistrationRow('x')).toBeNull()
    expect(normalizeRegistrationRow([1])).toBeNull()
    expect(normalizeRegistrationRow({ id: 1 })).toBeNull() // no course id
    expect(normalizeRegistrationRow({ course_id: 5 })).toBeNull() // no row id
  })

  it('defaults every access flag safely and rejects non-object access blocks', () => {
    const row = normalizeRegistrationRow({ id: 1, course_id: 2, access: { registration_id: '3' } })
    expect(row?.access).toEqual({
      is_paid_course: false,
      payment_required: false,
      payment_status: null,
      payment_completed: false,
      payment_url: null,
      enrollment_active: false,
      can_start_placement_test: false,
      placement_test_required: false,
      can_access_learning: false,
      block_reason: 'no_registration',
      registration_id: null, // string is not accepted
    })

    const noAccess = normalizeRegistrationRow({ id: 1, course_id: 2, access: 'yes' })
    expect(noAccess?.access).toBeNull()
    expect(normalizeRegistrationRow({ id: 1, course_id: 2 })?.access).toBeNull()
  })

  it('synthesizes the course title and reads flat payment_status', () => {
    const row = normalizeRegistrationRow({ id: 9, course_id: 77, payment_status: ' pending ' })
    expect(row?.course_title).toBe('course-77')
    expect(row?.payment_status).toBe('pending') // trimmed
    expect(row?.requires_placement_test).toBeUndefined() // false collapses to undefined
  })
})

describe('fetchStudentRegistrations', () => {
  it('GETs /student/registrations and filters unparseable rows', async () => {
    const log = silenceLog()
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: { registrations: [{ id: 301, course_id: 12, course: { title: 'دورة' } }, null, { foo: 1 }] },
    })
    const rows = await fetchStudentRegistrations()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/registrations', expect.objectContaining({ skipErrorToast: true }))
    expect(rows).toHaveLength(1)
    expect(rows[0].course_title).toBe('دورة')
    log.mockRestore()
  })

  it('returns [] on failure', async () => {
    const log = silenceLog()
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentRegistrations()).resolves.toEqual([])
    log.mockRestore()
  })
})

/* ── openStudentSessionLink ── */

describe('openStudentSessionLink', () => {
  it('POSTs to the open-link endpoint and returns a flat meeting_url', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { meeting_url: 'https://meet.example.com/1' } })
    const url = await openStudentSessionLink(15)
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/student/sessions/15/open-link',
      {},
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(url).toBe('https://meet.example.com/1')
  })

  it('unwraps a nested data.meeting_url', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { meeting_url: 'https://meet.example.com/2' } } })
    await expect(openStudentSessionLink(15)).resolves.toBe('https://meet.example.com/2')
  })

  it('throws the Arabic error when no URL is returned', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await expect(openStudentSessionLink(15)).rejects.toThrow('لم يتم إرجاع رابط الاجتماع')
  })

  it('propagates network errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'))
    await expect(openStudentSessionLink(15)).rejects.toThrow('Network Error')
  })
})

/* ── fetchStudentSessions ── */

describe('fetchStudentSessions', () => {
  it('splits a flat array by status, merges course_sessions and dedupes by id, excluding cancelled', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, title: 'جلسة قادمة', status: 'scheduled', course_id: 12 },
          { id: 2, title: 'جلسة منتهية', status: 'completed' },
          { id: 4, title: 'جلسة ملغاة', status: 'cancelled' },
        ],
        course_sessions: [
          { id: 1, status: 'scheduled' }, // duplicate → dropped
          { id: 3, title: 'جلسة الدورة', status: 'live_now' },
        ],
      },
    })
    const res = await fetchStudentSessions()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/sessions', expect.objectContaining({ skipErrorToast: true }))
    expect(res.upcoming.map((s) => s.id)).toEqual([1, 3]) // live counts as upcoming
    expect(res.completed.map((s) => s.id)).toEqual([2])
  })

  it('reads upcoming/completed keys from an object payload and appends course_sessions to upcoming', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          upcoming: [{ id: 10, title: 'قادمة', status: 'scheduled' }],
          completed: [{ id: 11, title: 'منتهية', status: 'completed' }],
        },
        course_sessions: [{ id: 12, title: 'إضافية', status: 'scheduled' }],
      },
    })
    const res = await fetchStudentSessions()
    expect(res.upcoming.map((s) => s.id)).toEqual([10, 12])
    expect(res.completed.map((s) => s.id)).toEqual([11])
  })

  it('splits a flat `sessions` array inside an object payload', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { sessions: [{ id: 20, status: 'scheduled' }, { id: 21, status: 'completed' }] } },
    })
    const res = await fetchStudentSessions()
    expect(res.upcoming.map((s) => s.id)).toEqual([20])
    expect(res.completed.map((s) => s.id)).toEqual([21])
  })

  it('normalizes session fields: alternate timestamps, type keywords, nested course', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        {
          id: 30,
          title: 'جلسة محادثة',
          status: 'in-progress-live',
          type: 'ONLINE',
          start_at: '2030-01-01T10:00:00Z',
          end_at: '2030-01-01T11:00:00Z',
          course: { id: 12, title: 'دورة المحادثة', instructor_name: 'أ. ليلى' },
          meeting_link: 'https://zoom.us/j/9',
          platform: 'zoom',
        },
        { title: 'بدون معرف' },
      ],
    })
    const res = await fetchStudentSessions()
    expect(res.upcoming).toHaveLength(1)
    const s = res.upcoming[0]
    expect(s.status).toBe('live')
    expect(s.type).toBe('online')
    expect(s.starts_at).toBe('2030-01-01T10:00:00Z')
    expect(s.ends_at).toBe('2030-01-01T11:00:00Z')
    expect(s.course_id).toBe(12)
    expect(s.course_name).toBe('دورة المحادثة')
    expect(s.instructor_name).toBe('أ. ليلى')
    expect(s.meeting_link).toBe('https://zoom.us/j/9')
  })

  it('returns empty buckets on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentSessions()).resolves.toEqual({ upcoming: [], completed: [] })
  })
})

/* ── downloadMaterial ── */

describe('downloadMaterial', () => {
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

  it('decodes an RFC 5987 UTF-8 Arabic filename', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['bytes']),
      headers: { 'content-disposition': "attachment; filename*=UTF-8''%D9%85%D9%84%D9%81.pdf" },
    })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await downloadMaterial(5)
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/materials/5/download',
      expect.objectContaining({ responseType: 'blob', skipErrorToast: true }),
    )
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe('ملف.pdf')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    appendSpy.mockRestore()
  })

  it('falls back to the plain filename= parameter', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['bytes']),
      headers: { 'content-disposition': 'attachment; filename="report.pdf"' },
    })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await downloadMaterial(6)
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe('report.pdf')
    appendSpy.mockRestore()
  })

  it('uses the caller fallback then the synthetic material-{id} name when no header exists', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['a']), headers: {} })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await downloadMaterial(7, 'بديل.pdf')
    expect((appendSpy.mock.calls[0][0] as HTMLAnchorElement).download).toBe('بديل.pdf')
    appendSpy.mockClear()

    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['a']), headers: {} })
    await downloadMaterial(9)
    expect((appendSpy.mock.calls[0][0] as HTMLAnchorElement).download).toBe('material-9')
    appendSpy.mockRestore()
  })

  it('propagates failures so callers can render an error state', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('401'))
    await expect(downloadMaterial(5)).rejects.toThrow('401')
  })
})

/* ── fetchStudentMaterials ── */

describe('fetchStudentMaterials', () => {
  it('normalizes material rows and maps every kind keyword', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        materials: [
          { id: 1, title: 'ملف الشرح', type: 'PDF', url: 'https://x/f.pdf', size_label: '2MB', course: { id: 12, title: 'دورة' } },
          { id: 2, name: 'فيديو الدرس', kind: 'mp4', link: 'https://x/v' },
          { id: 3, type: 'programming_project' },
          { id: 4, type: 'slide-deck' },
          { id: 5, type: 'external url' },
          { id: 6 },
          { id: 7, type: 'word doc' },
          'junk',
          { title: 'بدون معرف' },
        ],
      },
    })
    const rows = await fetchStudentMaterials()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/materials', expect.objectContaining({ skipErrorToast: true }))
    expect(rows.map((m) => m.kind)).toEqual(['pdf', 'video', 'zip', 'slides', 'link', 'other', 'document'])
    expect(rows[0].course_id).toBe(12)
    expect(rows[0].course_name).toBe('دورة')
    expect(rows[1].title).toBe('فيديو الدرس')
    expect(rows[1].url).toBe('https://x/v') // link fallback
    expect(rows[5].title).toBe('مادة') // Arabic title fallback
  })

  it('returns [] on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentMaterials()).resolves.toEqual([])
  })
})

/* ── fetchStudentAssignments / submitStudentAssignment ── */

describe('fetchStudentAssignments', () => {
  it('resolves the LMS submit id, the row id and my_submission fields', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        assignments: [
          {
            id: 7,
            course_assignment_id: 55,
            lms_assignment_id: 91,
            title: 'واجب الكتابة',
            course: { id: 12, title: 'دورة الكتابة' },
            deadline: '2026-08-20',
            max_points: 100,
            my_submission: { id: 400, status: 'graded', score: 88, feedback: 'ممتاز', submitted_at: '2026-08-18T10:00:00Z' },
          },
          { assignment_id: 12, title: 'واجب بسيط' },
          { title: 'بدون معرف' },
        ],
      },
    })
    const rows = await fetchStudentAssignments()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/assignments', expect.objectContaining({ skipErrorToast: true }))
    expect(rows).toHaveLength(2)

    expect(rows[0]).toEqual({
      id: 55, // course_assignment_id wins for the row id
      course_id: 12,
      assignment_id: 91, // lms id wins for the submit id
      title: 'واجب الكتابة',
      course_name: 'دورة الكتابة',
      due_at: '2026-08-20',
      status: 'graded',
      score: 88,
      max_score: 100,
      feedback: 'ممتاز',
      submitted_at: '2026-08-18T10:00:00Z',
      submission_id: 400,
    })

    expect(rows[1].assignment_id).toBe(12)
    expect(rows[1].id).toBe(12)
    expect(rows[1].status).toBe('pending') // no status, no submission
    expect(rows[1].course_id).toBeNull()
  })

  it('returns [] on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentAssignments()).resolves.toEqual([])
  })
})

describe('submitStudentAssignment', () => {
  it('passes a caller-built FormData through untouched and normalizes the response', async () => {
    const fd = new FormData()
    fd.append('text_answer', 'إجابتي')
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { id: 3, status: 'submitted', submitted_at: '2026-08-01T00:00:00Z' } },
    })
    const res = await submitStudentAssignment(91, fd)
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/student/assignments/91/submit',
      fd,
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(res).toEqual({ status: 'submitted', submitted_at: '2026-08-01T00:00:00Z', submission_id: 3 })
  })

  it('builds FormData from an object payload, duplicating the text under both field names', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const file = new File(['x'], 'homework.pdf', { type: 'application/pdf' })
    const res = await submitStudentAssignment(91, { answer_text: 'الإجابة النصية', notes: 'ملاحظة', file })

    const [url, body] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/student/assignments/91/submit')
    expect(body.get('text_answer')).toBe('الإجابة النصية')
    expect(body.get('answer_text')).toBe('الإجابة النصية')
    expect(body.get('notes')).toBe('ملاحظة')
    expect(body.get('file')).toBe(file)

    // res.data has no data key → unwrap returns {} → defaults
    expect(res.status).toBe('submitted')
    expect(res.submission_id).toBeNull()
    expect(typeof res.submitted_at).toBe('string') // synthesized ISO timestamp
  })

  it('omits empty text/notes/file fields entirely', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await submitStudentAssignment(91, { file: null })
    const [, body] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(body.get('text_answer')).toBeNull()
    expect(body.get('answer_text')).toBeNull()
    expect(body.get('notes')).toBeNull()
    expect(body.get('file')).toBeNull()
  })

  it('propagates submission failures', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(submitStudentAssignment(91, new FormData())).rejects.toThrow('422')
  })
})

/* ── attendance ── */

describe('fetchStudentAttendance', () => {
  it('normalizes attendance rows with alternate id/title keys and em-dash fallbacks', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            attendance_id: 5,
            session_id: '44',
            course_session_id: 9,
            title: 'جلسة المحادثة الأولى',
            course_id: 12,
            course_title: 'دورة المحادثة',
            date: '2026-08-01',
            starts_at: '2026-08-01T18:00:00Z',
            status: 'present',
            notes: 'حضر في الوقت',
            marked_at: '2026-08-01T18:05:00Z',
          },
          { id: 2 },
          { foo: 1 },
        ],
      },
    })
    const rows = await fetchStudentAttendance()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/attendance', expect.objectContaining({ skipErrorToast: true }))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      id: 5,
      session_id: 44,
      course_session_id: 9,
      session_title: 'جلسة المحادثة الأولى',
      course_id: 12,
      course_title: 'دورة المحادثة',
      date: '2026-08-01',
      starts_at: '2026-08-01T18:00:00Z',
      status: 'present',
      notes: 'حضر في الوقت',
      marked_at: '2026-08-01T18:05:00Z',
    })
    expect(rows[1].session_title).toBe('—')
    expect(rows[1].status).toBe('—')
    expect(rows[1].session_id).toBeNull()
  })

  it('returns [] on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentAttendance()).resolves.toEqual([])
  })
})

describe('fetchStudentAttendanceSummary', () => {
  it('passes course_id as a param only when provided and unwraps data', async () => {
    const summary = {
      total: 10,
      present_count: 8,
      absent_count: 1,
      late_count: 1,
      excused_count: 0,
      attendance_percentage: 80,
      current_attendance_streak: 3,
      current_absence_streak: 0,
      current_late_streak: 0,
      longest_attendance_streak: 5,
      longest_absence_streak: 1,
      risk_level: 'medium' as const,
    }
    mockedApi.get.mockResolvedValueOnce({ data: { data: summary } })
    await expect(fetchStudentAttendanceSummary(12)).resolves.toEqual(summary)
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/student/attendance/summary',
      expect.objectContaining({ params: { course_id: 12 }, skipErrorToast: true }),
    )

    mockedApi.get.mockResolvedValueOnce({ data: { data: summary } })
    await fetchStudentAttendanceSummary()
    expect(mockedApi.get).toHaveBeenLastCalledWith(
      '/student/attendance/summary',
      expect.objectContaining({ params: {} }),
    )
  })

  it('returns the zeroed summary when the body has no data key', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const s = await fetchStudentAttendanceSummary()
    expect(s.total).toBe(0)
    expect(s.attendance_percentage).toBe(0)
    expect(s.risk_level).toBe('low')
  })

  it('propagates failures (no catch in this fetcher)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentAttendanceSummary()).rejects.toThrow('Network Error')
  })
})

/* ── available courses ── */

describe('fetchStudentAvailableCourses', () => {
  it('extracts object rows from a keyed list', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { courses: [{ id: 1, title: 'دورة متاحة', slug: 'open-course' }, null, 'junk'] },
    })
    const rows = await fetchStudentAvailableCourses()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/available-courses', expect.objectContaining({ skipErrorToast: true }))
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('دورة متاحة')
  })

  it('returns [] for an empty list and on failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchStudentAvailableCourses()).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentAvailableCourses()).resolves.toEqual([])
  })
})

/* ── reviews / evaluations ── */

describe('fetchStudentReviews', () => {
  it('normalizes review rows: nested course id, numeric-string registration id, created_at fallback', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        reviews: [
          { id: 1, course: { id: 33 }, registration_id: '77', created_at: '2026-05-01' },
          { id: 2, course_id: 8, registration_id: '' },
          { id: 'x' },
          null,
        ],
      },
    })
    const rows = await fetchStudentReviews()
    expect(mockedApi.get).toHaveBeenCalledWith('/student/reviews', expect.objectContaining({ skipErrorToast: true }))
    expect(rows).toEqual([
      { id: 1, course_id: 33, registration_id: 77, submitted_at: '2026-05-01' },
      { id: 2, course_id: 8, registration_id: null, submitted_at: null },
    ])
  })

  it('returns [] on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentReviews()).resolves.toEqual([])
  })
})

describe('submitStudentEvaluation', () => {
  it('POSTs the evaluation body to /student/evaluations', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } })
    const body = {
      course_id: 12,
      registration_id: 301,
      overall_rating: 5,
      content_quality: 5,
      instructor_quality: 4,
      organization_quality: 5,
      comment: 'دورة ممتازة، شكراً للمدرس',
    }
    await submitStudentEvaluation(body)
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/student/evaluations',
      body,
      expect.objectContaining({ skipErrorToast: true }),
    )
  })

  it('propagates failures (caller shows the error)', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(
      submitStudentEvaluation({ overall_rating: 1, content_quality: 1, instructor_quality: 1, organization_quality: 1 }),
    ).rejects.toThrow('422')
  })
})
