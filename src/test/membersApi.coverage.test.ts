import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import apiClient from '@/api/axios'
import { createUserAccount, fetchMembers, type InternalMember } from '@/api/membersApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

const DAY_MS = 24 * 60 * 60 * 1000
const recentIso = new Date(Date.now() - 5 * DAY_MS).toISOString()
const oldIso = new Date(Date.now() - 90 * DAY_MS).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  // membersApi logs diagnostics in DEV mode — keep test output clean.
  vi.spyOn(console, 'group').mockImplementation(() => {})
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function okList(list: unknown) {
  return { data: list }
}

/* ── fetchMembers: payload unwrapping shapes ── */

describe('fetchMembers — payload shapes', () => {
  const raw = { id: 1, name: 'أحمد الصالح' }

  it.each([
    ['bare array', [raw]],
    ['{ data: [...] }', { data: [raw] }],
    ['{ members: [...] }', { members: [raw] }],
    ['{ items: [...] }', { items: [raw] }],
    ['{ team_profiles: [...] }', { team_profiles: [raw] }],
    ['{ data: { data: [...] } }', { data: { data: [raw] } }],
    ['{ data: { data: { members: [...] } } }', { data: { data: { members: [raw] } } }],
    ['{ data: { data: { team_profiles: [...] } } }', { data: { data: { team_profiles: [raw] } } }],
  ])('unwraps %s', async (_label, payload) => {
    mockedApi.get.mockResolvedValueOnce(okList(payload))
    const members = await fetchMembers()
    expect(members).toHaveLength(1)
    expect(members[0].id).toBe(1)
    expect(members[0].name).toBe('أحمد الصالح')
  })

  it('returns [] when the payload matches no known list shape', async () => {
    mockedApi.get.mockResolvedValueOnce(okList({ data: 'ليست قائمة' }))
    expect(await fetchMembers()).toEqual([])
  })

  it('queries /admin/members first with the silent flag', async () => {
    mockedApi.get.mockResolvedValueOnce(okList([]))
    await fetchMembers()
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/members', { skipErrorToast: true })
  })
})

/* ── fetchMembers: endpoint fallback & errors ── */

describe('fetchMembers — fallback and error handling', () => {
  it('falls back to /members when the admin endpoint fails', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('403 Forbidden'))
      .mockResolvedValueOnce(okList([{ id: 2, name: 'سارة يوسف' }]))

    const members = await fetchMembers()

    expect(members.map((m) => m.id)).toEqual([2])
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/admin/members', { skipErrorToast: true })
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/members', { skipErrorToast: true })
  })

  it('throws the last endpoint error when every endpoint fails', async () => {
    mockedApi.get
      .mockRejectedValueOnce(new Error('admin failed'))
      .mockRejectedValueOnce(new Error('members failed'))
    await expect(fetchMembers()).rejects.toThrow('members failed')
  })

  it('wraps a non-Error rejection in an Arabic Error', async () => {
    mockedApi.get.mockRejectedValueOnce('boom').mockRejectedValueOnce('boom2')
    await expect(fetchMembers()).rejects.toThrow('تعذّر تحميل قائمة الأعضاء.')
  })
})

/* ── fetchMembers: row normalization ── */

