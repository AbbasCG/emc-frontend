import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchAdminRegistrations,
  fetchAdminRegistrationDetail,
  updateRegistrationStatus,
  createAccountFromRegistration,
  repairRegistrationLinks,
  type AdminRegistrationListFilters,
  type AdminRegistrationListRow,
} from '@/api/adminRegistrationsApi'

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

const silent = { skipErrorToast: true }

/* ── fetchAdminRegistrations: query-param construction ── */

describe('fetchAdminRegistrations — request params', () => {
  it('sends empty params when no filters are given', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchAdminRegistrations()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/registrations', {
      ...silent,
      params: {},
    })
  })

  it('trims search/status/date filters and maps has_account linked → 1', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const filters: AdminRegistrationListFilters = {
      search: '  أحمد  ',
      status: ' confirmed ',
      course_id: 7,
      date_from: ' 2026-01-01 ',
      date_to: ' 2026-02-01 ',
      has_account: 'linked',
    }
    await fetchAdminRegistrations(filters)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/registrations', {
      ...silent,
      params: {
        search: 'أحمد',
        status: 'confirmed',
        course_id: 7,
        date_from: '2026-01-01',
        date_to: '2026-02-01',
        has_account: 1,
      },
    })
  })

  it('maps has_account guest → 0 and drops blank/NaN filters', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchAdminRegistrations({
      search: '   ',
      status: '',
      course_id: Number.NaN,
      has_account: 'guest',
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/registrations', {
      ...silent,
      params: { has_account: 0 },
    })
  })

  it('propagates request failures', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchAdminRegistrations()).rejects.toThrow('Network Error')
  })
})

/* ── fetchAdminRegistrations: payload coercion + row normalization ── */

describe('fetchAdminRegistrations — list coercion', () => {
  const row = { id: 1, course_id: 2, course_title: 'دورة إدارة المشاريع' }

  it.each([
    ['bare array', [row]],
    ['{ data: [] } envelope', { data: [row] }],
    ['paginated { data: { data: [] } }', { data: { data: [row] } }],
    ['{ registrations: [] } key', { registrations: [row] }],
    ['{ items: [] } key', { items: [row] }],
  ])('extracts rows from %s', async (_label, payload) => {
    mockedApi.get.mockResolvedValueOnce({ data: payload })
    const rows = await fetchAdminRegistrations()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe(1)
  })

  it.each([
    ['null', null],
    ['a string', 'oops'],
    ['an object without any list key', { message: 'لا توجد بيانات' }],
  ])('returns [] for %s payload without crashing', async (_label, payload) => {
    mockedApi.get.mockResolvedValueOnce({ data: payload })
    await expect(fetchAdminRegistrations()).resolves.toEqual([])
  })

  it('normalizes a full row with nested course + user', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 11,
            course: { id: 4, title: 'دورة اللغة الإنجليزية' },
            user: { id: 55, name: 'سارة خالد', email: 'sara@example.com', phone: '0501234567' },
            status: 'confirmed',
            created_at: '2026-08-01T10:00:00Z',
          },
        ],
      },
    })
    const [r] = await fetchAdminRegistrations()
    expect(r).toEqual<AdminRegistrationListRow>({
      id: 11,
      course_id: 4,
      course_title: 'دورة اللغة الإنجليزية',
      student_name: 'سارة خالد',
      email: 'sara@example.com',
      phone: '0501234567',
      user_id: 55,
      has_account: true,
      status: 'confirmed',
      created_at: '2026-08-01T10:00:00Z',
    })
  })

  it('falls back to registration_id / flat fields / registered_at and the Arabic course-title placeholder', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        {
          registration_id: '12',
          course_id: '9',
          full_name: 'محمد علي',
          student_email: 'm@example.com',
          registered_at: '2026-07-15',
        },
      ],
    })
    const [r] = await fetchAdminRegistrations()
    expect(r?.id).toBe(12)
    expect(r?.course_id).toBe(9)
    expect(r?.course_title).toBe('دورة #9')
    expect(r?.student_name).toBe('محمد علي')
    expect(r?.email).toBe('m@example.com')
    expect(r?.phone).toBeNull()
    expect(r?.user_id).toBeNull()
    expect(r?.has_account).toBe(false)
    expect(r?.created_at).toBe('2026-07-15')
  })

  it('honors an explicit has_account boolean over the user_id null-check', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{ id: 1, course_id: 2, user_id: 99, has_account: false }],
    })
    const [r] = await fetchAdminRegistrations()
    expect(r?.user_id).toBe(99)
    expect(r?.has_account).toBe(false)
  })

  it('drops rows with a missing/non-numeric id or course_id and non-object rows', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        { id: 'abc', course_id: 1 },
        { id: 1 }, // no course_id anywhere
        null,
        'junk',
        [1, 2],
        { id: 3, course_id: 4 }, // the only valid one
      ],
    })
    const rows = await fetchAdminRegistrations()
    expect(rows.map((r) => r.id)).toEqual([3])
  })

  it('treats a non-numeric user_id as no account', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [{ id: 1, course_id: 2, user_id: 'abc' }],
    })
    const [r] = await fetchAdminRegistrations()
    expect(r?.user_id).toBeNull()
    expect(r?.has_account).toBe(false)
  })
})

