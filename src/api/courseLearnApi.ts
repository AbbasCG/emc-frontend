/**
 * LMS course learn surface + admin course-scoped CMS.
 *
 * Backend contract (examples — unwrap supports `{ data }` nesting):
 *
 * Student: GET /student/courses/{courseId}/learn
 *
 * CMS (axios base URL should include `/api`):
 * - Admin scope: `/admin/courses/{courseId}/content` (aggregate) +
 *   `/admin/courses/{courseId}/(modules|sessions|materials|assignments)` for writes.
 * - Instructor scope: `/instructor/courses/{courseId}/…` (same shapes).
 */

import apiClient from '@/api/axios'
import { asList, unwrapLms } from '@/api/lmsApi'
import { unwrapData } from '@/api/unwrap'
import { normalizeRole } from '@/utils/dashboardAccess'
import type {
  CourseLearnAssignment,
  CourseLearnMaterial,
  CourseLearnSession,
  StudentCourseLearnPayload,
  StudentLearnCourseOverview,
  StudentLearnModule,
} from '@/types/courseLearn'
import type { AssignmentStatus, LmsMaterial, LmsSession, StudentAssignment } from '@/types/lms'
import type { LmsModule } from '@/types/platform'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

function normalizeLearnAssignmentStatus(raw: string | null | undefined): AssignmentStatus {
  const s = String(raw ?? '').toLowerCase()
  if (/grad|nota|점|passed|approve|credit/.test(s)) return 'graded'
  if (/submit|turned|deliver|تم\s*التسليم|مسلم/.test(s)) return 'submitted'
  if (/revision|rev\b|needs/.test(s)) return 'revision'
  if (/late|متأخر|overdue/.test(s)) return 'late'
  if (/pending|open|نشط/.test(s) || !s) return 'pending'
  return 'pending'
}

/** Maps learn-material row to LMS material card model (URLs resolved against API origin). */
export function mapCourseLearnMaterialToLmsMaterial(
  m: CourseLearnMaterial,
  ctx: { courseId: number; courseTitle: string },
): LmsMaterial {
  const raw = m.file_url ?? m.external_url ?? m.url ?? null
  const resolved = resolvePublicAssetUrl(raw) ?? (raw && String(raw).trim() !== '' ? String(raw).trim() : null)
  const kr = String(m.kind ?? 'other').toLowerCase()
  const kind: LmsMaterial['kind'] = ['pdf', 'video', 'link', 'slides', 'document', 'other'].includes(kr) ? (kr as LmsMaterial['kind']) : 'other'
  return {
    id: m.id,
    course_id: m.course_id ?? ctx.courseId,
    title: m.title,
    kind,
    url: resolved,
    description: m.description ?? null,
    course_name: ctx.courseTitle,
  }
}

