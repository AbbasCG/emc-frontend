/**
 * Parses GET /student/dashboard envelopes so «دوراتي» matches the student home dashboard.
 */

import type { Enrollment, Course, DashboardStats, StudentDashboard } from '@/types'
import type { StudentLmsDashboard } from '@/types/lms'
import { unwrapData } from '@/api/unwrap'
import { normalizeRegistrationRow, type StudentRegistrationRow } from '@/api/studentApi'
import { mapBackendRegStatus, skeletonCourse } from '@/utils/studentEnrollmentMerge'

export const STUDENT_SYNTH_REG_ID_OFFSET = 8_880_000

const EMPTY_STATS: DashboardStats = {
  enrolled_courses: 0,
  upcoming_sessions: 0,
  completed_certificates: 0,
  training_hours: 0,
}

function toFiniteStat(n: unknown, fallback = 0): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n
  const x = Number(n)
  return Number.isFinite(x) ? x : fallback
}

/** Walk Laravel nests `{ data }`, `{ data: { data } }`, plus `unwrapData`. */
export function enumerateDashboardRecords(payload: unknown): Record<string, unknown>[] {
  const list: Record<string, unknown>[] = []
  const seen = new Set<unknown>()
  const push = (v: unknown) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return
    if (seen.has(v)) return
    seen.add(v)
    list.push(v as Record<string, unknown>)
  }

  push(payload)
  push(unwrapData(payload))

  let cur: unknown = payload
  for (let d = 0; d < 6; d++) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) break
    const data = (cur as Record<string, unknown>).data
    if (!data || typeof data !== 'object' || Array.isArray(data)) break
    push(data)
    cur = data
  }

  cur = unwrapData(payload)
  for (let d = 0; d < 6; d++) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) break
    push(cur)
    const data = (cur as Record<string, unknown>).data
    if (!data || typeof data !== 'object' || Array.isArray(data)) break
    cur = data
  }

  return list
}

function firstArrayAcross(records: Record<string, unknown>[], keys: readonly string[]): unknown[] {
  for (const r of records) {
    for (const k of keys) {
      const v = r[k]
      if (Array.isArray(v) && v.length > 0) return v
    }
  }
  return []
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === 'object' && !Array.isArray(x)
}

function coerceCourseFromUnknown(courseIdFallback: number, c: Record<string, unknown>): Course {
  const id = Number(c.id ?? courseIdFallback)
  const cid = Number.isFinite(id) ? id : courseIdFallback
  const slug =
    c.slug != null && String(c.slug).trim() !== '' ? String(c.slug) : `course-${cid}`
  const title = c.title != null && String(c.title).trim() !== '' ? String(c.title) : `دورة ${cid}`
  let inst: string | null = null
  if (c.instructor_name != null && String(c.instructor_name).trim() !== '')
    inst = String(c.instructor_name)
  else if (isRecord(c.instructor) && c.instructor.name != null && String(c.instructor.name).trim() !== '')
    inst = String(c.instructor.name)

  const img =
    [c.course_image, c.cover_image, c.image_url, c.thumbnail, c.image].find(
      (x) => x != null && String(x).trim() !== '',
    ) ?? null

  return skeletonCourse(cid, title, slug, inst, {
    start_date:
      c.start_date != null && String(c.start_date).trim() !== ''
        ? String(c.start_date)
        : null,
    start_time:
      c.start_time != null && String(c.start_time).trim() !== ''
        ? String(c.start_time)
        : c.study_time != null && String(c.study_time).trim() !== ''
          ? String(c.study_time)
          : null,
    meeting_link:
      c.meeting_link != null && String(c.meeting_link).trim() !== '' ? String(c.meeting_link) : null,
    course_image: img != null ? String(img) : null,
    description: c.description != null ? String(c.description) : '',
  })
}

