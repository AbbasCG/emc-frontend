import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  mapCourseLearnMaterialToLmsMaterial,
  mapCourseLearnAssignmentToStudentAssignment,
  inferCourseCmsScopeFromUserRole,
  normalizeStudentCourseLearn,
  mapLearnSessionToLms,
  fetchStudentCourseLearn,
  fetchCourseNotes,
  saveCourseNotes,
  fetchCourseCmsContent,
  adminListCourseModules,
  adminCreateCourseModule,
  adminUpdateCourseModule,
  adminDeleteCourseModule,
  adminReorderCourseModules,
  adminListCourseSessions,
  adminCreateCourseSession,
  adminUpdateCourseSession,
  adminDeleteCourseSession,
  adminListCourseMaterials,
  adminCreateCourseMaterial,
  adminUpdateCourseMaterial,
  adminDeleteCourseMaterial,
  adminListCourseAssignments,
  adminCreateCourseAssignment,
  adminUpdateCourseAssignment,
  adminDeleteCourseAssignment,
  adminCreateCourseLesson,
  adminDeleteCourseLesson,
  type CourseCmsScope,
  type CourseCmsContentBundle,
} from '@/api/courseLearnApi'
import type { CourseLearnAssignment, CourseLearnMaterial, CourseLearnSession } from '@/types/courseLearn'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)
const silent = { skipErrorToast: true }

beforeEach(() => {
  vi.clearAllMocks()
})

/* ── mapCourseLearnMaterialToLmsMaterial ── */

describe('mapCourseLearnMaterialToLmsMaterial', () => {
  const ctx = { courseId: 3, courseTitle: 'دورة البرمجة' }

  it('maps programming_project kind to zip and passes absolute URLs through unchanged', () => {
    const m: CourseLearnMaterial = {
      id: 1,
      title: 'مشروع برمجي',
      kind: 'programming_project',
      file_url: 'https://cdn.example.com/a.zip',
      size_human: '2 MB',
    }
    const out = mapCourseLearnMaterialToLmsMaterial(m, ctx)
    expect(out.kind).toBe('zip')
    expect(out.url).toBe('https://cdn.example.com/a.zip')
    expect(out.course_id).toBe(3) // fallback from ctx when m.course_id missing
    expect(out.course_name).toBe('دورة البرمجة')
    expect(out.size_label).toBe('2 MB')
  })

  it('normalizes unknown kinds to "other" and keeps m.course_id when present', () => {
    const m: CourseLearnMaterial = { id: 2, course_id: 77, title: 'شيء', kind: 'weird_kind' }
    const out = mapCourseLearnMaterialToLmsMaterial(m, ctx)
    expect(out.kind).toBe('other')
    expect(out.course_id).toBe(77)
  })

  it('falls back to external_url and yields null url when nothing is set', () => {
    const withExternal: CourseLearnMaterial = {
      id: 3,
      title: 'رابط',
      kind: 'link',
      external_url: 'https://example.com/doc',
    }
    expect(mapCourseLearnMaterialToLmsMaterial(withExternal, ctx).url).toBe('https://example.com/doc')

    const bare: CourseLearnMaterial = { id: 4, title: 'بلا رابط', kind: 'pdf' }
    const out = mapCourseLearnMaterialToLmsMaterial(bare, ctx)
    expect(out.url).toBeNull()
    expect(out.description).toBeNull()
    expect(out.updated_at).toBeNull()
  })
})

/* ── mapCourseLearnAssignmentToStudentAssignment ── */