export function mapCourseLearnAssignmentToStudentAssignment(
  a: CourseLearnAssignment,
  ctx: { courseId: number; courseTitle: string },
): StudentAssignment {
  return {
    id: a.id,
    course_id: ctx.courseId,
    assignment_id: a.assignment_id ?? a.id,
    title: a.title,
    course_name: ctx.courseTitle,
    due_at: a.due_at ?? null,
    status: normalizeLearnAssignmentStatus(a.status),
    score: a.score ?? null,
    max_score: a.max_points ?? null,
    feedback: a.feedback ?? null,
    submitted_at: null,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

export type CourseCmsScope = 'admin' | 'instructor'

/** Admin / super_admin use `/admin/courses/…`; instructors use `/instructor/courses/…`. */
export function inferCourseCmsScopeFromUserRole(role: string | null | undefined): CourseCmsScope {
  const n = normalizeRole(role)
  return n === 'instructor' ? 'instructor' : 'admin'
}

function courseCmsBase(courseId: number, scope: CourseCmsScope): string {
  return scope === 'instructor' ? `/instructor/courses/${courseId}` : `/admin/courses/${courseId}`
}

/** Avoid global axios error toasts for LMS CMS; pages show their own errors. */
const silentLms = { skipErrorToast: true as const }

function payloadForCmsConsole(body: unknown): unknown {
  if (body instanceof FormData) {
    const o: Record<string, unknown> = {}
    body.forEach((v, k) => {
      o[String(k)] = v instanceof File ? `File:${v.name}` : v
    })
    return o
  }
  return body
}

/** Debug: LMS CMS requests (scoped paths only). */
function logLmsApiRequest(method: string, url: string, payload?: unknown): void {
  if (!import.meta.env.DEV) return
  if (payload !== undefined) console.log('LMS API REQUEST', method, url, payloadForCmsConsole(payload))
  else console.log('LMS API REQUEST', method, url)
}

function firstArray(payload: Record<string, unknown>, keys: string[]): unknown[] {
  for (const k of keys) {
    const v = payload[k]
    if (Array.isArray(v)) return v as unknown[]
  }
  return []
}

function toNum(n: unknown, fb = 0): number {
  const x = Number(n)
  return Number.isFinite(x) ? x : fb
}

function str(v: unknown, fb = ''): string {
  if (v == null) return fb
  const s = String(v).trim()
  return s || fb
}

/** Student learn + CMS `course` object — never default title to `#id`. */
function buildCourseOverview(
  o: Record<string, unknown>,
  fallbackCourseId: number,
  emptyTitle: string,
): StudentLearnCourseOverview | null {
  let id = o.id != null ? toNum(o.id) : 0
  if (id <= 0 && fallbackCourseId > 0) id = fallbackCourseId
  if (id <= 0) return null

  const titleRaw = str(o.title ?? o.course_title ?? o.name)
  const title = titleRaw || emptyTitle

  return {
    id,
    title,
    slug: o.slug != null ? str(o.slug) : null,
    instructor_name:
      str(o.instructor_name) ||
      (o.instructor && typeof o.instructor === 'object' && !Array.isArray(o.instructor) ?
        str((o.instructor as Record<string, unknown>).name)
      : ''),
    description: str(o.description) || undefined,
    course_image:
      [
        o.course_image,
        o.cover_image,
        o.thumbnail,
        o.image_url,
        o.image,
      ].find((x) => x != null && str(x)) != null ?
        String(
          [o.course_image, o.cover_image, o.thumbnail, o.image_url, o.image].find((x) => x != null && str(x)),
        )
      : undefined,
  }
}

function pickCourse(root: Record<string, unknown>, fallbackCourseId = 0): StudentLearnCourseOverview | null {
  const c =
    (root.course && typeof root.course === 'object' ? root.course : null) ??
    (root.data &&
    typeof root.data === 'object' &&
    !(Array.isArray as (x: unknown) => x is unknown[])(root.data) ?
      ((root.data as Record<string, unknown>).course ??
        ('course' in (root.data as object) ?
          undefined
        : root.data))
    : null)

  let o = c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, unknown>) : null

  const rootHasOverviewShape =
    root.id != null &&
    (root.title != null || root.course_title != null || root.name != null || root.course_image != null)
  if (!o && rootHasOverviewShape) o = root as Record<string, unknown>

  if (!o) {
    if (fallbackCourseId <= 0) return null
    return buildCourseOverview({ id: fallbackCourseId }, fallbackCourseId, 'محتوى الدورة')
  }

  return buildCourseOverview(o, fallbackCourseId, 'محتوى الدورة')
}

function normalizeModules(rawList: unknown[]): StudentLearnModule[] {
  const out: StudentLearnModule[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = toNum(o.id)
    const course_id = o.course_id != null ? toNum(o.course_id, 0) : undefined
    if (id <= 0) continue
    const title = str(o.title) || `وحدة ${id}`
    out.push({
      id,
      course_id: course_id && course_id > 0 ? course_id : undefined,
      title,
      sort_order: toNum(o.sort_order, out.length),
      lessons_count: toNum(o.lessons_count, 0),
      completed_lessons: o.completed_lessons != null ? toNum(o.completed_lessons) : undefined,
    })
  }
  return [...out].sort((a, b) => a.sort_order - b.sort_order)
}

function normalizeLearnSessions(rawList: unknown[]): CourseLearnSession[] {
  const out: CourseLearnSession[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = toNum(o.id)
    if (id <= 0) continue
    const statusRaw = String(o.status ?? 'scheduled').toLowerCase()
    const st: 'scheduled' | 'live' | 'completed' | 'cancelled' = ['scheduled', 'live', 'completed', 'cancelled'].includes(
      statusRaw,
    )
      ? (statusRaw as 'scheduled')
      : 'scheduled'

    const locType = str(o.location_type) || undefined
    out.push({
      id,
      course_id: o.course_id != null ? toNum(o.course_id) : undefined,
      title: o.title != null ? str(o.title) : undefined,
      description: o.description != null ? str(o.description) : undefined,
      start_at: str(o.start_at) || undefined,
      end_at: str(o.end_at) || undefined,
      starts_at: str(o.starts_at ?? o.startsAt) || undefined,
      ends_at: str(o.ends_at ?? o.endsAt) || undefined,
      date: str(o.date) || undefined,
      time: str(o.time) || undefined,
      meeting_url: str(o.meeting_url ?? o.meeting_link) || undefined,
      recording_url: str(o.recording_url ?? o.recording_link) || undefined,
      location_type: locType ?? null,
      location: str(o.location) || undefined,
      status: st,
      type: (() => {
        const t = str(o.type)
        return t === 'offline' ? 'offline' : t === 'online' ? 'online' : undefined
      })(),
      instructor_name: str(o.instructor_name) || undefined,
    })
  }
  return out.sort((a, b) =>
    tsFromISO(a.start_at ?? a.starts_at ?? a.date ?? '') - tsFromISO(b.start_at ?? b.starts_at ?? b.date ?? ''),
  )
}

function tsFromISO(s: string): number {
  if (!s) return 0
  const n = Date.parse(s)
  return Number.isNaN(n) ? 0 : n
}

function normalizeLearnMaterials(rawList: unknown[]): CourseLearnMaterial[] {
  const out: CourseLearnMaterial[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = toNum(o.id)
    if (id <= 0) continue
    const kindRaw = String(o.kind ?? o.type ?? 'other').toLowerCase()
    const kind =
      ['pdf', 'video', 'link', 'slides', 'document', 'other'].includes(kindRaw) ? kindRaw : 'other'

    const fileUrl = str(o.file_url) || undefined
    const extUrl = str(o.external_url) || undefined
    const urlLegacy = str(o.url) || undefined

    out.push({
      id,
      course_id: o.course_id != null ? toNum(o.course_id) : undefined,
      title: str(o.title, 'مادة'),
      description: str(o.description) || undefined,
      kind,
      file_url: fileUrl,
      external_url: extUrl,
      url: urlLegacy ?? fileUrl ?? extUrl,
      visibility: o.visibility != null ? str(o.visibility) : undefined,
    })
  }
  return out
}

function normalizeLearnAssignments(rawList: unknown[]): CourseLearnAssignment[] {
  const out: CourseLearnAssignment[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = toNum(o.id)
    const assignment_id = toNum(o.assignment_id ?? o.id, id)
    if (id <= 0) continue

    let sub =
      typeof o.submission_type === 'string'
        ? o.submission_type
        : o.submission_required_type != null ?
          String(o.submission_required_type)
        : 'both'

    const dueCand = str(o.deadline) || str(o.due_at) || str(o.ends_at)

    let score: number | undefined
    if (o.score != null) {
      const sc = Number(o.score)
      if (Number.isFinite(sc)) score = sc
    }

    out.push({
      id,
      assignment_id,
      title: str(o.title, 'واجب'),
      description: str(o.description) || undefined,

      due_at: dueCand || undefined,

      max_points: o.max_points != null ? toNum(o.max_points) : undefined,

      submission_type: sub,

      required: o.required !== undefined ? Boolean(o.required) : o.is_required !== undefined ? Boolean(o.is_required) : true,

      visible: o.visible !== undefined ? Boolean(o.visible) : true,
      status: str(o.status) || undefined,

      score,

      feedback: str(o.feedback) || undefined,
    })
  }
  return out
}

export function normalizeStudentCourseLearn(payload: unknown, courseIdFallback: number): StudentCourseLearnPayload {
  const rootWrap = unwrapData<unknown>(payload)
  let root =
    rootWrap && typeof rootWrap === 'object' && !Array.isArray(rootWrap) ?
      { ...(rootWrap as Record<string, unknown>) }
    : {}

  if (root.payload && typeof root.payload === 'object' && !Array.isArray(root.payload)) {
    root = { ...root, ...(root.payload as Record<string, unknown>) }
  }

  const course = pickCourse(root, courseIdFallback)

  let progressPct: number | undefined
  if (root.progress_percent != null) {
    const p = toNum(root.progress_percent)
    if (Number.isFinite(p)) progressPct = p
  } else if (root.progress && typeof root.progress === 'object') {
    const pct = (root.progress as Record<string, unknown>).percent
    if (pct != null) {
      const p = toNum(pct)
      if (Number.isFinite(p)) progressPct = p
    }
  }

  const registration_status =
    str(root.registration_status) || str(root.enrollment_status) || str(root.student_status) || undefined

  const mods = normalizeModules(firstArray(root, ['modules', 'course_modules']))
  const sess = normalizeLearnSessions(firstArray(root, ['sessions', 'learn_sessions', 'course_sessions']))
  const mats = normalizeLearnMaterials(firstArray(root, ['materials', 'course_materials', 'documents']))
  const assigns = normalizeLearnAssignments(firstArray(root, ['assignments', 'course_assignments', 'homework']))

  return {
    course,
    progress_percent: progressPct,
    registration_status,
    modules: mods,

    sessions: sess,
    materials: mats,

    assignments: assigns,
  }
}

/** Single GET …/courses/{id}/content payload — admin + instructor scope. */
export type CourseCmsContentBundle = {
  course: StudentLearnCourseOverview | null
  modules: LmsModule[]
  sessions: CourseLearnSession[]
  materials: CourseLearnMaterial[]
  assignments: CourseLearnAssignment[]
}

function normalizeCourseCmsContentEnvelope(payload: unknown, courseIdFallback: number): CourseCmsContentBundle {
  const wrapped = unwrapData<unknown>(payload)
  let root: Record<string, unknown> =
    wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped) ?
      { ...(wrapped as Record<string, unknown>) }
    : {}

  if (
    root.data &&
    typeof root.data === 'object' &&
    !Array.isArray(root.data) &&
    !root.course &&
    'course' in (root.data as object)
  ) {
    root = { ...root, ...(root.data as Record<string, unknown>) }
  }

  let courseOv: StudentLearnCourseOverview | null = null

  const cr = root.course
  if (cr && typeof cr === 'object' && !Array.isArray(cr)) {
    courseOv = buildCourseOverview(cr as Record<string, unknown>, courseIdFallback, 'محتوى الدورة')
  }

  const modulesNormalized = normalizeModules(firstArray(root, ['modules', 'course_modules']))
  const modules: LmsModule[] = modulesNormalized.map((m) => ({
    id: m.id,
    course_id: m.course_id && m.course_id > 0 ? m.course_id : courseIdFallback,
    title: m.title,
    sort_order: m.sort_order,
    lessons_count: m.lessons_count,
    completed_lessons: m.completed_lessons,
  }))

  return {
    course: courseOv,
    modules,
    sessions: normalizeLearnSessions(firstArray(root, ['sessions', 'learn_sessions', 'course_sessions'])),
    materials: normalizeLearnMaterials(firstArray(root, ['materials', 'course_materials', 'documents'])),
    assignments: normalizeLearnAssignments(firstArray(root, ['assignments', 'course_assignments', 'homework'])),
  }
}

