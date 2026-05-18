import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'
import { getApiErrorMessage } from './apiErrors'

const silent = { skipErrorToast: true as const }

/** Standard copy when AdminUser policy rejects an action with HTTP 403. */
export const ADMIN_USER_FORBIDDEN_AR = 'لا تملك صلاحية تنفيذ هذا الإجراء'

/**
 * Admin user management — `AdminUserController` under the API group (e.g. Sanctum + admin).
 *
 * Expected Laravel-style routes:
 *   GET    /admin/users
 *   POST   /admin/users
 *   GET    /admin/users/{user}
 *   PUT    /admin/users/{user}
 *   DELETE /admin/users/{user}
 */
const BASE = '/admin/users'

export type AdminManagedUser = {
  id: number
  name: string
  email: string
  role?: string | null
  /** When absent, treated as «active» in UI KPIs unless backend adds explicit flag later. */
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  /** Optional fields when Laravel serializes richer admin user payloads — otherwise UI shows «—». */
  phone?: string | null
  department?: string | null
  city?: string | null
  country?: string | null
  how_did_you_hear_about_us?: string | null
  avatar_url?: string | null
  email_verified_at?: string | null
  last_login_at?: string | null
  /** One-line summaries when backend nests learner/teacher payloads. */
  related_student_note?: string | null
  related_instructor_note?: string | null
}

function summarizeProfileBlock(raw: unknown, kind: 'student' | 'instructor'): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const bits: string[] = []
  if (o.id != null && Number(o.id) > 0) bits.push(`سجل ${kind === 'student' ? 'طالب' : 'مدرب'} #${Math.trunc(Number(o.id))}`)
  const code = trimStr(o.code ?? o.student_code ?? o.employee_code)
  if (code) bits.push(kind === 'student' ? `رمز طالب: ${code}` : `رمز موظّف: ${code}`)
  const lvl = trimStr(o.level ?? o.program ?? o.specialization)
  if (lvl) bits.push(`${kind === 'student' ? 'المسار' : 'التخصّص'}: ${lvl}`)
  return bits.length > 0 ? bits.join(' · ') : null
}

function relateNotesFromRaw(raw: Record<string, unknown>): {
  student: string | null
  instructor: string | null
} {
  const studentRaw =
    raw.student ?? raw.student_profile ?? raw.studentProfile ?? raw.student_data ?? raw.learner
  let student = summarizeProfileBlock(studentRaw, 'student')
  if (!student && Array.isArray(raw.enrollments) && raw.enrollments.length > 0) {
    student = `تسجيلات مرتبطة: ${raw.enrollments.length}`
  }

  const instRaw =
    raw.instructor ?? raw.instructor_profile ?? raw.teacher ?? raw.teaching_profile ?? raw.staff_profile
  const instructor = summarizeProfileBlock(instRaw, 'instructor')

  return { student, instructor }
}

function trimStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function normalizeManagedUser(raw: Record<string, unknown>): AdminManagedUser {
  const id = Number(raw.id)
  const roleRaw = raw.role
  let roleStr: string | null = null
  if (roleRaw != null && String(roleRaw).trim() !== '') {
    roleStr = String(roleRaw).trim().toLowerCase()
  }

  const nameFallback = typeof raw.full_name === 'string' ? raw.full_name : ''
  const name = String(raw.name ?? nameFallback ?? '')
  const ia = raw.is_active
  let is_active: boolean | null = null
  if (ia === true || ia === 1 || ia === '1') is_active = true
  else if (ia === false || ia === 0 || ia === '0') is_active = false

  const phoneRaw = raw.phone ?? raw.phone_number ?? raw.mobile ?? raw.phoneNumber
  const phone =
    phoneRaw != null && String(phoneRaw).trim() !== '' ?
      typeof phoneRaw === 'string' ?
        phoneRaw
      : String(phoneRaw)
    : null

  const deptRaw =
    raw.department ??
    raw.department_name ??
    raw.faculty ??
    raw.business_unit ??
    raw.faculty_name ??
    raw.org_unit ??
    raw.org_unit_name
  let department: string | null = null
  if (typeof deptRaw === 'string' && deptRaw.trim() !== '') department = deptRaw.trim()
  else if (deptRaw && typeof deptRaw === 'object' && 'name' in (deptRaw as object)) {
    const n = (deptRaw as { name?: unknown }).name
    if (typeof n === 'string' && n.trim() !== '') department = n.trim()
  }

  const ev = raw.email_verified_at ?? raw.emailVerifiedAt ?? raw.email_verified
  let email_verified_at: string | null = null
  if (ev !== null && ev !== undefined && String(ev).trim() !== '') email_verified_at = String(ev)

  const loginRaw =
    raw.last_login_at ??
    raw.last_login ??
    raw.last_seen_at ??
    raw.last_seen ??
    raw.last_activity_at ??
    raw.lastActivityAt ??
    raw.current_sign_in_at
  let last_login_at: string | null = null
  if (loginRaw !== null && loginRaw !== undefined && String(loginRaw).trim() !== '') last_login_at = String(loginRaw)

  const cityRaw = raw.city ?? raw.town ?? raw.city_name
  const city =
    cityRaw != null && String(cityRaw).trim() !== '' ?
      typeof cityRaw === 'string' ?
        cityRaw.trim()
      : String(cityRaw)
    : null

  const countryRaw = raw.country ?? raw.country_name ?? raw.country_code
  const country =
    countryRaw != null && String(countryRaw).trim() !== '' ?
      typeof countryRaw === 'string' ?
        countryRaw.trim()
      : String(countryRaw)
    : null

  const hh =
    raw.how_did_you_hear_about_us ??
    raw.howDidYouHearAboutUs ??
    raw.heard_from ??
    raw.source ??
    raw.referral_source
  const how =
    hh != null && String(hh).trim() !== '' ?
      typeof hh === 'string' ?
        hh.trim()
      : String(hh)
    : null

  const avatarRaw =
    raw.avatar_url ?? raw.avatarUrl ?? raw.avatar ?? raw.photo_url ?? raw.profile_photo ?? raw.profile_photo_url
  let avatar_url: string | null = null
  if (avatarRaw != null && String(avatarRaw).trim() !== '') avatar_url = String(avatarRaw).trim()

  const related = relateNotesFromRaw(raw)

  return {
    id: Number.isFinite(id) ? Math.trunc(id) : 0,
    name,
    email: String(raw.email ?? ''),
    role: roleStr,
    is_active,
    phone,
    department,
    city,
    country,
    how_did_you_hear_about_us: how,
    avatar_url,
    email_verified_at,
    last_login_at,
    related_student_note: related.student,
    related_instructor_note: related.instructor,
    created_at:
      raw.created_at != null ?
        typeof raw.created_at === 'string' ?
          raw.created_at
        : String(raw.created_at)
      : null,
    updated_at:
      raw.updated_at != null ?
        typeof raw.updated_at === 'string' ?
          raw.updated_at
        : String(raw.updated_at)
      : null,
  }
}

/** Extract list rows from Laravel array, `{ data: [] }`, or paginated `{ data: { data: [] } }`. */
export function unwrapAdminUsersList(payload: unknown): AdminManagedUser[] {
  const inner = unwrapData<unknown>(payload)
  let rows: unknown[] = []
  if (Array.isArray(inner)) rows = inner
  else if (inner && typeof inner === 'object' && inner !== null) {
    const o = inner as Record<string, unknown>
    if (Array.isArray(o.data)) rows = o.data
    else if (o.data && typeof o.data === 'object') {
      const nested = (o.data as Record<string, unknown>).data
      if (Array.isArray(nested)) rows = nested
    }
  }
  return rows
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r))
    .map((r) => normalizeManagedUser(r))
    .filter((u) => u.id > 0)
}

/** Map 403 responses to copy required by Super Admin UX. */
export function getAdminUserMutationMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.status === 403) {
    const body = err.response?.data as Record<string, unknown> | undefined
    if (body && typeof body.message === 'string' && body.message.trim()) return body.message
    return ADMIN_USER_FORBIDDEN_AR
  }
  return getApiErrorMessage(err)
}

export async function fetchAdminUsers(): Promise<AdminManagedUser[]> {
  const res = await apiClient.get<unknown>(BASE, silent)
  return unwrapAdminUsersList(res.data)
}

export async function fetchAdminUser(id: number): Promise<AdminManagedUser> {
  const res = await apiClient.get<unknown>(`${BASE}/${id}`, silent)
  const inner = unwrapData<unknown>(res.data)
  const rec =
    inner && typeof inner === 'object' && !Array.isArray(inner) ?
      (inner as Record<string, unknown>)
    : {}
  const u = normalizeManagedUser(rec)
  if (!u.id) throw new Error('Invalid user payload')
  return u
}

