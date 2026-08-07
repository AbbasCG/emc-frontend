import apiClient from './axios'
import { unwrapData } from './unwrap'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AmbassadorStatus =
  | 'new'
  | 'under_review'
  | 'interview_scheduled'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'cancelled'

export const AMBASSADOR_STATUS_LABELS: Record<AmbassadorStatus, string> = {
  new:                  'جديد',
  under_review:         'قيد المراجعة',
  interview_scheduled:  'مقابلة مجدولة',
  approved:             'مقبول',
  rejected:             'مرفوض',
  waitlisted:           'قائمة انتظار',
  cancelled:            'ملغى',
}

export const AMBASSADOR_STATUS_COLORS: Record<AmbassadorStatus, string> = {
  new:                  'bg-blue-100 text-blue-800',
  under_review:         'bg-amber-100 text-amber-800',
  interview_scheduled:  'bg-indigo-100 text-indigo-800',
  approved:             'bg-emerald-100 text-emerald-800',
  rejected:             'bg-red-100 text-red-800',
  waitlisted:           'bg-slate-100 text-slate-700',
  cancelled:            'bg-slate-100 text-slate-500',
}

export type AmbassadorApplication = {
  id: number
  uuid: string
  reference_number?: string | null
  status: AmbassadorStatus
  is_draft: boolean
  created_at?: string | null
  updated_at?: string | null
  submitted_at?: string | null
  source?: string | null

  // Personal
  full_name: string
  email: string
  mobile_phone: string
  nationality?: string | null
  gender?: string | null
  date_of_birth?: string | null
  country?: string | null
  city?: string | null

  // University
  university_name?: string | null
  university_type?: string | null
  faculty?: string | null
  major?: string | null
  study_year?: string | null
  student_number?: string | null
  student_status?: string | null
  expected_graduation_date?: string | null

  // Ambassador info
  motivation_why?: string | null
  contribution_what?: string | null
  expected_gain?: string | null
  biggest_achievement?: string | null
  biggest_challenge?: string | null
  has_volunteer_experience?: boolean
  has_event_organization_experience?: boolean
  has_teaching_experience?: boolean
  has_student_club_involvement?: boolean
  social_instagram?: string | null
  social_linkedin?: string | null
  social_facebook?: string | null
  social_tiktok?: string | null
  social_github?: string | null
  website_url?: string | null
  followers_count?: number | null

  // Arrays
  interests?: string[]
  skills?: string[]
  volunteer_experience_types?: string[]
  certifications?: string[]

  // Leadership
  has_led_team?: boolean
  has_organized_events?: boolean
  events_attendees_count?: number | null
  has_represented_university?: boolean

  // Availability
  weekly_hours_available?: number | null
  can_attend_university_events?: boolean
  can_represent_emc_outside?: boolean
  can_travel?: boolean
  owns_laptop?: boolean
  has_stable_internet?: boolean
  can_attend_weekly_meetings?: boolean

  // Files
  cv_download_url?: string | null
  cv_view_url?: string | null
  has_student_id?: boolean
  student_id_download_url?: string | null
  has_photo?: boolean
  photo_url?: string | null
  certificate_count?: number

  // Admin
  admin_notes?: string | null
  interview_scheduled_at?: string | null
  reviewed_by?: { id: number; name: string } | null
  reviewed_at?: string | null
  status_updated_by?: { id: number; name: string } | null
  status_updated_at?: string | null
  notes?: AmbassadorNote[]
  status_history?: AmbassadorStatusHistory[]
}

export type AmbassadorNote = {
  id: number
  content: string
  is_private: boolean
  author: string
  created_at?: string | null
}

export type AmbassadorStatusHistory = {
  id: number
  from_status: string | null
  to_status: string
  reason: string | null
  changed_by: string
  changed_at?: string | null
}