/** Maps learn session payload to existing LMS session UI model */
export function mapLearnSessionToLms(s: CourseLearnSession, courseFallbackName: string): LmsSession {
  const isoStart = s.start_at ?? s.starts_at
  const meeting = s.meeting_url ?? null
  return {
    id: s.id,
    course_id: s.course_id ?? undefined,
    title: s.title,
    course_name: courseFallbackName,
    starts_at: isoStart ?? null,
    ends_at: s.end_at ?? s.ends_at ?? null,
    date: s.date ?? undefined,
    time: s.time ?? undefined,
    status: typeof s.status === 'string' && ['scheduled', 'live', 'completed', 'cancelled'].includes(s.status as string)
      ? (s.status as LmsSession['status'])
      : /complete/.test(String(s.status)) ? 'completed'
      : /cancel/i.test(String(s.status)) ? 'cancelled'
      : /live/.test(String(s.status)) ? 'live'
      : 'scheduled',

    type: (s.type as 'online' | 'offline' | undefined) ?? (String(s.location_type).includes('off') ? 'offline' : 'online'),
    instructor_name: s.instructor_name ?? null,
    location: s.location ?? null,
    meeting_link: meeting ?? null,
    recording_link: s.recording_url ?? null,
    platform:
      meeting && (/zoom/i.test(meeting) ? 'zoom' : /meet\.google|google/i.test(meeting) ? 'google_meet' : undefined),
    course_slug: undefined,
  }
}