/* ── fetchAdminRegistrationDetail ── */

describe('fetchAdminRegistrationDetail', () => {
  it('requests GET /admin/registrations/{id} silently and maps the full nested payload', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 5,
          full_name: 'ليلى حسن',
          email: 'laila@example.com',
          phone: '0559876543',
          user_id: 77,
          status: 'pending',
          created_at: '2026-06-01',
          city: 'الرياض',
          country: 'السعودية',
          gender: 'female',
          notes: 'تواصل عبر الهاتف',
          source: 'facebook',
          user: { id: 77, name: 'ليلى حسن', email: 'laila@example.com', phone: '0559876543' },
          course: {
            id: 3,
            title: 'دورة إدارة المشاريع',
            type: 'workshop',
            slug: 'pm-101',
            status: 'published',
            start_date: '2026-09-01',
            end_date: '2026-09-30',
            location_type: 'online',
            instructor: { name: 'د. سامي العتيبي' },
          },
          progress: {
            percentage: 80,
            attendance_percentage: 90,
            assignments_completed: 4,
            certificate_status: 'eligible',
          },
        },
      },
    })

    const d = await fetchAdminRegistrationDetail(5)

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/registrations/5', silent)
    expect(d.id).toBe(5)
    expect(d.course_id).toBe(3)
    expect(d.course_title).toBe('دورة إدارة المشاريع')
    expect(d.student_name).toBe('ليلى حسن')
    expect(d.user_id).toBe(77)
    expect(d.has_account).toBe(true)
    expect(d.city).toBe('الرياض')
    expect(d.country).toBe('السعودية')
    expect(d.gender).toBe('female')
    expect(d.notes).toBe('تواصل عبر الهاتف')
    expect(d.source).toBe('facebook')
    expect(d.user).toEqual({ id: 77, name: 'ليلى حسن', email: 'laila@example.com', phone: '0559876543' })
    expect(d.course).toEqual({
      id: 3,
      title: 'دورة إدارة المشاريع',
      type: 'workshop',
      slug: 'pm-101',
      status: 'published',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      location_type: 'online',
      instructor: 'د. سامي العتيبي',
    })
    expect(d.progress).toEqual({
      percentage: 80,
      attendance_percentage: 90,
      assignments_completed: 4,
      certificate_status: 'eligible',
    })
  })

  it('resolves instructor via nested instructor.user.name and course date/location aliases', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        id: 6,
        course_id: 8,
        course: {
          id: 8,
          title: 'دورة تطوير الويب',
          starts_at: '2026-10-01',
          ends_at: '2026-10-20',
          delivery_type: 'onsite',
          instructor: { user: { name: 'أ. منى الزهراني' } },
        },
      },
    })
    const d = await fetchAdminRegistrationDetail(6)
    expect(d.course?.instructor).toBe('أ. منى الزهراني')
    expect(d.course?.start_date).toBe('2026-10-01')
    expect(d.course?.end_date).toBe('2026-10-20')
    expect(d.course?.location_type).toBe('onsite')
  })

  it('falls back to course.instructor_name when instructor is not an object', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        id: 7,
        course_id: 8,
        course: { id: 8, title: 'دورة', instructor_name: 'أ. فهد' },
      },
    })
    const d = await fetchAdminRegistrationDetail(7)
    expect(d.course?.instructor).toBe('أ. فهد')
  })

  it('does not crash on an empty payload — returns the safe placeholder shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    const d = await fetchAdminRegistrationDetail(1)
    // current behavior: id is NaN for an empty body; everything else has a safe fallback
    expect(Number.isNaN(d.id)).toBe(true)
    expect(d.course_id).toBe(0)
    expect(d.course_title).toBe('—')
    expect(d.student_name).toBeNull()
    expect(d.email).toBeNull()
    expect(d.user_id).toBeNull()
    expect(d.has_account).toBe(false)
    expect(d.user).toBeNull()
    expect(d.course).toBeNull()
    expect(d.progress).toBeNull()
  })

  it('fills missing nested user/progress fields with — / zeros', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 9, course_id: 2, user: { id: 4 }, progress: {} } },
    })
    const d = await fetchAdminRegistrationDetail(9)
    expect(d.user).toEqual({ id: 4, name: '—', email: '—', phone: null })
    expect(d.progress).toEqual({
      percentage: 0,
      attendance_percentage: 0,
      assignments_completed: 0,
      certificate_status: null,
    })
  })

  it('propagates request failures', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchAdminRegistrationDetail(1)).rejects.toThrow('boom')
  })
})

