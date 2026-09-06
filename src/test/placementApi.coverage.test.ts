import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  PLACEMENT_LEVELS,
  getLevelFromScore,
  progressFromStatus,
  deriveStudentPlacementState,
  fetchPlacementStatus,
  startPlacementTest,
  fetchPlacementTest,
  submitPlacementTest,
  logExamViolation,
  fetchOralSlots,
  bookOralSlot,
  fetchInstructorPlacementStudents,
  completeOralAssessment,
  fetchInstructorOralAssessments,
  fetchInstructorAvailability,
  createInstructorAvailability,
  deleteInstructorAvailability,
  fetchOralBookingDetail,
  updateOralBookingStatus,
  sendOralBookingMessage,
  rescheduleOralBooking,
  updateOralBookingMeetingLink,
  fetchInstructorAllPlacementTests,
  fetchPlacementTestAnswers,
  fetchInstructorClasses,
  fetchCourseClasses,
  createClassGroup,
  updateClassGroup,
  deleteClassGroup,
  fetchCourseEnrolledStudents,
  fetchClassAssignmentStudents,
  assignStudentToClass,
  removeStudentFromClass,
  fetchClassGroupStudents,
  fetchClassGroupDetail,
  fetchClassGroupAnnouncements,
  createClassAnnouncement,
  publishClassAnnouncement,
  archiveClassAnnouncement,
  fetchStudentClassAnnouncements,
  fetchClassGroupSessions,
  createClassGroupSession,
  normalizeLmsSessionEvent,
  fetchInstructorSessionCalendar,
  fetchClassSessionDetail,
  transitionClassSession,
  deleteClassSession,
  previewClassSessionGeneration,
  generateClassSessions,
  updateClassSession,
  fetchStudentSessions,
  fetchStudentSessionCalendar,
  fetchStudentSessionDetail,
  fetchClassGroupAttendance,
  fetchClassGroupMaterials,
  fetchClassGroupAssignments,
  type PlacementProgress,
  type OralSlot,
  type LmsSessionEvent,
} from '@/api/placementApi'

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

const silent = expect.objectContaining({ skipErrorToast: true })

/* ══════════════════════════════════════════════════════════════════
   PURE HELPERS
══════════════════════════════════════════════════════════════════ */

describe('progressFromStatus', () => {
  it('null/undefined status yields safe not_started progress', () => {
    const expected: PlacementProgress = {
      status: 'not_started',
      written_done: false,
      oral_booked: false,
      oral_done: false,
      level_approved: false,
      can_start: false,
    }
    expect(progressFromStatus(null)).toEqual(expected)
    expect(progressFromStatus(undefined)).toEqual(expected)
  })

  it('completed status enables every step flag', () => {
    expect(progressFromStatus('completed')).toEqual({
      status: 'completed',
      written_done: true,
      oral_booked: true,
      oral_done: true,
      level_approved: true,
      can_start: true,
    })
  })

  it('written_submitted marks only the written step done', () => {
    const p = progressFromStatus('written_submitted')
    expect(p.written_done).toBe(true)
    expect(p.oral_booked).toBe(false)
    expect(p.oral_done).toBe(false)
    expect(p.level_approved).toBe(false)
    expect(p.can_start).toBe(false)
  })

  it('oral_booked marks written + booked but not done', () => {
    const p = progressFromStatus('oral_booked')
    expect(p.written_done).toBe(true)
    expect(p.oral_booked).toBe(true)
    expect(p.oral_done).toBe(false)
  })

  it('oral_completed marks oral done without level approval', () => {
    const p = progressFromStatus('oral_completed')
    expect(p.oral_done).toBe(true)
    expect(p.level_approved).toBe(false)
    expect(p.can_start).toBe(false)
  })

  it('canStartOverride forces can_start without level approval', () => {
    const p = progressFromStatus('in_progress', true)
    expect(p.can_start).toBe(true)
    expect(p.level_approved).toBe(false)
  })

  it('does NOT alias backend statuses (waiting_oral passes through unmapped)', () => {
    // Documents current behavior: aliasing happens in fetchPlacementStatus
    // (coalesceStatus), not in progressFromStatus.
    const p = progressFromStatus('waiting_oral')
    expect(p.written_done).toBe(false)
    expect(p.status).toBe('waiting_oral')
  })
})

describe('deriveStudentPlacementState', () => {
  it('completed enrollment always wins', () => {
    expect(deriveStudentPlacementState(true, 'not_started', false, 'completed', 100)).toBe('COURSE_COMPLETED')
  })

  it('no placement required → LEVEL_APPROVED, or COURSE_ACTIVE with progress', () => {
    expect(deriveStudentPlacementState(false, null, null)).toBe('LEVEL_APPROVED')
    expect(deriveStudentPlacementState(false, null, null, 'active', 40)).toBe('COURSE_ACTIVE')
  })

  it('completed placement approves the level; progress flips to active', () => {
    expect(deriveStudentPlacementState(true, 'completed', false)).toBe('LEVEL_APPROVED')
    expect(deriveStudentPlacementState(true, 'completed', false, 'active', 10)).toBe('COURSE_ACTIVE')
  })

  it('canStartLearning override approves the level before status is completed', () => {
    expect(deriveStudentPlacementState(true, 'written_submitted', true)).toBe('LEVEL_APPROVED')
  })

  it('maps each intermediate placement status to its canonical state', () => {
    expect(deriveStudentPlacementState(true, 'oral_completed', false)).toBe('ORAL_COMPLETED_PENDING_APPROVAL')
    expect(deriveStudentPlacementState(true, 'oral_booked', false)).toBe('ORAL_BOOKED')
    expect(deriveStudentPlacementState(true, 'written_submitted', false)).toBe('WRITTEN_COMPLETED')
    expect(deriveStudentPlacementState(true, 'in_progress', false)).toBe('WRITTEN_IN_PROGRESS')
    expect(deriveStudentPlacementState(true, 'placement_required', false)).toBe('NOT_STARTED')
    expect(deriveStudentPlacementState(true, null, false)).toBe('NOT_STARTED')
  })
})

describe('PLACEMENT_LEVELS / getLevelFromScore', () => {
  it('every level has an Arabic label and description', () => {
    const expected: Record<string, string> = {
      beginner: 'مبتدئ',
      elementary: 'ابتدائي',
      pre_intermediate: 'ما قبل المتوسط',
      intermediate: 'متوسط',
      upper_intermediate: 'فوق المتوسط',
      advanced: 'متقدم',
    }
    expect(PLACEMENT_LEVELS).toHaveLength(6)
    for (const lvl of PLACEMENT_LEVELS) {
      expect(lvl.label).toBe(expected[lvl.level])
      expect(lvl.description.length).toBeGreaterThan(0)
    }
  })

  it('maps raw 1–70 scores into their bands', () => {
    expect(getLevelFromScore(3).level).toBe('beginner')
    expect(getLevelFromScore(10).level).toBe('elementary')
    expect(getLevelFromScore(25).level).toBe('pre_intermediate')
    expect(getLevelFromScore(40).level).toBe('intermediate')
    expect(getLevelFromScore(55).level).toBe('upper_intermediate')
    expect(getLevelFromScore(68).level).toBe('advanced')
  })

  it('rescales when the total is not 70', () => {
    // 5/10 → scaled 35 → intermediate band [35, 48]
    expect(getLevelFromScore(5, 10).level).toBe('intermediate')
  })

  it('clamps out-of-range scores to the nearest band', () => {
    expect(getLevelFromScore(0).level).toBe('beginner')
    expect(getLevelFromScore(200).level).toBe('advanced')
  })
})