// ── Student ─────────────────────────────────────────────────────────────────

export async function fetchStudentCourseLearn(courseId: number): Promise<StudentCourseLearnPayload> {
  const res = await apiClient.get<unknown>(`/student/courses/${courseId}/learn`, {
    skipErrorToast: true,
  })
  return normalizeStudentCourseLearn(res.data, courseId)
}

// ── Admin / course scoped LMS CMS ──────────────────────────────────────────

/** Full course CMS tree (preferred); falls back gracefully if `/content` missing. */

export async function fetchCourseCmsContent(courseId: number, scope: CourseCmsScope): Promise<CourseCmsContentBundle> {
  const url = `${courseCmsBase(courseId, scope)}/content`
  logLmsApiRequest('GET', url)
  try {
    const res = await apiClient.get<unknown>(url, silentLms)
    return normalizeCourseCmsContentEnvelope(res.data, courseId)
  } catch (_err: unknown) {
    const [mods, sess, mats, assigns] = await Promise.all([
      adminListCourseModulesLegacy(courseId, scope),
      adminListCourseSessionsLegacy(courseId, scope),
      adminListCourseMaterialsLegacy(courseId, scope),
      adminListCourseAssignmentsLegacy(courseId, scope),
    ])

    const courseOv = buildCourseOverview({ id: courseId }, courseId, 'محتوى الدورة')

    return {
      course: courseOv,
      modules: mods,
      sessions: sess,
      materials: mats,
      assignments: assigns,
    }
  }
}

