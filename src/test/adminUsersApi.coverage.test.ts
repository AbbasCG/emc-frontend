import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  ADMIN_USER_FORBIDDEN_AR,
  unwrapAdminUsersList,
  getAdminUserMutationMessage,
  fetchAdminUsersPage,
  fetchAdminUsers,
  restoreAdminUser,
  fetchAdminUser,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  searchAdminUsers,
  fetchStudentCourses,
  fetchSuperAdminStats,
  type AdminManagedUser,
  type CreateAdminUserInput,
  type UpdateAdminUserInput,
  type SuperAdminStats,
} from '@/api/adminUsersApi'

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

/** Minimal axios-shaped error — passes axios.isAxiosError (checks `isAxiosError === true`). */
function axiosErr(status: number, data?: unknown): unknown {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed',
    config: { url: '/admin/users' },
    response: { status, data },
  }
}

/* ── unwrapAdminUsersList + normalization ── */

describe('unwrapAdminUsersList — payload shapes', () => {
  const raw = { id: 1, name: 'أحمد محمد', email: 'ahmad@example.com' }

  it.each([
    ['bare array', [raw]],
    ['{ data: [] } envelope', { data: [raw] }],
    ['paginated { data: { data: [] } }', { data: { data: [raw] } }],
  ])('extracts rows from %s', (_label, payload) => {
    const users = unwrapAdminUsersList(payload)
    expect(users).toHaveLength(1)
    expect(users[0]?.id).toBe(1)
    expect(users[0]?.name).toBe('أحمد محمد')
  })

  it.each([
    ['null', null],
    ['a string', 'oops'],
    ['an object without lists', { message: 'لا يوجد' }],
  ])('returns [] for %s without crashing', (_label, payload) => {
    expect(unwrapAdminUsersList(payload)).toEqual([])
  })

  it('drops non-object rows and rows without a positive numeric id', () => {
    const users = unwrapAdminUsersList([
      null,
      'junk',
      [1],
      { name: 'بدون معرف' },
      { id: 0, name: 'صفر' },
      { id: -3, name: 'سالب' },
      { id: 'abc', name: 'نص' },
      { id: 9, name: 'صالح', email: 'ok@example.com' },
    ])
    expect(users.map((u) => u.id)).toEqual([9])
  })
})