/* ══════════════════════════════════════════════════════════════════
   STUDENT API — fetchPlacementStatus
══════════════════════════════════════════════════════════════════ */

describe('fetchPlacementStatus', () => {
  it('normalizes the standard Laravel shape with attempt + oral booking', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          status: 'oral_booked',
          attempt: {
            id: 12, course_id: 3, status: 'oral_booked',
            written_score: 42, total_questions: 70, written_level: 'intermediate',
            submitted_at: '2026-08-01T10:00:00Z',
            oral_booking_id: 77, oral_booking_at: '2026-08-09T12:00:00Z',
            can_start_course: false, created_at: '2026-08-01T09:00:00Z',
          },
          can_book_oral: false,
          can_take_written_test: false,
          oral_booking: {
            id: 77, instructor_id: 4, instructor: { name: 'أ. محمد' },
            starts_at: '2026-08-09T12:00:00Z', ends_at: '2026-08-09T12:30:00Z',
            status: 'booked', meeting_link: 'https://meet.example/x',
          },
          can_start_learning: false,
        },
      },
    })

    const res = await fetchPlacementStatus(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/courses/3/placement-test/status', silent)
    expect(res.status).toBe('oral_booked')
    expect(res.attempt).toMatchObject({
      id: 12,
      written_score: 42,
      total_questions: 70,
      percentage: 60, // round(42/70*100)
      written_level: 'intermediate',
      estimated_level: 'intermediate',
      submitted_at: '2026-08-01T10:00:00Z',
      oral_booking_id: 77,
    })
    expect(res.oral_booking).toMatchObject({
      id: 77,
      instructor_name: 'أ. محمد', // resolved from nested instructor.name
      starts_at: '2026-08-09T12:00:00Z',
      ends_at: '2026-08-09T12:30:00Z',
      meeting_link: 'https://meet.example/x',
    })
    expect(res.can_book_oral).toBe(false)
    expect(res.can_take_written_test).toBe(false)
    expect(res.can_start_learning).toBe(false)
  })

  it('trusts a terminal attempt status over a top-level not_started', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { status: 'not_started', attempt: { id: 1, status: 'completed', can_start_course: true } } },
    })
    const res = await fetchPlacementStatus(3)
    expect(res.status).toBe('completed')
    expect(res.can_start_learning).toBe(true) // attempt.can_start_course
  })

  it('remaps written_test { status: completed } to written_submitted and derives flags', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { written_test: { id: 2, status: 'completed', score: 55, total: 70 } } },
    })
    const res = await fetchPlacementStatus(3)
    expect(res.status).toBe('written_submitted')
    expect(res.attempt).toMatchObject({ written_score: 55, total_questions: 70, percentage: 79 })
    expect(res.can_book_oral).toBe(true)       // derived: attempt is written_submitted
    expect(res.can_take_written_test).toBe(false) // derived: attempt in terminal state
  })

  it('coalesces backend alias statuses (case/whitespace-insensitive)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { status: ' Waiting_Oral ' } } })
    expect((await fetchPlacementStatus(3)).status).toBe('written_submitted')

    mockedApi.get.mockResolvedValueOnce({ data: { data: { status: 'booked' } } })
    expect((await fetchPlacementStatus(3)).status).toBe('oral_booked')
  })

  it('reads status nested under placement_progress', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { placement_progress: { status: 'in_progress', can_take_written_test: false } } },
    })
    const res = await fetchPlacementStatus(3)
    expect(res.status).toBe('in_progress')
    expect(res.can_take_written_test).toBe(false)
    expect(res.attempt).toBeNull()
  })

  it('reconstructs a minimal oral booking from attempt scalar fields', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          status: 'oral_booked',
          attempt: { id: 5, status: 'oral_booked', oral_booking_id: 9, oral_booking_at: '2026-08-11T12:00:00Z' },
        },
      },
    })
    const res = await fetchPlacementStatus(3)
    expect(res.oral_booking).toMatchObject({ id: 9, starts_at: '2026-08-11T12:00:00Z' })
  })

  it('accepts a bare string response as the status', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: 'completed' })
    const res = await fetchPlacementStatus(3)
    expect(res.status).toBe('completed')
    expect(res.attempt).toBeNull()
  })

  it('falls back to a safe default when the payload is malformed', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    expect(await fetchPlacementStatus(3)).toEqual({
      status: 'not_started',
      attempt: null,
      can_book_oral: false,
      can_take_written_test: true,
      oral_booking: null,
      can_start_learning: false,
    })
  })

  it('never rejects — returns the safe default on network error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    const res = await fetchPlacementStatus(3)
    expect(res.status).toBe('not_started')
    expect(res.can_take_written_test).toBe(true)
  })
})

/* ══════════════════════════════════════════════════════════════════
   STUDENT API — start / fetch / submit test
══════════════════════════════════════════════════════════════════ */

describe('startPlacementTest', () => {
  it('normalizes questions from every supported option shape', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          test: {
            id: 4, course_id: 3, title: 'اختبار تحديد مستوى اللغة', duration_minutes: 45,
            questions: [
              // string-array options — empty entries filtered, keys stay positional
              { id: 1, question: 'ما معنى كلمة "قط"؟', choices: ['حيوان أليف', 'نبات', '', 'طائر'] },
              // object options — explicit key uppercased, missing key falls back to letter
              { id: 2, text: 'اختر الإجابة الصحيحة', options: [{ key: 'a', text: 'صحيح' }, { label: 'خطأ' }] },
              // flat DB fields
              { id: 3, question_text: 'أكمل الجملة', option_a: 'ذهبتُ', option_b: 'ذهبوا' },
              // no options at all — dropped
              { id: 4, text: 'بدون خيارات' },
            ],
          },
          attempt: { id: 9, course_id: 3, status: 'in_progress' },
        },
      },
    })

    const res = await startPlacementTest(3)
    expect(mockedApi.post).toHaveBeenCalledWith('/student/courses/3/placement-test/start', {}, silent)

    expect(res.questions).toHaveLength(3)
    expect(res.questions[0]).toEqual({
      id: 1,
      text: 'ما معنى كلمة "قط"؟',
      options: [
        { key: 'A', text: 'حيوان أليف' },
        { key: 'B', text: 'نبات' },
        { key: 'D', text: 'طائر' },
      ],
    })
    expect(res.questions[1].options).toEqual([
      { key: 'A', text: 'صحيح' },
      { key: 'B', text: 'خطأ' },
    ])
    expect(res.questions[2].options).toEqual([
      { key: 'A', text: 'ذهبتُ' },
      { key: 'B', text: 'ذهبوا' },
    ])

    expect(res.test).toMatchObject({
      id: 4,
      title: 'اختبار تحديد مستوى اللغة',
      duration_minutes: 45,
      total_questions: 3, // recomputed from normalized questions
    })
    expect(res.attempt).toMatchObject({ id: 9, status: 'in_progress' })
  })

  it('survives an empty payload with safe defaults', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const res = await startPlacementTest(3)
    expect(res.questions).toEqual([])
    expect(res.attempt).toBeNull()
    expect(res.test).toMatchObject({
      id: 0,
      title: 'اختبار تحديد المستوى',
      total_questions: 0,
      duration_minutes: 30,
    })
  })

  it('propagates errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'))
    await expect(startPlacementTest(3)).rejects.toThrow('Network Error')
  })
})