export type AmbassadorApplicationFormData = {
  // Step 1
  full_name: string
  email: string
  mobile_phone: string
  nationality: string
  gender: string
  date_of_birth: string
  country: string
  city: string
  // Step 2
  university_name: string
  university_type: string
  faculty: string
  major: string
  study_year: string
  student_number: string
  student_status: string
  expected_graduation_date: string
  // Step 3
  motivation_why: string
  contribution_what: string
  expected_gain: string
  biggest_achievement: string
  biggest_challenge: string
  has_volunteer_experience: boolean
  has_event_organization_experience: boolean
  has_teaching_experience: boolean
  has_student_club_involvement: boolean
  social_instagram: string
  social_linkedin: string
  social_facebook: string
  social_tiktok: string
  social_github: string
  website_url: string
  followers_count: string
  // Step 4
  interests: string[]
  // Step 5
  skills: string[]
  // Step 6
  has_led_team: boolean
  has_organized_events: boolean
  events_attendees_count: string
  has_represented_university: boolean
  // Step 7
  weekly_hours_available: string
  can_attend_university_events: boolean
  can_represent_emc_outside: boolean
  can_travel: boolean
  owns_laptop: boolean
  has_stable_internet: boolean
  can_attend_weekly_meetings: boolean
  // Step 8
  volunteer_experience_types: string[]
  // Step 9
  certifications: string[]
  // Step 10
  cv_file: File | null
  student_id_file: File | null
  photo_file: File | null
  certificate_files: File[]
  // Step 11
  agree_terms: boolean
}

export const defaultAmbassadorForm: AmbassadorApplicationFormData = {
  full_name: '', email: '', mobile_phone: '', nationality: '', gender: '',
  date_of_birth: '', country: '', city: '',
  university_name: '', university_type: '', faculty: '', major: '',
  study_year: '', student_number: '', student_status: '', expected_graduation_date: '',
  motivation_why: '', contribution_what: '', expected_gain: '',
  biggest_achievement: '', biggest_challenge: '',
  has_volunteer_experience: false, has_event_organization_experience: false,
  has_teaching_experience: false, has_student_club_involvement: false,
  social_instagram: '', social_linkedin: '', social_facebook: '',
  social_tiktok: '', social_github: '', website_url: '', followers_count: '',
  interests: [], skills: [],
  has_led_team: false, has_organized_events: false,
  events_attendees_count: '', has_represented_university: false,
  weekly_hours_available: '',
  can_attend_university_events: false, can_represent_emc_outside: false,
  can_travel: false, owns_laptop: false, has_stable_internet: false,
  can_attend_weekly_meetings: false,
  volunteer_experience_types: [], certifications: [],
  cv_file: null, student_id_file: null, photo_file: null, certificate_files: [],
  agree_terms: false,
}

export type AmbassadorListParams = {
  page?: number
  per_page?: number
  status?: AmbassadorStatus | 'all'
  search?: string
  country?: string
  city?: string
  university?: string
  university_name?: string
  specialization?: string
  major?: string
  gender?: string
  date_from?: string
  date_to?: string
}

export type AmbassadorFilterOptions = {
  countries: string[]
  cities: string[]
  universities: string[]
  specializations: string[]
}

export type AmbassadorListResult = {
  data: AmbassadorApplication[]
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number; to: number }
  statistics: Record<string, number>
  by_country: { country: string; count: number }[]
  monthly_trend: { month: string; count: number }[]
}

// ── Public API ────────────────────────────────────────────────────────────────

export type AmbassadorSubmitResult = {
  application_id: number
  reference_number: string
  status: string
  submitted_at: string
  email_confirmation_queued: boolean
}

