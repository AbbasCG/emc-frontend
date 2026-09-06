import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  submitVolunteerApplication,
  normalizeRequest,
  fetchAcceptedVolunteers,
  fetchVolunteerRequests,
  updateVolunteerRequestStatus,
  convertVolunteerToMember,
  type VolunteerApplicationInput,
} from '@/api/volunteerApplicationApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

function fdEntries(fd: FormData): Record<string, FormDataEntryValue> {
  const out: Record<string, FormDataEntryValue> = {}
  fd.forEach((v, k) => { out[k] = v })
  return out
}

/* ── submitVolunteerApplication (public multipart submit) ── */

describe('submitVolunteerApplication', () => {
  const baseInput: VolunteerApplicationInput = {
    full_name: '  علي حسن  ',
    email: ' ali@example.com ',
    phone: ' 01112223334 ',
    country: 'مصر',
    city: 'طنطا',
    gender: 'male',
    desired_department: 'الإعلام',
    experience_level: 'متوسط',
    skills: '  مونتاج فيديو  ',
    availability: 'weekends',
    motivation: ' أرغب في خدمة المجتمع ',
    previous_experience: ' تطوع سابق في مبادرة ',
    cv_file: null,
    notes: ' ملاحظة إضافية ',
    agree_terms: true,
  }

  it('posts a trimmed multipart payload to /volunteer-requests', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } })
    const cv = new File(['cv'], 'cv.pdf', { type: 'application/pdf' })

    await submitVolunteerApplication({ ...baseInput, cv_file: cv })

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/volunteer-requests',
      expect.any(FormData),
      { skipErrorToast: true },
    )
    const fd = mockedApi.post.mock.calls[0][1] as FormData
    const entries = fdEntries(fd)
    expect(entries.full_name).toBe('علي حسن')
    expect(entries.email).toBe('ali@example.com')
    expect(entries.phone).toBe('01112223334')
    expect(entries.country).toBe('مصر')
    expect(entries.city).toBe('طنطا')
    expect(entries.gender).toBe('male')
    expect(entries.desired_department).toBe('الإعلام')
    expect(entries.experience_level).toBe('متوسط')
    expect(entries.skills).toBe('مونتاج فيديو')
    expect(entries.availability).toBe('weekends')
    expect(entries.motivation).toBe('أرغب في خدمة المجتمع')
    expect(entries.previous_experience).toBe('تطوع سابق في مبادرة')
    expect(fd.get('cv_file')).toBe(cv)
    expect(entries.notes).toBe('ملاحظة إضافية')
    expect(entries.agree_terms).toBe('1') // always sent as '1'
  })

  it('omits the optional fields when blank, but always sends the select-style fields', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } })
    await submitVolunteerApplication({
      ...baseInput,
      gender: '',
      skills: '   ',
      previous_experience: undefined,
      cv_file: null,
      notes: undefined,
    })
    const entries = fdEntries(mockedApi.post.mock.calls[0][1] as FormData)
    expect(entries.skills).toBeUndefined()
    expect(entries.previous_experience).toBeUndefined()
    expect(entries.cv_file).toBeUndefined()
    expect(entries.notes).toBeUndefined()
    // gender/department/level/availability are appended unconditionally, even empty
    expect(entries.gender).toBe('')
    expect(entries.availability).toBe('weekends')
  })

  it('propagates a rejection from the API', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(submitVolunteerApplication(baseInput)).rejects.toThrow('422')
  })
})

/* ── normalizeRequest (exported normalizer) ── */