describe('fetchPlacementTest', () => {
  it('finds double-wrapped questions and applies defaults', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { data: { questions: [{ id: 1, question: 'س؟', option_a: 'أ', option_b: 'ب' }] } } },
    })
    const test = await fetchPlacementTest(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/courses/3/placement-test', silent)
    expect(test.questions).toHaveLength(1)
    expect(test.total_questions).toBe(1)
    expect(test.title).toBe('اختبار تحديد المستوى')
    expect(test.duration_minutes).toBe(30)
  })

  it('unwraps paginated questions ({ data: [...] }) and reads time_limit as duration', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          test: {
            id: 2, time_limit: 20,
            questions: { data: [{ id: 7, text: 'اختر', options: ['أ', 'ب'] }], total: 1 },
          },
        },
      },
    })
    const test = await fetchPlacementTest(3)
    expect(test.id).toBe(2)
    expect(test.duration_minutes).toBe(20)
    expect(test.questions[0].id).toBe(7)
  })
})

describe('submitPlacementTest', () => {
  it('lowercases answers and posts them keyed by question id', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { result: { score: 50, total: 70, estimated_level: 'intermediate' }, attempt: { id: 5, status: 'written_submitted', score: 50, total: 70 } } },
    })
    const res = await submitPlacementTest(3, { 1: 'A', 2: 'B' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/student/courses/3/placement-test/submit',
      { answers: { '1': 'a', '2': 'b' } },
      silent,
    )
    expect(res.score).toBe(50)
    expect(res.total).toBe(70)
    expect(res.percentage).toBe(71)
    expect(res.estimated_level).toBe('intermediate')
    expect(res.level_label).toBe('متوسط')
    expect(res.attempt).toMatchObject({ id: 5, written_score: 50, total_questions: 70, percentage: 71 })
  })

  it('falls back to the score-derived level label when the backend level is unknown', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { score: 3, total: 70, estimated_level: 'غير معروف' } },
    })
    const res = await submitPlacementTest(3, {})
    expect(res.estimated_level).toBe('غير معروف') // key preserved as-is
    expect(res.level_label).toBe('مبتدئ')          // label from getLevelFromScore(3, 70)
    expect(res.attempt).toBeNull()
  })

  it('returns safe zeros for an empty payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const res = await submitPlacementTest(3, {})
    expect(res).toMatchObject({ score: 0, total: 70, percentage: 0, estimated_level: 'beginner', level_label: 'مبتدئ', attempt: null })
  })

  it('propagates errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('boom'))
    await expect(submitPlacementTest(3, {})).rejects.toThrow('boom')
  })
})

describe('logExamViolation', () => {
  it('posts the violation with its metadata', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await logExamViolation(3, 'tab_switch', { count: 2 })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/student/courses/3/placement-test/violations',
      { violation_type: 'tab_switch', meta: { count: 2 } },
      silent,
    )
  })

  it('never throws when logging fails (fire-and-forget)', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'))
    await expect(logExamViolation(3, 'copy')).resolves.toBeUndefined()
  })
})

/* ══════════════════════════════════════════════════════════════════
   STUDENT API — oral slots + booking
══════════════════════════════════════════════════════════════════ */

describe('fetchOralSlots', () => {
  it('normalizes slots with date/time fields and derives end_time from duration', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          slots: [{
            id: 1, instructor_id: 2, instructor: { name: 'أ. سمير' },
            date: '2026-08-10', time: '10:00:00', duration_minutes: 30,
            is_available: true, meeting_link: null,
          }],
        },
      },
    })
    const slots = await fetchOralSlots(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/courses/3/oral-assessment/slots', silent)
    const expected: OralSlot = {
      id: 1, instructor_id: 2, instructor_name: 'أ. سمير',
      date: '2026-08-10', time: '10:00', end_time: '10:30',
      duration_minutes: 30, is_available: true, meeting_link: null,
    }
    expect(slots).toEqual([expected])
  })

  it('derives date/time/duration from starts_at/ends_at ISO strings (root-array response)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{ id: 2, starts_at: '2026-08-10T12:00:00', ends_at: '2026-08-10T13:30:00' }],
    })
    const [slot] = await fetchOralSlots(3)
    expect(slot.date).toBe('2026-08-10')
    expect(slot.time).toBe('12:00')
    expect(slot.end_time).toBe('13:30')
    expect(slot.duration_minutes).toBe(90)
    expect(slot.is_available).toBe(true)
    expect(slot.instructor_name).toBe('')
  })

  it('rolls the derived end_time over midnight', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { slots: [{ id: 3, date: '2026-08-10', time: '23:45' }] } },
    })
    const [slot] = await fetchOralSlots(3)
    expect(slot.end_time).toBe('00:15')
  })

  it('respects an explicit is_available: false', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { slots: [{ id: 4, date: '2026-08-10', time: '10:00', is_available: false }] } },
    })
    expect((await fetchOralSlots(3))[0].is_available).toBe(false)
  })

  it('returns safe defaults for non-object slot entries', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { items: [null, 'x'] } } })
    const slots = await fetchOralSlots(3)
    expect(slots).toHaveLength(2)
    for (const s of slots) {
      expect(s).toEqual({
        id: 0, instructor_id: 0, instructor_name: '', date: '', time: '',
        end_time: '', duration_minutes: 30, is_available: false, meeting_link: null,
      })
    }
  })

  it('finds slots in a double-wrapped payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: { slots: [{ id: 9 }] } } } })
    const slots = await fetchOralSlots(3)
    expect(slots).toHaveLength(1)
    expect(slots[0].id).toBe(9)
  })

  it('returns [] when no known key matches', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { message: 'لا توجد مواعيد' } })
    expect(await fetchOralSlots(3)).toEqual([])
  })

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchOralSlots(3)).rejects.toThrow('boom')
  })
})

describe('bookOralSlot', () => {
  it('sends the attempt id when provided and normalizes the attempt (alias fields)', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { id: 11, course_id: 3, status: 'booked', score: 40, total: 70, completed_at: '2026-08-05T10:00:00Z', percentage: 10 } },
    })
    const attempt = await bookOralSlot(3, 5, 11)
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/student/courses/3/oral-assessment/book',
      { slot_id: 5, placement_test_attempt_id: 11 },
      silent,
    )
    expect(attempt.status).toBe('oral_booked')      // 'booked' alias
    expect(attempt.written_score).toBe(40)           // from plain score
    expect(attempt.total_questions).toBe(70)         // from plain total
    expect(attempt.percentage).toBe(57)              // recomputed, backend 10 ignored
    expect(attempt.submitted_at).toBe('2026-08-05T10:00:00Z') // completed_at fallback
  })

  it('omits the attempt id when null and defaults an empty response', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const attempt = await bookOralSlot(3, 5, null)
    expect(mockedApi.post).toHaveBeenCalledWith('/student/courses/3/oral-assessment/book', { slot_id: 5 }, silent)
    expect(attempt).toMatchObject({ id: 0, course_id: 0, status: 'not_started', written_score: null, can_start_course: false })
  })

  it('uses the backend percentage only when score/total are absent', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 1, percentage: '88' } } })
    expect((await bookOralSlot(3, 5)).percentage).toBe(88)
  })
})