describe('mapCourseLearnAssignmentToStudentAssignment', () => {
  const ctx = { courseId: 3, courseTitle: 'دورة البرمجة' }

  it('returns null when no usable submit id can be resolved', () => {
    const a: CourseLearnAssignment = { id: 0, title: 'واجب بلا معرف' }
    expect(mapCourseLearnAssignmentToStudentAssignment(a, ctx)).toBeNull()
  })

  it('prefers lms_assignment_id for assignment_id and course_assignment_id for the row id', () => {
    const a: CourseLearnAssignment = {
      id: 5,
      course_assignment_id: 7,
      lms_assignment_id: 9,
      title: 'واجب الوحدة الأولى',
      max_points: 10,
      my_submission: { submitted_at: '2026-01-05T00:00:00Z', score: 8, feedback: 'جيد جداً' },
    }
    const out = mapCourseLearnAssignmentToStudentAssignment(a, ctx)
    expect(out).not.toBeNull()
    expect(out!.id).toBe(7)
    expect(out!.assignment_id).toBe(9)
    expect(out!.course_id).toBe(3)
    expect(out!.course_name).toBe('دورة البرمجة')
    expect(out!.max_score).toBe(10)
    expect(out!.score).toBe(8) // fallback to my_submission.score
    expect(out!.feedback).toBe('جيد جداً')
    expect(out!.submitted_at).toBe('2026-01-05T00:00:00Z')
    // no explicit status, but submitted_at present -> derived "submitted"
    expect(out!.status).toBe('submitted')
  })

  it('defaults to pending status when nothing indicates submission', () => {
    const a: CourseLearnAssignment = { id: 5, title: 'واجب' }
    const out = mapCourseLearnAssignmentToStudentAssignment(a, ctx)
    expect(out!.status).toBe('pending')
    expect(out!.due_at).toBeNull()
    expect(out!.score).toBeNull()
  })
})

/* ── inferCourseCmsScopeFromUserRole ── */

describe('inferCourseCmsScopeFromUserRole', () => {
  it('maps instructor (and the teacher alias) to instructor scope', () => {
    expect(inferCourseCmsScopeFromUserRole('instructor')).toBe('instructor')
    expect(inferCourseCmsScopeFromUserRole('Teacher')).toBe('instructor')
  })

  it('maps every other role (and null) to admin scope', () => {
    expect(inferCourseCmsScopeFromUserRole('admin')).toBe('admin')
    expect(inferCourseCmsScopeFromUserRole('super_admin')).toBe('admin')
    expect(inferCourseCmsScopeFromUserRole(null)).toBe('admin')
    expect(inferCourseCmsScopeFromUserRole(undefined)).toBe('admin')
  })
})

/* ── normalizeStudentCourseLearn ── */