async function adminListCourseModulesLegacy(courseId: number, scope: CourseCmsScope): Promise<LmsModule[]> {
  const url = `${courseCmsBase(courseId, scope)}/modules`
  const res = await apiClient.get<unknown>(url, silentLms)
  return asList<LmsModule>(res.data).map((m) => ({
    ...m,
    sort_order:
      typeof (m as { sort_order?: number }).sort_order === 'number'
        ? (m as { sort_order: number }).sort_order
        : toNum((m as { sort_order?: unknown }).sort_order, 0),
  }))
}

async function adminListCourseSessionsLegacy(courseId: number, scope: CourseCmsScope): Promise<CourseLearnSession[]> {
  const url = `${courseCmsBase(courseId, scope)}/sessions`
  const res = await apiClient.get<unknown>(url, silentLms)
  return normalizeLearnSessions(asList<unknown>(res.data))
}

async function adminListCourseMaterialsLegacy(courseId: number, scope: CourseCmsScope): Promise<CourseLearnMaterial[]> {
  const url = `${courseCmsBase(courseId, scope)}/materials`
  const res = await apiClient.get<unknown>(url, silentLms)
  return normalizeLearnMaterials(asList<unknown>(res.data))
}

async function adminListCourseAssignmentsLegacy(courseId: number, scope: CourseCmsScope): Promise<CourseLearnAssignment[]> {
  const url = `${courseCmsBase(courseId, scope)}/assignments`
  const res = await apiClient.get<unknown>(url, silentLms)
  return normalizeLearnAssignments(asList<unknown>(res.data))
}

/** Module rows for admin CMS (reuse platform LmsModule shape + optional extras) */

export async function adminListCourseModules(courseId: number, scope: CourseCmsScope): Promise<LmsModule[]> {
  return (await fetchCourseCmsContent(courseId, scope)).modules
}

export async function adminCreateCourseModule(courseId: number, body: Record<string, unknown>, scope: CourseCmsScope): Promise<LmsModule> {
  const url = `${courseCmsBase(courseId, scope)}/modules`
  logLmsApiRequest('POST', url, body)
  const res = await apiClient.post<unknown>(url, body, silentLms)
  return unwrapLms<LmsModule>(res.data)
}

export async function adminUpdateCourseModule(
  courseId: number,
  moduleId: number,
  body: Record<string, unknown>,
  scope: CourseCmsScope,
): Promise<LmsModule> {
  const url = `${courseCmsBase(courseId, scope)}/modules/${moduleId}`
  logLmsApiRequest('PUT', url, body)
  const res = await apiClient.put<unknown>(url, body, silentLms)
  return unwrapLms<LmsModule>(res.data)
}

export async function adminDeleteCourseModule(courseId: number, moduleId: number, scope: CourseCmsScope): Promise<void> {
  const url = `${courseCmsBase(courseId, scope)}/modules/${moduleId}`
  logLmsApiRequest('DELETE', url)
  await apiClient.delete(url, silentLms)
}

export async function adminReorderCourseModules(courseId: number, orderedIds: number[], scope: CourseCmsScope): Promise<void> {
  const url = `${courseCmsBase(courseId, scope)}/modules/reorder`
  const body = {
    ids: orderedIds,
    ordered_ids: orderedIds,
    module_ids: orderedIds,
  }
  logLmsApiRequest('POST', url, body)
  await apiClient.post(url, body, silentLms)
}