describe('unwrapAdminUsersList — field normalization', () => {
  it('normalizes a rich raw payload with all the alias fields', () => {
    const [u] = unwrapAdminUsersList([
      {
        id: '7',
        name: null,
        full_name: 'أحمد محمد',
        email: 'a@example.com',
        role: ' Teacher ',
        is_active: '1',
        status: ' Active ',
        gender: 'MALE',
        phone_number: 966501111111,
        department: { name: ' إدارة التدريب ' },
        email_verified: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-08-01T09:00:00Z',
        town: ' جدة ',
        country_code: 'SA',
        heard_from: ' صديق ',
        avatarUrl: ' https://cdn.example.com/a.png ',
        created_at: 1720000000,
        updated_at: '2026-08-02',
        student: { id: 3, student_code: 'S-100', level: 'مبتدئ' },
        instructor_profile: { id: 4, employee_code: 'E-9', specialization: 'رياضيات' },
      },
    ])

    expect(u).toBeDefined()
    expect(u?.id).toBe(7)
    expect(u?.name).toBe('أحمد محمد') // full_name fallback
    expect(u?.role).toBe('teacher') // trimmed + lowercased
    expect(u?.is_active).toBe(true) // '1' coerced
    expect(u?.status).toBe('active')
    expect(u?.gender).toBe('male')
    expect(u?.phone).toBe('966501111111') // numeric phone stringified
    expect(u?.department).toBe('إدارة التدريب') // object with name
    expect(u?.email_verified_at).toBe('2026-01-01T00:00:00Z')
    expect(u?.last_login_at).toBe('2026-08-01T09:00:00Z')
    expect(u?.city).toBe('جدة')
    expect(u?.country).toBe('SA')
    expect(u?.how_did_you_hear_about_us).toBe('صديق')
    expect(u?.avatar_url).toBe('https://cdn.example.com/a.png')
    expect(u?.created_at).toBe('1720000000')
    expect(u?.updated_at).toBe('2026-08-02')
    expect(u?.deleted_at).toBeNull()
    expect(u?.related_student_note).toBe('سجل طالب #3 · رمز طالب: S-100 · المسار: مبتدئ')
    expect(u?.related_instructor_note).toBe('سجل مدرب #4 · رمز موظّف: E-9 · التخصّص: رياضيات')
  })

  it('coerces is_active variants and leaves unknown values as null', () => {
    const users = unwrapAdminUsersList([
      { id: 1, is_active: true },
      { id: 2, is_active: 0 },
      { id: 3, is_active: 'yes' },
      { id: 4 },
    ])
    expect(users.map((u) => u.is_active)).toEqual([true, false, null, null])
  })

  it('summarizes linked enrollments when no student profile block exists', () => {
    const [u] = unwrapAdminUsersList([{ id: 5, name: 'سعاد', enrollments: [{}, {}] }])
    expect(u?.related_student_note).toBe('تسجيلات مرتبطة: 2')
    expect(u?.related_instructor_note).toBeNull()
  })

  it('fills nullable fields with null for a minimal payload', () => {
    const [u] = unwrapAdminUsersList([{ id: 2 }])
    expect(u).toMatchObject<Partial<AdminManagedUser>>({
      id: 2,
      name: '',
      email: '',
      role: null,
      is_active: null,
      status: null,
      deleted_at: null,
      phone: null,
      department: null,
      city: null,
      country: null,
      gender: null,
      how_did_you_hear_about_us: null,
      avatar_url: null,
      email_verified_at: null,
      last_login_at: null,
      created_at: null,
      updated_at: null,
    })
  })

  it('marks a soft-deleted user via deleted_at aliases', () => {
    const [a] = unwrapAdminUsersList([{ id: 1, deleted_at: '2026-05-01' }])
    const [b] = unwrapAdminUsersList([{ id: 2, deletedAt: '2026-06-01' }])
    expect(a?.deleted_at).toBe('2026-05-01')
    expect(b?.deleted_at).toBe('2026-06-01')
  })
})

/* ── getAdminUserMutationMessage ── */

describe('getAdminUserMutationMessage', () => {
  it('returns the Error message for a non-axios Error', () => {
    expect(getAdminUserMutationMessage(new Error('عطل داخلي'))).toBe('عطل داخلي')
  })

  it('returns the generic Arabic fallback for a non-axios non-Error', () => {
    expect(getAdminUserMutationMessage({})).toBe('حدث خطأ غير متوقع. حاول مرة أخرى.')
  })

  it('prefers the backend message on 403 when present', () => {
    const err = axiosErr(403, { message: 'ممنوع: صلاحيات غير كافية' })
    expect(getAdminUserMutationMessage(err)).toBe('ممنوع: صلاحيات غير كافية')
  })

  it('falls back to the standard forbidden copy on a bare 403', () => {
    expect(getAdminUserMutationMessage(axiosErr(403, {}))).toBe(ADMIN_USER_FORBIDDEN_AR)
    expect(ADMIN_USER_FORBIDDEN_AR).toBe('لا تملك صلاحية تنفيذ هذا الإجراء')
  })

  it('joins all 422 field errors with Arabic labels and translated messages', () => {
    const err = axiosErr(422, {
      message: 'The given data was invalid.',
      errors: {
        role: ['The selected role is invalid.'],
        name: ['The name field is required.'],
        custom_field: ['The custom_field field is required.'],
      },
    })
    expect(getAdminUserMutationMessage(err)).toBe(
      [
        'الدور: القيمة المختارة غير مقبولة من الخادم.',
        'الاسم: الحقل مطلوب.',
        'custom_field: الحقل مطلوب.', // unknown fields keep the raw key
      ].join('\n'),
    )
  })

  it('falls through to the generic 422 copy when the 422 body has no errors map', () => {
    expect(getAdminUserMutationMessage(axiosErr(422, {}))).toBe('يرجى مراجعة الحقول المطلوبة.')
  })

  it('maps other statuses via the generic Arabic status copy', () => {
    expect(getAdminUserMutationMessage(axiosErr(500, {}))).toBe('حدث خطأ غير متوقع في الخادم.')
  })
})

