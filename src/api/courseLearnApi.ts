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

import axios from 'axios'
import apiClient from '@/api/axios'
import { asList, unwrapLms } from '@/api/lmsApi'
import { unwrapData } from '@/api/unwrap'
import { normalizeRole } from '@/utils/dashboardAccess'
import type {
  CourseLearnAssignment,
  CourseLearnClassGroup,
  CourseLearnMaterial,
  CourseLearnSession,
  ModuleLesson,
  StudentCourseLearnPayload,
  StudentLearnCourseOverview,
  StudentLearnModule,
} from '@/types/courseLearn'
import type { AssignmentStatus, LmsMaterial, LmsSession, StudentAssignment } from '@/types/lms'
import type { LmsModule } from '@/types/platform'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { normalizeAssignmentStatus, resolveLmsAssignmentSubmitId } from '@/utils/lmsAssignment'

function normalizeLearnAssignmentStatus(raw: string | null | undefined): AssignmentStatus {
  return normalizeAssignmentStatus(raw)
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
    updated_at: m.updated_at ?? null,
  }
}

export function mapCourseLearnAssignmentToStudentAssignment(
  a: CourseLearnAssignment,
  ctx: { courseId: number; courseTitle: string },
): StudentAssignment | null {
  const submitId = resolveLmsAssignmentSubmitId({
    lms_assignment_id: a.lms_assignment_id,
    assignment_id: a.assignment_id,
    id: a.id,
    course_assignment_id: a.course_assignment_id ?? a.id,
  })
  if (submitId == null) return null

  const mySub = a.my_submission
  const submittedAt = a.submitted_at ?? mySub?.submitted_at ?? null
  const statusRaw = a.status ?? mySub?.status ?? (submittedAt ? 'submitted' : null)

  return {
    id: a.course_assignment_id ?? a.id,
    course_id: ctx.courseId,
    assignment_id: submitId,
    title: a.title,
    course_name: ctx.courseTitle,
    due_at: a.due_at ?? null,
    status: normalizeLearnAssignmentStatus(statusRaw),
    score: a.score ?? mySub?.score ?? null,
    max_score: a.max_points ?? null,
    feedback: a.feedback ?? mySub?.feedback ?? null,
    submitted_at: submittedAt,
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

function normalizeModuleLessons(rawList: unknown[]): ModuleLesson[] {
  const out: ModuleLesson[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = toNum(o.id)
    if (id <= 0) continue
    const title = str(o.title)
    if (!title) continue
    out.push({
      id,
      title,
      description: str(o.description) || undefined,
      video_url: str(o.video_url) || undefined,
      duration_minutes: o.duration_minutes != null ? toNum(o.duration_minutes) : undefined,
      sort_order: toNum(o.sort_order, out.length),
      status: str(o.status) || 'active',
    })
  }
  return out.sort((a, b) => a.sort_order - b.sort_order)
}

function normalizeModules(rawList: unknown[]): StudentLearnModule[] {
  const out: StudentLearnModule[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = toNum(o.id)
    const course_id = o.course_id != null ? toNum(o.course_id, 0) : undefined
    if (id <= 0) continue
    const title = str(o.title)
    if (!title) continue
    const completedLessons = o.completed_lessons_count != null
      ? toNum(o.completed_lessons_count)
      : o.completed_lessons != null
        ? toNum(o.completed_lessons)
        : undefined
    out.push({
      id,
      course_id: course_id && course_id > 0 ? course_id : undefined,
      title,
      description: str(o.description) || undefined,
      sort_order: toNum(o.sort_order, out.length),
      lessons_count: toNum(o.lessons_count, 0),
      completed_lessons: completedLessons,
      completed_lessons_count: completedLessons,
      assignments_count: o.assignments_count != null ? toNum(o.assignments_count) : undefined,
      submitted_assignments_count:
        o.submitted_assignments_count != null ? toNum(o.submitted_assignments_count) : undefined,
      progress_percentage: o.progress_percentage != null ? toNum(o.progress_percentage) : undefined,
      is_completed: o.is_completed != null ? Boolean(o.is_completed) : undefined,
      lessons: Array.isArray(o.lessons) ? normalizeModuleLessons(o.lessons) : undefined,
      materials: Array.isArray(o.materials) ? normalizeLearnMaterials(o.materials) : undefined,
      sessions: Array.isArray(o.sessions) ? normalizeLearnSessions(o.sessions) : undefined,
      assignments: Array.isArray(o.assignments) ? normalizeLearnAssignments(o.assignments) : undefined,
    })
  }
  return [...out].sort((a, b) => a.sort_order - b.sort_order)
}

function normalizeLearnSessions(rawList: unknown[]): CourseLearnSession[] {
  const out: CourseLearnSession[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = toNum(o.id ?? o.session_id ?? o.lms_session_id ?? o.course_session_id)
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
      module_id: o.module_id != null ? toNum(o.module_id) : null,
      meeting_url: str(o.meeting_url ?? o.meeting_link) || undefined,
      meeting_link: str(o.meeting_link ?? o.meeting_url) || undefined,
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
    const id = toNum(o.id ?? o.material_id ?? o.course_material_id)
    if (id <= 0) continue
    const kindRaw = String(o.kind ?? o.type ?? 'other').toLowerCase()
    const kind =
      ['pdf', 'video', 'link', 'slides', 'document', 'other'].includes(kindRaw) ? kindRaw : 'other'

    const fileUrl = str(o.file_url ?? o.download_url) || undefined
    const extUrl = str(o.external_url) || undefined
    const urlLegacy = str(o.url) || undefined

    out.push({
      id,
      course_id: o.course_id != null ? toNum(o.course_id) : undefined,
      module_id: o.module_id != null ? toNum(o.module_id) : null,
      title: str(o.title, 'مادة'),
      description: str(o.description) || undefined,
      kind,
      file_url: fileUrl,
      external_url: extUrl,
      url: urlLegacy ?? fileUrl ?? extUrl,
      visibility: o.visibility != null ? str(o.visibility) : undefined,
      updated_at: str(o.updated_at ?? o.created_at) || undefined,
    })
  }
  return out
}

function normalizeLearnAssignments(rawList: unknown[]): CourseLearnAssignment[] {
  const out: CourseLearnAssignment[] = []
  for (const r of rawList) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const rowId = toNum(o.id ?? o.course_assignment_id)
    const courseAssignmentId =
      o.course_assignment_id != null ? toNum(o.course_assignment_id) : rowId > 0 ? rowId : 0
    const lmsId = resolveLmsAssignmentSubmitId({
      lms_assignment_id: o.lms_assignment_id != null ? toNum(o.lms_assignment_id) : null,
      assignment_id: o.assignment_id != null ? toNum(o.assignment_id) : null,
      id: rowId > 0 ? rowId : null,
      course_assignment_id: courseAssignmentId > 0 ? courseAssignmentId : null,
    })
    if (rowId <= 0 && lmsId == null) continue

    const mySub =
      o.my_submission && typeof o.my_submission === 'object' && !Array.isArray(o.my_submission) ?
        (o.my_submission as Record<string, unknown>)
      : null

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
      id: rowId > 0 ? rowId : (lmsId ?? 0),
      course_assignment_id: courseAssignmentId > 0 ? courseAssignmentId : undefined,
      assignment_id: lmsId ?? undefined,
      module_id: o.module_id != null ? toNum(o.module_id) : null,
      title: str(o.title, 'واجب'),
      description: str(o.description) || undefined,
      instructions: str(o.instructions) || undefined,

      due_at: dueCand || undefined,

      max_points: o.max_points != null ? toNum(o.max_points) : undefined,

      submission_type: sub,

      required: o.required !== undefined ? Boolean(o.required) : o.is_required !== undefined ? Boolean(o.is_required) : true,

      visible: o.visible !== undefined ? Boolean(o.visible) : o.is_visible !== undefined ? Boolean(o.is_visible) : true,
      status: str(o.status) || (mySub?.status != null ? str(mySub.status) : undefined),

      score,

      feedback: str(o.feedback) || (mySub?.feedback != null ? str(mySub.feedback) : undefined),
      submitted_at:
        o.submitted_at != null ? str(o.submitted_at) : mySub?.submitted_at != null ? str(mySub.submitted_at) : undefined,
      lms_assignment_id: lmsId ?? undefined,
      resubmission_allowed: o.resubmission_allowed != null ? Boolean(o.resubmission_allowed) : undefined,
      my_submission: mySub ?
        {
          submitted_at: mySub.submitted_at != null ? str(mySub.submitted_at) : null,
          status: mySub.status != null ? str(mySub.status) : null,
          text_answer: mySub.text_answer != null ? str(mySub.text_answer) : null,
          score: mySub.score != null ? Number(mySub.score) : null,
          feedback: mySub.feedback != null ? str(mySub.feedback) : null,
        }
      : null,
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

  let classGroup: CourseLearnClassGroup | null = null
  const cgRaw = root.class_group
  if (cgRaw && typeof cgRaw === 'object' && !Array.isArray(cgRaw)) {
    const cg = cgRaw as Record<string, unknown>
    const cgId = toNum(cg.id)
    if (cgId > 0) {
      classGroup = {
        id: cgId,
        name: str(cg.name) || 'الفصل الدراسي',
        level_code: cg.level_code != null ? str(cg.level_code) : null,
        schedule_day: cg.schedule_day != null ? str(cg.schedule_day) : null,
        schedule_time: cg.schedule_time != null ? str(cg.schedule_time) : null,
        location_type: cg.location_type != null ? str(cg.location_type) : null,
        meeting_link: cg.meeting_link != null ? str(cg.meeting_link) : null,
      }
    }
  }

  const mods = normalizeModules(firstArray(root, ['modules', 'course_modules']))
  const sess = normalizeLearnSessions(firstArray(root, ['sessions', 'learn_sessions', 'course_sessions']))
  const mats = normalizeLearnMaterials(firstArray(root, ['materials', 'course_materials', 'documents']))
  const assigns = normalizeLearnAssignments(firstArray(root, ['assignments', 'course_assignments', 'homework']))

  // Include module-nested assignments in the top-level list (deduped)
  const seenAssignIds = new Set(assigns.map((a) => a.id))
  for (const mod of mods) {
    for (const a of mod.assignments ?? []) {
      if (!seenAssignIds.has(a.id)) {
        assigns.push(a)
        seenAssignIds.add(a.id)
      }
    }
  }

  return {
    course,
    progress_percent: progressPct,
    registration_status,
    class_group: classGroup,
    modules: mods,
    sessions: sess,
    materials: mats,
    assignments: assigns,
  }
}

/** Single GET …/courses/{id}/content payload — admin + instructor scope. */
export type CourseCmsContentBundle = {
  course: StudentLearnCourseOverview | null
  modules: StudentLearnModule[]
  sessions: CourseLearnSession[]
  materials: CourseLearnMaterial[]
  assignments: CourseLearnAssignment[]
}

/**
 * The `/content` payload's flat `sessions`/`materials`/`assignments` lists only
 * contain course-level items (module_id = null) — the CMS tabs are meant to
 * browse *all* content though, so module-nested items are merged in here
 * (deduped by id) while staying nested under their module too.
 */
function mergeModuleNestedById<T extends { id: number }>(
  flat: T[],
  modules: StudentLearnModule[],
  pick: (m: StudentLearnModule) => T[] | undefined,
): T[] {
  const merged = [...flat]
  const seenIds = new Set(flat.map((item) => item.id))
  for (const mod of modules) {
    for (const item of pick(mod) ?? []) {
      if (!seenIds.has(item.id)) {
        merged.push(item)
        seenIds.add(item.id)
      }
    }
  }
  return merged
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

  const modules = normalizeModules(firstArray(root, ['modules', 'course_modules'])).map((m) => ({
    ...m,
    course_id: m.course_id && m.course_id > 0 ? m.course_id : courseIdFallback,
  }))

  const sessions = normalizeLearnSessions(firstArray(root, ['sessions', 'learn_sessions', 'course_sessions']))
  const materials = normalizeLearnMaterials(firstArray(root, ['materials', 'course_materials', 'documents']))
  const assignments = normalizeLearnAssignments(firstArray(root, ['assignments', 'course_assignments', 'homework']))

  return {
    course: courseOv,
    modules,
    sessions: mergeModuleNestedById(sessions, modules, (m) => m.sessions),
    materials: mergeModuleNestedById(materials, modules, (m) => m.materials),
    assignments: mergeModuleNestedById(assignments, modules, (m) => m.assignments),
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

export async function fetchCourseNotes(courseId: number): Promise<{ content: string; updated_at: string | null }> {
  const res = await apiClient.get<unknown>(`/student/courses/${courseId}/notes`, { skipErrorToast: true })
  const d = unwrapData<{ content?: unknown; updated_at?: unknown }>(res.data)
  return {
    content: d?.content != null ? String(d.content) : '',
    updated_at: d?.updated_at != null && String(d.updated_at).trim() !== '' ? String(d.updated_at) : null,
  }
}

export async function saveCourseNotes(courseId: number, content: string): Promise<{ content: string; updated_at: string | null }> {
  const res = await apiClient.put<unknown>(`/student/courses/${courseId}/notes`, { content }, { skipErrorToast: true })
  const d = unwrapData<{ content?: unknown; updated_at?: unknown }>(res.data)
  return {
    content: d?.content != null ? String(d.content) : content,
    updated_at: d?.updated_at != null && String(d.updated_at).trim() !== '' ? String(d.updated_at) : null,
  }
}

// ── Admin / course scoped LMS CMS ──────────────────────────────────────────

/** Full course CMS tree (preferred); falls back gracefully if `/content` missing. */

async function safeCmsList<T>(loader: () => Promise<T[]>, label: string): Promise<T[]> {
  try {
    return await loader()
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      if (status === 404 || status === 405 || status === 403) {
        if (import.meta.env.DEV) console.warn(`LMS CMS skip ${label}: HTTP ${status}`)
        return []
      }
    }
    throw err
  }
}

export async function fetchCourseCmsContent(courseId: number, scope: CourseCmsScope): Promise<CourseCmsContentBundle> {
  const url = `${courseCmsBase(courseId, scope)}/content`
  logLmsApiRequest('GET', url)
  try {
    const res = await apiClient.get<unknown>(url, silentLms)
    return normalizeCourseCmsContentEnvelope(res.data, courseId)
  } catch (_err: unknown) {
    const assignmentsLoader =
      scope === 'instructor'
        ? () => Promise.resolve([] as CourseLearnAssignment[])
        : () => adminListCourseAssignmentsLegacy(courseId, scope)

    const [mods, sess, mats, assigns] = await Promise.all([
      safeCmsList(() => adminListCourseModulesLegacy(courseId, scope), 'modules'),
      safeCmsList(() => adminListCourseSessionsLegacy(courseId, scope), 'sessions'),
      safeCmsList(() => adminListCourseMaterialsLegacy(courseId, scope), 'materials'),
      safeCmsList(assignmentsLoader, 'assignments'),
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

export async function adminListCourseModules(courseId: number, scope: CourseCmsScope): Promise<StudentLearnModule[]> {
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

export async function adminCreateCourseLesson(courseId: number, body: Record<string, unknown>, scope: CourseCmsScope): Promise<ModuleLesson> {
  const url = `${courseCmsBase(courseId, scope)}/lessons`
  logLmsApiRequest('POST', url, body)
  const res = await apiClient.post<unknown>(url, body, silentLms)
  const raw = unwrapLms<Record<string, unknown>>(res.data)
  return {
    id: toNum(raw.id),
    title: str(raw.title, 'درس'),
    description: raw.description != null ? str(raw.description) || undefined : undefined,
    video_url: raw.video_url != null ? str(raw.video_url) || undefined : undefined,
    duration_minutes: raw.duration_minutes != null ? toNum(raw.duration_minutes) : undefined,
    sort_order: toNum(raw.sort_order, 0),
    status: str(raw.status, 'active'),
  }
}

export async function adminDeleteCourseLesson(courseId: number, lessonId: number, scope: CourseCmsScope): Promise<void> {
  const url = `${courseCmsBase(courseId, scope)}/lessons/${lessonId}`
  logLmsApiRequest('DELETE', url)
  await apiClient.delete(url, silentLms)
}
