import axios from 'axios'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'
import { getApiErrorMessage } from '@/api/apiErrors'

const silent = { skipErrorToast: true as const }

/** Normalized instructors table row (+ optional nested `user`) — GET /api/admin/instructors */
export type AdminInstructorDirectoryRow = {
  /** instructors.id — use for course `instructor_id` */
  id: number
  user_id: number | null
  /** Duplicate of instructors.id for legacy UI/links */
  instructor_id: number
  has_instructor_profile: boolean
  name: string
  email: string
  phone?: string | null
  role: string
  is_active: boolean
  title?: string | null
  bio?: string | null
  expertise: string[]
  avatar_url?: string | null
  instructor_image_url?: string | null
  assigned_courses_count: number
  workshops_count: number
  upcoming_workshops_count: number
  last_login_at?: string | null
  last_activity_at?: string | null
}

/** Course assignment picker — id is instructors.id */
export type AdminInstructorOption = {
  id: number
  name: string
  email: string
  avatar_url?: string | null
  role?: string | null
}

function asRecord(o: unknown): Record<string, unknown> | null {
  return o && typeof o === 'object' ? (o as Record<string, unknown>) : null
}

/** Pull array from Laravel / mixed shapes — no role or “complete profile” filtering */
function extractInstructorsArray(payload: unknown): unknown[] {
  const fromNode = (node: unknown): unknown[] | null => {
    if (Array.isArray(node)) return node
    const obj = asRecord(node)
    if (!obj) return null

    const d = obj.data
    const instructors = obj.instructors

    if (Array.isArray(d)) return d
    if (Array.isArray(instructors)) return instructors

    const inner = asRecord(d)
    if (inner) {
      if (Array.isArray(inner.data)) return inner.data
      if (Array.isArray(inner.instructors)) return inner.instructors
    }
    return null
  }

  const first = fromNode(payload)
  if (first) return first

  const lifted = unwrapData(payload)
  if (lifted !== payload) {
    const second = fromNode(lifted)
    if (second) return second
  }

  return []
}

function nestedUser(raw: Record<string, unknown>): Record<string, unknown> | null {
  const u = raw.user
  return asRecord(u)
}

function str(v: unknown, fallback = ''): string {
  if (v == null || v === false) return fallback
  return String(v).trim()
}

function coerceUserId(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function coerceBool(raw: unknown, fallback: boolean): boolean {
  if (raw === true || raw === 1 || raw === '1') return true
  if (raw === false || raw === 0 || raw === '0') return false
  return fallback
}

/** One instructors-table record (do not drop rows for missing images, counts, bio, role, …) */
function normalizeDirectoryRow(raw: unknown): AdminInstructorDirectoryRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const user = nestedUser(o)

  const id = Number(o.id)
  if (!Number.isFinite(id) || id <= 0) return null

  const user_id = coerceUserId(o.user_id ?? user?.id)

  const name =
    str(o.name) ||
    str(user?.name) ||
    'مدرب غير مسمى'

  const email = str(o.email) || str(user?.email)
  const phone = str(o.phone) || str(user?.phone)
  const title = str(o.title) || 'مدرب'
  const bio = str(o.bio) || ''

  const imageCandidate =
    str(o.image) ||
    str(user?.profile_photo_url) ||
    str(o.avatar_url) ||
    str(o.photo_url) ||
    str(o.profile_photo_url) ||
    str(user?.avatar_url)

  const img = imageCandidate || null

  const expertiseRaw = o.expertise
  let expertise: string[] = []
  if (Array.isArray(expertiseRaw)) {
    expertise = expertiseRaw.map((x) => String(x).trim()).filter(Boolean)
  }

  const role = str(o.role) || str(user?.role) || 'instructor'
  const is_active = coerceBool(o.is_active, coerceBool(user?.is_active, true))

  return {
    id,
    user_id,
    instructor_id: id,
    has_instructor_profile: true,
    name,
    email,
    phone: phone || null,
    role,
    is_active,
    title,
    bio: bio || null,
    expertise,
    avatar_url: img,
    instructor_image_url: img,
    assigned_courses_count: Number(o.assigned_courses_count ?? o.courses_count ?? 0) || 0,
    workshops_count: Number(o.workshops_count ?? 0) || 0,
    upcoming_workshops_count: Number(o.upcoming_workshops_count ?? 0) || 0,
    last_login_at: o.last_login_at != null ? String(o.last_login_at) : null,
    last_activity_at: o.last_activity_at != null ? String(o.last_activity_at) : null,
  }
}

function pickMeta(payload: unknown, lifted: unknown): Record<string, unknown> {
  for (const node of [payload, lifted]) {
    const rec = asRecord(node)
    if (!rec?.meta || typeof rec.meta !== 'object' || Array.isArray(rec.meta)) continue
    return rec.meta as Record<string, unknown>
  }

  const rec = asRecord(lifted)
  const inner = rec ? asRecord(rec.data) : null
  if (inner?.meta && typeof inner.meta === 'object' && !Array.isArray(inner.meta)) {
    return inner.meta as Record<string, unknown>
  }
  return {}
}

/**
 * Instructor directory — GET /api/admin/instructors  
 * Supports: `data`, `data.data`, `data.instructors`, nested Laravel pagination.
 */
export async function fetchAdminInstructorsDirectory(params?: { search?: string; status?: string }): Promise<{
  rows: AdminInstructorDirectoryRow[]
  meta: { total: number; current_page: number; last_page: number; per_page: number }
}> {
  try {
    const res = await apiClient.get<unknown>('/admin/instructors', {
      ...silent,
      params: {
        per_page: 500,
        ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
    })

    const rawList = extractInstructorsArray(res.data)
    const rows = rawList.map(normalizeDirectoryRow).filter((x): x is AdminInstructorDirectoryRow => x != null)

    const lifted = unwrapData(res.data)
    const metaRaw = pickMeta(res.data, lifted)

    return {
      rows,
      meta: {
        total: Number(metaRaw.total ?? rows.length) || rows.length,
        current_page: Number(metaRaw.current_page ?? 1) || 1,
        last_page: Number(metaRaw.last_page ?? 1) || 1,
        per_page: Number(metaRaw.per_page ?? rows.length) || rows.length,
      },
    }
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status !== 404 && import.meta.env.DEV) {
      console.warn('fetchAdminInstructorsDirectory:', getApiErrorMessage(e))
    }
    return {
      rows: [],
      meta: { total: 0, current_page: 1, last_page: 1, per_page: 0 },
    }
  }
}

/** All instructor records usable for assigns — each `id` is instructors.id */
export async function fetchAdminInstructors(): Promise<AdminInstructorOption[]> {
  const { rows } = await fetchAdminInstructorsDirectory()
  return rows.map((r) => ({
    id: r.instructor_id,
    name: r.name,
    email: r.email || '',
    avatar_url: r.avatar_url ?? r.instructor_image_url ?? null,
    role: r.role,
  }))
}