export type CreateAdminUserInput = {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: string
  phone?: string | null
  department?: string | null
  city?: string | null
  country?: string | null
  how_did_you_hear_about_us?: string | null
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminManagedUser> {
  const body: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    password: input.password,
    password_confirmation: input.password_confirmation,
    role: input.role,
  }
  if (input.phone != null && String(input.phone).trim() !== '') body.phone = String(input.phone).trim()
  if (input.department != null && String(input.department).trim() !== '')
    body.department = String(input.department).trim()
  if (input.city != null && String(input.city).trim() !== '') body.city = String(input.city).trim()
  if (input.country != null && String(input.country).trim() !== '') body.country = String(input.country).trim()
  if (input.how_did_you_hear_about_us != null && String(input.how_did_you_hear_about_us).trim() !== '')
    body.how_did_you_hear_about_us = String(input.how_did_you_hear_about_us).trim()

  const res = await apiClient.post<unknown>(BASE, body, silent)
  const inner = unwrapData<unknown>(res.data)
  const rec =
    inner && typeof inner === 'object' && !Array.isArray(inner) ?
      (inner as Record<string, unknown>)
    : typeof res.data === 'object' && res.data !== null ?
      (res.data as Record<string, unknown>)
    : {}
  return normalizeManagedUser(rec as Record<string, unknown>)
}

export type UpdateAdminUserInput = {
  name: string
  email: string
  role: string
  phone?: string | null
  department?: string | null
  city?: string | null
  country?: string | null
  how_did_you_hear_about_us?: string | null
  /** Omit to leave unchanged on server. */
  is_active?: boolean | null
  password?: string
  password_confirmation?: string
  /** Multipart PUT via Laravel `_method`. */
  avatarFile?: File | null
  remove_avatar?: boolean
}

export async function updateAdminUser(id: number, patch: UpdateAdminUserInput): Promise<AdminManagedUser> {
  const pwd = patch.password?.trim()

  function mergedRecord(resData: unknown, fallbackBody: Record<string, unknown>): AdminManagedUser {
    const inner = unwrapData<unknown>(resData)
    const rec =
      inner && typeof inner === 'object' && !Array.isArray(inner) ?
        (inner as Record<string, unknown>)
      : { ...fallbackBody, id }
    return normalizeManagedUser(rec as Record<string, unknown>)
  }

  const useMultipart = Boolean(patch.avatarFile) || Boolean(patch.remove_avatar)

  const commonPairs: Record<string, string | boolean | undefined> = {}
  if (patch.phone != null && String(patch.phone).trim() !== '') commonPairs.phone = String(patch.phone).trim()
  if (patch.department != null && String(patch.department).trim() !== '')
    commonPairs.department = String(patch.department).trim()
  if (patch.city != null && String(patch.city).trim() !== '') commonPairs.city = String(patch.city).trim()
  if (patch.country != null && String(patch.country).trim() !== '') commonPairs.country = String(patch.country).trim()
  if (patch.how_did_you_hear_about_us != null && String(patch.how_did_you_hear_about_us).trim() !== '')
    commonPairs.how_did_you_hear_about_us = String(patch.how_did_you_hear_about_us).trim()

  if (patch.is_active === true) commonPairs.is_active = true
  else if (patch.is_active === false) commonPairs.is_active = false

  if (useMultipart) {
    const fd = new FormData()
    fd.append('_method', 'PUT')
    fd.append('name', patch.name)
    fd.append('email', patch.email)
    fd.append('role', patch.role)
    Object.entries(commonPairs).forEach(([k, val]) => {
      if (val === undefined) return
      if (typeof val === 'boolean') {
        fd.append(k, val ? '1' : '0')
        return
      }
      fd.append(k, val)
    })
    if (pwd) {
      fd.append('password', pwd)
      fd.append('password_confirmation', patch.password_confirmation?.trim() ?? pwd)
    }
    if (patch.avatarFile) fd.append('avatar', patch.avatarFile)
    if (patch.remove_avatar) fd.append('remove_avatar', '1')

    const res = await apiClient.post<unknown>(`${BASE}/${id}`, fd, silent)
    return mergedRecord(res.data, {})
  }

  const body: Record<string, unknown> = {
    name: patch.name,
    email: patch.email,
    role: patch.role,
  }
  Object.assign(body, commonPairs)
  if (pwd) {
    body.password = pwd
    body.password_confirmation = patch.password_confirmation ?? pwd
  }

  const res = await apiClient.put<unknown>(`${BASE}/${id}`, body, silent)

  const innerFallback: Record<string, unknown> = { ...body }
  innerFallback.id = id
  return mergedRecord(res.data, innerFallback)
}

export async function deleteAdminUser(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, silent)
}
