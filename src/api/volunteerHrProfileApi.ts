import api from './axios'

export type VolunteerHrProfileStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived'

export type VolunteerHrProfileCv = {
  available: boolean
  file_name: string | null
  mime_type: string | null
  size: number | null
  uploaded_at: string | null
}

export type VolunteerHrProfile = {
  id: number
  user_id: number | null
  full_name: string
  email: string
  phone: string
  phone_country_code: string | null
  country: string | null
  country_code: string | null
  city: string | null
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  profile_photo_url: string | null
  department: { id: number; name: string } | null
  department_id: number | null
  job_title: string
  employment_type: string | null
  join_date: string | null
  availability: string | null
  weekly_hours: number | null
  skills: string | null
  languages: string[]
  education: string | null
  university_specialization: string | null
  experience: string | null
  motivation: string | null
  professional_bio: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  /** null = not yet answered (only possible on rows predating this feature) — new submissions always have an explicit true/false. */
  photo_publication_consent: boolean | null
  photo_consent_at: string | null
  professional_profile_consent: boolean | null
  professional_profile_consent_at: string | null
  cv: VolunteerHrProfileCv
  status: VolunteerHrProfileStatus
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: { id: number; name: string } | null
  rejection_reason: string | null
  approved_at: string | null
  approved_by: { id: number; name: string } | null
  team_profile_id: number | null
  created_at: string
  updated_at: string
}

export type VolunteerHrProfileFormValues = {
  full_name: string
  email: string
  /** Canonical E.164-ish value — `${dialCode}${localPhone}`, built by PhoneInput's buildE164Phone, same as signup. */
  phone: string
  phone_country_code?: string
  country?: string
  country_code?: string
  city?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  department_id: number
  job_title: string
  /** 'canonical' when chosen from the department's job-title list (backend verifies it belongs to the department); 'custom' for free text. */
  job_title_source?: 'canonical' | 'custom'
  employment_type?: string
  join_date: string
  availability?: string
  weekly_hours?: number
  skills?: string
  languages?: string[]
  education?: string
  university_specialization?: string
  experience?: string
  motivation?: string
  /** Max 500 chars, plain text only (no HTML) — enforced both client-side and server-side. */
  professional_bio?: string
  linkedin_url?: string
  portfolio_url?: string
  /** Explicit choice required — must be true or false, never left undefined at submit time. */
  photo_publication_consent: boolean | null
  professional_profile_consent: boolean | null
  confirmed: boolean
  cv_file?: File | null
  profile_photo?: File | null
}

function toFormData(values: VolunteerHrProfileFormValues): FormData {
  const fd = new FormData()
  Object.entries(values).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return
    if (key === 'cv_file' || key === 'profile_photo') {
      if (val instanceof File) fd.append(key, val)
      return
    }
    if (key === 'confirmed') {
      fd.append(key, val ? '1' : '0')
      return
    }
    if (key === 'languages' && Array.isArray(val)) {
      val.forEach((lang) => fd.append('languages[]', lang))
      return
    }
    fd.append(key, String(val))
  })
  return fd
}

export async function fetchMyVolunteerHrProfile(): Promise<VolunteerHrProfile | null> {
  const res = await api.get('/volunteer/hr-profile')
  return res.data.data ?? null
}

export async function submitVolunteerHrProfile(values: VolunteerHrProfileFormValues): Promise<VolunteerHrProfile> {
  const res = await api.post('/volunteer/hr-profile', toFormData(values), {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function updateVolunteerHrProfile(id: number, values: VolunteerHrProfileFormValues): Promise<VolunteerHrProfile> {
  const fd = toFormData(values)
  fd.append('_method', 'PUT')
  const res = await api.post(`/volunteer/hr-profile/${id}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}