export async function submitAmbassadorApplication(
  form: AmbassadorApplicationFormData,
): Promise<AmbassadorSubmitResult> {
  const fd = new FormData()

  const appendStr = (key: string, val: string) => { if (val.trim()) fd.append(key, val.trim()) }
  const appendBool = (key: string, val: boolean) => fd.append(key, val ? '1' : '0')

  appendStr('full_name', form.full_name)
  appendStr('email', form.email)
  appendStr('mobile_phone', form.mobile_phone)
  appendStr('nationality', form.nationality)
  appendStr('gender', form.gender)
  appendStr('date_of_birth', form.date_of_birth)
  appendStr('country', form.country)
  appendStr('city', form.city)
  appendStr('university_name', form.university_name)
  appendStr('university_type', form.university_type)
  appendStr('faculty', form.faculty)
  appendStr('major', form.major)
  appendStr('study_year', form.study_year)
  appendStr('student_number', form.student_number)
  appendStr('student_status', form.student_status)
  appendStr('expected_graduation_date', form.expected_graduation_date)
  appendStr('motivation_why', form.motivation_why)
  appendStr('contribution_what', form.contribution_what)
  appendStr('expected_gain', form.expected_gain)
  appendStr('biggest_achievement', form.biggest_achievement)
  appendStr('biggest_challenge', form.biggest_challenge)
  appendBool('has_volunteer_experience', form.has_volunteer_experience)
  appendBool('has_event_organization_experience', form.has_event_organization_experience)
  appendBool('has_teaching_experience', form.has_teaching_experience)
  appendBool('has_student_club_involvement', form.has_student_club_involvement)
  appendStr('social_instagram', form.social_instagram)
  appendStr('social_linkedin', form.social_linkedin)
  appendStr('social_facebook', form.social_facebook)
  appendStr('social_tiktok', form.social_tiktok)
  appendStr('social_github', form.social_github)
  appendStr('website_url', form.website_url)
  if (form.followers_count.trim()) fd.append('followers_count', form.followers_count)
  form.interests.forEach((v, i) => fd.append(`interests[${i}]`, v))
  form.skills.forEach((v, i) => fd.append(`skills[${i}]`, v))
  appendBool('has_led_team', form.has_led_team)
  appendBool('has_organized_events', form.has_organized_events)
  if (form.events_attendees_count.trim()) fd.append('events_attendees_count', form.events_attendees_count)
  appendBool('has_represented_university', form.has_represented_university)
  if (form.weekly_hours_available.trim()) fd.append('weekly_hours_available', form.weekly_hours_available)
  appendBool('can_attend_university_events', form.can_attend_university_events)
  appendBool('can_represent_emc_outside', form.can_represent_emc_outside)
  appendBool('can_travel', form.can_travel)
  appendBool('owns_laptop', form.owns_laptop)
  appendBool('has_stable_internet', form.has_stable_internet)
  appendBool('can_attend_weekly_meetings', form.can_attend_weekly_meetings)
  form.volunteer_experience_types.forEach((v, i) => fd.append(`volunteer_experience_types[${i}]`, v))
  form.certifications.forEach((v, i) => fd.append(`certifications[${i}]`, v))
  if (form.cv_file) fd.append('cv_file', form.cv_file)
  if (form.student_id_file) fd.append('student_id_file', form.student_id_file)
  if (form.photo_file) fd.append('photo_file', form.photo_file)
  form.certificate_files.forEach((f, i) => fd.append(`certificate_files[${i}]`, f))
  fd.append('agree_terms', '1')

  const res = await apiClient.post<{ success: boolean; data: AmbassadorSubmitResult }>(
    '/ambassador-applications',
    fd,
    { skipErrorToast: true },
  )
  return (res.data as { data: AmbassadorSubmitResult }).data
}