describe('normalizeStudentCourseLearn', () => {
  it('normalizes a realistic nested payload (course, progress, class group, modules, sessions, materials, assignments)', () => {
    const payload = {
      data: {
        course: { id: 3, title: 'دورة البرمجة', slug: 'prog', instructor: { name: 'أ. محمد' } },
        progress: { percent: '40' },
        enrollment_status: 'active',
        class_group: { id: 8, name: '', level_code: 'L1' },
        modules: [
          {
            id: 2,
            title: 'الوحدة الثانية',
            sort_order: 1,
            lessons_count: '2',
            completed_lessons: '1',
            lessons: [
              { id: 21, title: 'درس الفيديو', sort_order: 5, duration_minutes: '30' },
              { id: 0, title: 'مرفوض — معرف صفر' },
              { title: 'مرفوض — بلا معرف' },
            ],
            assignments: [{ id: 50, title: 'واجب الوحدة' }],
          },
          { id: 1, title: 'الوحدة الأولى', sort_order: 0 },
          { id: 7, title: '' }, // dropped: empty title
          'garbage',
          null,
        ],
        sessions: [
          { id: 11, title: 'الجلسة الثانية', start_at: '2026-09-02T10:00:00Z', status: 'LIVE' },
          { session_id: 12, start_at: '2026-09-01T10:00:00Z', meeting_link: 'https://zoom.us/j/1' },
          { id: -1, start_at: '2026-09-03T10:00:00Z' }, // dropped: invalid id
        ],
        materials: [
          { id: 31, title: 'ملف المحاضرة', type: 'PDF' },
          { material_id: 32, kind: 'weird' },
        ],
        assignments: [
          { id: 50, title: 'واجب الوحدة' },
          {
            course_assignment_id: 60,
            lms_assignment_id: 61,
            deadline: '2026-09-10T00:00:00Z',
            my_submission: { status: 'submitted', score: '9' },
          },
        ],
      },
    }

    const out = normalizeStudentCourseLearn(payload, 3)

    expect(out.course).toEqual(
      expect.objectContaining({ id: 3, title: 'دورة البرمجة', slug: 'prog', instructor_name: 'أ. محمد' }),
    )
    expect(out.progress_percent).toBe(40)
    expect(out.registration_status).toBe('active')
    expect(out.class_group).toEqual(
      expect.objectContaining({ id: 8, name: 'الفصل الدراسي', level_code: 'L1' }),
    )

    // modules sorted by sort_order, invalid rows dropped
    expect(out.modules.map((m) => m.id)).toEqual([1, 2])
    const mod2 = out.modules[1]!
    expect(mod2.lessons_count).toBe(2)
    expect(mod2.completed_lessons).toBe(1)
    expect(mod2.completed_lessons_count).toBe(1)
    expect(mod2.lessons).toHaveLength(1)
    expect(mod2.lessons![0]).toEqual(
      expect.objectContaining({ id: 21, title: 'درس الفيديو', sort_order: 5, duration_minutes: 30, status: 'active' }),
    )

    // sessions sorted by start timestamp; alt id key + status normalization
    expect(out.sessions.map((s) => s.id)).toEqual([12, 11])
    expect(out.sessions[1]!.status).toBe('live')
    expect(out.sessions[0]!.status).toBe('scheduled')
    expect(out.sessions[0]!.meeting_url).toBe('https://zoom.us/j/1')

    // materials: kind from `type` (lowercased), fallback title, alt id key
    expect(out.materials[0]).toEqual(expect.objectContaining({ id: 31, title: 'ملف المحاضرة', kind: 'pdf' }))
    expect(out.materials[1]).toEqual(expect.objectContaining({ id: 32, title: 'مادة', kind: 'other' }))

    // assignments: module-nested id 50 deduped against the flat list
    expect(out.assignments).toHaveLength(2)
    const a60 = out.assignments.find((a) => a.id === 60)!
    expect(a60.course_assignment_id).toBe(60)
    expect(a60.assignment_id).toBe(61)
    expect(a60.due_at).toBe('2026-09-10T00:00:00Z')
    expect(a60.submission_type).toBe('both') // default
    expect(a60.required).toBe(true) // default
    expect(a60.visible).toBe(true) // default
    expect(a60.status).toBe('submitted') // from my_submission
    expect(a60.my_submission).toEqual(
      expect.objectContaining({ status: 'submitted', score: 9 }),
    )
  })

  it('merges module-nested assignments that are missing from the flat list', () => {
    const out = normalizeStudentCourseLearn(
      {
        data: {
          modules: [{ id: 1, title: 'وحدة', assignments: [{ id: 99, title: 'واجب متداخل' }] }],
          assignments: [],
        },
      },
      1,
    )
    expect(out.assignments.map((a) => a.id)).toEqual([99])
  })

  it('supports alternate collection keys (course_modules / learn_sessions / documents / homework)', () => {
    const out = normalizeStudentCourseLearn(
      {
        course_modules: [{ id: 1, title: 'وحدة' }],
        learn_sessions: [{ id: 2, start_at: '2026-05-01T00:00:00Z' }],
        documents: [{ id: 3, title: 'مستند' }],
        homework: [{ id: 4, title: 'واجب منزلي' }],
      },
      1,
    )
    expect(out.modules).toHaveLength(1)
    expect(out.sessions).toHaveLength(1)
    expect(out.materials).toHaveLength(1)
    expect(out.assignments).toHaveLength(1)
  })

  it('merges a nested `payload` object into the root and reads progress_percent directly', () => {
    const out = normalizeStudentCourseLearn(
      { payload: { progress_percent: 55, registration_status: 'confirmed' } },
      2,
    )
    expect(out.progress_percent).toBe(55)
    expect(out.registration_status).toBe('confirmed')
  })

  it('accepts a root that is itself the course overview shape', () => {
    const out = normalizeStudentCourseLearn({ id: 4, course_title: 'اسم الدورة' }, 0)
    expect(out.course).toEqual(expect.objectContaining({ id: 4, title: 'اسم الدورة' }))
  })

  it('falls back to the courseId with the Arabic default title when the payload is unusable', () => {
    const out = normalizeStudentCourseLearn({ data: 'nope' }, 9)
    expect(out.course).toEqual(expect.objectContaining({ id: 9, title: 'محتوى الدورة' }))
    expect(out.modules).toEqual([])
    expect(out.sessions).toEqual([])
    expect(out.materials).toEqual([])
    expect(out.assignments).toEqual([])
  })

  it('returns a null course for garbage payload with no fallback id — never crashes', () => {
    const out = normalizeStudentCourseLearn(undefined, 0)
    expect(out.course).toBeNull()
    expect(out.class_group).toBeNull()
    expect(out.progress_percent).toBeUndefined()
    expect(out.modules).toEqual([])
  })
})