/* ══════════════════════════════════════════════════════════════════
   INSTRUCTOR API — placement students
══════════════════════════════════════════════════════════════════ */

describe('fetchInstructorPlacementStudents', () => {
  it('reads the canonical nested resource shape first', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          students: [{
            attempt_id: 11, booking_id: 22,
            student: { id: 5, name: 'سارة أحمد', email: 'sara@example.com' },
            placement: {
              written: { score: 60, total: 70, percentage: 86, level: 'upper_intermediate' },
              oral: { score: 90, level: 'B2' },
              final_level: 'C1',
            },
            placement_status: 'completed',
            written_assessment: { time_spent_seconds: 1200, correct_answers: 60, wrong_answers: 8, skipped_answers: 2 },
            summary: {
              overall_score: 88, recommended_level: 'C1', recommended_class: 'C1-A',
              recommended_track: 'عام', confidence_score: 0.9,
              assessment_status: 'completed', assignment_status: 'assigned',
            },
            avatar_url: 'https://cdn/a.png',
            submitted_at: '2026-08-01T10:00:00Z',
            instructor_notes: 'أداء ممتاز',
          }],
        },
      },
    })

    const rows = await fetchInstructorPlacementStudents(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/3/placement-students', silent)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      attempt_id: 11,
      booking_id: 22,
      student_id: 5,
      student_name: 'سارة أحمد',
      email: 'sara@example.com',
      written_score: 60,
      total_questions: 70,
      percentage: 86,
      written_level: 'upper_intermediate',
      oral_score: 90,
      final_level: 'C1',
      status: 'completed',
      submitted_at: '2026-08-01T10:00:00Z',
      notes: 'أداء ممتاز',
      avatar_url: 'https://cdn/a.png',
      time_spent_seconds: 1200,
      written_stats: { correct_answers: 60, wrong_answers: 8, skipped_answers: 2 },
      summary: {
        overall_score: 88, recommended_level: 'C1', recommended_class: 'C1-A',
        recommended_track: 'عام', confidence_score: 0.9,
        assessment_status: 'completed', assignment_status: 'assigned',
      },
      is_assigned: true, // via summary.assignment_status === 'assigned'
    })
  })

  it('falls back to legacy flat fields and maps instructor status aliases', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          students: [{
            student_id: 6, student_name: 'عمر', email: 'omar@example.com',
            written_score: '50', total_questions: 70, status: 'waiting_oral',
            profile_photo_url: 'https://cdn/b.png', notes: 'يحتاج مقابلة',
          }],
        },
      },
    })
    const [row] = await fetchInstructorPlacementStudents(3)
    expect(row).toMatchObject({
      student_id: 6,
      student_name: 'عمر',
      written_score: 50,
      total_questions: 70,
      percentage: 71,
      status: 'written_submitted', // waiting_oral alias
      avatar_url: 'https://cdn/b.png',
      notes: 'يحتاج مقابلة',
      written_level: null,
      submitted_at: null,
      oral_score: null,
      final_level: null,
      written_stats: null,
      summary: null,
      is_assigned: false,
      attempt_id: 0,
      booking_id: 0,
    })
  })

  it('reads score/level/booking nested under placement_progress', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          students: [{
            student_id: 7, name: 'منى', email: 'm@x.com',
            placement_progress: {
              status: 'oral_booked',
              written_test: { id: 77, score: 45, total_questions: 70, estimated_level: 'intermediate' },
              oral_assessment: { id: 88, starts_at: '2026-08-12T10:00:00Z' },
            },
          }],
        },
      },
    })
    const [row] = await fetchInstructorPlacementStudents(3)
    expect(row).toMatchObject({
      student_name: 'منى',
      written_score: 45,
      total_questions: 70,
      percentage: 64,
      written_level: 'intermediate',
      status: 'oral_booked',
      oral_booking_at: '2026-08-12T10:00:00Z',
      attempt_id: 77,
      booking_id: 88,
    })
  })

  it('returns [] for an empty payload and propagates errors', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchInstructorPlacementStudents(3)).toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchInstructorPlacementStudents(3)).rejects.toThrow('boom')
  })
})

describe('completeOralAssessment', () => {
  it('patches the completion endpoint and maps the returned booking', async () => {
    mockedApi.patch.mockResolvedValueOnce({
      data: { data: { id: 22, status: 'completed', oral_score: 88, final_level: 'B2', instructor_notes: 'جيد جداً' } },
    })
    const res = await completeOralAssessment(22, { final_level: 'B2', oral_score: 88, instructor_notes: 'جيد جداً' })
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/instructor/oral-assessments/22/complete',
      { final_level: 'B2', oral_score: 88, instructor_notes: 'جيد جداً' },
    )
    expect(res).toEqual({ id: 22, status: 'completed', oral_score: 88, final_level: 'B2', instructor_notes: 'جيد جداً' })
  })

  it('defaults id/status when the response is empty', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    const res = await completeOralAssessment(9, { final_level: 'A2' })
    expect(res).toEqual({ id: 9, status: 'completed', oral_score: null, final_level: null, instructor_notes: null })
  })

  it('propagates errors', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('403'))
    await expect(completeOralAssessment(9, { final_level: 'A2' })).rejects.toThrow('403')
  })
})

describe('fetchInstructorOralAssessments', () => {
  it('normalizes rows with alias score fields, nested booking and rubric scores', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [{
          id: 9, attempt_id: 15, student_id: 3,
          student_name: 'ليلى', student_email: 'l@x.com',
          course_id: 2, course: { title: 'دورة الإنجليزية' },
          score: 40, total_questions: 70, written_level: 'elementary',
          oral_booking: { starts_at: '2026-08-12T10:00:00Z', ends_at: '2026-08-12T10:30:00Z' },
          placement_status: 'oral_booked',
          pronunciation_score: 15, grammar_score: 16,
        }],
      },
    })
    const rows = await fetchInstructorOralAssessments()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/oral-assessments', silent)
    expect(rows[0]).toMatchObject({
      id: 9,
      attempt_id: 15,
      student_name: 'ليلى',
      course_title: 'دورة الإنجليزية',
      written_score: 40,
      percentage: 57,
      estimated_level: 'elementary',
      oral_booking_at: '2026-08-12T10:00:00Z',
      oral_booking_ends_at: '2026-08-12T10:30:00Z',
      status: 'oral_booked',
      pronunciation_score: 15,
      grammar_score: 16,
      vocabulary_score: null,
    })
  })

  it('accepts a root-array response', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, name: 'زيد', email: 'z@x.com' }] })
    const rows = await fetchInstructorOralAssessments()
    expect(rows[0]).toMatchObject({ id: 1, student_name: 'زيد', student_email: 'z@x.com', status: 'not_started' })
  })
})

/* ══════════════════════════════════════════════════════════════════
   INSTRUCTOR API — availability + oral booking actions
══════════════════════════════════════════════════════════════════ */