describe('fetchMembers — member normalization', () => {
  it('normalizes a full realistic row (aliases, linked user, numeric coercions)', async () => {
    mockedApi.get.mockResolvedValueOnce(okList([{
      id: '7',
      name: 'أحمد الصالح',
      email: 'ahmad@example.com',
      phone: '+491701234567',
      avatar: 'https://cdn.example.com/a.png',
      department_name: 'قسم التعليم',
      department_id: 3,
      role: 'منسق تطوع',
      member_type: 'staff',
      status: 'active',
      skills: 'ترجمة، تصميم',
      source: 'volunteer_request',
      volunteerRequestId: '12',
      created_at: oldIso,
      joined_at: recentIso,
      user_id: 44,
      can_create_user_account: false,
      linked_user: { id: 44, name: 'أحمد الصالح', email: 'ahmad@example.com', role: 'staff' },
    }]))

    const [m] = await fetchMembers()
    const expected: InternalMember = {
      id: 7,
      name: 'أحمد الصالح',
      email: 'ahmad@example.com',
      phone: '+491701234567',
      avatar_url: 'https://cdn.example.com/a.png',
      department: 'قسم التعليم',
      department_id: '3',
      role_label: 'منسق تطوع',
      member_type: 'staff',
      is_new: true, // joined 5 days ago
      status: 'active',
      skills: 'ترجمة، تصميم',
      source: 'volunteer_request',
      volunteer_request_id: 12,
      created_at: oldIso,
      joined_at: recentIso,
      user_id: 44,
      has_user_account: true,
      can_create_user_account: false,
      linked_user: { id: 44, name: 'أحمد الصالح', email: 'ahmad@example.com', role: 'staff' },
    }
    expect(m).toEqual(expected)
  })

  it('drops rows without a valid id or name, and non-object rows', async () => {
    mockedApi.get.mockResolvedValueOnce(okList([
      null,
      'نص عشوائي',
      [1, 2],
      { name: 'بدون معرف' },
      { id: 0, name: 'معرف صفري' },
      { id: 9 }, // no name
      { id: 9, name: '   ' }, // whitespace-only name
      { id: 10, full_name: 'اسم كامل فقط' }, // full_name alias is accepted
    ]))
    const members = await fetchMembers()
    expect(members.map((m) => m.id)).toEqual([10])
    expect(members[0].name).toBe('اسم كامل فقط')
  })

  it('resolves member types from English, Arabic and alias values', async () => {
    mockedApi.get.mockResolvedValueOnce(okList([
      { id: 1, name: 'أ', member_type: 'موظف' },
      { id: 2, name: 'ب', type: 'شريك' },
      { id: 3, name: 'ج', source_type: 'EMPLOYEE' },
      { id: 4, name: 'د', member_type: 'غير معروف' },
      { id: 5, name: 'هـ' },
    ]))
    const members = await fetchMembers()
    expect(members.map((m) => m.member_type)).toEqual(['staff', 'partner', 'staff', 'volunteer', 'volunteer'])
  })

  it('derives is_new from dates: recent created_at → new, old joined_at → not new, explicit is_new wins', async () => {
    mockedApi.get.mockResolvedValueOnce(okList([
      { id: 1, name: 'أ', created_at: recentIso },
      { id: 2, name: 'ب', joined_at: oldIso },
      { id: 3, name: 'ج' },
      { id: 4, name: 'د', joined_at: recentIso, is_new: false },
      { id: 5, name: 'هـ', converted_to_member_at: recentIso },
    ]))
    const members = await fetchMembers()
    expect(members.map((m) => m.is_new)).toEqual([true, false, false, false, true])
  })

  it('derives has_user_account from user_id when the flag is absent, and rejects invalid linked_user', async () => {
    mockedApi.get.mockResolvedValueOnce(okList([
      { id: 1, name: 'أ', user_id: 5 },
      { id: 2, name: 'ب', user_id: 0 },
      { id: 3, name: 'ج', has_user_account: true },
      { id: 4, name: 'د', linked_user: { id: 8, name: 'مستخدم' } }, // no email → invalid
      { id: 5, name: 'هـ', linked_user: { id: 8, name: 'مستخدم', email: 'u@example.com' } }, // role defaults
    ]))
    const members = await fetchMembers()
    expect(members[0].has_user_account).toBe(true)
    expect(members[0].user_id).toBe(5)
    expect(members[1].has_user_account).toBe(false)
    expect(members[1].user_id).toBeNull()
    expect(members[2].has_user_account).toBe(true)
    expect(members[3].linked_user).toBeNull()
    expect(members[4].linked_user).toEqual({ id: 8, name: 'مستخدم', email: 'u@example.com', role: 'volunteer' })
    expect(members[4].can_create_user_account).toBeNull()
  })
})

/* ── createUserAccount ── */

describe('createUserAccount', () => {
  it('posts to the create-user-account endpoint and unwraps the full result', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          member: { id: 7, name: 'أحمد الصالح', user_id: 44 },
          user: { id: 44, name: 'أحمد الصالح', email: 'ahmad@example.com', role: 'volunteer' },
          temporary_password: 'Temp#1234',
          password_shown_once: true,
          already_linked: false,
          linked_existing: false,
          created: true,
        },
      },
    })

    const result = await createUserAccount(7)

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/team-profiles/7/create-user-account',
      {},
      { skipErrorToast: true },
    )
    expect(result.member?.id).toBe(7)
    expect(result.member?.has_user_account).toBe(true)
    expect(result.user).toEqual({ id: 44, name: 'أحمد الصالح', email: 'ahmad@example.com', role: 'volunteer' })
    expect(result.temporary_password).toBe('Temp#1234')
    expect(result.password_shown_once).toBe(true)
    expect(result.already_linked).toBe(false)
    expect(result.linked_existing).toBe(false)
    expect(result.created).toBe(true)
  })

  it('handles an envelope-less payload and an already-linked response without password', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        member: { id: 7, name: 'أحمد الصالح' },
        user: { id: 44, name: 'أحمد', email: '' }, // empty email → invalid user
        already_linked: true,
      },
    })

    const result = await createUserAccount(7)
    expect(result.member?.id).toBe(7)
    expect(result.user).toBeNull()
    expect(result.temporary_password).toBeNull()
    expect(result.password_shown_once).toBe(false)
    expect(result.already_linked).toBe(true)
    expect(result.created).toBe(false)
  })

  it('returns null member when the payload has none', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: { created: false } } })
    const result = await createUserAccount(9)
    expect(result.member).toBeNull()
    expect(result.user).toBeNull()
  })

  it('propagates request errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(createUserAccount(7)).rejects.toThrow('422')
  })
})