/* ── mapLearnSessionToLms ── */

describe('mapLearnSessionToLms', () => {
  it('passes through a valid status and detects the zoom platform from the meeting link', () => {
    const s: CourseLearnSession = {
      id: 1,
      title: 'جلسة مباشرة',
      start_at: '2026-01-01T10:00:00Z',
      end_at: '2026-01-01T12:00:00Z',
      status: 'live',
      meeting_url: 'https://zoom.us/j/123',
      instructor_name: 'أ. سارة',
    }
    const out = mapLearnSessionToLms(s, 'دورة')
    expect(out.status).toBe('live')
    expect(out.starts_at).toBe('2026-01-01T10:00:00Z')
    expect(out.ends_at).toBe('2026-01-01T12:00:00Z')
    expect(out.meeting_link).toBe('https://zoom.us/j/123')
    expect(out.platform).toBe('zoom')
    expect(out.type).toBe('online') // no type, no "off" in location_type
    expect(out.course_name).toBe('دورة')
  })

  it('detects google_meet and infers offline from location_type', () => {
    const s: CourseLearnSession = {
      id: 2,
      status: 'scheduled',
      meeting_url: 'https://meet.google.com/xyz',
    }
    expect(mapLearnSessionToLms(s, 'دورة').platform).toBe('google_meet')

    const offline: CourseLearnSession = { id: 3, status: 'scheduled', location_type: 'offline' }
    expect(mapLearnSessionToLms(offline, 'دورة').type).toBe('offline')
  })

  it('maps fuzzy statuses: /cancel/i matches, unknown falls back to scheduled', () => {
    const cancelled: CourseLearnSession = { id: 4, status: 'Cancelled by admin' }
    expect(mapLearnSessionToLms(cancelled, 'د').status).toBe('cancelled')

    const unknown: CourseLearnSession = { id: 5, status: 'whatever' }
    expect(mapLearnSessionToLms(unknown, 'د').status).toBe('scheduled')
  })
})

/* ── Student endpoints ── */

