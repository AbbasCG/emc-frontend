import type { Course } from '@/types'
import type { AdminRegistrationRow } from '@/api/adminCoursesApi'

export type ProgramKind = 'course' | 'workshop' | 'program' | 'track'

export const PROGRAM_KIND_LABEL: Record<ProgramKind, string> = {
  course: 'دورة',
  workshop: 'ورشة',
  program: 'برنامج',
  track: 'مسار',
}

export function inferProgramKind(c: Course): ProgramKind {
  const raw =
    c.program_kind ??
    (c as { program_type?: string }).program_type ??
    (c as { catalog_kind?: string }).catalog_kind ??
    (c as { kind?: string }).kind
  if (raw != null) {
    const s = String(raw).toLowerCase()
    if (s === 'full_program' || s.includes('برنامج')) return 'program'
    if (s === 'one_session') return 'workshop'
    if (s.includes('workshop') || s.includes('ورش')) return 'workshop'
    if (s.includes('track') || s.includes('مسار')) return 'track'
    if (s.includes('program')) return 'program'
    if (s.includes('course') || s.includes('دورة')) return 'course'
  }
  return 'course'
}

export function isPublishedCourse(c: Course): boolean {
  if (typeof c.is_published === 'boolean') return c.is_published
  if (typeof c.is_published === 'number') return c.is_published === 1
  const s = String(c.status ?? '').toLowerCase()
  return s === 'published' || s === 'active'
}

export function parseCourseStartTs(c: Course): number | null {
  const raw = c.start_date
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '' || s === '—') return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

export function missingCourseDate(c: Course): boolean {
  return parseCourseStartTs(c) == null
}

export function hasInstructor(c: Course): boolean {
  if (c.instructor_id != null && Number(c.instructor_id) > 0) return true
  if (c.instructor?.id != null && Number(c.instructor.id) > 0) return true
  const n = c.instructor_name
  return n != null && String(n).trim() !== '' && String(n) !== '—'
}

export function isUpcomingCourse(c: Course, from = Date.now(), horizonDays = 365): boolean {
  const t = parseCourseStartTs(c)
  if (t == null) return false
  return t >= from && t <= from + horizonDays * 86_400_000
}

export function isArchivedCourse(c: Course): boolean {
  const s = String(c.status ?? '').toLowerCase()
  return s === 'archived'
}

export function isDraftCourse(c: Course): boolean {
  if (isPublishedCourse(c)) return false
  if (isArchivedCourse(c)) return false
  return true
}

export function isScheduledCourse(c: Course): boolean {
  return !missingCourseDate(c)
}

export function isEndedCourse(c: Course): boolean {
  const x = c as Record<string, unknown>
  if (x.is_ended === true || x.is_ended === 1) return true
  const computed = String(x.computed_status ?? '').toLowerCase()
  if (computed === 'ended') return true
  const endDate = String(c.end_date ?? '').slice(0, 10)
  if (!endDate) return false
  return isPublishedCourse(c) && new Date(endDate + 'T23:59:59') < new Date()
}

export function countNewRegsForCourse(rows: AdminRegistrationRow[], courseId: number, days = 7): number {
  const cutoff = Date.now() - days * 86_400_000
  let n = 0
  for (const r of rows) {
    if (r.course_id !== courseId) continue
    if (!r.created_at) continue
    const ts = Date.parse(r.created_at)
    if (Number.isFinite(ts) && ts >= cutoff) n += 1
  }
  return n
}

export function defaultSlugFromTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06ff-]/gi, '')
  return base.length > 2 ? base : `course-${Date.now()}`
}
