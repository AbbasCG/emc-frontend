import type { Course } from '@/types'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

/** Lookup row keyed by `courses.instructor_id` (instructors table PK). */
export type CourseInstructorLookupRow = {
  id: number
  name: string
  email?: string | null
  avatar_url?: string | null
}

export type ResolvedCourseInstructor = {
  /** Safe Arabic label — never a raw numeric id like `#1`. */
  displayName: string
  email: string | null
  avatarUrl: string | null
}

function firstNonEmpty(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '' && s !== '—') return s
  }
  return null
}

function nameFromRelation(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null
  return firstNonEmpty((obj as Record<string, unknown>).name)
}

function absAvatar(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '' || s === '—') return null
  if (/^https?:\/\//iu.test(s)) return s
  return resolvePublicAssetUrl(s.startsWith('/') ? s : `/${s}`)
}

function avatarFromPlainObject(o: Record<string, unknown>): string | null {
  const keys = ['avatar_url', 'image', 'photo', 'profile_photo', 'avatar', 'picture', 'profile_picture']
  for (const k of keys) {
    const v = o[k]
    if (v == null || v === '') continue
    const u = absAvatar(String(v))
    if (u) return u
  }
  return null
}

function instructorFk(course: Course): number | null {
  const raw = course.instructor_id
  if (raw == null) return null
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n
  return null
}

/**
 * Normalize instructor display from heterogeneous API payloads.
 * Prefer nested names; resolve `instructor_id` via optional admin lookup map.
 */
export function getCourseInstructor(
  course: Course,
  options?: {
    lookupByInstructorId?: Map<number, CourseInstructorLookupRow>
    /** When there is no assignment / no displayable name */
    emptyLabel?: string
    /** When `instructor_id` exists but name cannot be resolved */
    assignedWithoutNameLabel?: string
  },
): ResolvedCourseInstructor {
  const emptyLabel = options?.emptyLabel ?? 'بدون مدرب'
  const assignedWithoutNameLabel = options?.assignedWithoutNameLabel ?? 'مدرب مسند'

  const ext = course as Record<string, unknown>

  let avatarUrl =
    course.instructor?.image != null && String(course.instructor.image).trim() !== ''
      ? String(course.instructor.image).trim()
      : null

  const fromNested =
    firstNonEmpty(course.instructor?.name) ??
    firstNonEmpty(course.instructor_name) ??
    nameFromRelation(ext.assigned_instructor) ??
    nameFromRelation(ext.teacher) ??
    nameFromRelation(ext.trainer)

  const fk = instructorFk(course)

  let email: string | null = null
  let displayName = fromNested

  if (fk != null && options?.lookupByInstructorId) {
    const row = options.lookupByInstructorId.get(fk)
    if (row) {
      displayName = displayName ?? firstNonEmpty(row.name)
      if (!avatarUrl && row.avatar_url != null && String(row.avatar_url).trim() !== '') {
        avatarUrl = String(row.avatar_url).trim()
      }
      if (row.email != null && String(row.email).trim() !== '') {
        email = String(row.email).trim()
      }
    }
  }

  const assignedHint =
    fk != null || (course.instructor?.id != null && Number(course.instructor.id) > 0)

  let label: string
  if (displayName) {
    label = displayName
  } else if (assignedHint) {
    label = assignedWithoutNameLabel
  } else {
    label = emptyLabel
  }

  return {
    displayName: label,
    email,
    avatarUrl,
  }
}

/** For `fetchAdminInstructors()` rows where `option.id` is already the instructors PK. */
export function instructorLookupMapFromAssignableRows(rows: CourseInstructorLookupRow[]): Map<number, CourseInstructorLookupRow> {
  const m = new Map<number, CourseInstructorLookupRow>()
  for (const r of rows) {
    if (!Number.isFinite(r.id) || r.id <= 0) continue
    m.set(r.id, r)
  }
  return m
}

export type ResolvedPublicCourseInstructor = {
  assigned: boolean
  name: string | null
  email: string | null
  title: string | null
  bio: string | null
  avatarUrl: string | null
}

/**
 * Normalize nested shapes: `instructor.user.name`, `instructor.name`, flat `instructor_name`.
 */
export function resolvePublicCourseInstructor(course: Course): ResolvedPublicCourseInstructor {
  const ext = course as Record<string, unknown>

  let userRec: Record<string, unknown> | null = null
  const rawIns = ext.instructor
  if (rawIns && typeof rawIns === 'object') {
    const u = (rawIns as Record<string, unknown>).user
    if (u && typeof u === 'object') userRec = u as Record<string, unknown>
  }
  if (!userRec && ext.instructor_user && typeof ext.instructor_user === 'object') {
    userRec = ext.instructor_user as Record<string, unknown>
  }

  const nestedIns = rawIns && typeof rawIns === 'object' ? (rawIns as Record<string, unknown>) : null

  const email =
    firstNonEmpty(userRec?.email, nestedIns?.email, ext.instructor_email) ?? null

  const title = firstNonEmpty(nestedIns?.title, nestedIns?.job_title, ext.instructor_title) ?? null

  const bio =
    firstNonEmpty(nestedIns?.bio, nestedIns?.about, nestedIns?.description, ext.instructor_bio) ?? null

  const name =
    firstNonEmpty(
      userRec?.name,
      nestedIns?.name,
      course.instructor?.name,
      course.instructor_name,
      userRec?.full_name,
    ) ?? null

  let avatarUrl: string | null = null
  if (nestedIns) avatarUrl = avatarFromPlainObject(nestedIns)
  if (!avatarUrl && userRec) avatarUrl = avatarFromPlainObject(userRec)

  const hasRelation =
    (course.instructor?.id != null && Number(course.instructor.id) > 0) ||
    (nestedIns?.id != null && Number(nestedIns.id) > 0)

  const hasSignal = !!(name || email || title || bio || avatarUrl)
  /** مدرب حقيقي: بيانات واضحة؛ أو علاقة وبيانات، أو علاقة وفِق منطق الزائر المعقول لا نعتبر المعرف وحده دليلًا */
  const assigned = hasSignal || (hasRelation && !!name)

  return {
    assigned,
    name,
    email,
    title,
    bio,
    avatarUrl,
  }
}

export function applyAssignedInstructorToCourse(
  course: Course,
  ins: { id: number; name: string; email?: string; avatar_url?: string | null },
): Course {
  const avatar = ins.avatar_url != null && String(ins.avatar_url).trim() !== '' ? String(ins.avatar_url).trim() : null
  return {
    ...course,
    instructor_id: ins.id,
    instructor_name: ins.name,
    instructor: {
      id: ins.id,
      name: ins.name,
      title: course.instructor?.title ?? null,
      bio: course.instructor?.bio ?? null,
      image: avatar ?? course.instructor?.image ?? null,
    },
  }
}