describe('instructor availability', () => {
  it('fetchInstructorAvailability normalizes slots with a full nested booking', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [{
          id: 1, course_id: 2, course: { title: 'دورة المحادثة' },
          starts_at: '2026-08-10T10:00:00Z', ends_at: '2026-08-10T10:30:00Z',
          is_available: false, is_booked: true, meeting_link: 'https://meet/x',
          booking: {
            id: 3, reference: 'REF-3', status: 'confirmed',
            student: { id: 4, name: 'هدى', email: 'h@x.com', initials: 'هد' },
            course: { id: 2, title: 'دورة المحادثة' },
            placement: { score: 40, total: 70, percentage: 57, estimated_level: 'intermediate' },
            status_history: [{ to_status: 'confirmed' }],
          },
        }],
      },
    })
    const slots = await fetchInstructorAvailability()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/availability', silent)
    expect(slots[0]).toMatchObject({
      id: 1,
      course_title: 'دورة المحادثة',
      is_available: false,
      is_booked: true,
      booking_status: 'booked', // derived: not available and no explicit booking_status
      meeting_link: 'https://meet/x',
    })
    expect(slots[0].booking).toMatchObject({
      id: 3,
      reference: 'REF-3',
      status: 'confirmed',
      is_active: true,
      student: { id: 4, name: 'هدى', email: 'h@x.com', phone: null, avatar_url: null, initials: 'هد' },
      course: { id: 2, title: 'دورة المحادثة' },
      placement: { score: 40, total: 70, percentage: 57, estimated_level: 'intermediate' },
      status_history: [{ from_status: null, to_status: 'confirmed', reason: null, changed_by: null, changed_at: null }],
    })
  })

  it('createInstructorAvailability passes the payload through and wraps a single created slot', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { id: 7, starts_at: '2026-09-01T10:00:00Z', ends_at: '2026-09-01T10:30:00Z' } },
    })
    const payload = {
      course_id: null,
      apply_to_all_courses: true,
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      weekdays: ['monday', 'wednesday'],
      start_time: '10:00',
      end_time: '12:00',
      slot_duration: 30,
      notes: 'مقابلات تحديد المستوى',
    }
    const slots = await createInstructorAvailability(payload)
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/availability', payload, silent)
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({ id: 7, is_available: true, booking_status: 'available', booking: null })
  })

  it('createInstructorAvailability maps a returned slots array', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { slots: [{ id: 1 }, { id: 2 }] } } })
    const slots = await createInstructorAvailability({
      course_id: 2, date_from: 'a', date_to: 'b', weekdays: [], start_time: '10:00', end_time: '11:00', slot_duration: 30,
    })
    expect(slots.map((s) => s.id)).toEqual([1, 2])
  })

  it('deleteInstructorAvailability deletes by id', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteInstructorAvailability(7)
    expect(mockedApi.delete).toHaveBeenCalledWith('/instructor/availability/7')
  })
})

describe('oral booking detail & actions', () => {
  it('fetchOralBookingDetail normalizes the booking payload', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 5, reference: 'R-5', status: 'booked', booked_at: '2026-08-08T09:00:00Z', meeting_link: null } },
    })
    const detail = await fetchOralBookingDetail(5)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/oral-bookings/5', silent)
    expect(detail).toMatchObject({
      id: 5, reference: 'R-5', status: 'booked', is_active: true,
      booked_at: '2026-08-08T09:00:00Z', student: null, course: null, placement: null,
      status_history: null, oral_score: null, final_level: null,
    })
  })

  it('fetchOralBookingDetail returns a defaulted object for an empty payload (never null here)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const detail = await fetchOralBookingDetail(5)
    expect(detail).toMatchObject({ id: 0, reference: '', status: 'booked', is_active: true })
  })

  it('updateOralBookingStatus patches status + reason', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5, status: 'no_show' } } })
    const detail = await updateOralBookingStatus(5, 'no_show', 'لم يحضر الطالب')
    expect(mockedApi.patch).toHaveBeenCalledWith('/instructor/oral-bookings/5/status', { status: 'no_show', reason: 'لم يحضر الطالب' })
    expect(detail?.status).toBe('no_show')
  })

  it('sendOralBookingMessage defaults send_email to true and honors false', async () => {
    mockedApi.post.mockResolvedValue({ data: {} })
    await sendOralBookingMessage(5, 'مرحباً، تم تأكيد موعدك')
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/oral-bookings/5/message', { body: 'مرحباً، تم تأكيد موعدك', send_email: true })
    await sendOralBookingMessage(5, 'بدون بريد', false)
    expect(mockedApi.post).toHaveBeenLastCalledWith('/instructor/oral-bookings/5/message', { body: 'بدون بريد', send_email: false })
  })

  it('rescheduleOralBooking posts the new slot and note', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 5, status: 'rescheduled' } } })
    const detail = await rescheduleOralBooking(5, 9, 'تغيير الموعد')
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/oral-bookings/5/reschedule', { new_slot_id: 9, note: 'تغيير الموعد' })
    expect(detail?.status).toBe('rescheduled')
  })

  it('updateOralBookingMeetingLink patches and echoes the stored link', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { meeting_link: 'https://zoom/j/1', meeting_provider: 'zoom' } } })
    const res = await updateOralBookingMeetingLink(5, 'https://zoom/j/1', 'zoom')
    expect(mockedApi.patch).toHaveBeenCalledWith('/instructor/oral-bookings/5/meeting-link', {
      meeting_link: 'https://zoom/j/1', meeting_provider: 'zoom',
    })
    expect(res).toEqual({ meeting_link: 'https://zoom/j/1', meeting_provider: 'zoom' })
  })

  it('updateOralBookingMeetingLink returns nulls when the link was removed', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    expect(await updateOralBookingMeetingLink(5, null)).toEqual({ meeting_link: null, meeting_provider: null })
  })
})

/* ══════════════════════════════════════════════════════════════════
   INSTRUCTOR API — all placement tests + answers
══════════════════════════════════════════════════════════════════ */

describe('fetchInstructorAllPlacementTests', () => {
  it('normalizes a full canonical row with class assignment and oral assessment', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [{
          attempt_id: 21, course_id: 2, course_title: { name: 'اللغة الإنجليزية العامة' },
          student: { id: 8, name: 'خالد', email: 'k@x.com', avatar_url: 'https://a/x.png' },
          placement: {
            written: { score: 55, total: 70, percentage: 79, level: 'intermediate' },
            oral: { score: 85, level: 'B1' },
            final_level: 'B1',
          },
          placement_attempt: { status: 'completed', submitted_at: '2026-08-02T11:00:00Z' },
          oral_booking: { starts_at: '2026-08-05T10:00:00Z', ends_at: '2026-08-05T10:30:00Z' },
          class_assignment: {
            class_name: 'B1-A', status: 'assigned', assigned_at: '2026-08-06T08:00:00Z',
            assigned_by_name: 'أ. منى', method: 'automatic', reason_details: ['قاعدة المستوى B1'],
          },
          oral_rubric: [{ key: 'grammar', label: 'القواعد', score: 17 }],
          recommended_class: 'B1-A',
          instructor_notes: 'ملاحظات المقيم',
          oral_assessment_full: { id: 5, status: 'completed', oral_score: 85, system: { approval_status: 'approved' } },
        }],
      },
    })
    const rows = await fetchInstructorAllPlacementTests()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/placement-tests', silent)
    expect(rows[0]).toMatchObject({
      attempt_id: 21,
      student_id: 8,
      student_name: 'خالد',
      student_email: 'k@x.com',
      course_title: 'اللغة الإنجليزية العامة',
      written_score: 55,
      total_questions: 70,
      percentage: 79,
      written_level: 'intermediate',
      oral_score: 85,
      status: 'completed',
      submitted_at: '2026-08-02T11:00:00Z',
      oral_booking_at: '2026-08-05T10:00:00Z',
      oral_booking_ends_at: '2026-08-05T10:30:00Z',
      final_level: 'B1',
      is_assigned: true,
      assigned_class: 'B1-A',
      assigned_at: '2026-08-06T08:00:00Z',
      assigned_by: 'أ. منى',
      assignment_method: 'automatic',
      assignment_reason_details: ['قاعدة المستوى B1'],
      recommended_class: 'B1-A',
      instructor_notes: 'ملاحظات المقيم',
      oral_rubric: [{ key: 'grammar', label: 'القواعد', score: 17, max: 20 }],
      avatar_url: 'https://a/x.png',
    })
    expect(rows[0].oral_assessment).toMatchObject({
      id: 5,
      status: 'completed',
      oral_score: 85,
      oral_score_max: 100,
      rubric: [],
      notes: { reason: null, strengths: null, weaknesses: null, recommendations: null },
      system: expect.objectContaining({ approval_status: 'approved' }),
      history: null,
    })
  })

  it('returns an empty row for a non-object entry', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [null] } })
    const rows = await fetchInstructorAllPlacementTests()
    expect(rows[0]).toMatchObject({
      attempt_id: 0, student_id: 0, student_name: '', status: 'not_started',
      is_assigned: false, oral_rubric: [], oral_assessment: null, assignment_reason_details: [],
    })
  })

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchInstructorAllPlacementTests()).rejects.toThrow('boom')
  })
})