describe('student endpoints', () => {
  it('fetchStudentCourseLearn GETs /student/courses/{id}/learn silently and normalizes', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { course: { id: 3, title: 'دورة' } } } })
    const out = await fetchStudentCourseLearn(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/courses/3/learn', { skipErrorToast: true })
    expect(out.course).toEqual(expect.objectContaining({ id: 3, title: 'دورة' }))
  })

  it('fetchStudentCourseLearn propagates transport errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchStudentCourseLearn(3)).rejects.toThrow('Network Error')
  })

  it('fetchCourseNotes unwraps content/updated_at', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { content: 'ملاحظاتي', updated_at: '2026-01-01' } } })
    const out = await fetchCourseNotes(4)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/courses/4/notes', { skipErrorToast: true })
    expect(out).toEqual({ content: 'ملاحظاتي', updated_at: '2026-01-01' })
  })

  it('fetchCourseNotes tolerates empty payload and blank updated_at', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    expect(await fetchCourseNotes(4)).toEqual({ content: '', updated_at: null })

    mockedApi.get.mockResolvedValueOnce({ data: { data: { content: 'x', updated_at: '   ' } } })
    expect(await fetchCourseNotes(4)).toEqual({ content: 'x', updated_at: null })
  })

  it('saveCourseNotes PUTs the content and falls back to the submitted content on an empty response', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: {} })
    const out = await saveCourseNotes(4, 'نص جديد')
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/student/courses/4/notes',
      { content: 'نص جديد' },
      { skipErrorToast: true },
    )
    expect(out).toEqual({ content: 'نص جديد', updated_at: null })
  })
})

/* ── Course CMS content bundle ── */

describe('fetchCourseCmsContent', () => {
  const contentEnvelope = {
    data: {
      course: { id: 5, title: 'دورة التصميم' },
      modules: [
        {
          id: 1,
          title: 'وحدة',
          materials: [{ id: 70, title: 'مادة متداخلة' }],
          sessions: [{ id: 80, start_at: '2026-01-01T00:00:00Z' }],
          assignments: [{ id: 90, title: 'واجب' }],
        },
      ],
      materials: [{ id: 71, title: 'مادة عامة' }],
      sessions: [],
      assignments: [{ id: 90, title: 'واجب' }],
    },
  }

  it('GETs the admin /content endpoint, fills module course_id, and merges module-nested items deduped', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: contentEnvelope })
    const out: CourseCmsContentBundle = await fetchCourseCmsContent(5, 'admin')

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/courses/5/content', silent)
    expect(out.course).toEqual(expect.objectContaining({ id: 5, title: 'دورة التصميم' }))
    expect(out.modules[0]!.course_id).toBe(5) // fallback filled
    expect(out.materials.map((m) => m.id)).toEqual([71, 70]) // flat + nested merged
    expect(out.sessions.map((s) => s.id)).toEqual([80])
    expect(out.assignments.map((a) => a.id)).toEqual([90]) // deduped by id
  })

  it('uses the instructor base path for instructor scope', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: contentEnvelope })
    await fetchCourseCmsContent(5, 'instructor')
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/5/content', silent)
  })

  it('falls back to legacy per-collection endpoints when /content fails (admin), skipping HTTP 404 lists', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('content endpoint down')) // /content
      .mockResolvedValueOnce({ data: { data: [{ id: 1, title: 'وحدة قديمة', sort_order: 2 }] } }) // /modules
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } }) // /sessions -> []
      .mockResolvedValueOnce({ data: [] }) // /materials
      .mockResolvedValueOnce({ data: { data: [{ id: 9, title: 'واجب قديم' }] } }) // /assignments

    const out = await fetchCourseCmsContent(5, 'admin')

    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/admin/courses/5/modules', silent)
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/admin/courses/5/sessions', silent)
    expect(mockedApi.get).toHaveBeenNthCalledWith(4, '/admin/courses/5/materials', silent)
    expect(mockedApi.get).toHaveBeenNthCalledWith(5, '/admin/courses/5/assignments', silent)

    expect(out.course).toEqual(expect.objectContaining({ id: 5, title: 'محتوى الدورة' }))
    expect(out.modules).toHaveLength(1)
    expect(out.modules[0]!.sort_order).toBe(2)
    expect(out.sessions).toEqual([]) // 404 skipped
    expect(out.materials).toEqual([])
    expect(out.assignments.map((a) => a.id)).toEqual([9])
  })

  it('never hits the legacy assignments endpoint for instructor scope', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('content endpoint down')) // /content
      .mockResolvedValueOnce({ data: [] }) // /modules
      .mockResolvedValueOnce({ data: [] }) // /sessions
      .mockResolvedValueOnce({ data: [] }) // /materials

    const out = await fetchCourseCmsContent(5, 'instructor')
    expect(out.assignments).toEqual([])
    expect(mockedApi.get).toHaveBeenCalledTimes(4)
    expect(mockedApi.get).not.toHaveBeenCalledWith('/instructor/courses/5/assignments', silent)
  })

  it('rethrows non-skippable legacy errors', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('content endpoint down')) // /content
      .mockRejectedValue(new Error('server exploded')) // every legacy list

    await expect(fetchCourseCmsContent(5, 'admin')).rejects.toThrow('server exploded')
  })
})