describe('normalizeRequest', () => {
  it('normalizes a realistic accepted-volunteer payload', () => {
    const r = normalizeRequest({
      id: '5',
      full_name: 'علي حسن',
      email: 'ali@example.com',
      phone: ' 01112223334 ',
      country: 'مصر',
      city: 'طنطا',
      gender: 'male',
      desired_department: 'الإعلام',
      experience_level: 'متوسط',
      skills: 'مونتاج',
      availability: 'أسبوعي',
      motivation: 'أحب التطوع',
      previous_experience: '   ',      // whitespace-only → null
      notes: 'ملاحظة',
      admin_notes: null,
      cv_url: '/files/cv.pdf',         // legacy key feeds both url fields
      status: 'ACCEPTED',              // lowercased then accepted
      created_at: '2026-01-01T00:00:00Z',
      accepted_at: '2026-02-01T00:00:00Z',
      accepted_by: { id: 2, name: 'مشرف' },
      accepted_by_name: 'مشرف',
      can_convert_to_member: '1',
    })
    expect(r.id).toBe(5)
    expect(r.full_name).toBe('علي حسن')
    expect(r.phone).toBe('01112223334')
    expect(r.previous_experience).toBeNull()
    expect(r.cv_file_url).toBe('/files/cv.pdf')
    expect(r.cv_download_url).toBe('/files/cv.pdf')
    expect(r.status).toBe('accepted')
    expect(r.accepted_by).toEqual({ id: 2, name: 'مشرف' })
    expect(r.can_convert_to_member).toBe(true)
    // no conversion signals at all → unknown, not false
    expect(r.is_converted).toBeNull()
    expect(r.converted_to_member_at).toBeNull()
    expect(r.converted_member_id).toBeNull()
    expect(r.converted_member).toBeNull()
  })

  it('does not crash on an empty object — safe defaults everywhere', () => {
    const r = normalizeRequest({})
    expect(r.id).toBe(0)
    expect(r.full_name).toBe('')
    expect(r.email).toBe('')
    expect(r.status).toBe('pending')
    expect(r.phone).toBeNull()
    expect(r.accepted_by).toBeNull()
    expect(r.is_converted).toBeNull()
    expect(r.can_convert_to_member).toBeNull()
  })

  it('coerces an unknown status to "pending" and falls back to raw.name for full_name', () => {
    const r = normalizeRequest({ id: 1, name: 'منى', status: 'archived' })
    expect(r.status).toBe('pending')
    expect(r.full_name).toBe('منى')
  })

  it('an explicit is_converted=false wins over a present conversion timestamp', () => {
    const r = normalizeRequest({ id: 1, is_converted: false, converted_to_member_at: '2026-05-01T00:00:00Z' })
    expect(r.is_converted).toBe(false)
    expect(r.converted_to_member_at).toBe('2026-05-01T00:00:00Z')
  })

  it('derives is_converted=true from the legacy converted_at key', () => {
    const r = normalizeRequest({ id: 1, converted_at: '2026-05-01T00:00:00Z' })
    expect(r.is_converted).toBe(true)
    expect(r.converted_to_member_at).toBe('2026-05-01T00:00:00Z')
  })

  it('derives is_converted=true and the member id from the legacy member_id key', () => {
    const r = normalizeRequest({ id: 1, member_id: '15' })
    expect(r.is_converted).toBe(true)
    expect(r.converted_member_id).toBe(15)
  })

  it('builds the embedded member snapshot from raw.member with a full_name fallback', () => {
    const r = normalizeRequest({ id: 1, member: { id: 8, full_name: 'منى سعيد' } })
    expect(r.converted_member).toEqual({ id: 8, name: 'منى سعيد' })
  })

  it('drops an embedded member with a non-positive id', () => {
    const r = normalizeRequest({ id: 1, converted_member: { id: 0, name: 'x' } })
    expect(r.converted_member).toBeNull()
  })

  it('drops an accepted_by that is an array or has an invalid id', () => {
    expect(normalizeRequest({ id: 1, accepted_by: [1, 2] }).accepted_by).toBeNull()
    expect(normalizeRequest({ id: 1, accepted_by: { id: -1, name: 'x' } }).accepted_by).toBeNull()
  })

  it('parses can_convert_to_member "0" as an explicit false', () => {
    expect(normalizeRequest({ id: 1, can_convert_to_member: '0' }).can_convert_to_member).toBe(false)
  })
})

