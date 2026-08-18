import { describe, it, expect } from 'vitest'
import { toFormData, type VolunteerHrProfileFormValues } from '@/api/volunteerHrProfileApi'

const base: VolunteerHrProfileFormValues = {
  full_name: 'أحمد', email: 'a@example.com', phone: '0501234567',
  department_id: 1, job_title: 'مطور', join_date: '2026-01-01',
  languages: [], confirmed: true, cv_file: null, profile_photo: null,
  photo_publication_consent: null, professional_profile_consent: null,
}

describe('toFormData — consent field serialization (the live FormData boolean bug)', () => {
  it('sends "1"/"0" strings for explicit true/false, never a raw boolean or the string "null"', () => {
    const fd = toFormData({ ...base, photo_publication_consent: true, professional_profile_consent: false })
    expect(fd.get('photo_publication_consent')).toBe('1')
    expect(fd.get('professional_profile_consent')).toBe('0')
  })

  it('omits the field entirely when the value is null (no selection) rather than sending "null"', () => {
    const fd = toFormData({ ...base, photo_publication_consent: null, professional_profile_consent: null })
    expect(fd.get('photo_publication_consent')).toBeNull()
    expect(fd.get('professional_profile_consent')).toBeNull()
  })

  it('false is serialized as "0", not omitted — false is a valid explicit answer', () => {
    const fd = toFormData({ ...base, photo_publication_consent: false, professional_profile_consent: false })
    expect(fd.get('photo_publication_consent')).toBe('0')
    expect(fd.get('professional_profile_consent')).toBe('0')
  })
})