describe('fetchPlacementTestAnswers', () => {
  it('normalizes both option shapes and preserves zero score contributions', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          answers: [
            {
              question_id: 1, question_text: 'ما جمع كتاب؟',
              options: { a: 'كتب', b: 'كاتب', c: 'مكتبة', d: 'كتّاب' },
              student_answer: 'a', correct_answer: 'a', is_correct: true, score_contribution: 1,
            },
            {
              question_id: 2, text: 'اختر الصحيح',
              option_a: 'أ', option_b: 'ب', option_c: 'ج', option_d: 'د',
              selected_option: 'b', correct_option: 'c', is_correct: false, points: 0,
            },
          ],
        },
      },
    })
    const rows = await fetchPlacementTestAnswers(21)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/placement-tests/21/answers', silent)
    expect(rows[0]).toEqual({
      question_id: 1,
      question_text: 'ما جمع كتاب؟',
      options: { a: 'كتب', b: 'كاتب', c: 'مكتبة', d: 'كتّاب' },
      student_answer: 'a',
      correct_answer: 'a',
      is_correct: true,
      score_contribution: 1,
    })
    expect(rows[1]).toEqual({
      question_id: 2,
      question_text: 'اختر الصحيح',
      options: { a: 'أ', b: 'ب', c: 'ج', d: 'د' },
      student_answer: 'b',
      correct_answer: 'c',
      is_correct: false,
      score_contribution: 0,
    })
  })
})

/* ══════════════════════════════════════════════════════════════════
   CLASS / GROUP MANAGEMENT
══════════════════════════════════════════════════════════════════ */

describe('class groups CRUD', () => {
  it('fetchInstructorClasses passes course_id params and normalizes schedules', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          classes: [{
            id: 1, course_id: 3, name: 'الفوج A', capacity: 25, enrolled: 10, remaining: 15,
            status: 'active', created_at: '2026-08-01T00:00:00Z',
            schedules: [{ id: 2, day_of_week: 'monday', start_time: '10:00', end_time: '12:00' }],
          }],
        },
      },
    })
    const groups = await fetchInstructorClasses(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes', expect.objectContaining({
      params: { course_id: 3 }, skipErrorToast: true,
    }))
    expect(groups[0]).toMatchObject({
      id: 1, name: 'الفوج A', capacity: 25, enrolled: 10, remaining: 15, status: 'active',
      schedules: [{ id: 2, day_of_week: 'monday', start_time: '10:00', end_time: '12:00', delivery_mode: 'online', location: null, is_active: true }],
    })
  })

  it('fetchInstructorClasses sends empty params without a course and defaults bad rows', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [null] } })
    const groups = await fetchInstructorClasses()
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes', expect.objectContaining({ params: {} }))
    expect(groups[0]).toMatchObject({ id: 0, name: '', capacity: 20, status: 'draft', schedules: [] })
  })

  it('fetchCourseClasses hits the course-scoped endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { groups: [{ id: 4, name: 'فوج B' }] } } })
    const groups = await fetchCourseClasses(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/3/classes', silent)
    expect(groups[0].name).toBe('فوج B')
  })

  it('createClassGroup posts the payload and unwraps the created group', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 5, course_id: 3, name: 'فوج جديد' } } })
    const data = { course_id: 3, name: 'فوج جديد' }
    const group = await createClassGroup(data)
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/classes', data, silent)
    expect(group).toMatchObject({ id: 5, course_id: 3, name: 'فوج جديد', status: 'draft' })
  })

  it('updateClassGroup patches by id', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5, name: 'فوج معدل' } } })
    const group = await updateClassGroup(5, { name: 'فوج معدل' })
    expect(mockedApi.patch).toHaveBeenCalledWith('/instructor/classes/5', { name: 'فوج معدل' }, silent)
    expect(group.name).toBe('فوج معدل')
  })

  it('deleteClassGroup deletes silently', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteClassGroup(5)
    expect(mockedApi.delete).toHaveBeenCalledWith('/instructor/classes/5', silent)
  })
})

describe('class students endpoints', () => {
  it('fetchCourseEnrolledStudents fixes placement fields to safe nulls', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { students: [{ student_id: 1, student_name: 'علي', student_email: 'a@x.com', student_phone: '0501234567', is_assigned: true }] } },
    })
    const rows = await fetchCourseEnrolledStudents(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/3/students', silent)
    expect(rows[0]).toEqual({
      student_id: 1,
      student_name: 'علي',
      student_email: 'a@x.com',
      student_phone: '0501234567',
      written_score: null,
      total_questions: null,
      percentage: null,
      written_level: null,
      oral_score: null,
      final_level: null,
      instructor_notes: null,
      placement_status: 'not_started',
      attempt_id: null,
      booking_id: null,
      is_assigned: true,
      avatar_url: null,
    })
  })

  it('fetchClassAssignmentStudents maps flat placement fields', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          students: [{
            student_id: 2, student_name: 'ريم', student_email: 'r@x.com',
            written_score: 62, total_questions: 70, percentage: 89, written_level: 'upper_intermediate',
            oral_score: 90, final_level: 'B2', instructor_notes: 'ممتازة',
            placement_status: 'completed', attempt_id: 12, booking_id: 34, is_assigned: false,
          }],
        },
      },
    })
    const rows = await fetchClassAssignmentStudents(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/3/class-assignment/students', silent)
    expect(rows[0]).toMatchObject({
      student_id: 2, written_score: 62, percentage: 89, final_level: 'B2',
      placement_status: 'completed', attempt_id: 12, booking_id: 34, is_assigned: false,
    })
  })

  it('assignStudentToClass / removeStudentFromClass call the roster endpoints', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await assignStudentToClass(9, { user_id: 2, placement_attempt_id: 12, notes: 'تعيين يدوي' })
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/classes/9/students', { user_id: 2, placement_attempt_id: 12, notes: 'تعيين يدوي' }, silent)

    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await removeStudentFromClass(9, 2)
    expect(mockedApi.delete).toHaveBeenCalledWith('/instructor/classes/9/students/2', silent)
  })

  it('fetchClassGroupStudents reads canonical fields and filters invalid rows', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          students: [
            {
              student: { id: 4, name: 'نور', email: 'n@x.com' },
              placement: {
                written: { score: 60, total: 70, percentage: 86, level: 'upper_intermediate' },
                oral: { score: 88, level: 'B2' },
                final_level: 'B2',
              },
              notes: 'ملاحظة',
              assigned_at: '2026-08-06T08:00:00Z',
              oral_assessment: { id: 33, oral_score: 88 },
            },
            { id: 0, name: 'مجهول' },        // dropped: student_id 0
            { student_id: 9, name: '   ' },   // dropped: blank name
          ],
        },
      },
    })
    const rows = await fetchClassGroupStudents(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/students', silent)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      student_id: 4,
      student_name: 'نور',
      student_email: 'n@x.com',
      written_score: 60,
      total_questions: 70,
      percentage: 86,
      written_level: 'upper_intermediate',
      oral_score: 88,
      final_level: 'B2',           // legacy placement.final_level wins
      instructor_notes: 'ملاحظة',
      placement_status: 'completed', // derived from placement.final_level presence
      attempt_id: null,
      booking_id: 33,               // from oral_assessment.id
      is_assigned: true,
      assigned_at: '2026-08-06T08:00:00Z',
    })
    expect(rows[0].oral_assessment).toMatchObject({ id: 33, oral_score: 88, oral_score_max: 100 })
  })
})