export async function saveAmbassadorDraft(
  data: Partial<AmbassadorApplicationFormData>,
  draftToken?: string,
): Promise<{ draft_token: string; id: number }> {
  const body: Record<string, unknown> = { ...data }
  if (draftToken) body.draft_token = draftToken
  const res = await apiClient.post('/ambassador-applications/draft', body, { skipErrorToast: true })
  return (res.data as Record<string, unknown>) as { draft_token: string; id: number }
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export async function fetchAmbassadorApplications(
  params: AmbassadorListParams = {},
  signal?: AbortSignal,
): Promise<AmbassadorListResult> {
  const qs: Record<string, string> = {}
  if (params.page && params.page > 1) qs.page = String(params.page)
  if (params.per_page) qs.per_page = String(params.per_page)
  if (params.status && params.status !== 'all') qs.status = params.status
  if (params.search?.trim()) qs.search = params.search.trim()
  if (params.country?.trim() && params.country !== 'all') qs.country = params.country.trim()
  if (params.city?.trim()) qs.city = params.city.trim()
  const university = (params.university ?? params.university_name)?.trim()
  if (university) qs.university = university
  const specialization = (params.specialization ?? params.major)?.trim()
  if (specialization) qs.specialization = specialization
  if (params.gender && params.gender !== 'all') qs.gender = params.gender
  if (params.date_from) qs.date_from = params.date_from
  if (params.date_to) qs.date_to = params.date_to

  const query = Object.keys(qs).length ? '?' + new URLSearchParams(qs).toString() : ''
  const res = await apiClient.get<unknown>(`/admin/ambassador-applications${query}`, {
    skipErrorToast: true,
    signal,
  } as Record<string, unknown>)
  const body = res.data as Record<string, unknown>

  const rawList = Array.isArray(body?.data) ? (body.data as unknown[]) : []
  const data = rawList
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map(normalizeApplication)

  const rawMeta = (body?.meta ?? {}) as Record<string, unknown>

  return {
    data,
    meta: {
      current_page: Number(rawMeta.current_page ?? 1),
      last_page:    Number(rawMeta.last_page    ?? 1),
      per_page:     Number(rawMeta.per_page     ?? 20),
      total:        Number(rawMeta.total        ?? data.length),
      from:         Number(rawMeta.from         ?? 1),
      to:           Number(rawMeta.to           ?? data.length),
    },
    statistics: (body?.statistics ?? {}) as Record<string, number>,
    by_country: (body?.by_country ?? []) as { country: string; count: number }[],
    monthly_trend: (body?.monthly_trend ?? []) as { month: string; count: number }[],
  }
}

export async function fetchAmbassadorFilterOptions(
  params: { country?: string; city?: string } = {},
  signal?: AbortSignal,
): Promise<AmbassadorFilterOptions> {
  const qs: Record<string, string> = {}
  if (params.country?.trim()) qs.country = params.country.trim()
  if (params.city?.trim()) qs.city = params.city.trim()
  const query = Object.keys(qs).length ? '?' + new URLSearchParams(qs).toString() : ''
  const res = await apiClient.get<unknown>(`/admin/ambassador-applications/filter-options${query}`, {
    skipErrorToast: true,
    signal,
  } as Record<string, unknown>)
  const body = res.data as Record<string, unknown>
  const data = (body?.data ?? body ?? {}) as Record<string, unknown>
  const asStringList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []

  return {
    countries: asStringList(data.countries),
    cities: asStringList(data.cities),
    universities: asStringList(data.universities),
    specializations: asStringList(data.specializations),
  }
}

export async function fetchAmbassadorApplication(id: number): Promise<AmbassadorApplication> {
  const res = await apiClient.get<unknown>(`/admin/ambassador-applications/${id}`, { skipErrorToast: true } as Record<string, unknown>)
  const inner = unwrapData<unknown>(res.data)
  return normalizeApplication(
    inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : {},
  )
}

export async function updateAmbassadorStatus(
  id: number,
  status: AmbassadorStatus,
  reason?: string,
  adminNotes?: string,
  interviewScheduledAt?: string,
): Promise<AmbassadorApplication> {
  const body: Record<string, unknown> = { status }
  if (reason) body.reason = reason
  if (adminNotes !== undefined) body.admin_notes = adminNotes
  if (interviewScheduledAt) body.interview_scheduled_at = interviewScheduledAt

  const res = await apiClient.patch<unknown>(
    `/admin/ambassador-applications/${id}/status`,
    body,
    { skipErrorToast: true } as Record<string, unknown>,
  )
  const inner = unwrapData<unknown>(res.data)
  return normalizeApplication(
    inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : { id, status },
  )
}

export async function addAmbassadorNote(
  id: number,
  content: string,
  isPrivate = true,
): Promise<AmbassadorNote> {
  const res = await apiClient.post<unknown>(
    `/admin/ambassador-applications/${id}/notes`,
    { content, is_private: isPrivate },
    { skipErrorToast: true } as Record<string, unknown>,
  )
  return unwrapData<AmbassadorNote>(res.data)!
}

export async function deleteAmbassadorNote(id: number, noteId: number): Promise<void> {
  await apiClient.delete(`/admin/ambassador-applications/${id}/notes/${noteId}`, { skipErrorToast: true } as Record<string, unknown>)
}

export async function fetchAmbassadorAnalytics(): Promise<Record<string, unknown>> {
  const res = await apiClient.get<unknown>('/admin/ambassador-applications/analytics', { skipErrorToast: true } as Record<string, unknown>)
  return (unwrapData<Record<string, unknown>>(res.data) ?? {})
}

// ── Normalizer ────────────────────────────────────────────────────────────────

function parseStr(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s || null
}

function parseBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true'
}

function parseNum(v: unknown): number | null {
  const n = Number(v)
  return v != null && Number.isFinite(n) ? n : null
}

const ALLOWED_STATUSES: AmbassadorStatus[] = [
  'new', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'waitlisted', 'cancelled',
]