/* ── fetchAdminUsersPage ── */

describe('fetchAdminUsersPage — query params', () => {
  it('sends defaults page=1 per_page=15 status=all and omits empty filters', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchAdminUsersPage({})
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/users', {
      ...silent,
      params: { page: 1, per_page: 15, status: 'all' },
    })
  })

  it('serializes all filters, trimming search and mapping verified to 1/0', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchAdminUsersPage({
      page: 2,
      per_page: 20,
      search: ' منى ',
      role: 'student',
      status: 'active',
      department: 'التدريب',
      verified: 'verified',
    })
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/users', {
      ...silent,
      params: {
        page: 2,
        per_page: 20,
        status: 'active',
        search: 'منى',
        role: 'student',
        department: 'التدريب',
        verified: '1',
      },
    })
  })

  it("omits role/department when 'all' and maps verified=unverified to '0'", async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    await fetchAdminUsersPage({ role: 'all', department: 'all', verified: 'unverified' })
    const [, config] = mockedApi.get.mock.calls[0] as [string, { params: Record<string, unknown> }]
    expect(config.params).toEqual({ page: 1, per_page: 15, status: 'all', verified: '0' })
  })

  it('propagates request failures', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchAdminUsersPage({})).rejects.toThrow('Network Error')
  })
})

describe('fetchAdminUsersPage — server-paginated payloads', () => {
  it('uses root-level meta and stats when the backend paginates', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [{ id: 1, name: 'أحمد', email: 'a@example.com' }],
        meta: { total: 42, current_page: 2, per_page: 15, last_page: 3 },
        stats: { total: 42, active: 30, suspended: 5, verified: 20, unverified: 22 },
      },
    })
    const page = await fetchAdminUsersPage({ page: 2 })
    expect(page.serverPaginated).toBe(true)
    expect(page.total).toBe(42)
    expect(page.page).toBe(2)
    expect(page.perPage).toBe(15)
    expect(page.lastPage).toBe(3)
    expect(page.users.map((u) => u.id)).toEqual([1])
    expect(page.summary).toEqual({ total: 42, active: 30, suspended: 5, verified: 20, unverified: 22 })
  })

  it('accepts meta nested inside data and stats under the summary/aliased-count keys', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          data: [{ id: 4, name: 'خالد', email: 'k@example.com' }],
          meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
          summary: { total: 1, active_count: 1, inactive_count: 0, verified_count: 0, unverified_count: 1 },
        },
      },
    })
    const page = await fetchAdminUsersPage({})
    expect(page.serverPaginated).toBe(true)
    expect(page.total).toBe(1)
    expect(page.perPage).toBe(10)
    expect(page.summary).toEqual({ total: 1, active: 1, suspended: 0, verified: 0, unverified: 1 })
  })

  it('defaults page/perPage and computes lastPage when meta only has a total', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [], meta: { total: 30 } },
    })
    const page = await fetchAdminUsersPage({})
    expect(page.serverPaginated).toBe(true)
    expect(page.page).toBe(1)
    expect(page.perPage).toBe(15)
    expect(page.lastPage).toBe(2) // ceil(30 / 15)
    expect(page.summary).toBeNull()
  })
})