describe('fetchClassGroupDetail', () => {
  it('returns null for an empty payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    expect(await fetchClassGroupDetail(3)).toBeNull()
  })

  it('maps the full workspace detail shape', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 3, name: 'فوج B1', level_code: 'B1', status: 'active',
          capacity: 20, current_students_count: 12, available_seats: 8,
          course: { id: 2, title: 'الإنجليزية العامة' },
          instructor: { id: 7, name: 'أ. محمد' },
          schedule: { start_date: '2026-09-01', day: 'monday', time: '18:00', mode: 'online' },
          meeting_link: 'https://meet/x',
          counts: { students: 12, sessions: 8, materials: 5, assignments: 3, attendance_records: 40, pending_reviews: 2, announcements: 4 },
          next_session: { id: 55, title: 'الدرس القادم', starts_at: '2026-08-10T18:00:00Z' },
          permissions: {
            edit: true, delete: false, manage_students: true, create_session: true,
            record_attendance: true, create_assignment: false, upload_material: true, send_announcement: true,
          },
          attendance_summary: { attendance_percentage: 91.5, present: 100, absent: 5, late: 3, excused: 2 },
          progress_summary: { students_total: 12, students_completed: 2, average_progress_percentage: 45, at_risk_students: 1 },
        },
      },
    })
    const detail = await fetchClassGroupDetail(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/3', silent)
    expect(detail).toEqual({
      id: 3, name: 'فوج B1', level_code: 'B1', status: 'active',
      capacity: 20, current_students_count: 12, available_seats: 8,
      course: { id: 2, title: 'الإنجليزية العامة' },
      instructor: { id: 7, name: 'أ. محمد' },
      schedule: { start_date: '2026-09-01', day: 'monday', time: '18:00', mode: 'online' },
      meeting_link: 'https://meet/x',
      counts: { students: 12, sessions: 8, materials: 5, assignments: 3, attendance_records: 40, pending_reviews: 2, announcements: 4 },
      next_session: { id: 55, title: 'الدرس القادم', starts_at: '2026-08-10T18:00:00Z' },
      permissions: {
        edit: true, delete: false, manage_students: true, create_session: true,
        record_attendance: true, create_assignment: false, upload_material: true, send_announcement: true,
      },
      attendance_summary: { attendance_percentage: 91.5, present: 100, absent: 5, late: 3, excused: 2 },
      progress_summary: { students_total: 12, students_completed: 2, average_progress_percentage: 45, at_risk_students: 1 },
    })
  })
})

describe('class announcements', () => {
  it('fetchClassGroupAnnouncements maps rows with defaults', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 1, title: 'إعلان مهم', body: 'نص الإعلان' }] },
    })
    const rows = await fetchClassGroupAnnouncements(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/announcements', silent)
    expect(rows[0]).toEqual({
      id: 1, title: 'إعلان مهم', body: 'نص الإعلان',
      priority: 'normal', status: 'draft', published_at: null, created_at: undefined,
    })
  })

  it('createClassAnnouncement posts and normalizes the created row', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { id: 2, title: 'جديد', body: 'محتوى', priority: 'high', status: 'published', published_at: '2026-08-07T10:00:00Z' } },
    })
    const row = await createClassAnnouncement(9, { title: 'جديد', body: 'محتوى', priority: 'high' })
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/classes/9/announcements', { title: 'جديد', body: 'محتوى', priority: 'high' })
    expect(row).toMatchObject({ id: 2, priority: 'high', status: 'published', published_at: '2026-08-07T10:00:00Z' })
  })

  it('publishClassAnnouncement patches the publish endpoint', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 2, title: 'جديد', body: 'محتوى', status: 'published' } } })
    const row = await publishClassAnnouncement(9, 2)
    expect(mockedApi.patch).toHaveBeenCalledWith('/instructor/classes/9/announcements/2/publish', {})
    expect(row.status).toBe('published')
  })

  it('archiveClassAnnouncement deletes the announcement', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await archiveClassAnnouncement(9, 2)
    expect(mockedApi.delete).toHaveBeenCalledWith('/instructor/classes/9/announcements/2')
  })

  it('fetchStudentClassAnnouncements reads only the data array and defaults to []', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 3, title: 'للطلاب', body: 'نص' }] } })
    const rows = await fetchStudentClassAnnouncements(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/classes/9/announcements', silent)
    expect(rows[0].title).toBe('للطلاب')

    mockedApi.get.mockResolvedValueOnce({ data: { message: 'لا شيء' } })
    expect(await fetchStudentClassAnnouncements(9)).toEqual([])
  })
})

describe('class sessions', () => {
  it('fetchClassGroupSessions maps mixed source rows', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 1, source_type: 'lms', title: 'الجلسة الأولى', status: 'scheduled', session_date: '2026-08-10', start_time: '10:00', end_time: '12:00' }] },
    })
    const rows = await fetchClassGroupSessions(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/sessions', silent)
    expect(rows[0]).toEqual({
      id: 1, source_type: 'lms', title: 'الجلسة الأولى', status: 'scheduled',
      starts_at: null, ends_at: null, session_date: '2026-08-10', start_time: '10:00', end_time: '12:00',
    })
  })

  it('createClassGroupSession posts the session payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const payload = { title: 'جلسة تعويضية', session_date: '2026-08-15', start_time: '10:00', end_time: '12:00' }
    await createClassGroupSession(9, payload)
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/classes/9/sessions', payload)
  })
})

