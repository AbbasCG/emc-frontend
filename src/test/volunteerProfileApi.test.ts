import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { fetchVolunteerActivity, fetchVolunteerProfile, isForbiddenError } from '@/api/volunteersHubApi'
import { normalizeRequest, submitVolunteerApplication } from '@/api/volunteerApplicationApi'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), defaults: { baseURL: 'http://localhost/api' } },
}))

const api = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchVolunteerProfile', () => {
  it('reads the endpoint and normalises the request through the same code as the accepted list', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          volunteer: { id: 7, user_id: 107, name: 'علي', email: 'a@example.com', phone: null, status: 'active', department_id: 4, department_name: 'الإعلام', hours_logged: '12', created_at: '2026-01-01', account: { has_account: 1, email_verified: true, must_change_password: false, created_at: '2026-01-02' } },
          request: { id: 70, full_name: 'علي', email: 'a@example.com', status: 'accepted', languages: ['العربية', ' '], linkedin_url: 'https://www.linkedin.com/in/ali', professional_bio: ' نبذة ', professional_profile_consent: 0 },
          source: 'volunteer_request',
          team_profile: null,
        },
      },
    })

    const profile = await fetchVolunteerProfile(7)

    expect(api.get).toHaveBeenCalledWith('/operations/volunteers/7/profile', expect.objectContaining({ skipErrorToast: true }))
    expect(profile.volunteer.hours_logged).toBe(12)
    expect(profile.volunteer.account.has_account).toBe(true)
    expect(profile.request?.languages).toEqual(['العربية'])
    expect(profile.request?.professional_bio).toBe('نبذة')
    expect(profile.request?.professional_profile_consent).toBe(false)
    expect(profile.source).toBe('volunteer_request')
    expect(profile.team_profile).toBeNull()
  })

  it('a volunteer without a request: request null, team profile read, source kept', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: { volunteer: { id: 8, name: 'سارة' }, request: null, source: 'team_profile', team_profile: { id: 3, position_ar: 'منسقة', is_active: 0, city: 'عدن' } } },
    })

    const profile = await fetchVolunteerProfile(8)

    expect(profile.request).toBeNull()
    expect(profile.team_profile).toMatchObject({ id: 3, position_ar: 'منسقة', is_active: false, city: 'عدن' })
    // nothing the server did not say is invented: no «active», no «0 hours», no «not verified»
    expect(profile.volunteer.account).toEqual({ has_account: null, email_verified: null, must_change_password: null, created_at: null })
    expect(profile.volunteer.status).toBeNull()
    expect(profile.volunteer.hours_logged).toBeNull()
    expect(profile.match).toBeNull()
  })

  it('an answer with missing pieces still yields a complete object (nothing to crash on)', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true } })

    const profile = await fetchVolunteerProfile(9)

    expect(profile.request).toBeNull()
    expect(profile.source).toBe('account_only')
    expect(profile.volunteer.name).toBe('')
    expect(profile.volunteer.status).toBeNull()
    expect(profile.volunteer.hours_logged).toBeNull()
    expect(profile.volunteer.account.has_account).toBeNull()
  })
})

describe('fetchVolunteerProfile: explicit values and the e-mail match', () => {
  it('keeps an explicit false / 0 and reads match, ignoring an unknown value', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: { volunteer: { id: 1, name: 'أ', status: 'inactive', hours_logged: 0, account: { has_account: false, email_verified: false, must_change_password: false } }, request: null, source: 'account_only', match: 'email' } },
    })
    const profile = await fetchVolunteerProfile(1)
    expect(profile.volunteer.status).toBe('inactive')
    expect(profile.volunteer.hours_logged).toBe(0)
    expect(profile.volunteer.account).toMatchObject({ has_account: false, email_verified: false, must_change_password: false })
    expect(profile.match).toBe('email')

    api.get.mockResolvedValueOnce({ data: { success: true, data: { volunteer: { id: 1 }, match: 'something_new' } } })
    expect((await fetchVolunteerProfile(1)).match).toBeNull()
  })

  it('isForbiddenError tells a 403 from every other failure', () => {
    expect(isForbiddenError({ response: { status: 403 } })).toBe(true)
    expect(isForbiddenError({ response: { status: 500 } })).toBe(false)
    expect(isForbiddenError(new Error('Network Error'))).toBe(false)
    expect(isForbiddenError(null)).toBe(false)
  })
})

describe('fetchVolunteerActivity', () => {
  it('keeps unknown types, fills missing optional fields, and drops non-objects', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { id: 1, type: 'status_change', title: 'تغيير', description: null, occurred_at: '2026-10-01T10:00:00Z', date_formatted: '2026-10-01', actor_name: 'المدير', meta: { old_status: 'active' } },
          { type: 'a_future_type' },
          'garbage',
          null,
        ],
      },
    })

    const items = await fetchVolunteerActivity(7)

    expect(api.get).toHaveBeenCalledWith('/operations/volunteers/7/activity', expect.objectContaining({ skipErrorToast: true }))
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ id: 1, type: 'status_change', actor_name: 'المدير', meta: { old_status: 'active' } })
    expect(items[1]).toMatchObject({ type: 'a_future_type', title: '', description: null, occurred_at: null, actor_name: null, meta: {} })
  })

  it('a non-array answer is an empty timeline, a failed request is thrown (never swallowed)', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: null } })
    expect(await fetchVolunteerActivity(7)).toEqual([])

    api.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchVolunteerActivity(7)).rejects.toThrow('500')
  })
})

describe('the request carries the four new answers', () => {
  it('normalizeRequest reads languages, bio, linkedin and the tri-state consent', () => {
    const r = normalizeRequest({ id: 1, languages: ['العربية'], professional_bio: 'نبذة', linkedin_url: 'https://linkedin.com/in/x', professional_profile_consent: true })
    expect(r).toMatchObject({ languages: ['العربية'], professional_bio: 'نبذة', linkedin_url: 'https://linkedin.com/in/x', professional_profile_consent: true })

    const none = normalizeRequest({ id: 2 })
    expect(none.languages).toBeNull()
    expect(none.professional_profile_consent).toBeNull()
  })

  const base = { full_name: 'أ', email: 'a@example.com', phone: '+967770000000', country: 'اليمن', city: 'صنعاء', gender: 'male', desired_department: 'الإعلام', agree_terms: true }

  it('submit sends them like the other fields (arrays as JSON, consent as 1/0)', async () => {
    api.post.mockResolvedValue({ data: {} })
    await submitVolunteerApplication({ ...base, languages: ['العربية', 'الإنجليزية'], professional_bio: ' نبذة ', linkedin_url: 'https://www.linkedin.com/in/x', professional_profile_consent: false })

    const fd = api.post.mock.calls[0][1] as FormData
    expect(fd.get('languages')).toBe(JSON.stringify(['العربية', 'الإنجليزية']))
    expect(fd.get('professional_bio')).toBe('نبذة')
    expect(fd.get('linkedin_url')).toBe('https://www.linkedin.com/in/x')
    expect(fd.get('professional_profile_consent')).toBe('0')
  })

  it('submit sends NOTHING for an unanswered optional question', async () => {
    api.post.mockResolvedValue({ data: {} })
    await submitVolunteerApplication({ ...base, languages: [], professional_bio: '  ', linkedin_url: '', professional_profile_consent: null })

    const fd = api.post.mock.calls[0][1] as FormData
    for (const key of ['languages', 'professional_bio', 'linkedin_url', 'professional_profile_consent']) expect(fd.has(key)).toBe(false)
  })
})