function normalizeApplication(raw: Record<string, unknown>): AmbassadorApplication {
  const statusRaw = String(raw.status ?? 'new').toLowerCase()
  const status: AmbassadorStatus = ALLOWED_STATUSES.includes(statusRaw as AmbassadorStatus)
    ? (statusRaw as AmbassadorStatus)
    : 'new'

  const parseStrArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((s) => typeof s === 'string') as string[]
    return []
  }

  return {
    id:     Number(raw.id ?? 0),
    uuid:   String(raw.uuid ?? ''),
    reference_number: parseStr(raw.reference_number),
    status,
    is_draft: parseBool(raw.is_draft),
    created_at: parseStr(raw.created_at),
    updated_at: parseStr(raw.updated_at),
    submitted_at: parseStr(raw.submitted_at),
    source: parseStr(raw.source),
    full_name:    String(raw.full_name ?? ''),
    email:        String(raw.email ?? ''),
    mobile_phone: String(raw.mobile_phone ?? ''),
    nationality:  parseStr(raw.nationality),
    gender:       parseStr(raw.gender),
    date_of_birth: parseStr(raw.date_of_birth),
    country:      parseStr(raw.country),
    city:         parseStr(raw.city),
    university_name:          parseStr(raw.university_name),
    university_type:          parseStr(raw.university_type),
    faculty:                  parseStr(raw.faculty),
    major:                    parseStr(raw.major),
    study_year:               parseStr(raw.study_year),
    student_number:           parseStr(raw.student_number),
    student_status:           parseStr(raw.student_status),
    expected_graduation_date: parseStr(raw.expected_graduation_date),
    motivation_why:    parseStr(raw.motivation_why),
    contribution_what: parseStr(raw.contribution_what),
    expected_gain:     parseStr(raw.expected_gain),
    biggest_achievement: parseStr(raw.biggest_achievement),
    biggest_challenge:   parseStr(raw.biggest_challenge),
    has_volunteer_experience:           parseBool(raw.has_volunteer_experience),
    has_event_organization_experience:  parseBool(raw.has_event_organization_experience),
    has_teaching_experience:            parseBool(raw.has_teaching_experience),
    has_student_club_involvement:       parseBool(raw.has_student_club_involvement),
    social_instagram: parseStr(raw.social_instagram),
    social_linkedin:  parseStr(raw.social_linkedin),
    social_facebook:  parseStr(raw.social_facebook),
    social_tiktok:    parseStr(raw.social_tiktok),
    social_github:    parseStr(raw.social_github),
    website_url:      parseStr(raw.website_url),
    followers_count:  parseNum(raw.followers_count),
    interests:                  parseStrArray(raw.interests),
    skills:                     parseStrArray(raw.skills),
    volunteer_experience_types: parseStrArray(raw.volunteer_experience_types),
    certifications:             parseStrArray(raw.certifications),
    has_led_team:               parseBool(raw.has_led_team),
    has_organized_events:       parseBool(raw.has_organized_events),
    events_attendees_count:     parseNum(raw.events_attendees_count),
    has_represented_university: parseBool(raw.has_represented_university),
    weekly_hours_available:     parseNum(raw.weekly_hours_available),
    can_attend_university_events: parseBool(raw.can_attend_university_events),
    can_represent_emc_outside:    parseBool(raw.can_represent_emc_outside),
    can_travel:                   parseBool(raw.can_travel),
    owns_laptop:                  parseBool(raw.owns_laptop),
    has_stable_internet:          parseBool(raw.has_stable_internet),
    can_attend_weekly_meetings:   parseBool(raw.can_attend_weekly_meetings),
    cv_download_url:         parseStr(raw.cv_download_url),
    cv_view_url:             parseStr(raw.cv_view_url),
    has_student_id:          parseBool(raw.has_student_id),
    student_id_download_url: parseStr(raw.student_id_download_url),
    has_photo:               parseBool(raw.has_photo),
    photo_url:               parseStr(raw.photo_url),
    certificate_count:       parseNum(raw.certificate_count) ?? 0,
    admin_notes:            parseStr(raw.admin_notes),
    interview_scheduled_at: parseStr(raw.interview_scheduled_at),
    reviewed_by:   raw.reviewed_by as { id: number; name: string } | null ?? null,
    reviewed_at:   parseStr(raw.reviewed_at),
    status_updated_by: raw.status_updated_by as { id: number; name: string } | null ?? null,
    status_updated_at: parseStr(raw.status_updated_at),
    notes:          Array.isArray(raw.notes) ? raw.notes as AmbassadorNote[] : undefined,
    status_history: Array.isArray(raw.status_history) ? raw.status_history as AmbassadorStatusHistory[] : undefined,
  }
}