describe('fetchAdminUsersPage — client-side fallback (no paginator meta)', () => {
  const rawUsers = [
    { id: 1, name: 'أحمد', email: 'ahmad@example.com', role: 'student', is_active: true, email_verified_at: '2026-01-01' },
    { id: 2, name: 'منى', email: 'mona@example.com', role: 'teacher', is_active: '0' },
    { id: 3, name: 'محذوف', email: 'del@example.com', role: 'student', deleted_at: '2026-01-01' },
    { id: 4, name: 'خالد', email: 'khaled@example.com', role: 'student', department: 'التدريب' },
  ]

  function mockList(): void {
    mockedApi.get.mockResolvedValueOnce({ data: rawUsers })
  }

  it('paginates client-side and computes the summary from the filtered list', async () => {
    mockList()
    const page = await fetchAdminUsersPage({})
    expect(page.serverPaginated).toBe(false)
    expect(page.total).toBe(4)
    expect(page.page).toBe(1)
    expect(page.lastPage).toBe(1)
    expect(page.users).toHaveLength(4)
    // deleted user is skipped entirely; explicit is_active=false counts as suspended
    expect(page.summary).toEqual({ total: 4, active: 2, suspended: 1, verified: 1, unverified: 3 })
  })

  it('clamps an out-of-range page and slices per_page', async () => {
    mockList()
    const page = await fetchAdminUsersPage({ page: 99, per_page: 2 })
    expect(page.lastPage).toBe(2)
    expect(page.page).toBe(2) // clamped from 99
    expect(page.users.map((u) => u.id)).toEqual([3, 4])
  })

  it("status 'active' keeps users unless explicitly inactive or deleted", async () => {
    mockList()
    const page = await fetchAdminUsersPage({ status: 'active' })
    expect(page.users.map((u) => u.id)).toEqual([1, 4])
  })

  it("status 'inactive' keeps only explicit is_active=false non-deleted users", async () => {
    mockList()
    const page = await fetchAdminUsersPage({ status: 'inactive' })
    expect(page.users.map((u) => u.id)).toEqual([2])
  })

  it("status 'deleted' keeps only soft-deleted users", async () => {
    mockList()
    const page = await fetchAdminUsersPage({ status: 'deleted' })
    expect(page.users.map((u) => u.id)).toEqual([3])
  })

  it('matches role filters through normalizeRole aliases (teacher → instructor)', async () => {
    mockList()
    const page = await fetchAdminUsersPage({ role: 'instructor' })
    expect(page.users.map((u) => u.id)).toEqual([2])
  })

  it('filters by verified / unverified', async () => {
    mockList()
    const verified = await fetchAdminUsersPage({ verified: 'verified' })
    expect(verified.users.map((u) => u.id)).toEqual([1])

    mockList()
    const unverified = await fetchAdminUsersPage({ verified: 'unverified' })
    expect(unverified.users.map((u) => u.id)).toEqual([2, 3, 4])
  })

  it('filters by department and by free-text search over name/email', async () => {
    mockList()
    const byDept = await fetchAdminUsersPage({ department: 'التدريب' })
    expect(byDept.users.map((u) => u.id)).toEqual([4])

    mockList()
    const bySearch = await fetchAdminUsersPage({ search: 'ahmad' })
    expect(bySearch.users.map((u) => u.id)).toEqual([1])
  })
})

/* ── plain list / restore / single fetch ── */

describe('fetchAdminUsers', () => {
  it('requests the base list with status=all, silently', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [{ id: 1, name: 'أحمد', email: 'a@example.com' }] } })
    const users = await fetchAdminUsers()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/users', { ...silent, params: { status: 'all' } })
    expect(users.map((u) => u.id)).toEqual([1])
  })
})

describe('restoreAdminUser', () => {
  it('POSTs to the restore endpoint with an empty body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await restoreAdminUser(5)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/users/5/restore', {}, silent)
  })

  it('propagates failures', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('403'))
    await expect(restoreAdminUser(5)).rejects.toThrow('403')
  })
})

describe('fetchAdminUser', () => {
  it('unwraps and normalizes a single user', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 8, name: 'سارة', email: 's@example.com', role: 'Admin' } },
    })
    const u = await fetchAdminUser(8)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/users/8', silent)
    expect(u.id).toBe(8)
    expect(u.role).toBe('admin')
  })

  it('throws on a payload without a valid user id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await expect(fetchAdminUser(8)).rejects.toThrow('Invalid user payload')
  })

  it('throws on a non-object payload instead of returning garbage', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [1, 2] } })
    await expect(fetchAdminUser(8)).rejects.toThrow('Invalid user payload')
  })
})

/* ── create / update / delete ── */