/* ── fetchAcceptedVolunteers ── */

describe('fetchAcceptedVolunteers', () => {
  it('unwraps the paginated shape, drops junk and id-less rows, and reads both meta levels', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          data: [
            { id: 5, full_name: 'علي حسن', email: 'a@x.com', status: 'accepted' },
            { id: 0, full_name: 'صف بلا معرف', email: '' }, // filtered: id must be > 0
            'junk',
          ],
          meta: { total: 12, current_page: 2, last_page: 3, per_page: 5 },
        },
        meta: { total_accepted: 12, total_converted: 4, accepted_this_month: 2, top_department: 'الإعلام' },
      },
    })
    const result = await fetchAcceptedVolunteers()
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/volunteers/accepted',
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(result.data).toHaveLength(1)
    expect(result.data[0].full_name).toBe('علي حسن')
    expect(result.pagination).toEqual({ total: 12, current_page: 2, last_page: 3, per_page: 5 })
    expect(result.meta).toEqual({ total_accepted: 12, total_converted: 4, accepted_this_month: 2, top_department: 'الإعلام' })
  })

  it('accepts a bare-array body and falls back to default meta/pagination', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 9, full_name: 'منى', email: 'm@x.com', status: 'accepted' }] },
    })
    const result = await fetchAcceptedVolunteers()
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(9)
    expect(result.pagination).toEqual({ total: 0, current_page: 1, last_page: 1, per_page: 50 })
    expect(result.meta).toEqual({ total_accepted: 0, total_converted: 0, accepted_this_month: 0, top_department: null })
  })

  it('serializes the params record into the query string', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { data: [], meta: {} } } })
    await fetchAcceptedVolunteers({ page: '2', department: 'الإعلام' })
    const url = mockedApi.get.mock.calls[0][0] as string
    const qs = new URLSearchParams(url.split('?')[1])
    expect(url.startsWith('/admin/volunteers/accepted?')).toBe(true)
    expect(qs.get('page')).toBe('2')
    expect(qs.get('department')).toBe('الإعلام')
  })

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchAcceptedVolunteers()).rejects.toThrow('500')
  })
})

/* ── fetchVolunteerRequests ── */

describe('fetchVolunteerRequests', () => {
  it('requests the bare endpoint when no filter is active (page 1, "all" sentinels)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchVolunteerRequests({ page: 1, status: 'all', desired_department: 'all' })
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/volunteer-requests',
      expect.objectContaining({ skipErrorToast: true }),
    )
  })

  it('builds the query string from active filters, trimming the search', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchVolunteerRequests({ page: 2, per_page: 10, status: 'accepted', search: ' علي ', desired_department: 'الإعلام' })
    const url = mockedApi.get.mock.calls[0][0] as string
    const qs = new URLSearchParams(url.split('?')[1])
    expect(qs.get('page')).toBe('2')
    expect(qs.get('per_page')).toBe('10')
    expect(qs.get('status')).toBe('accepted')
    expect(qs.get('search')).toBe('علي')
    expect(qs.get('desired_department')).toBe('الإعلام')
  })

  it('normalizes rows (skipping arrays/null/strings) and reads meta + statistics', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 3, full_name: 'سعاد', email: 's@x.com', status: 'reviewing' },
          [1, 2], // arrays are explicitly excluded by the row filter
          null,
          { id: 0 }, // id must be > 0
        ],
        meta: { current_page: 1, last_page: 2, per_page: 20, total: 25, from: 1, to: 20 },
        statistics: { total: 25, pending: 10, reviewing: 5, reviewed: 2, accepted: 4, rejected: 2, contacted: 1, converted_to_member: 1 },
      },
    })
    const result = await fetchVolunteerRequests()
    expect(result.data).toHaveLength(1)
    expect(result.data[0].status).toBe('reviewing')
    expect(result.meta.total).toBe(25)
    expect(result.statistics.converted_to_member).toBe(1)
    expect(result.statistics.pending).toBe(10)
  })

  it('survives a null body: empty data, default meta, statistics.total mirrors meta.total', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const result = await fetchVolunteerRequests()
    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ current_page: 1, last_page: 1, per_page: 20, total: 0, from: 1, to: 0 })
    expect(result.statistics).toEqual({
      total: 0, pending: 0, reviewing: 0, reviewed: 0, accepted: 0, rejected: 0, contacted: 0, converted_to_member: 0,
    })
  })

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('403'))
    await expect(fetchVolunteerRequests()).rejects.toThrow('403')
  })
})