function tryEnrollmentObject(raw: unknown): Enrollment | null {
  if (!isRecord(raw)) return null
  const o = raw
  const c = o.course
  if (!isRecord(c)) return null
  const cid = Number(c.id ?? o.course_id)
  if (!Number.isFinite(cid)) return null
  const enrollmentId = Number(o.id ?? o.enrollment_id ?? cid)
  if (!Number.isFinite(enrollmentId)) return null
  const course = coerceCourseFromUnknown(cid, c)
  const completed = Math.max(
    0,
    Math.floor(toFiniteStat(o.completed_sessions ?? o.completed_lessons ?? o.sessions_completed, 0)),
  )
  const total = Math.max(
    completed,
    Math.floor(toFiniteStat(o.total_sessions ?? o.sessions_total ?? o.lessons_total, 0)),
  )
  const status = mapBackendRegStatus(
    typeof o.status === 'string'
      ? o.status
      : typeof o.registration_status === 'string'
        ? o.registration_status
        : undefined,
  )
  const enrolledRaw = o.enrolled_at ?? o.registered_at ?? o.created_at
  const enrolled_at = enrolledRaw != null && String(enrolledRaw).trim() !== '' ? String(enrolledRaw) : ''
  return {
    id: enrollmentId,
    course,
    enrolled_at,
    completed_sessions: completed,
    total_sessions: total,
    status,
  }
}

function tryEnrollmentFromRegistrationLike(raw: unknown): Enrollment | null {
  const first = tryEnrollmentObject(raw)
  if (first) return first
  const regRow = normalizeRegistrationRow(raw as Record<string, unknown>)
  if (!regRow) return null
  return {
    id: regRow.id,
    course: skeletonCourse(regRow.course_id, regRow.course_title ?? '', regRow.slug, regRow.instructor_name ?? null, {
      start_date: regRow.start_date ?? undefined,
      start_time: regRow.start_time ?? undefined,
      meeting_link: regRow.meeting_link ?? undefined,
      course_image: regRow.course_cover_url ?? undefined,
      image_url: regRow.course_cover_url ?? undefined,
      cover_image: regRow.course_cover_url ?? undefined,
    }),
    enrolled_at: regRow.enrolled_at ?? '',
    completed_sessions: 0,
    total_sessions: 0,
    status: mapBackendRegStatus(regRow.status),
  }
}

function synthRegistrationFromCourseRow(raw: unknown): StudentRegistrationRow | null {
  if (!isRecord(raw)) return null
  const nested =
    raw.course && typeof raw.course === 'object' && !Array.isArray(raw.course) ?
      (raw.course as Record<string, unknown>)
    : raw
  const cid = Number((nested as Record<string, unknown>)?.id ?? raw.course_id ?? raw.id)
  if (!Number.isFinite(cid)) return null
  const title =
    nested?.title != null ?
      String(nested.title)
    : raw.course_title != null ?
      String(raw.course_title)
    : `دورة ${cid}`
  const slugRaw =
    nested?.slug ??
    nested?.slug_en ??
    raw.slug ??
    raw.course_slug ??
    null

  const id = STUDENT_SYNTH_REG_ID_OFFSET + cid
  return normalizeRegistrationRow({
    ...raw,
    id,
    registration_id: id,
    course_id: cid,
    course_title: title,
    slug: slugRaw,
    enrolled_at:
      raw.enrolled_at ?? raw.registered_at ?? raw.created_at ?? raw.updated_at ?? '',
    course: ({
      ...(nested ?? {}),
      id: cid,
      title,
      slug: slugRaw ?? undefined,
    } as unknown) as Record<string, unknown>,
  })
}

