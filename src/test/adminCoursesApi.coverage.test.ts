import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchAdminRegistrationsIndex,
  countRegistrationsByCourse,
  countNewRegistrations,
  fetchActiveCourses,
  sanitizeCoursePayload,
  updateCourse,
  upsertCourse,
  fetchAdminCourseDetail,
  deleteCourse,
  assignInstructorToCourse,
  patchCourseSchedule,
  patchCoursePublishState,
  patchCourseStatus,
  fetchCourseStudents,
  addStudentToCourse,
  removeStudentFromCourse,
  fetchDepartmentOptions,
  type AdminRegistrationRow,
  type CourseUpsertPayload,
} from '@/api/adminCoursesApi'

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
const silent = { skipErrorToast: true }
const FALLBACK = 'حدث خطأ غير متوقع. حاول مرة أخرى.'

beforeEach(() => {
  vi.clearAllMocks()
  // The module logs request bodies / errors under import.meta.env.DEV — keep test output clean.
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

/* ── fetchAdminRegistrationsIndex + normalization ── */

describe('fetchAdminRegistrationsIndex', () => {
  it('returns normalized rows from the first endpoint when it yields data (does not probe the fallback)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          registrations: [
            { id: 1, course_id: 10, created_at: '2026-08-01T10:00:00Z', status: 'confirmed' },
            { registration_id: 2, course: { id: 11 }, registered_at: '2026-08-02T09:00:00Z' },
            { id: 3, courseId: 12, enrolled_at: '   ' },
            { id: 'not-a-number', course_id: 10 },
            'junk-row',
            null,
          ],
        },
      },
    })

    const rows = await fetchAdminRegistrationsIndex()

    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/registrations', silent)
    expect(rows).toEqual([
      { id: 1, course_id: 10, created_at: '2026-08-01T10:00:00Z', status: 'confirmed' },
      { id: 2, course_id: 11, created_at: '2026-08-02T09:00:00Z', status: null },
      // whitespace-only enrolled_at becomes null, courseId alias accepted
      { id: 3, course_id: 12, created_at: null, status: null },
    ])
  })

  it('falls through to /registrations when the admin endpoint returns an empty list', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { items: [{ id: 5, course_id: 20, createdAt: '2026-08-05' }] } })

    const rows = await fetchAdminRegistrationsIndex()

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/admin/registrations', silent)
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/registrations', silent)
    expect(rows).toEqual([{ id: 5, course_id: 20, created_at: '2026-08-05', status: null }])
  })

  it('returns [] when every endpoint rejects (never throws)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('404')).mockRejectedValueOnce(new Error('404'))
    await expect(fetchAdminRegistrationsIndex()).resolves.toEqual([])
  })

  it('returns [] for a completely malformed final payload (e.g. HTML error page)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce({ data: '<html>error</html>' })
    await expect(fetchAdminRegistrationsIndex()).resolves.toEqual([])
  })
})

describe('countRegistrationsByCourse / countNewRegistrations', () => {
  const rows: AdminRegistrationRow[] = [
    { id: 1, course_id: 10, created_at: new Date(Date.now() - 1 * 86_400_000).toISOString(), status: 'confirmed' },
    { id: 2, course_id: 10, created_at: '2020-01-01T00:00:00Z', status: null },
    { id: 3, course_id: 11, created_at: null, status: null },
    { id: 4, course_id: 11, created_at: 'ليس-تاريخاً', status: null },
  ]

  it('counts registrations per course id', () => {
    const m = countRegistrationsByCourse(rows)
    expect(m.get(10)).toBe(2)
    expect(m.get(11)).toBe(2)
    expect(m.get(99)).toBeUndefined()
  })

  it('counts only rows with a parseable created_at inside the window (default 7 days)', () => {
    expect(countNewRegistrations(rows)).toBe(1)
  })

  it('widens with a custom day window', () => {
    // 2020 row is far outside even a 30-day window; the recent row still counts.
    expect(countNewRegistrations(rows, 30)).toBe(1)
    expect(countNewRegistrations([], 30)).toBe(0)
  })
})

/* ── fetchActiveCourses ── */