/* ── updateVolunteerRequestStatus ── */

describe('updateVolunteerRequestStatus', () => {
  it('patches only the status when admin_notes is not given', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5, status: 'reviewed', full_name: 'علي', email: 'a@x.com' } } })
    const r = await updateVolunteerRequestStatus(5, 'reviewed')
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/admin/volunteer-requests/5/status',
      { status: 'reviewed' },
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(r.status).toBe('reviewed')
    expect(r.full_name).toBe('علي')
  })

  it('sends admin_notes even when it is an empty string (explicit clear)', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 5, status: 'rejected' } } })
    await updateVolunteerRequestStatus(5, 'rejected', '')
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/admin/volunteer-requests/5/status',
      { status: 'rejected', admin_notes: '' },
      expect.objectContaining({ skipErrorToast: true }),
    )
  })

  it('falls back to {id, status} normalization when the response payload is unusable', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: null } })
    const r = await updateVolunteerRequestStatus(5, 'accepted')
    expect(r.id).toBe(5)
    expect(r.status).toBe('accepted')
  })

  it('propagates errors', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('422'))
    await expect(updateVolunteerRequestStatus(5, 'accepted')).rejects.toThrow('422')
  })
})

/* ── convertVolunteerToMember ── */

describe('convertVolunteerToMember', () => {
  it('posts an empty body to the convert endpoint and merges the nested request + member shapes', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        data: {
          volunteer_request: {
            id: 7,
            full_name: 'علي حسن',
            status: 'converted_to_member',
            converted_to_member_at: '2026-08-01T00:00:00Z',
            converted_member_id: 99,
          },
          member: { id: 99, name: 'أحمد علي' },
        },
      },
    })
    const r = await convertVolunteerToMember(7)
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/volunteer-requests/7/convert-to-member',
      {},
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(r.id).toBe(7)
    expect(r.status).toBe('converted_to_member')
    expect(r.is_converted).toBe(true)
    expect(r.converted_to_member_at).toBe('2026-08-01T00:00:00Z')
    expect(r.converted_member_id).toBe(99)
    expect(r.converted_member).toEqual({ id: 99, name: 'أحمد علي' })
    expect(r.can_convert_to_member).toBe(false)
  })

  it('synthesizes a converted state when the backend returns an empty payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const r = await convertVolunteerToMember(7)
    expect(r.id).toBe(7)
    expect(r.status).toBe('accepted')
    expect(r.is_converted).toBe(true)
    // synthesized "now" timestamp
    expect(r.converted_to_member_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(r.converted_member).toBeNull()
    expect(r.converted_member_id).toBeNull()
    expect(r.can_convert_to_member).toBe(false)
  })

  it('when the backend returns the member record directly, the member id becomes the row id (current behavior)', async () => {
    // NOTE: current behavior — the spread of the member record overrides the known
    // request id, so the returned VolunteerRequest.id is the MEMBER id (42), not 7.
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 42, name: 'عضو جديد' } } })
    const r = await convertVolunteerToMember(7)
    expect(r.id).toBe(42)
    expect(r.full_name).toBe('عضو جديد')
    expect(r.status).toBe('accepted')
    expect(r.is_converted).toBe(true)
    expect(r.converted_member_id).toBe(42)
    expect(r.can_convert_to_member).toBe(false)
  })

  it('propagates errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('409'))
    await expect(convertVolunteerToMember(7)).rejects.toThrow('409')
  })
})
