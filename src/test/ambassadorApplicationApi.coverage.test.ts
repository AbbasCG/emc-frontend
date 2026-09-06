import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  AMBASSADOR_STATUS_LABELS,
  AMBASSADOR_STATUS_COLORS,
  defaultAmbassadorForm,
  submitAmbassadorApplication,
  saveAmbassadorDraft,
  fetchAmbassadorApplications,
  fetchAmbassadorFilterOptions,
  fetchAmbassadorApplication,
  updateAmbassadorStatus,
  addAmbassadorNote,
  deleteAmbassadorNote,
  fetchAmbassadorAnalytics,
  type AmbassadorStatus,
  type AmbassadorApplicationFormData,
  type AmbassadorNote,
  type AmbassadorSubmitResult,
} from '@/api/ambassadorApplicationApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

/* ── Constant exports ── */

describe('status label and color maps', () => {
  const allStatuses: AmbassadorStatus[] = [
    'new', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'waitlisted', 'cancelled',
  ]

  it('provides an Arabic label for every status', () => {
    expect(AMBASSADOR_STATUS_LABELS.new).toBe('جديد')
    expect(AMBASSADOR_STATUS_LABELS.under_review).toBe('قيد المراجعة')
    expect(AMBASSADOR_STATUS_LABELS.interview_scheduled).toBe('مقابلة مجدولة')
    expect(AMBASSADOR_STATUS_LABELS.approved).toBe('مقبول')
    expect(AMBASSADOR_STATUS_LABELS.rejected).toBe('مرفوض')
    expect(AMBASSADOR_STATUS_LABELS.waitlisted).toBe('قائمة انتظار')
    expect(AMBASSADOR_STATUS_LABELS.cancelled).toBe('ملغى')
    for (const s of allStatuses) {
      expect(AMBASSADOR_STATUS_LABELS[s]).not.toMatch(/^[a-zA-Z]/)
    }
  })

  it('provides a badge color class for every status', () => {
    for (const s of allStatuses) {
      expect(AMBASSADOR_STATUS_COLORS[s]).toMatch(/^bg-/)
      expect(AMBASSADOR_STATUS_COLORS[s]).toContain('text-')
    }
  })

  it('defaultAmbassadorForm starts empty and unagreed', () => {
    expect(defaultAmbassadorForm.full_name).toBe('')
    expect(defaultAmbassadorForm.interests).toEqual([])
    expect(defaultAmbassadorForm.certificate_files).toEqual([])
    expect(defaultAmbassadorForm.cv_file).toBeNull()
    expect(defaultAmbassadorForm.agree_terms).toBe(false)
    expect(defaultAmbassadorForm.has_led_team).toBe(false)
  })
})

/* ── submitAmbassadorApplication (public multipart submit) ── */