describe('fetchActiveCourses', () => {
  it('requests /admin/courses with per_page 300 silently and maps nested instructor names', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          data: [
            { id: 1, title: 'دورة البرمجة', instructor: { user: { name: 'أ. محمد' } }, status: 'published' },
            { id: 2, name: 'ورشة التصميم', instructor: { name: 'أ. سارة' } },
            { id: 3, title: 'دورة اللغة', instructor_name: 'أ. خالد', status: 'draft' },
            { id: 0, title: 'مرفوضة — معرف صفري' },
            { id: 4, title: '' },
            'junk',
          ],
        },
      },
    })

    const list = await fetchActiveCourses()

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/courses', { params: { per_page: 300 }, skipErrorToast: true })
    expect(list).toEqual([
      { id: 1, title: 'دورة البرمجة', instructor_name: 'أ. محمد', status: 'published' },
      { id: 2, title: 'ورشة التصميم', instructor_name: 'أ. سارة', status: null },
      { id: 3, title: 'دورة اللغة', instructor_name: 'أ. خالد', status: 'draft' },
    ])
  })

  it('accepts a bare array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 7, title: 'دورة', status: null }] })
    const list = await fetchActiveCourses()
    expect(list).toEqual([{ id: 7, title: 'دورة', instructor_name: null, status: null }])
  })

  it('returns [] on request failure and on non-list payloads', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchActiveCourses()).resolves.toEqual([])

    mockedApi.get.mockResolvedValueOnce({ data: { data: 'oops' } })
    await expect(fetchActiveCourses()).resolves.toEqual([])
  })
})

/* ── sanitizeCoursePayload ── */

describe('sanitizeCoursePayload', () => {
  it('drops undefined / null / NaN / empty-and-whitespace strings but keeps 0, false, and null learning_path_id', () => {
    const out = sanitizeCoursePayload({
      title: 'دورة',
      type: 'paid',
      price: 0,
      registration_open: false,
      description: '',
      notes: '   ',
      location: null,
      capacity: Number.NaN,
      learning_path_id: null,
      instructor_id: undefined,
    })
    expect(out).toEqual({
      title: 'دورة',
      type: 'paid',
      price: 0,
      registration_open: false,
      learning_path_id: null,
    })
  })

  it('trims array items, removes empties, and drops arrays that end up empty', () => {
    const out = sanitizeCoursePayload({
      title: 'دورة',
      type: 'free',
      keywords: ['  برمجة  ', '', '   '],
      features: ['', '   '],
    })
    expect(out.keywords).toEqual(['برمجة'])
    expect('features' in out).toBe(false)
  })

  it('rounds training_hours and normalizes status casing', () => {
    const out = sanitizeCoursePayload({
      title: 'دورة',
      type: 'free',
      training_hours: 9.6,
      status: ' PUBLISHED ' as unknown as CourseUpsertPayload['status'],
    })
    expect(out.training_hours).toBe(10)
    expect(out.status).toBe('published')
  })

  it('coerces an unknown status to draft', () => {
    const out = sanitizeCoursePayload({
      title: 'دورة',
      type: 'free',
      status: 'bogus' as unknown as CourseUpsertPayload['status'],
    })
    expect(out.status).toBe('draft')
  })
})

/* ── updateCourse / upsertCourse ── */

describe('updateCourse', () => {
  it('PUTs sanitized JSON with delivery_type derived from location_type, and unwraps { data }', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 5, title: 'دورة البرمجة' } } })

    const course = await updateCourse(5, {
      title: 'دورة البرمجة',
      type: 'paid',
      location_type: 'online',
      description: '',
      notes: null,
    })

    expect(mockedApi.put).toHaveBeenCalledWith(
      '/admin/courses/5',
      { title: 'دورة البرمجة', type: 'paid', location_type: 'online', delivery_type: 'online' },
      { skipErrorToast: true },
    )
    expect(course).toEqual({ id: 5, title: 'دورة البرمجة' })
  })

  it('keeps an explicit delivery_type over location_type', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 5 } } })
    await updateCourse(5, { title: 'دورة', type: 'free', location_type: 'onsite', delivery_type: 'hybrid' })
    const [, body] = mockedApi.put.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.delivery_type).toBe('hybrid')
  })

  it('switches to multipart POST with _method=PUT when an image file is supplied', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 5 } } })
    const file = new File(['img-bytes'], 'cover.png', { type: 'image/png' })

    await updateCourse(
      5,
      {
        title: 'دورة البرمجة',
        type: 'paid',
        is_online: true,
        registration_open: false,
        capacity: 30,
        course_image: 'https://old-image.example/x.png',
        features: [' شهادة معتمدة ', ''],
        keywords: ['برمجة'],
      },
      { imageFile: file },
    )

    expect(mockedApi.put).not.toHaveBeenCalled()
    const [url, fd, cfg] = mockedApi.post.mock.calls[0] as [string, FormData, Record<string, unknown>]
    expect(url).toBe('/admin/courses/5')
    expect(cfg).toEqual({ skipErrorToast: true })
    expect(fd.get('_method')).toBe('PUT')
    expect(fd.get('title')).toBe('دورة البرمجة')
    expect(fd.get('is_online')).toBe('1')
    expect(fd.get('registration_open')).toBe('0')
    expect(fd.get('capacity')).toBe('30')
    // arrays serialized as key[i], trimmed by sanitize
    expect(fd.get('features[0]')).toBe('شهادة معتمدة')
    expect(fd.get('keywords[0]')).toBe('برمجة')
    // course_image is never duplicated as a scalar — only the File goes out
    expect(fd.getAll('course_image')).toEqual([file])
  })

  it('propagates request errors', async () => {
    const boom = new Error('422')
    mockedApi.put.mockRejectedValueOnce(boom)
    await expect(updateCourse(5, { title: 'x', type: 'free' })).rejects.toBe(boom)
  })
})