/* ── mutations ── */

describe('updateRegistrationStatus', () => {
  it('PATCHes the status endpoint with the new status, silently', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} })
    await updateRegistrationStatus(14, 'confirmed')
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/admin/registrations/14/status',
      { status: 'confirmed' },
      silent,
    )
  })

  it('propagates failures', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('403'))
    await expect(updateRegistrationStatus(14, 'x')).rejects.toThrow('403')
  })
})

describe('createAccountFromRegistration', () => {
  it('POSTs to create-account and returns the inner data block', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: { user_id: 42, created: true, linked: false } },
    })
    const result = await createAccountFromRegistration(9)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/registrations/9/create-account')
    expect(result).toEqual({ user_id: 42, created: true, linked: false })
  })

  it('propagates failures', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(createAccountFromRegistration(9)).rejects.toThrow('422')
  })
})

describe('repairRegistrationLinks', () => {
  it('POSTs to repair-links with an empty body and maps counters + message', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        linked_registrations: 3,
        created_progress_records: 2,
        skipped_duplicates: 1,
        message: 'تم إصلاح الروابط بنجاح',
      },
    })
    const r = await repairRegistrationLinks()
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/registrations/repair-links', {})
    expect(r).toEqual({
      linked_registrations: 3,
      created_progress_records: 2,
      skipped_duplicates: 1,
      message: 'تم إصلاح الروابط بنجاح',
    })
  })

  it('defaults every counter to 0 and message to undefined for a null/empty body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: null })
    const r = await repairRegistrationLinks()
    expect(r).toEqual({
      linked_registrations: 0,
      created_progress_records: 0,
      skipped_duplicates: 0,
      message: undefined,
    })
  })

  it('propagates failures', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('500'))
    await expect(repairRegistrationLinks()).rejects.toThrow('500')
  })
})