function enrollmentFromCourseBare(cid: number, row: Record<string, unknown>, course: Record<string, unknown>): Enrollment {
  const courseObj = coerceCourseFromUnknown(cid, course)
  const status = mapBackendRegStatus(typeof row.status === 'string' ? row.status : undefined)
  const enrolledRaw =
    row.enrolled_at ??
    row.registered_at ??
    row.created_at ??
    row.updated_at ??
    row.joined_at
  const completed = Math.max(
    0,
    Math.floor(toFiniteStat(row.completed_sessions ?? row.sessions_completed, 0)),
  )
  const total = Math.max(completed, Math.floor(toFiniteStat(row.total_sessions ?? row.sessions_total, 0)))
  return {
    id: Number(row.id ?? row.registration_id ?? cid),
    course: courseObj,
    enrolled_at: enrolledRaw != null && String(enrolledRaw).trim() !== '' ? String(enrolledRaw) : '',
    completed_sessions: completed,
    total_sessions: total,
    status,
  }
}

/** Deep-unwrapped `StudentDashboard` with enrollments bootstrapped from cross-key arrays. */
export function normalizeStudentDashboardPayload(raw: unknown): StudentDashboard {
  const envelopes = enumerateDashboardRecords(raw)

  let inner: unknown = unwrapData(raw) ?? raw
  for (let d = 0; d < 5; d++) {
    if (
      inner &&
      typeof inner === 'object' &&
      !Array.isArray(inner) &&
      'data' in inner &&
      typeof (inner as { data?: unknown }).data === 'object' &&
      (inner as { data?: unknown }).data != null &&
      !Array.isArray((inner as { data?: unknown }).data)
    ) {
      inner = (inner as { data: unknown }).data
    } else {
      break
    }
  }

  if (!inner || typeof inner !== 'object') {
    return {
      stats: { ...EMPTY_STATS },
      enrollments: [],
      upcoming_sessions: [],
      notifications: [],
    }
  }

  const o = inner as Partial<StudentDashboard>
  const statsIn = o.stats && typeof o.stats === 'object' ? o.stats : {}
  const s = statsIn as Partial<DashboardStats>
  const backendStats = (() => {
    for (const r of envelopes) {
      if (r.stats && typeof r.stats === 'object' && !Array.isArray(r.stats)) {
        return r.stats as Record<string, unknown>
      }
    }
    return {} as Record<string, unknown>
  })()

  const registrationsArr = firstArrayAcross(envelopes, ['registrations'])

  const enrolledFromRegs = registrationsArr
    .flatMap((r) => {
      const e = tryEnrollmentFromRegistrationLike(r)
      return e ? [e] : []
    })

  const enrolledCoursesArr = firstArrayAcross(envelopes, [
    'enrolled_courses',
    'registered_courses',
    'my_courses',
    'courses',
    'student_courses',
    'registeredCourses',
    'registered',
  ])

  const fromEnrolledBare = enrolledCoursesArr
    .map((item) => {
      if (!isRecord(item)) return null
      if (normalizeRegistrationRow(item)) return null
      const e = tryEnrollmentObject(item)
      if (e) return e
      const course = item.course ?? item
      if (!isRecord(course)) return null
      const cid = Number(course.id ?? item.course_id ?? item.id)
      if (!Number.isFinite(cid)) return null
      return enrollmentFromCourseBare(cid, item, course)
    })
    .filter((x): x is Enrollment => x != null)

  const enrollOut = [...(Array.isArray(o.enrollments) ? o.enrollments : []), ...enrolledFromRegs, ...fromEnrolledBare]

  return {
    stats: {
      enrolled_courses: toFiniteStat(
        s.enrolled_courses ?? backendStats.courses_enrolled ?? backendStats.enrolled_courses,
        EMPTY_STATS.enrolled_courses,
      ),
      upcoming_sessions: toFiniteStat(
        s.upcoming_sessions ?? backendStats.upcoming_sessions,
        EMPTY_STATS.upcoming_sessions,
      ),
      completed_certificates: toFiniteStat(
        s.completed_certificates ?? backendStats.certificates_earned ?? backendStats.completed_certificates,
        EMPTY_STATS.completed_certificates,
      ),
      training_hours: toFiniteStat(
        s.training_hours ?? backendStats.training_hours,
        EMPTY_STATS.training_hours,
      ),
    },
    enrollments: enrollOut,
    upcoming_sessions: Array.isArray(o.upcoming_sessions) ? o.upcoming_sessions : [],
    notifications: Array.isArray(o.notifications) ? o.notifications : [],
  }
}