describe('normalizeLmsSessionEvent', () => {
  it('produces complete safe defaults for an empty object', () => {
    const expected: LmsSessionEvent = {
      id: 0, title: '', description: null, course: null, class_group: null, instructor: null,
      date: null, start_time: null, end_time: null, timezone: 'Europe/Amsterdam', status: 'scheduled',
      location: null, meeting: { provider: 'none', url: null, join_allowed: false },
      recording_url: null,
      attendance: { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
      materials_count: 0, assignments_count: 0, allowed_transitions: [],
      permissions: { view: false, update: false, transition: false, delete: false, view_meeting_link: false, record_attendance: false },
    }
    expect(normalizeLmsSessionEvent({})).toEqual(expected)
  })

  it('maps a full canonical LmsSessionResource payload', () => {
    const event = normalizeLmsSessionEvent({
      id: 55, title: 'درس المحادثة', description: 'وصف',
      course: { id: 2, title: 'الإنجليزية' },
      class_group: { id: 9, name: 'فوج B1' },
      instructor: { id: 7, name: 'أ. محمد' },
      date: '2026-08-10', start_time: '18:00', end_time: '20:00', timezone: 'Asia/Riyadh',
      status: 'in_progress', location: 'قاعة 3',
      meeting: { provider: 'zoom', url: 'https://zoom/j/1', join_allowed: true },
      recording_url: 'https://rec/1',
      attendance: { total: 12, present: 10, absent: 1, late: 1, excused: 0 },
      materials_count: 4, assignments_count: 2,
      allowed_transitions: ['completed', 'cancelled'],
      permissions: { view: true, update: true, transition: true, delete: false, view_meeting_link: true, record_attendance: true },
    })
    expect(event).toMatchObject({
      id: 55,
      title: 'درس المحادثة',
      course: { id: 2, title: 'الإنجليزية' },
      class_group: { id: 9, name: 'فوج B1' },
      instructor: { id: 7, name: 'أ. محمد' },
      timezone: 'Asia/Riyadh',
      status: 'in_progress',
      meeting: { provider: 'zoom', url: 'https://zoom/j/1', join_allowed: true },
      allowed_transitions: ['completed', 'cancelled'],
      permissions: expect.objectContaining({ update: true, delete: false }),
    })
  })
})

describe('session endpoints (instructor + student)', () => {
  it('fetchInstructorSessionCalendar passes range params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 1, title: 'جلسة' }] } })
    const events = await fetchInstructorSessionCalendar({ from: '2026-08-01', to: '2026-08-31', course_id: 2 })
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/sessions/calendar', expect.objectContaining({
      params: { from: '2026-08-01', to: '2026-08-31', course_id: 2 },
      skipErrorToast: true,
    }))
    expect(events[0]).toMatchObject({ id: 1, title: 'جلسة' })
  })

  it('fetchClassSessionDetail returns the normalized session, or null without data', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: { id: 4, title: 'تفاصيل' } } } })
    const event = await fetchClassSessionDetail(9, 4)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/sessions/4', silent)
    expect(event).toMatchObject({ id: 4, title: 'تفاصيل' })

    mockedApi.get.mockResolvedValueOnce({ data: { data: {} } })
    expect(await fetchClassSessionDetail(9, 4)).toBeNull()
  })

  it('transitionClassSession posts the target status', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { data: { id: 4, status: 'completed' } } } })
    const event = await transitionClassSession(9, 4, 'completed')
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/classes/9/sessions/4/transition', { status: 'completed' })
    expect(event.status).toBe('completed')
  })

  it('deleteClassSession deletes by ids', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteClassSession(9, 4)
    expect(mockedApi.delete).toHaveBeenCalledWith('/instructor/classes/9/sessions/4')
  })

  it('previewClassSessionGeneration returns the preview rows or []', async () => {
    const rows = [{ date: '2026-08-10', day_of_week: 'monday', start_time: '10:00', end_time: '12:00', already_exists: false }]
    mockedApi.post.mockResolvedValueOnce({ data: { data: rows } })
    expect(await previewClassSessionGeneration(9, '2026-08-01', '2026-08-31')).toEqual(rows)
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/classes/9/sessions/generation-preview', { from: '2026-08-01', to: '2026-08-31' })

    mockedApi.post.mockResolvedValueOnce({ data: {} })
    expect(await previewClassSessionGeneration(9, 'a', 'b')).toEqual([])
  })

  it('generateClassSessions returns counts with zero defaults', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { created_count: 4, skipped_count: 1 } } })
    expect(await generateClassSessions(9, '2026-08-01', '2026-08-31')).toEqual({ created_count: 4, skipped_count: 1 })
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/classes/9/sessions/generate', { from: '2026-08-01', to: '2026-08-31' })

    mockedApi.post.mockResolvedValueOnce({ data: {} })
    expect(await generateClassSessions(9, 'a', 'b')).toEqual({ created_count: 0, skipped_count: 0 })
  })

  it('updateClassSession patches content fields only', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { data: { id: 4, title: 'محدّث' } } } })
    const event = await updateClassSession(9, 4, { title: 'محدّث' })
    expect(mockedApi.patch).toHaveBeenCalledWith('/instructor/classes/9/sessions/4', { title: 'محدّث' })
    expect(event.title).toBe('محدّث')
  })

  it('fetchStudentSessions sends the status filter only when given', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: [] } })
    await fetchStudentSessions('scheduled')
    expect(mockedApi.get).toHaveBeenCalledWith('/student/sessions', expect.objectContaining({ params: { status: 'scheduled' } }))
    await fetchStudentSessions()
    expect(mockedApi.get).toHaveBeenLastCalledWith('/student/sessions', expect.objectContaining({ params: {} }))
  })

  it('fetchStudentSessionCalendar passes the range', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 2 }] } })
    const events = await fetchStudentSessionCalendar({ from: '2026-08-01', to: '2026-08-31' })
    expect(mockedApi.get).toHaveBeenCalledWith('/student/sessions/calendar', expect.objectContaining({ params: { from: '2026-08-01', to: '2026-08-31' } }))
    expect(events).toHaveLength(1)
  })

  it('fetchStudentSessionDetail returns null on 403/404 instead of throwing', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Request failed with status code 404'))
    expect(await fetchStudentSessionDetail(4)).toBeNull()
  })

  it('fetchStudentSessionDetail normalizes an existing session and nulls a missing one', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: { id: 4, title: 'جلستي' } } } })
    expect(await fetchStudentSessionDetail(4)).toMatchObject({ id: 4, title: 'جلستي' })

    mockedApi.get.mockResolvedValueOnce({ data: { data: {} } })
    expect(await fetchStudentSessionDetail(4)).toBeNull()
  })
})

describe('class attendance / materials / assignments', () => {
  it('fetchClassGroupAttendance maps rows', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 1, user_id: 4, student_name: 'نور', status: 'present', checked_in_at: '2026-08-10T18:05:00Z' }] },
    })
    const rows = await fetchClassGroupAttendance(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/attendance', silent)
    expect(rows[0]).toEqual({ id: 1, user_id: 4, student_name: 'نور', status: 'present', checked_in_at: '2026-08-10T18:05:00Z' })
  })

  it('fetchClassGroupMaterials maps rows with null fallbacks', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 2, title: 'ملف القواعد' }] } })
    const rows = await fetchClassGroupMaterials(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/materials', silent)
    expect(rows[0]).toEqual({ id: 2, title: 'ملف القواعد', type: null, sort_order: null })
  })

  it('fetchClassGroupAssignments maps rows with null fallbacks', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 3, title: 'واجب الكتابة', due_date: '2026-08-20', max_score: 100, status: 'open' }] },
    })
    const rows = await fetchClassGroupAssignments(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/assignments', silent)
    expect(rows[0]).toEqual({ id: 3, title: 'واجب الكتابة', due_date: '2026-08-20', max_score: 100, status: 'open' })
  })
})