describe('submitAmbassadorApplication', () => {
  const submitResult: AmbassadorSubmitResult = {
    application_id: 11,
    reference_number: 'AMB-2026-0011',
    status: 'new',
    submitted_at: '2026-08-07T10:00:00Z',
    email_confirmation_queued: true,
  }

  it('builds a trimmed multipart payload and posts it to /ambassador-applications', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: submitResult } })

    const cv = new File(['cv'], 'cv.pdf', { type: 'application/pdf' })
    const cert1 = new File(['c1'], 'cert1.pdf', { type: 'application/pdf' })
    const cert2 = new File(['c2'], 'cert2.pdf', { type: 'application/pdf' })

    const form: AmbassadorApplicationFormData = {
      ...defaultAmbassadorForm,
      full_name: '  سارة محمد  ',
      email: 'sara@example.com',
      mobile_phone: '01001234567',
      nationality: 'مصرية',
      gender: 'female',
      date_of_birth: '2003-05-01',
      country: 'مصر',
      city: 'القاهرة',
      university_name: 'جامعة القاهرة',
      motivation_why: 'أرغب في تمثيل EMC داخل جامعتي',
      has_volunteer_experience: true,
      followers_count: '1200',
      interests: ['تصميم', 'برمجة'],
      skills: ['قيادة'],
      events_attendees_count: '150',
      weekly_hours_available: '10',
      can_travel: true,
      volunteer_experience_types: ['تنظيم فعاليات'],
      certifications: ['شهادة تطوع'],
      cv_file: cv,
      student_id_file: null,
      photo_file: null,
      certificate_files: [cert1, cert2],
      agree_terms: true,
    }

    const result = await submitAmbassadorApplication(form)

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/ambassador-applications',
      expect.any(FormData),
      { skipErrorToast: true },
    )
    const fd = mockedApi.post.mock.calls[0][1] as FormData
    const entries = fdEntries(fd)

    // trimmed strings, empty ones omitted entirely
    expect(entries.full_name).toBe('سارة محمد')
    expect(entries.university_type).toBeUndefined()
    expect(entries.social_instagram).toBeUndefined()

    // booleans serialized as '1' / '0'
    expect(entries.has_volunteer_experience).toBe('1')
    expect(entries.has_teaching_experience).toBe('0')
    expect(entries.can_travel).toBe('1')
    expect(entries.owns_laptop).toBe('0')

    // numeric strings sent only when non-blank
    expect(entries.followers_count).toBe('1200')
    expect(entries.events_attendees_count).toBe('150')
    expect(entries.weekly_hours_available).toBe('10')

    // arrays as indexed keys
    expect(entries['interests[0]']).toBe('تصميم')
    expect(entries['interests[1]']).toBe('برمجة')
    expect(entries['skills[0]']).toBe('قيادة')
    expect(entries['volunteer_experience_types[0]']).toBe('تنظيم فعاليات')
    expect(entries['certifications[0]']).toBe('شهادة تطوع')

    // files
    expect(fd.get('cv_file')).toBe(cv)
    expect(entries.student_id_file).toBeUndefined()
    expect(entries.photo_file).toBeUndefined()
    expect(fd.get('certificate_files[0]')).toBe(cert1)
    expect(fd.get('certificate_files[1]')).toBe(cert2)

    // terms always sent as '1'
    expect(entries.agree_terms).toBe('1')

    expect(result).toEqual(submitResult)
  })

  it('omits blank numeric strings (followers_count of whitespace)', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: submitResult } })
    await submitAmbassadorApplication({ ...defaultAmbassadorForm, full_name: 'x', followers_count: '   ' })
    const fd = mockedApi.post.mock.calls[0][1] as FormData
    expect(fdEntries(fd).followers_count).toBeUndefined()
  })

  it('propagates a rejection from the API', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'))
    await expect(submitAmbassadorApplication(defaultAmbassadorForm)).rejects.toThrow('Network Error')
  })
})

/* ── saveAmbassadorDraft ── */

describe('saveAmbassadorDraft', () => {
  it('posts the partial form without a draft_token on first save', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { draft_token: 'tok-1', id: 4 } })
    const result = await saveAmbassadorDraft({ full_name: 'أحمد' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/ambassador-applications/draft',
      { full_name: 'أحمد' },
      { skipErrorToast: true },
    )
    expect(result).toEqual({ draft_token: 'tok-1', id: 4 })
  })

  it('includes the draft_token when resuming an existing draft', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { draft_token: 'tok-1', id: 4 } })
    await saveAmbassadorDraft({ city: 'أسيوط' }, 'tok-1')
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/ambassador-applications/draft',
      { city: 'أسيوط', draft_token: 'tok-1' },
      { skipErrorToast: true },
    )
  })

  it('propagates errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('500'))
    await expect(saveAmbassadorDraft({})).rejects.toThrow('500')
  })
})

/* ── fetchAmbassadorApplications (admin list) ── */