/** Extra registration rows gleaned beyond GET /student/registrations. */
export function extractExtraRegistrationRows(payload: unknown): StudentRegistrationRow[] {
  const records = enumerateDashboardRecords(payload)
  const rawRegs = firstArrayAcross(records, [
    'registrations',
    'registration_list',
    'course_registrations',
    'my_registrations',
  ])
  const out: StudentRegistrationRow[] = []
  for (const r of rawRegs) {
    const row = normalizeRegistrationRow(r as unknown)
    if (row) out.push(row)
  }

  const enrolledOnly = firstArrayAcross(records, [
    'enrolled_courses',
    'registered_courses',
    'my_courses',
    'courses',
    'student_courses',
    'registeredCourses',
    'current_courses',
  ])
  for (const r of enrolledOnly) {
    if (normalizeRegistrationRow(r)) continue
    const syn = synthRegistrationFromCourseRow(r)
    if (syn) out.push(syn)
  }

  const byCourse = new Map<number, StudentRegistrationRow>()
  for (const row of out) {
    const prev = byCourse.get(row.course_id)
    if (!prev || (row.id < STUDENT_SYNTH_REG_ID_OFFSET && prev.id >= STUDENT_SYNTH_REG_ID_OFFSET)) {
      byCourse.set(row.course_id, row)
    }
  }
  return [...byCourse.values()]
}

export function mergeRegistrationRows(primary: StudentRegistrationRow[], extras: StudentRegistrationRow[]) {
  const byCourse = new Map<number, StudentRegistrationRow>()
  for (const x of extras) {
    if (!byCourse.has(x.course_id)) byCourse.set(x.course_id, x)
  }
  for (const p of primary) {
    byCourse.set(p.course_id, p)
  }
  return [...byCourse.values()]
}

/** First occurrence per course id wins (home dashboard slice first). */
export function dedupeEnrollmentsByCourseId(enrollments: Enrollment[]): Enrollment[] {
  const m = new Map<number, Enrollment>()
  for (const e of enrollments) {
    const cid = e?.course?.id
    if (typeof cid !== 'number' || !Number.isFinite(cid) || cid <= 0) continue
    if (!m.has(cid)) m.set(cid, e)
  }
  return [...m.values()]
}

export function buildEnrollmentBaselineFromLmsCourses(
  courses: StudentLmsDashboard['current_courses'],
): Enrollment[] {
  if (!Array.isArray(courses)) return []
  const out: Enrollment[] = []
  for (const c of courses) {
    if (!c || typeof c !== 'object') continue
    const row = c as Record<string, unknown>
    const cid = Number(row.id)
    if (!Number.isFinite(cid)) continue
    out.push(enrollmentFromCourseBare(cid, row, row))
  }
  return out
}

export function buildEnrollmentBaselineFromEnvelopePayloads(
  mainDashboardPayload: unknown | null,
  lmsPayload: unknown | null,
  lmsNormalized: StudentLmsDashboard,
): Enrollment[] {
  const dashNorm = normalizeStudentDashboardPayload(mainDashboardPayload)
  const extraRegsFromLayers = [
    ...extractExtraRegistrationRows(mainDashboardPayload),
    ...extractExtraRegistrationRows(lmsPayload),
  ]
  const fromRegs = extraRegsFromLayers
    .map((r) => tryEnrollmentFromRegistrationLike(r as unknown))
    .filter((x): x is Enrollment => x != null)

  const fromLmsCurrent = buildEnrollmentBaselineFromLmsCourses(lmsNormalized.current_courses)

  return dedupeEnrollmentsByCourseId([
    ...(Array.isArray(dashNorm.enrollments) ? dashNorm.enrollments : []),
    ...fromRegs,
    ...fromLmsCurrent,
  ])
}