describe('upsertCourse', () => {
  it('creates via POST /admin/courses with sanitized JSON when no courseId is given', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 9, title: 'ورشة' } } })
    const course = await upsertCourse({ title: 'ورشة', type: 'free', location_type: 'online' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/courses',
      { title: 'ورشة', type: 'free', location_type: 'online', delivery_type: 'online' },
      { skipErrorToast: true },
    )
    expect(course).toEqual({ id: 9, title: 'ورشة' })
  })

  it('creates via multipart POST (no _method spoof) when an image file is supplied', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 9 } } })
    const file = new File(['img'], 'cover.jpg', { type: 'image/jpeg' })
    await upsertCourse({ title: 'ورشة', type: 'free' }, undefined, { imageFile: file })
    const [url, fd] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/admin/courses')
    expect(fd.get('_method')).toBeNull()
    expect(fd.get('course_image')).toBe(file)
  })

  it('delegates to updateCourse (PUT) when courseId is provided', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 5 } } })
    await upsertCourse({ title: 'دورة', type: 'free' }, 5)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/courses/5', expect.anything(), { skipErrorToast: true })
    expect(mockedApi.post).not.toHaveBeenCalled()
  })

  it('propagates create errors', async () => {
    const boom = new Error('500')
    mockedApi.post.mockRejectedValueOnce(boom)
    await expect(upsertCourse({ title: 'x', type: 'free' })).rejects.toBe(boom)
  })
})

/* ── fetchAdminCourseDetail (fallback chain) ── */

describe('fetchAdminCourseDetail', () => {
  it('uses the admin endpoint when it succeeds', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { id: 9, title: 'دورة' } } })
    const detail = await fetchAdminCourseDetail(9)
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/courses/9', silent)
    expect(detail).toEqual({ id: 9, title: 'دورة' })
  })

  it('falls back to the public /courses/{id} endpoint on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('403')).mockResolvedValueOnce({ data: { id: 9, title: 'دورة' } })
    const detail = await fetchAdminCourseDetail(9)
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/courses/9', silent)
    expect(detail).toEqual({ id: 9, title: 'دورة' })
  })

  it('rejects with the last Error when every endpoint fails', async () => {
    const last = new Error('not found')
    mockedApi.get.mockRejectedValueOnce(new Error('first')).mockRejectedValueOnce(last)
    await expect(fetchAdminCourseDetail(9)).rejects.toBe(last)
  })

  it('wraps a non-Error rejection into an Error with the Arabic fallback message', async () => {
    mockedApi.get.mockRejectedValueOnce({}).mockRejectedValueOnce({})
    await expect(fetchAdminCourseDetail(9)).rejects.toThrow(FALLBACK)
  })
})

/* ── deleteCourse / assignInstructorToCourse ── */

describe('deleteCourse', () => {
  it('DELETEs the admin course route silently', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteCourse(3)
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/courses/3', silent)
  })

  it('rethrows an Error unchanged', async () => {
    const boom = new Error('forbidden')
    mockedApi.delete.mockRejectedValueOnce(boom)
    await expect(deleteCourse(3)).rejects.toBe(boom)
  })

  it('maps a non-Error axios-like 403 to the Arabic permission message', async () => {
    mockedApi.delete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    await expect(deleteCourse(3)).rejects.toThrow('لا تملك صلاحية الوصول.')
  })
})

describe('assignInstructorToCourse', () => {
  it('succeeds on the dedicated assign-instructor POST without probing fallbacks', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await assignInstructorToCourse(4, 77)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/courses/4/assign-instructor', { instructor_id: 77 }, silent)
    expect(mockedApi.patch).not.toHaveBeenCalled()
    expect(mockedApi.put).not.toHaveBeenCalled()
  })

  it('falls back to PATCH when POST fails', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('405'))
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    await assignInstructorToCourse(4, 77)
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/courses/4', { instructor_id: 77 }, silent)
    expect(mockedApi.put).not.toHaveBeenCalled()
  })

  it('falls back to PUT when POST and PATCH both fail', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('405'))
    mockedApi.patch.mockRejectedValueOnce(new Error('405'))
    mockedApi.put.mockResolvedValueOnce({ data: {} })
    await assignInstructorToCourse(4, 77)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/courses/4', { instructor_id: 77 }, silent)
  })

  it('rejects with the LAST attempt error when all three fail', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('p1'))
    mockedApi.patch.mockRejectedValueOnce(new Error('p2'))
    const last = new Error('p3')
    mockedApi.put.mockRejectedValueOnce(last)
    await expect(assignInstructorToCourse(4, 77)).rejects.toBe(last)
  })

  it('wraps a non-Error final rejection into an Arabic fallback Error', async () => {
    mockedApi.post.mockRejectedValueOnce({})
    mockedApi.patch.mockRejectedValueOnce({})
    mockedApi.put.mockRejectedValueOnce({})
    await expect(assignInstructorToCourse(4, 77)).rejects.toThrow(FALLBACK)
  })
})