describe('createAdminUser', () => {
  const base: CreateAdminUserInput = {
    name: 'أحمد محمد',
    email: 'ahmad@example.com',
    password: 'Secret123!',
    password_confirmation: 'Secret123!',
    role: 'student',
  }

  it('POSTs only the required fields when optionals are empty/blank', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 10, ...base } } })
    await createAdminUser({ ...base, phone: '   ', department: null, city: undefined })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/users',
      {
        name: 'أحمد محمد',
        email: 'ahmad@example.com',
        password: 'Secret123!',
        password_confirmation: 'Secret123!',
        role: 'student',
      },
      silent,
    )
  })

  it('trims and includes the optional profile fields when present', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 10, ...base } } })
    await createAdminUser({
      ...base,
      phone: ' 0501234567 ',
      department: ' التدريب ',
      city: ' الرياض ',
      country: ' السعودية ',
      how_did_you_hear_about_us: ' صديق ',
    })
    const [, body] = mockedApi.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.phone).toBe('0501234567')
    expect(body.department).toBe('التدريب')
    expect(body.city).toBe('الرياض')
    expect(body.country).toBe('السعودية')
    expect(body.how_did_you_hear_about_us).toBe('صديق')
  })

  it('normalizes the created user from the data envelope', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { id: 10, name: 'أحمد محمد', email: 'ahmad@example.com', role: 'Student' } },
    })
    const u = await createAdminUser(base)
    expect(u.id).toBe(10)
    expect(u.role).toBe('student')
  })

  it('returns a safe empty user (id 0) when the response body is unusable', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: 'ok' })
    const u = await createAdminUser(base)
    expect(u.id).toBe(0)
    expect(u.name).toBe('')
    expect(u.email).toBe('')
  })

  it('propagates validation failures', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(createAdminUser(base)).rejects.toThrow('422')
  })
})

describe('updateAdminUser — JSON path', () => {
  const patch: UpdateAdminUserInput = {
    name: 'منى خالد',
    email: 'mona@example.com',
    role: 'instructor',
  }

  it('PUTs name/email/role only when no optionals are set', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 5, ...patch } } })
    await updateAdminUser(5, patch)
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/admin/users/5',
      { name: 'منى خالد', email: 'mona@example.com', role: 'instructor' },
      silent,
    )
  })

  it('includes trimmed optionals, explicit is_active=false, and the trimmed password pair', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 5, ...patch } } })
    await updateAdminUser(5, {
      ...patch,
      phone: ' 0501111111 ',
      department: ' الجودة ',
      is_active: false,
      password: '  NewPass1! ',
      password_confirmation: 'NewPass1!',
    })
    const [, body] = mockedApi.put.mock.calls[0] as [string, Record<string, unknown>]
    expect(body).toEqual({
      name: 'منى خالد',
      email: 'mona@example.com',
      role: 'instructor',
      phone: '0501111111',
      department: 'الجودة',
      is_active: false,
      password: 'NewPass1!',
      password_confirmation: 'NewPass1!',
    })
  })

  it('omits is_active entirely when null (leave unchanged on server)', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: { id: 5, ...patch } } })
    await updateAdminUser(5, { ...patch, is_active: null })
    const [, body] = mockedApi.put.mock.calls[0] as [string, Record<string, unknown>]
    expect('is_active' in body).toBe(false)
  })

  it('falls back to the sent body merged with the id when the server returns no record', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: null })
    const u = await updateAdminUser(5, { ...patch, role: 'Instructor' })
    expect(u.id).toBe(5)
    expect(u.name).toBe('منى خالد')
    expect(u.email).toBe('mona@example.com')
    expect(u.role).toBe('instructor') // normalized to lowercase
  })

  it('propagates failures', async () => {
    mockedApi.put.mockRejectedValueOnce(new Error('403'))
    await expect(updateAdminUser(5, patch)).rejects.toThrow('403')
  })
})