/* ── Admin CMS list wrappers (delegate to fetchCourseCmsContent) ── */

describe('admin CMS list wrappers', () => {
  const scope: CourseCmsScope = 'admin'
  const envelope = {
    data: {
      course: { id: 5, title: 'دورة' },
      modules: [{ id: 1, title: 'وحدة' }],
      sessions: [{ id: 2, start_at: '2026-01-01T00:00:00Z' }],
      materials: [{ id: 3, title: 'مادة' }],
      assignments: [{ id: 4, title: 'واجب' }],
    },
  }

  it('adminListCourseModules / Sessions / Materials / Assignments return the matching bundle slice', async () => {
    mockedApi.get.mockResolvedValue({ data: envelope })
    expect((await adminListCourseModules(5, scope)).map((m) => m.id)).toEqual([1])
    expect((await adminListCourseSessions(5, scope)).map((s) => s.id)).toEqual([2])
    expect((await adminListCourseMaterials(5, scope)).map((m) => m.id)).toEqual([3])
    expect((await adminListCourseAssignments(5, scope)).map((a) => a.id)).toEqual([4])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/courses/5/content', silent)
  })
})

/* ── Admin CMS writes ── */

describe('admin CMS module writes', () => {
  it('adminCreateCourseModule POSTs and unwraps the created module', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 9, title: 'وحدة جديدة' } } })
    const out = await adminCreateCourseModule(5, { title: 'وحدة جديدة' }, 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/courses/5/modules', { title: 'وحدة جديدة' }, silent)
    expect(out).toEqual(expect.objectContaining({ id: 9, title: 'وحدة جديدة' }))
  })

  it('adminUpdateCourseModule PUTs to the module URL (instructor scope)', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 9, title: 'محدثة' } } })
    const out = await adminUpdateCourseModule(5, 9, { title: 'محدثة' }, 'instructor')
    expect(mockedApi.put).toHaveBeenCalledWith('/instructor/courses/5/modules/9', { title: 'محدثة' }, silent)
    expect(out).toEqual(expect.objectContaining({ id: 9 }))
  })

  it('adminDeleteCourseModule DELETEs the module URL', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteCourseModule(5, 9, 'admin')
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/courses/5/modules/9', silent)
  })

  it('adminReorderCourseModules POSTs the ordered ids under all three accepted keys', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await adminReorderCourseModules(5, [3, 1, 2], 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/courses/5/modules/reorder',
      { ids: [3, 1, 2], ordered_ids: [3, 1, 2], module_ids: [3, 1, 2] },
      silent,
    )
  })
})

describe('admin CMS session writes', () => {
  it('adminCreateCourseSession POSTs and returns the normalized session', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { id: 3, title: 'جلسة', start_at: '2026-02-01T10:00:00Z', status: 'live' } },
    })
    const out = await adminCreateCourseSession(5, { title: 'جلسة' }, 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/courses/5/sessions', { title: 'جلسة' }, silent)
    expect(out).toEqual(expect.objectContaining({ id: 3, title: 'جلسة', status: 'live' }))
  })

  it('adminUpdateCourseSession PUTs to the session URL', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 3, status: 'completed' } } })
    const out = await adminUpdateCourseSession(5, 3, { status: 'completed' }, 'admin')
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/courses/5/sessions/3', { status: 'completed' }, silent)
    expect(out.status).toBe('completed')
  })

  it('adminDeleteCourseSession DELETEs the session URL', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteCourseSession(5, 3, 'admin')
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/courses/5/sessions/3', silent)
  })
})