/* ── patch helpers ── */

describe('course patch helpers', () => {
  it('patchCourseSchedule PATCHes the schedule fields as-is', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5 } } })
    const body = { start_date: '2026-09-01', end_date: null, study_time: '18:00', meeting_link: null }
    await patchCourseSchedule(5, body)
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/courses/5', body, silent)
  })

  it('patchCoursePublishState(true) sends is_published + status published', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5 } } })
    await patchCoursePublishState(5, true)
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/courses/5', { is_published: true, status: 'published' }, silent)
  })

  it('patchCoursePublishState(false) demotes to draft', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5 } } })
    await patchCoursePublishState(5, false)
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/courses/5', { is_published: false, status: 'draft' }, silent)
  })

  it('patchCourseStatus sends the raw status and unwraps the course', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5, status: 'archived' } } })
    const course = await patchCourseStatus(5, 'archived')
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/courses/5', { status: 'archived' }, silent)
    expect(course).toEqual({ id: 5, status: 'archived' })
  })

  it('patch helpers propagate errors', async () => {
    const boom = new Error('422')
    mockedApi.patch.mockRejectedValueOnce(boom)
    await expect(patchCourseStatus(5, 'draft')).rejects.toBe(boom)
  })
})

/* ── course students ── */

describe('course students endpoints', () => {
  it('fetchCourseStudents forwards search params and returns server data + meta', async () => {
    const participant = {
      registration_id: 1, status: 'confirmed', registered_at: '2026-08-01', user_id: 2,
      name: 'أحمد علي', email: 'a@example.com', phone: null, has_account: true,
      avatar_url: null, progress_status: 'in_progress', progress_pct: 40,
    }
    const meta = { total: 1, current_page: 1, last_page: 1, per_page: 25 }
    mockedApi.get.mockResolvedValueOnce({ data: { data: [participant], meta } })

    const res = await fetchCourseStudents(5, { search: 'أحمد', page: 1 })

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/courses/5/students', {
      params: { search: 'أحمد', page: 1 },
      skipErrorToast: true,
    })
    expect(res.data).toEqual([participant])
    expect(res.meta).toEqual(meta)
  })

  it('fetchCourseStudents survives a null body with safe fallbacks', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const res = await fetchCourseStudents(5)
    expect(res.data).toEqual([])
    expect(res.meta).toEqual({ total: 0, current_page: 1, last_page: 1, per_page: 50 })
  })

  it('addStudentToCourse posts the payload and unwraps { data }', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { registration_id: 9, name: 'سارة' } } })
    const p = await addStudentToCourse(5, { email: 's@example.com', full_name: 'سارة' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/courses/5/students',
      { email: 's@example.com', full_name: 'سارة' },
      silent,
    )
    expect(p).toEqual({ registration_id: 9, name: 'سارة' })
  })

  it('addStudentToCourse falls back to the bare body when there is no data envelope', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { registration_id: 9 } })
    await expect(addStudentToCourse(5, { user_id: 2 })).resolves.toEqual({ registration_id: 9 })
  })

  it('removeStudentFromCourse returns the server message when present, else the Arabic default', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: { message: 'تم الحذف' } })
    await expect(removeStudentFromCourse(5, 2)).resolves.toBe('تم الحذف')
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/courses/5/students/2', silent)

    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await expect(removeStudentFromCourse(5, 2)).resolves.toBe('تمت إزالة الطالب من الدورة وإلغاء تسجيله بنجاح')
  })
})

/* ── departments ── */

describe('fetchDepartmentOptions', () => {
  it('normalizes name/title/slug fallbacks and skips invalid rows', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        departments: [
          { id: 1, name: 'إدارة التدريب' },
          { id: 2, title: 'إدارة الجودة' },
          { id: 3, slug: 'hr' },
          { id: 4 },
          { id: 'x', name: 'مرفوضة' },
          null,
        ],
      },
    })
    const opts = await fetchDepartmentOptions()
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/departments', silent)
    expect(opts).toEqual([
      { id: 1, name: 'إدارة التدريب' },
      { id: 2, name: 'إدارة الجودة' },
      { id: 3, name: 'hr' },
      { id: 4, name: 'إدارة 4' },
    ])
  })

  it('returns [] on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchDepartmentOptions()).resolves.toEqual([])
  })
})