export async function adminListCourseSessions(courseId: number, scope: CourseCmsScope): Promise<CourseLearnSession[]> {
  return (await fetchCourseCmsContent(courseId, scope)).sessions
}

export async function adminCreateCourseSession(
  courseId: number,
  body: Record<string, unknown>,
  scope: CourseCmsScope,
): Promise<CourseLearnSession> {
  const url = `${courseCmsBase(courseId, scope)}/sessions`
  logLmsApiRequest('POST', url, body)
  const res = await apiClient.post<unknown>(url, body, silentLms)
  return normalizeLearnSessions([unwrapLms<unknown>(res.data)])[0]!
}

export async function adminUpdateCourseSession(
  courseId: number,
  sessionId: number,
  body: Record<string, unknown>,
  scope: CourseCmsScope,
): Promise<CourseLearnSession> {
  const url = `${courseCmsBase(courseId, scope)}/sessions/${sessionId}`
  logLmsApiRequest('PUT', url, body)
  const res = await apiClient.put<unknown>(url, body, silentLms)
  return normalizeLearnSessions([unwrapLms<unknown>(res.data)])[0]!
}

export async function adminDeleteCourseSession(courseId: number, sessionId: number, scope: CourseCmsScope): Promise<void> {
  const url = `${courseCmsBase(courseId, scope)}/sessions/${sessionId}`
  logLmsApiRequest('DELETE', url)
  await apiClient.delete(url, silentLms)
}

export async function adminListCourseMaterials(courseId: number, scope: CourseCmsScope): Promise<CourseLearnMaterial[]> {
  return (await fetchCourseCmsContent(courseId, scope)).materials
}

export async function adminCreateCourseMaterial(courseId: number, body: FormData | Record<string, unknown>, scope: CourseCmsScope): Promise<CourseLearnMaterial> {
  const url = `${courseCmsBase(courseId, scope)}/materials`
  logLmsApiRequest('POST', url, body)
  const res =
    body instanceof FormData ?
      await apiClient.post<unknown>(url, body, {
        ...silentLms,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    : await apiClient.post<unknown>(url, body, silentLms)

  return normalizeLearnMaterials([unwrapLms<unknown>(res.data)])[0]!
}

export async function adminUpdateCourseMaterial(courseId: number, materialId: number, body: FormData | Record<string, unknown>, scope: CourseCmsScope): Promise<CourseLearnMaterial> {
  const url = `${courseCmsBase(courseId, scope)}/materials/${materialId}`
  logLmsApiRequest('PUT', url, body)
  const res =
    body instanceof FormData ?
      await apiClient.put<unknown>(url, body, {
        ...silentLms,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    : await apiClient.put<unknown>(url, body, silentLms)

  return normalizeLearnMaterials([unwrapLms<unknown>(res.data)])[0]!
}

export async function adminDeleteCourseMaterial(courseId: number, materialId: number, scope: CourseCmsScope): Promise<void> {
  const url = `${courseCmsBase(courseId, scope)}/materials/${materialId}`
  logLmsApiRequest('DELETE', url)
  await apiClient.delete(url, silentLms)
}

export async function adminListCourseAssignments(courseId: number, scope: CourseCmsScope): Promise<CourseLearnAssignment[]> {
  return (await fetchCourseCmsContent(courseId, scope)).assignments
}

export async function adminCreateCourseAssignment(courseId: number, body: Record<string, unknown>, scope: CourseCmsScope): Promise<CourseLearnAssignment> {
  const url = `${courseCmsBase(courseId, scope)}/assignments`
  logLmsApiRequest('POST', url, body)
  const res = await apiClient.post<unknown>(url, body, silentLms)
  return normalizeLearnAssignments([unwrapLms<unknown>(res.data)])[0]!
}

export async function adminUpdateCourseAssignment(courseId: number, assignmentId: number, body: Record<string, unknown>, scope: CourseCmsScope): Promise<CourseLearnAssignment> {
  const url = `${courseCmsBase(courseId, scope)}/assignments/${assignmentId}`
  logLmsApiRequest('PUT', url, body)
  const res = await apiClient.put<unknown>(url, body, silentLms)
  return normalizeLearnAssignments([unwrapLms<unknown>(res.data)])[0]!
}

export async function adminDeleteCourseAssignment(courseId: number, assignmentId: number, scope: CourseCmsScope): Promise<void> {
  const url = `${courseCmsBase(courseId, scope)}/assignments/${assignmentId}`
  logLmsApiRequest('DELETE', url)
  await apiClient.delete(url, silentLms)
}