describe('fetchAmbassadorApplications', () => {
  it('requests the bare endpoint when no filter is active', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchAmbassadorApplications()
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/ambassador-applications',
      expect.objectContaining({ skipErrorToast: true }),
    )
  })

  it('builds the query string from active filters, using the aliased param names', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchAmbassadorApplications({
      page: 2,
      per_page: 50,
      status: 'approved',
      search: '  أحمد  ',
      country: 'مصر',
      city: 'القاهرة',
      university_name: ' جامعة القاهرة ', // aliased → university
      major: 'هندسة',                     // aliased → specialization
      gender: 'female',
      date_from: '2026-01-01',
      date_to: '2026-06-30',
    })
    const url = mockedApi.get.mock.calls[0][0] as string
    const qs = new URLSearchParams(url.split('?')[1])
    expect(url.startsWith('/admin/ambassador-applications?')).toBe(true)
    expect(qs.get('page')).toBe('2')
    expect(qs.get('per_page')).toBe('50')
    expect(qs.get('status')).toBe('approved')
    expect(qs.get('search')).toBe('أحمد')
    expect(qs.get('country')).toBe('مصر')
    expect(qs.get('city')).toBe('القاهرة')
    expect(qs.get('university')).toBe('جامعة القاهرة')
    expect(qs.get('specialization')).toBe('هندسة')
    expect(qs.get('gender')).toBe('female')
    expect(qs.get('date_from')).toBe('2026-01-01')
    expect(qs.get('date_to')).toBe('2026-06-30')
  })

  it('omits page=1 and the "all" sentinels from the query', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchAmbassadorApplications({ page: 1, status: 'all', country: 'all', gender: 'all' })
    expect(mockedApi.get.mock.calls[0][0]).toBe('/admin/ambassador-applications')
  })

  it('prefers explicit university/specialization over their aliases', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchAmbassadorApplications({ university: 'الأزهر', university_name: 'أخرى', specialization: 'طب', major: 'صيدلة' })
    const qs = new URLSearchParams((mockedApi.get.mock.calls[0][0] as string).split('?')[1])
    expect(qs.get('university')).toBe('الأزهر')
    expect(qs.get('specialization')).toBe('طب')
  })

  it('normalizes rows, filters non-object entries, and passes through the extras', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: '7', uuid: 'u-1', status: 'APPROVED', full_name: 'سارة محمد', email: 's@x.com', mobile_phone: '0100', is_draft: '1' },
          'junk',
          null,
        ],
        meta: { current_page: 2, last_page: 5, per_page: 20, total: 93, from: 21, to: 40 },
        statistics: { new: 3, approved: 9 },
        by_country: [{ country: 'مصر', count: 80 }],
        monthly_trend: [{ month: '2026-07', count: 12 }],
      },
    })
    const result = await fetchAmbassadorApplications()
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(7)
    expect(result.data[0].status).toBe('approved') // lowercased then accepted
    expect(result.data[0].is_draft).toBe(true)
    expect(result.meta).toEqual({ current_page: 2, last_page: 5, per_page: 20, total: 93, from: 21, to: 40 })
    expect(result.statistics).toEqual({ new: 3, approved: 9 })
    expect(result.by_country).toEqual([{ country: 'مصر', count: 80 }])
    expect(result.monthly_trend).toEqual([{ month: '2026-07', count: 12 }])
  })

  it('survives a completely malformed body with safe defaults', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    const result = await fetchAmbassadorApplications()
    expect(result.data).toEqual([])
    expect(result.meta).toEqual({ current_page: 1, last_page: 1, per_page: 20, total: 0, from: 1, to: 0 })
    expect(result.statistics).toEqual({})
    expect(result.by_country).toEqual([])
    expect(result.monthly_trend).toEqual([])
  })

  it('propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('403'))
    await expect(fetchAmbassadorApplications()).rejects.toThrow('403')
  })
})

/* ── fetchAmbassadorFilterOptions ── */

describe('fetchAmbassadorFilterOptions', () => {
  it('requests the bare endpoint with no params and normalizes the wrapped data', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { countries: [' مصر ', '', 3], cities: ['القاهرة'], universities: null, specializations: 'not-an-array' } },
    })
    const result = await fetchAmbassadorFilterOptions()
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/ambassador-applications/filter-options',
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(result).toEqual({
      countries: ['مصر', '3'], // trimmed, empties dropped, non-strings stringified
      cities: ['القاهرة'],
      universities: [],
      specializations: [],
    })
  })

  it('appends trimmed country/city params to the query', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await fetchAmbassadorFilterOptions({ country: ' مصر ', city: 'أسوان' })
    const qs = new URLSearchParams((mockedApi.get.mock.calls[0][0] as string).split('?')[1])
    expect(qs.get('country')).toBe('مصر')
    expect(qs.get('city')).toBe('أسوان')
  })

  it('falls back to the body itself when there is no data wrapper', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { countries: ['السعودية'], cities: [], universities: [], specializations: [] } })
    const result = await fetchAmbassadorFilterOptions()
    expect(result.countries).toEqual(['السعودية'])
  })
})

/* ── fetchAmbassadorApplication + normalizer branches ── */