describe('admin CMS material writes', () => {
  it('adminCreateCourseMaterial with FormData sends multipart headers', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 4, title: 'ملف', kind: 'pdf' } } })
    const fd = new FormData()
    fd.append('title', 'ملف')
    fd.append('file', new File(['bytes'], 'lecture.pdf', { type: 'application/pdf' }))

    const out = await adminCreateCourseMaterial(5, fd, 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/courses/5/materials',
      fd,
      expect.objectContaining({
        skipErrorToast: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
    expect(out).toEqual(expect.objectContaining({ id: 4, title: 'ملف', kind: 'pdf' }))
  })

  it('adminCreateCourseMaterial with a plain body POSTs JSON without multipart headers', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 4, title: 'رابط', kind: 'link' } } })
    await adminCreateCourseMaterial(5, { title: 'رابط' }, 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/courses/5/materials', { title: 'رابط' }, silent)
  })

  it('adminUpdateCourseMaterial with FormData POSTs with ?_method=PATCH spoofing', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 4, title: 'محدث' } } })
    const fd = new FormData()
    fd.append('title', 'محدث')
    await adminUpdateCourseMaterial(5, 4, fd, 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/courses/5/materials/4?_method=PATCH',
      fd,
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    )
  })

  it('adminUpdateCourseMaterial with a plain body uses a real PUT', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 4, title: 'محدث' } } })
    await adminUpdateCourseMaterial(5, 4, { title: 'محدث' }, 'admin')
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/courses/5/materials/4', { title: 'محدث' }, silent)
  })

  it('adminDeleteCourseMaterial DELETEs the material URL', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteCourseMaterial(5, 4, 'admin')
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/courses/5/materials/4', silent)
  })
})

describe('admin CMS assignment writes', () => {
  it('adminCreateCourseAssignment POSTs and returns the normalized assignment with defaults', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 6, title: 'واجب جديد' } } })
    const out = await adminCreateCourseAssignment(5, { title: 'واجب جديد' }, 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/courses/5/assignments', { title: 'واجب جديد' }, silent)
    expect(out).toEqual(
      expect.objectContaining({ id: 6, title: 'واجب جديد', submission_type: 'both', required: true, visible: true }),
    )
  })

  it('adminUpdateCourseAssignment PUTs to the assignment URL', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 6, title: 'محدث' } } })
    await adminUpdateCourseAssignment(5, 6, { title: 'محدث' }, 'admin')
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/courses/5/assignments/6', { title: 'محدث' }, silent)
  })

  it('adminDeleteCourseAssignment DELETEs the assignment URL', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteCourseAssignment(5, 6, 'admin')
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/courses/5/assignments/6', silent)
  })
})

describe('admin CMS lesson writes', () => {
  it('adminCreateCourseLesson POSTs and coerces numeric strings in the response', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { id: 12, title: 'درس جديد', duration_minutes: '45', sort_order: '3' } },
    })
    const out = await adminCreateCourseLesson(5, { title: 'درس جديد' }, 'admin')
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/courses/5/lessons', { title: 'درس جديد' }, silent)
    expect(out).toEqual({
      id: 12,
      title: 'درس جديد',
      description: undefined,
      video_url: undefined,
      duration_minutes: 45,
      sort_order: 3,
      status: 'active',
    })
  })

  it('adminCreateCourseLesson survives an empty response row with Arabic fallback title', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: {} } })
    const out = await adminCreateCourseLesson(5, { title: 'x' }, 'admin')
    expect(out).toEqual(
      expect.objectContaining({ id: 0, title: 'درس', sort_order: 0, status: 'active' }),
    )
  })

  it('adminDeleteCourseLesson DELETEs the lesson URL', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await adminDeleteCourseLesson(5, 12, 'admin')
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/courses/5/lessons/12', silent)
  })
})