describe('updateAdminUser — multipart path (avatar)', () => {
  const patch: UpdateAdminUserInput = {
    name: 'منى خالد',
    email: 'mona@example.com',
    role: 'instructor',
  }

  function fdEntries(fd: FormData): Record<string, FormDataEntryValue> {
    const out: Record<string, FormDataEntryValue> = {}
    fd.forEach((v, k) => {
      out[k] = v
    })
    return out
  }

  it('POSTs FormData with _method=PUT and the avatar file', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 5, ...patch } } })
    const avatar = new File(['img-bytes'], 'avatar.png', { type: 'image/png' })
    await updateAdminUser(5, {
      ...patch,
      avatarFile: avatar,
      is_active: true,
      password: ' Pw123456 ',
    })

    const [url, fd, config] = mockedApi.post.mock.calls[0] as [string, FormData, unknown]
    expect(url).toBe('/admin/users/5')
    expect(config).toEqual(silent)
    const entries = fdEntries(fd)
    expect(entries._method).toBe('PUT')
    expect(entries.name).toBe('منى خالد')
    expect(entries.email).toBe('mona@example.com')
    expect(entries.role).toBe('instructor')
    expect(entries.is_active).toBe('1') // boolean serialized Laravel-style
    expect(entries.password).toBe('Pw123456')
    expect(entries.password_confirmation).toBe('Pw123456') // defaults to the trimmed password
    expect(fd.get('avatar')).toBe(avatar)
    expect(entries.remove_avatar).toBeUndefined()
  })

  it('sends remove_avatar=1 (multipart, no file) when only removing the avatar', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 5, ...patch } } })
    await updateAdminUser(5, { ...patch, remove_avatar: true, is_active: false })
    const [, fd] = mockedApi.post.mock.calls[0] as [string, FormData]
    const entries = fdEntries(fd)
    expect(entries.remove_avatar).toBe('1')
    expect(entries.is_active).toBe('0')
    expect(entries.avatar).toBeUndefined()
    expect(entries.password).toBeUndefined()
    expect(mockedApi.put).not.toHaveBeenCalled()
  })
})

describe('deleteAdminUser', () => {
  it('DELETEs the user silently', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteAdminUser(3)
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/users/3', silent)
  })

  it('propagates failures', async () => {
    mockedApi.delete.mockRejectedValueOnce(new Error('403'))
    await expect(deleteAdminUser(3)).rejects.toThrow('403')
  })
})

/* ── typeahead search / student courses / super-admin stats ── */

describe('searchAdminUsers', () => {
  const hit = { id: 1, name: 'أحمد', email: 'a@example.com', phone: null, avatar: null }

  it('returns [] for a blank query without hitting the network', async () => {
    await expect(searchAdminUsers('   ')).resolves.toEqual([])
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('queries with the trimmed term and unwraps an array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [hit] } })
    const hits = await searchAdminUsers(' منى ')
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/users/search', {
      params: { q: 'منى' },
      ...silent,
    })
    expect(hits).toEqual([hit])
  })

  it('unwraps the doubly-nested { data: { data: [] } } shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: [hit] } } })
    await expect(searchAdminUsers('x')).resolves.toEqual([hit])
  })

  it('returns [] for an unusable payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: 'nope' })
    await expect(searchAdminUsers('x')).resolves.toEqual([])
  })

  it('swallows request errors and returns []', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(searchAdminUsers('x')).resolves.toEqual([])
  })
})

describe('fetchStudentCourses', () => {
  const row = {
    course_id: 4,
    course_title: 'دورة إدارة المشاريع',
    status: 'confirmed',
    registered_at: '2026-07-01',
    progress_status: 'in_progress',
    progress_pct: 40,
  }

  it('fetches the admin student-courses endpoint and unwraps the list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [row] } })
    const rows = await fetchStudentCourses(7)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/students/7/courses', silent)
    expect(rows).toEqual([row])
  })

  it('unwraps the doubly-nested shape too', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: [row] } } })
    await expect(fetchStudentCourses(7)).resolves.toEqual([row])
  })

  it('returns [] for unusable payloads and on request errors', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: 'nope' })
    await expect(fetchStudentCourses(7)).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchStudentCourses(7)).resolves.toEqual([])
  })
})

describe('fetchSuperAdminStats', () => {
  it('returns the nested data object when it is a real object', async () => {
    const stats = {
      users: { total: 100, active: 90, inactive: 10, new_this_month: 5, new_last_month: 4, change_percentage: 25 },
      courses: { total: 12 },
      chart: [],
    } as unknown as SuperAdminStats
    mockedApi.get.mockResolvedValueOnce({ data: { data: stats } })
    const result = await fetchSuperAdminStats()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/stats', silent)
    expect(result).toBe(stats)
  })

  it('returns null when data is an array (truthy-but-wrong payload guard)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await expect(fetchSuperAdminStats()).resolves.toBeNull()
  })

  it('returns null when the data key is missing', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await expect(fetchSuperAdminStats()).resolves.toBeNull()
  })

  it('swallows request errors and returns null', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchSuperAdminStats()).resolves.toBeNull()
  })
})