describe('fetchAmbassadorApplication', () => {
  it('unwraps and normalizes a realistic detail payload', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          id: '7',
          uuid: 'u-1',
          reference_number: ' AMB-2026-0007 ',
          status: 'Interview_Scheduled',
          is_draft: 0,
          full_name: 'سارة محمد',
          email: 's@x.com',
          mobile_phone: '0100',
          nationality: '   ', // whitespace-only → null
          followers_count: '1200',
          weekly_hours_available: 'abc', // NaN → null
          events_attendees_count: 0,     // zero is preserved, not dropped
          has_led_team: 'true',
          can_travel: 1,
          owns_laptop: 'no', // unrecognized truthy string → false
          interests: ['تصميم', 5, 'برمجة'], // non-strings filtered
          skills: 'not-an-array',
          certificate_count: undefined, // → 0 fallback
          reviewed_by: { id: 1, name: 'مدير' },
          notes: [{ id: 1, content: 'ملاحظة', is_private: true, author: 'مدير' }],
        },
      },
    })
    const app = await fetchAmbassadorApplication(7)
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/ambassador-applications/7',
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(app.id).toBe(7)
    expect(app.reference_number).toBe('AMB-2026-0007')
    expect(app.status).toBe('interview_scheduled')
    expect(app.is_draft).toBe(false)
    expect(app.nationality).toBeNull()
    expect(app.followers_count).toBe(1200)
    expect(app.weekly_hours_available).toBeNull()
    expect(app.events_attendees_count).toBe(0)
    expect(app.has_led_team).toBe(true)
    expect(app.can_travel).toBe(true)
    expect(app.owns_laptop).toBe(false)
    expect(app.interests).toEqual(['تصميم', 'برمجة'])
    expect(app.skills).toEqual([])
    expect(app.certificate_count).toBe(0)
    expect(app.reviewed_by).toEqual({ id: 1, name: 'مدير' })
    expect(app.notes).toHaveLength(1)
    expect(app.status_history).toBeUndefined()
  })

  it('coerces an unknown status to "new"', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { id: 1, uuid: 'u', status: 'weird_status' } } })
    const app = await fetchAmbassadorApplication(1)
    expect(app.status).toBe('new')
  })

  it('does not crash on a non-object inner payload — returns the empty-application shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: 'oops' } })
    const app = await fetchAmbassadorApplication(1)
    expect(app.id).toBe(0)
    expect(app.uuid).toBe('')
    expect(app.status).toBe('new')
    expect(app.full_name).toBe('')
    expect(app.certificate_count).toBe(0)
  })
})

/* ── updateAmbassadorStatus ── */

describe('updateAmbassadorStatus', () => {
  it('patches only the status when no optional fields are given', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 9, uuid: 'u', status: 'approved' } } })
    const app = await updateAmbassadorStatus(9, 'approved')
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/admin/ambassador-applications/9/status',
      { status: 'approved' },
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(app.status).toBe('approved')
  })

  it('includes reason, admin_notes (even empty string) and interview timestamp when provided', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { id: 9, uuid: 'u', status: 'interview_scheduled' } } })
    await updateAmbassadorStatus(9, 'interview_scheduled', 'مؤهلة للمقابلة', '', '2026-09-01T10:00')
    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/admin/ambassador-applications/9/status',
      {
        status: 'interview_scheduled',
        reason: 'مؤهلة للمقابلة',
        admin_notes: '',
        interview_scheduled_at: '2026-09-01T10:00',
      },
      expect.objectContaining({ skipErrorToast: true }),
    )
  })

  it('falls back to {id, status} normalization when the response has no usable payload', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: null } })
    const app = await updateAmbassadorStatus(9, 'rejected')
    expect(app.id).toBe(9)
    expect(app.status).toBe('rejected')
  })

  it('propagates errors', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('422'))
    await expect(updateAmbassadorStatus(9, 'approved')).rejects.toThrow('422')
  })
})

/* ── notes + analytics ── */

describe('notes and analytics endpoints', () => {
  it('addAmbassadorNote posts with is_private defaulting to true and unwraps the note', async () => {
    const note: AmbassadorNote = { id: 3, content: 'ملاحظة داخلية', is_private: true, author: 'مدير', created_at: null }
    mockedApi.post.mockResolvedValueOnce({ data: { data: note } })
    const result = await addAmbassadorNote(7, 'ملاحظة داخلية')
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/ambassador-applications/7/notes',
      { content: 'ملاحظة داخلية', is_private: true },
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(result).toEqual(note)
  })

  it('addAmbassadorNote passes is_private = false through explicitly', async () => {
    const note: AmbassadorNote = { id: 4, content: 'ملاحظة عامة', is_private: false, author: 'مدير' }
    mockedApi.post.mockResolvedValueOnce({ data: { data: note } })
    await addAmbassadorNote(7, 'ملاحظة عامة', false)
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/ambassador-applications/7/notes',
      { content: 'ملاحظة عامة', is_private: false },
      expect.objectContaining({ skipErrorToast: true }),
    )
  })

  it('deleteAmbassadorNote hits the nested notes route', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteAmbassadorNote(7, 3)
    expect(mockedApi.delete).toHaveBeenCalledWith(
      '/admin/ambassador-applications/7/notes/3',
      expect.objectContaining({ skipErrorToast: true }),
    )
  })

  it('fetchAmbassadorAnalytics unwraps the payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { total: 5, by_status: { new: 2 } } } })
    const result = await fetchAmbassadorAnalytics()
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/ambassador-applications/analytics',
      expect.objectContaining({ skipErrorToast: true }),
    )
    expect(result).toEqual({ total: 5, by_status: { new: 2 } })
  })

  it('fetchAmbassadorAnalytics returns {} for a null body', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: null })
    await expect(fetchAmbassadorAnalytics()).resolves.toEqual({})
  })
})
