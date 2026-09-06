import apiClient from './axios'
import {
  getCanonicalStudentIdentity,
  getCanonicalPlacement,
  getCanonicalProgress,
} from './normalizers/instructorStudentSummary'

const silent = { skipErrorToast: true as const }

/* ══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */

export type PlacementQuestion = {
  id: number
  text: string
  options: Array<{ key: string; text: string }>
}

export type PlacementTest = {
  id: number
  course_id: number
  title: string
  total_questions: number
  duration_minutes: number
  questions: PlacementQuestion[]
  instructions?: string | null
}

export type PlacementStatus =
  | 'not_started'
  | 'placement_required'
  | 'in_progress'
  | 'written_submitted'
  | 'oral_booked'
  | 'oral_completed'
  | 'completed'

/**
 * Authoritative per-step progress derived from the API-returned status.
 * All placement UI must read from this object — never re-derive from
 * local fields (score, booking date, etc.).
 */
export type PlacementProgress = {
  status: PlacementStatus
  /** Written test has been submitted */
  written_done: boolean
  /** Oral interview slot is booked */
  oral_booked: boolean
  /** Instructor completed the oral assessment */
  oral_done: boolean
  /** Final level has been approved (status === 'completed') */
  level_approved: boolean
  /** Student may start the course */
  can_start: boolean
}

const WRITTEN_STATUSES: PlacementStatus[] = ['written_submitted', 'oral_booked', 'oral_completed', 'completed']
const ORAL_BOOKED_STATUSES: PlacementStatus[] = ['oral_booked', 'oral_completed', 'completed']
const ORAL_DONE_STATUSES: PlacementStatus[] = ['oral_completed', 'completed']

/**
 * Canonical student placement states — exhaustive, ordered by progression.
 * Use deriveStudentPlacementState() to map any enrollment or status to one of these.
 */
export type StudentPlacementState =
  | 'NOT_STARTED'
  | 'WRITTEN_IN_PROGRESS'
  | 'WRITTEN_COMPLETED'
  | 'ORAL_BOOKED'
  | 'ORAL_COMPLETED_PENDING_APPROVAL'
  | 'LEVEL_APPROVED'
  | 'COURSE_ACTIVE'
  | 'COURSE_COMPLETED'

/**
 * Derives the canonical StudentPlacementState from placement fields.
 *
 * @param requiresPlacement  - Whether the course requires a placement test
 * @param status             - Canonical placement status string
 * @param canStartLearning   - Backend flag indicating level is approved
 * @param courseStatus       - Enrollment status ('active'|'completed'|'pending')
 * @param progressPct        - Course progress percentage (0–100)
 */
export function deriveStudentPlacementState(
  requiresPlacement: boolean,
  status: PlacementStatus | string | null | undefined,
  canStartLearning: boolean | null | undefined,
  courseStatus?: string | null,
  progressPct?: number,
): StudentPlacementState {
  if (courseStatus === 'completed') return 'COURSE_COMPLETED'

  if (!requiresPlacement) {
    return progressPct && progressPct > 0 ? 'COURSE_ACTIVE' : 'LEVEL_APPROVED'
  }

  const p = progressFromStatus(status, !!(canStartLearning))

  if (p.can_start) {
    return progressPct && progressPct > 0 ? 'COURSE_ACTIVE' : 'LEVEL_APPROVED'
  }
  if (p.oral_done)    return 'ORAL_COMPLETED_PENDING_APPROVAL'
  if (p.oral_booked)  return 'ORAL_BOOKED'
  if (p.written_done) return 'WRITTEN_COMPLETED'
  if (p.status === 'in_progress') return 'WRITTEN_IN_PROGRESS'
  return 'NOT_STARTED'
}

/** Single source of truth — call once, read everywhere. */
export function progressFromStatus(
  status: PlacementStatus | string | null | undefined,
  canStartOverride = false,
): PlacementProgress {
  const s = (status ?? 'not_started') as PlacementStatus
  const level_approved = s === 'completed'
  return {
    status: s,
    written_done:  WRITTEN_STATUSES.includes(s),
    oral_booked:   ORAL_BOOKED_STATUSES.includes(s),
    oral_done:     ORAL_DONE_STATUSES.includes(s),
    level_approved,
    can_start:     level_approved || canStartOverride,
  }
}

export type PlacementAttempt = {
  id: number
  course_id: number
  status: PlacementStatus
  written_score: number | null
  total_questions: number | null
  /** Normalised from written_level / estimated_level / level */
  written_level: string | null
  estimated_level: string | null
  /** Pre-computed percentage (0–100) */
  percentage: number | null
  /** ISO timestamp when the written test was submitted */
  submitted_at: string | null
  oral_booking_id: number | null
  oral_booking_at: string | null
  final_level: string | null
  oral_score: number | null
  instructor_notes: string | null
  can_start_course: boolean
  created_at: string | null
}

/** Oral interview booking data returned alongside placement status */
export type OralBooking = {
  id: number | null
  instructor_id: number | null
  instructor_name: string | null
  starts_at: string | null
  ends_at: string | null
  status: string | null
  final_level: string | null
  oral_score: number | null
  notes: string | null
  meeting_link: string | null
  calendar_event_id: number | null
}

/** Returned by GET /placement-test/status */
export type PlacementStatusResponse = {
  status: PlacementStatus
  attempt: PlacementAttempt | null
  /** True when written test is submitted and oral has not yet been booked */
  can_book_oral: boolean
  /** False when the student has already submitted the written test (cannot start again) */
  can_take_written_test: boolean
  /** Oral interview booking object if one exists */
  oral_booking: OralBooking | null
  /** True when the student may start the course (final level approved) */
  can_start_learning: boolean
}

/** Returned by POST /placement-test/start */
export type StartPlacementResult = {
  test: PlacementTest | null
  attempt: PlacementAttempt | null
  questions: PlacementQuestion[]
}

/** Returned by POST /placement-test/submit */
export type PlacementSubmitResult = {
  score: number
  total: number
  percentage: number
  estimated_level: string
  level_label: string
  attempt: PlacementAttempt | null
}

export type OralSlot = {
  id: number
  instructor_id: number
  instructor_name: string
  date: string
  time: string
  end_time: string
  duration_minutes: number
  is_available: boolean
  meeting_link: string | null
}

export type WrittenAssessmentStats = {
  correct_answers: number | null
  wrong_answers: number | null
  skipped_answers: number | null
}

export type PlacementRowSummary = {
  overall_score: number | null
  recommended_level: string | null
  recommended_class: string | null
  recommended_track: string | null
  confidence_score: number | null
  assessment_status: string | null
  assignment_status: string | null
}

export type PlacementStudentRow = {
  attempt_id: number
  booking_id: number
  student_id: number
  student_name: string
  email: string
  written_score: number | null
  total_questions: number | null
  written_level: string | null
  oral_booking_at: string | null
  final_level: string | null
  oral_score: number | null
  status: PlacementStatus
  notes: string | null
  submitted_at: string | null
  percentage: number | null
  avatar_url: string | null
  oral_assessment_full: OralAssessmentFull | null
  /** Seconds spent on written test, when backend provides it */
  time_spent_seconds: number | null
  /** Pre-computed answer breakdown from API or written_assessment block */
  written_stats: WrittenAssessmentStats | null
  /** Server-side summary block when available */
  summary: PlacementRowSummary | null
  is_assigned: boolean
}

/* ══════════════════════════════════════════════════════════════════
   LEVEL MAPPING  (1–70 scale)
══════════════════════════════════════════════════════════════════ */

export type PlacementLevel = {
  level: string
  label: string
  description: string
  range: [number, number]
}

export const PLACEMENT_LEVELS: PlacementLevel[] = [
  { level: 'beginner',           label: 'مبتدئ',         description: 'أساسيات اللغة والمفردات الأولى',       range: [1,  6]  },
  { level: 'elementary',         label: 'ابتدائي',        description: 'فهم الجمل البسيطة والتواصل الأساسي',  range: [7,  20] },
  { level: 'pre_intermediate',   label: 'ما قبل المتوسط', description: 'التعبير عن أفكار بسيطة بثقة',         range: [21, 34] },
  { level: 'intermediate',       label: 'متوسط',          description: 'التعامل مع مواقف يومية بطلاقة',       range: [35, 48] },
  { level: 'upper_intermediate', label: 'فوق المتوسط',    description: 'إتقان معظم الأنماط اللغوية',          range: [49, 62] },
  { level: 'advanced',           label: 'متقدم',          description: 'إتقان اللغة بطلاقة واتساع أفق',       range: [63, 70] },
]

export function getLevelFromScore(score: number, total = 70): PlacementLevel {
  const scaled = total !== 70 ? Math.round((score / total) * 70) : score
  for (const lvl of PLACEMENT_LEVELS) {
    if (scaled >= lvl.range[0] && scaled <= lvl.range[1]) return lvl
  }
  return scaled < 1 ? PLACEMENT_LEVELS[0] : PLACEMENT_LEVELS[PLACEMENT_LEVELS.length - 1]
}

/* ══════════════════════════════════════════════════════════════════
   INTERNAL NORMALIZATION
══════════════════════════════════════════════════════════════════ */

/** Direct unwrap: handles both { success, data: {...} } and already-unwrapped payloads */
function extractPayload(responseData: unknown): Record<string, unknown> {
  if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) return {}
  const raw = responseData as Record<string, unknown>
  if (raw.data != null && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return raw.data as Record<string, unknown>
  }
  return raw
}

/**
 * Exhaustively searches all known backend response shapes for a questions array.
 *
 * Paths tried (in priority order):
 *   data.test.questions          ← confirmed Laravel shape
 *   data.questions
 *   test.questions
 *   questions
 *   data.data.test.questions     ← double-wrapped
 *   data.data.questions
 */
function extractQuestionsFromAny(data: unknown): unknown[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []

  function dig(obj: unknown, ...keys: string[]): unknown[] | null {
    let cur: unknown = obj
    for (const k of keys) {
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return null
      cur = (cur as Record<string, unknown>)[k]
    }
    if (Array.isArray(cur) && cur.length > 0) return cur as unknown[]
    // Handle paginated shape { data: [...], total: N }
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
      const inner = (cur as Record<string, unknown>).data
      if (Array.isArray(inner) && inner.length > 0) return inner as unknown[]
    }
    return null
  }

  return (
    dig(data, 'data', 'test', 'questions') ??
    dig(data, 'data', 'questions') ??
    dig(data, 'test', 'questions') ??
    dig(data, 'questions') ??
    dig(data, 'data', 'data', 'test', 'questions') ??
    dig(data, 'data', 'data', 'questions') ??
    []
  )
}

function coalesceStatus(raw: unknown): PlacementStatus {
  const s = String(raw ?? 'not_started').toLowerCase().trim()
  // Map backend-specific aliases to canonical statuses
  const ALIAS: Record<string, PlacementStatus> = {
    waiting_oral:       'written_submitted',
    oral_pending:       'written_submitted',
    pending_oral:       'written_submitted',
    pending_interview:  'written_submitted',
    test_completed:     'written_submitted',
    written_completed:  'written_submitted',
    booked:             'oral_booked',
  }
  if (s in ALIAS) return ALIAS[s]
  const allowed: PlacementStatus[] = [
    'not_started', 'placement_required', 'in_progress',
    'written_submitted', 'oral_booked', 'oral_completed', 'completed',
  ]
  return (allowed.includes(s as PlacementStatus) ? s : 'not_started') as PlacementStatus
}

function normalizeAttempt(o: Record<string, unknown>): PlacementAttempt {
  // Score — accept written_score or plain score
  const writtenScore =
    o.written_score != null ? Number(o.written_score) :
    o.score         != null ? Number(o.score)         : null

  // Total — accept total_questions or plain total
  const totalQuestions =
    o.total_questions != null ? Number(o.total_questions) :
    o.total           != null ? Number(o.total)           : null

  // Level — accept written_level, estimated_level, or plain level
  const levelStr =
    o.written_level   != null ? String(o.written_level)   :
    o.estimated_level != null ? String(o.estimated_level) :
    o.level           != null ? String(o.level)           : null

  // Percentage — compute or accept from backend
  const percentage =
    writtenScore != null && totalQuestions != null && totalQuestions > 0
      ? Math.round((writtenScore / totalQuestions) * 100)
      : o.percentage != null ? Number(o.percentage) : null

  // Submission timestamp — prefer dedicated field, fallback to created_at
  const submittedAt =
    o.submitted_at  != null ? String(o.submitted_at)  :
    o.completed_at  != null ? String(o.completed_at)  :
    o.created_at    != null ? String(o.created_at)    : null

  return {
    id:               Number(o.id ?? 0),
    course_id:        Number(o.course_id ?? 0),
    status:           coalesceStatus(o.status ?? o.placement_status),
    written_score:    writtenScore,
    total_questions:  totalQuestions,
    written_level:    levelStr,
    estimated_level:  levelStr,
    percentage,
    submitted_at:     submittedAt,
    oral_booking_id:  o.oral_booking_id  != null ? Number(o.oral_booking_id)  : null,
    oral_booking_at:  o.oral_booking_at  != null ? String(o.oral_booking_at)  : null,
    final_level:      o.final_level      != null ? String(o.final_level)      : null,
    oral_score:       o.oral_score       != null ? Number(o.oral_score)       : null,
    instructor_notes: o.instructor_notes != null ? String(o.instructor_notes) : null,
    can_start_course: !!o.can_start_course,
    created_at:       o.created_at != null ? String(o.created_at) : null,
  }
}

function normalizeOralBooking(o: Record<string, unknown>): OralBooking {
  const instructorName =
    o.instructor_name != null ? String(o.instructor_name) :
    o.instructor != null && typeof o.instructor === 'object'
      ? String((o.instructor as Record<string, unknown>).name ?? '') || null
      : null

  // starts_at: accept ISO string or reconstruct from date + time fields
  let startsAt = o.starts_at != null ? String(o.starts_at) : null
  if (!startsAt && o.date != null && o.time != null) {
    startsAt = `${String(o.date)}T${String(o.time)}`
  }
  const endsAt =
    o.ends_at != null ? String(o.ends_at) :
    o.ends    != null ? String(o.ends)    : null

  return {
    id:              o.id            != null ? Number(o.id)            : null,
    instructor_id:   o.instructor_id != null ? Number(o.instructor_id) : null,
    instructor_name: instructorName  ?? null,
    starts_at:       startsAt,
    ends_at:         endsAt,
    status:          o.status        != null ? String(o.status)        : null,
    final_level:     o.final_level   != null ? String(o.final_level)   : null,
    oral_score:      o.oral_score    != null ? Number(o.oral_score)    : null,
    notes:           o.notes         != null ? String(o.notes)         : null,
    meeting_link:    o.meeting_link  != null ? String(o.meeting_link)  : null,
    calendar_event_id: o.calendar_event_id != null ? Number(o.calendar_event_id) : null,
  }
}

/** Normalize a single question — handles flat DB format and nested options array */
function normalizeQuestion(raw: unknown): PlacementQuestion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const id = Number(o.id ?? o.question_id ?? 0)
  if (!Number.isFinite(id) || id < 0) return null

  const text = String(
    o.text ?? o.question_text ?? o.question ?? o.body ?? o.content ??
    o.prompt ?? o.statement ?? o.title ?? '',
  ).trim()
  if (!text) return null

  // ── Options: array format ────────────────────────────────────────
  const optArray = o.options ?? o.choices ?? o.answers ?? o.variants
  if (Array.isArray(optArray) && optArray.length > 0) {
    const firstItem = optArray[0]
    if (typeof firstItem === 'string') {
      const opts = (optArray as string[])
        .map((v, i) => ({ key: 'ABCDE'[i] ?? String(i + 1), text: String(v).trim() }))
        .filter((x) => x.text !== '')
      if (opts.length > 0) return { id, text, options: opts }
    } else {
      const opts = (optArray as unknown[])
        .map((opt, idx) => {
          if (!opt || typeof opt !== 'object') return null
          const oo = opt as Record<string, unknown>
          // Key: explicit field first, then positional letter — never leave empty
          const rawKey = String(oo.key ?? oo.letter ?? oo.option ?? '').toUpperCase()
          const key = rawKey || 'ABCDE'[idx] || String(idx + 1)
          // Text: try every known field name including choice, answer
          const t = String(
            oo.text ?? oo.label ?? oo.content ?? oo.choice ??
            oo.answer ?? oo.option_text ?? oo.value ?? '',
          ).trim()
          return t ? { key, text: t } : null
        })
        .filter((x): x is { key: string; text: string } => x !== null)
      if (opts.length > 0) return { id, text, options: opts }
    }
  }

  // ── Options: flat fields option_a / option_b / option_c / option_d ──
  const opts: Array<{ key: string; text: string }> = []
  for (const [letter, dbKey] of [
    ['A', 'option_a'], ['B', 'option_b'], ['C', 'option_c'], ['D', 'option_d'],
  ] as [string, string][]) {
    const val =
      o[dbKey] ??
      o[`choice_${letter.toLowerCase()}`] ??
      o[`answer_${letter.toLowerCase()}`] ??
      o[letter.toLowerCase()]
    if (val != null && String(val).trim() !== '') {
      opts.push({ key: letter, text: String(val).trim() })
    }
  }
  if (opts.length > 0) return { id, text, options: opts }

  if (import.meta.env.DEV) {
    console.warn('[EMC normalizeQuestion] could not extract options from:', o)
  }
  return null
}

function normalizeTestPayload(o: Record<string, unknown>): PlacementTest {
  let rawQuestions: unknown[] = []
  if (Array.isArray(o.questions)) rawQuestions = o.questions
  else if (o.test && typeof o.test === 'object' && !Array.isArray(o.test)) {
    const t = o.test as Record<string, unknown>
    if (Array.isArray(t.questions)) rawQuestions = t.questions
  }

  const questions = rawQuestions.map(normalizeQuestion).filter((q): q is PlacementQuestion => q !== null)

  return {
    id:               Number(o.id ?? 0),
    course_id:        Number(o.course_id ?? 0),
    title:            String(o.title ?? 'اختبار تحديد المستوى'),
    total_questions:  questions.length > 0 ? questions.length : Number(o.total_questions ?? 0),
    duration_minutes: Number(o.duration_minutes ?? o.time_limit ?? 30),
    questions,
    instructions:     o.instructions != null ? String(o.instructions) : null,
  }
}

/* ══════════════════════════════════════════════════════════════════
   STUDENT API
══════════════════════════════════════════════════════════════════ */

/**
 * GET /student/courses/{courseId}/placement-test/status
 *
 * Tries all known response shapes:
 *   { data: { status, attempt } }        ← standard Laravel
 *   { data: { attempt: { status } } }    ← status inside attempt
 *   { data: { result } }                 ← attempt under "result" key
 *   { data: { data: { ... } } }          ← double-wrapped
 */
export async function fetchPlacementStatus(courseId: string | number): Promise<PlacementStatusResponse> {
  try {
    const res = await apiClient.get<unknown>(`/student/courses/${courseId}/placement-test/status`, silent)

    if (import.meta.env.DEV) {
      console.log('[EMC placement/status] raw:', res.data)
    }

    const payload = extractPayload(res.data)

    // Also handle double-wrapped data
    const inner: Record<string, unknown> =
      payload.data != null && typeof payload.data === 'object' && !Array.isArray(payload.data)
        ? (payload.data as Record<string, unknown>)
        : payload

    // Some backends nest all placement fields under a placement_progress key
    const pp: Record<string, unknown> =
      payload.placement_progress != null && typeof payload.placement_progress === 'object' && !Array.isArray(payload.placement_progress)
        ? payload.placement_progress as Record<string, unknown>
        : inner.placement_progress != null && typeof inner.placement_progress === 'object' && !Array.isArray(inner.placement_progress)
          ? inner.placement_progress as Record<string, unknown>
          : {}

    // Find the raw attempt object — check explicit attempt/result keys first
    let rawAttempt: Record<string, unknown> | null = null
    for (const candidate of [
      payload.attempt, payload.result,
      inner.attempt,   inner.result,
      pp.attempt,      pp.result,
    ]) {
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        rawAttempt = candidate as Record<string, unknown>
        break
      }
    }

    // Fallback: written_test holds the written-step result.
    // Its status "completed" means the step is done = placement "written_submitted".
    // Remap before normalizing so downstream placement status logic is correct.
    if (!rawAttempt) {
      for (const candidate of [payload.written_test, inner.written_test, pp.written_test]) {
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
          const wt = candidate as Record<string, unknown>
          rawAttempt = wt.status === 'completed' ? { ...wt, status: 'written_submitted' } : wt
          break
        }
      }
    }

    // Fallback: payload itself looks like an attempt (has id + written_score field)
    if (!rawAttempt && payload.id != null && payload.written_score !== undefined) {
      rawAttempt = payload
    }

    // Resolve status: prefer attempt's own status when top-level says "not_started"
    // but an attempt object exists (backend inconsistency guard)
    const topLevelStatus = coalesceStatus(
      payload.status ??
      payload.placement_status ??
      inner.status ??
      inner.placement_status ??
      pp.status ??
      pp.placement_status ??
      (typeof res.data === 'string' ? res.data : undefined),
    )
    const attemptStatus = rawAttempt?.status ? coalesceStatus(rawAttempt.status) : null
    const TERMINAL: PlacementStatus[] = ['written_submitted', 'oral_booked', 'oral_completed', 'completed']
    // If top level says not_started/placement_required but attempt is in a terminal state, trust the attempt
    const status: PlacementStatus =
      (topLevelStatus === 'not_started' || topLevelStatus === 'placement_required') &&
      attemptStatus && TERMINAL.includes(attemptStatus)
        ? attemptStatus
        : topLevelStatus

    const attempt = rawAttempt ? normalizeAttempt(rawAttempt) : null

    // can_book_oral: explicit backend flag OR derive from status
    const canBookOral = !!(
      payload.can_book_oral ?? inner.can_book_oral ?? pp.can_book_oral ??
      (attempt?.status === 'written_submitted')
    )

    // can_take_written_test: explicit backend flag OR derive (false if attempt exists in terminal state)
    const canTakeWrittenTest = !!(
      payload.can_take_written_test ?? inner.can_take_written_test ?? pp.can_take_written_test ??
      !(attempt != null && (TERMINAL.includes(attempt.status) || attempt.status === 'in_progress'))
    )

    // Extract oral_booking from all known response paths
    let rawOralBooking: Record<string, unknown> | null = null
    for (const candidate of [
      payload.oral_booking,
      payload.oral_assessment,
      inner.oral_booking,
      inner.oral_assessment,
      pp.oral_booking,
      pp.oral_assessment,
      rawAttempt?.oral_booking,
    ]) {
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        rawOralBooking = candidate as Record<string, unknown>
        break
      }
    }
    // Fallback: reconstruct minimal oral_booking from attempt scalar fields if a booking exists
    if (!rawOralBooking && rawAttempt) {
      const bookingId = rawAttempt.oral_booking_id
      const bookingAt = rawAttempt.oral_booking_at
      if (bookingId != null || bookingAt != null) {
        rawOralBooking = {
          id:              bookingId,
          starts_at:       bookingAt,
          instructor_name: rawAttempt.instructor_name ?? null,
          final_level:     rawAttempt.final_level ?? null,
          oral_score:      rawAttempt.oral_score ?? null,
          status:          rawAttempt.status ?? null,
        }
      }
    }
    const oralBooking: OralBooking | null = rawOralBooking ? normalizeOralBooking(rawOralBooking) : null

    // can_start_learning: explicit flag or derive from completed status / can_start_course
    const canStartLearning = !!(
      payload.can_start_learning ?? inner.can_start_learning ?? pp.can_start_learning ??
      rawAttempt?.can_start_course ??
      (attempt?.status === 'completed')
    )

    if (import.meta.env.DEV) {
      console.log('[EMC placement/status] normalized:', { status, attempt, oralBooking, canBookOral, canTakeWrittenTest, canStartLearning })
    }

    return { status, attempt, can_book_oral: canBookOral, can_take_written_test: canTakeWrittenTest, oral_booking: oralBooking, can_start_learning: canStartLearning }
  } catch {
    return { status: 'not_started', attempt: null, can_book_oral: false, can_take_written_test: true, oral_booking: null, can_start_learning: false }
  }
}

/**
 * POST /student/courses/{courseId}/placement-test/start
 * Backend returns: { success, data: { test: { questions: [...] }, attempt: {...} } }
 */
export async function startPlacementTest(courseId: string | number): Promise<StartPlacementResult> {
  const res = await apiClient.post<unknown>(`/student/courses/${courseId}/placement-test/start`, {}, silent)

  if (import.meta.env.DEV) {
    console.log('placement start response', res.data)
  }

  const rawQuestions = extractQuestionsFromAny(res.data)
  const questions = rawQuestions
    .map(normalizeQuestion)
    .filter((q): q is PlacementQuestion => q !== null)

  if (import.meta.env.DEV) {
    console.log('normalized questions', questions)
    console.log('[placement/start] raw question sample:', rawQuestions[0] ?? 'none')
    console.log('[placement/start] normalized count:', questions.length, '/', rawQuestions.length)
  }

  const payload = extractPayload(res.data)
  const testRaw =
    payload.test != null && typeof payload.test === 'object' && !Array.isArray(payload.test)
      ? (payload.test as Record<string, unknown>)
      : payload

  const testObj: Record<string, unknown> = { ...testRaw, questions: rawQuestions }
  const test = normalizeTestPayload(testObj)

  const attemptRaw =
    payload.attempt != null && typeof payload.attempt === 'object' && !Array.isArray(payload.attempt)
      ? (payload.attempt as Record<string, unknown>)
      : null
  const attempt = attemptRaw ? normalizeAttempt(attemptRaw) : null

  return { test, attempt, questions }
}

/**
 * GET /student/courses/{courseId}/placement-test
 * Only called when status is confirmed in_progress.
 */
export async function fetchPlacementTest(courseId: string | number): Promise<PlacementTest> {
  const res = await apiClient.get<unknown>(`/student/courses/${courseId}/placement-test`, silent)

  if (import.meta.env.DEV) {
    console.log('[EMC placement/test] raw:', res.data)
  }

  const rawQuestions = extractQuestionsFromAny(res.data)
  const payload = extractPayload(res.data)

  const testRaw =
    payload.test != null && typeof payload.test === 'object' && !Array.isArray(payload.test)
      ? (payload.test as Record<string, unknown>)
      : payload

  const testObj: Record<string, unknown> = { ...testRaw, questions: rawQuestions }

  if (import.meta.env.DEV) {
    console.log('[EMC placement/test] raw question sample:', rawQuestions[0] ?? 'none')
  }

  return normalizeTestPayload(testObj)
}

function normalizeSubmitResult(payload: Record<string, unknown>): PlacementSubmitResult {
  const resultObj =
    payload.result != null && typeof payload.result === 'object' && !Array.isArray(payload.result)
      ? (payload.result as Record<string, unknown>)
      : payload

  const score = Number(resultObj.score ?? resultObj.written_score ?? payload.score ?? 0)
  const total = Number(resultObj.total ?? resultObj.total_questions ?? payload.total_questions ?? 70)
  const pct = total > 0 ? Math.round((score / total) * 100) : Number(resultObj.percentage ?? 0)

  const levelKey = String(
    resultObj.estimated_level ?? resultObj.written_level ?? resultObj.level ??
    payload.estimated_level ?? payload.written_level ?? 'beginner',
  )
  const levelDef = PLACEMENT_LEVELS.find((l) => l.level === levelKey) ?? getLevelFromScore(score, total)

  let attempt: PlacementAttempt | null = null
  if (payload.attempt != null && typeof payload.attempt === 'object' && !Array.isArray(payload.attempt)) {
    attempt = normalizeAttempt(payload.attempt as Record<string, unknown>)
  } else if (payload.id != null) {
    attempt = normalizeAttempt(payload)
  }

  return { score, total, percentage: pct, estimated_level: levelKey, level_label: levelDef.label, attempt }
}

/**
 * POST /student/courses/{courseId}/placement-test/submit
 * Payload: { answers: { "1": "a", "2": "b" } }
 */
export async function submitPlacementTest(
  courseId: string | number,
  answers: Record<number, string>,
): Promise<PlacementSubmitResult> {
  const answersObj: Record<string, string> = {}
  Object.entries(answers).forEach(([qId, opt]) => { answersObj[qId] = opt.toLowerCase() })

  if (import.meta.env.DEV) {
    console.log('[EMC placement/submit] payload:', { answers: answersObj })
  }

  const res = await apiClient.post<unknown>(
    `/student/courses/${courseId}/placement-test/submit`,
    { answers: answersObj },
    silent,
  )
  const payload = extractPayload(res.data)

  if (import.meta.env.DEV) {
    console.log('[EMC placement/submit] response payload:', payload)
  }

  return normalizeSubmitResult(payload)
}

export type ExamViolationType =
  | 'copy'
  | 'paste'
  | 'cut'
  | 'right_click'
  | 'keyboard_shortcut'
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'window_blur'
  | 'selection_attempt'

/**
 * Fire-and-forget exam-integrity violation log. Never throws — a failed log
 * call must not interrupt or visibly disrupt the student's exam.
 */
export async function logExamViolation(
  courseId: string | number,
  violationType: ExamViolationType,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await apiClient.post(
      `/student/courses/${courseId}/placement-test/violations`,
      { violation_type: violationType, meta },
      silent,
    )
  } catch {
    // Intentionally swallowed — see docblock above.
  }
}

/**
 * Normalise a raw slot from any backend shape.
 * Supports starts_at/start_time/start/date + ends_at/end_time/end for date/time extraction.
 */
function normalizeOralSlot(r: unknown): OralSlot {
  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    return { id: 0, instructor_id: 0, instructor_name: '', date: '', time: '', end_time: '', duration_minutes: 30, is_available: false, meeting_link: null }
  }
  const o = r as Record<string, unknown>

  const startsAtRaw = o.starts_at ?? o.start_time ?? o.start_at ?? o.date_time

  // Date (YYYY-MM-DD)
  let date: string
  const rawDate = o.date != null ? String(o.date) : null
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    date = rawDate
  } else if (startsAtRaw != null) {
    const d = new Date(String(startsAtRaw))
    date = !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : (rawDate ?? '')
  } else {
    date = rawDate ?? ''
  }

  // Time (HH:MM)
  let time: string
  if (o.time != null) {
    time = String(o.time).slice(0, 5)
  } else if (startsAtRaw != null) {
    const d = new Date(String(startsAtRaw))
    time = !Number.isNaN(d.getTime())
      ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : ''
  } else {
    time = ''
  }

  // Duration from ends_at if not directly provided
  const endsAtRaw = o.ends_at ?? o.end_time ?? o.end_at
  let durationMinutes = o.duration_minutes != null ? Number(o.duration_minutes) : 30
  if (endsAtRaw != null && startsAtRaw != null) {
    const start = new Date(String(startsAtRaw))
    const end   = new Date(String(endsAtRaw))
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diff = Math.round((end.getTime() - start.getTime()) / 60000)
      if (diff > 0) durationMinutes = diff
    }
  }

  // End time (HH:MM), from ends_at directly or derived from start + duration
  let endTime = ''
  if (endsAtRaw != null) {
    const d = new Date(String(endsAtRaw))
    if (!Number.isNaN(d.getTime())) {
      endTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
  }
  if (!endTime && time) {
    const [h, m] = time.split(':').map(Number)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      const total = h * 60 + m + durationMinutes
      endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }
  }

  const instructorName =
    o.instructor_name != null ? String(o.instructor_name) :
    o.instructor != null && typeof o.instructor === 'object'
      ? String((o.instructor as Record<string, unknown>).name ?? '') || ''
      : ''

  return {
    id:               Number(o.id ?? 0),
    instructor_id:    Number(o.instructor_id ?? 0),
    instructor_name:  instructorName,
    date,
    time,
    end_time:         endTime,
    duration_minutes: durationMinutes,
    is_available:     o.is_available !== false,
    meeting_link:     o.meeting_link != null ? String(o.meeting_link) : null,
  }
}

/**
 * GET /student/courses/{courseId}/oral-assessment/slots
 *
 * Normalises from:
 *   response.data.slots
 *   response.data.data
 *   response.data.data.slots
 *   response.data (direct array)
 */
export async function fetchOralSlots(courseId: string | number): Promise<OralSlot[]> {
  const res = await apiClient.get<unknown>(
    `/student/courses/${courseId}/oral-assessment/slots`,
    silent,
  )

  if (import.meta.env.DEV) {
    console.log('oral slots response', res.data)
  }

  const payload = extractPayload(res.data)

  // Try common key names at the unwrapped level
  for (const key of ['slots', 'data', 'items']) {
    if (Array.isArray(payload[key])) return (payload[key] as unknown[]).map(normalizeOralSlot)
  }

  // Double-wrapped: payload still has a .data object
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    const inner = payload.data as Record<string, unknown>
    for (const key of ['slots', 'data', 'items']) {
      if (Array.isArray(inner[key])) return (inner[key] as unknown[]).map(normalizeOralSlot)
    }
  }

  // Raw array at root
  if (Array.isArray(res.data)) return (res.data as unknown[]).map(normalizeOralSlot)

  return []
}

/**
 * POST /student/courses/{courseId}/oral-assessment/book
 * Includes placement_test_attempt_id when available.
 */
export async function bookOralSlot(
  courseId: string | number,
  slotId: number,
  attemptId?: number | null,
): Promise<PlacementAttempt> {
  const body: Record<string, unknown> = { slot_id: slotId }
  if (attemptId != null) body.placement_test_attempt_id = attemptId

  if (import.meta.env.DEV) {
    console.log('booking payload', body)
  }

  const res = await apiClient.post<unknown>(
    `/student/courses/${courseId}/oral-assessment/book`,
    body,
    silent,
  )

  if (import.meta.env.DEV) {
    console.log('booking response', res.data)
  }

  return normalizeAttempt(extractPayload(res.data))
}

/* ══════════════════════════════════════════════════════════════════
   INSTRUCTOR API
══════════════════════════════════════════════════════════════════ */

// Maps backend-specific statuses not in PlacementStatus union
const INSTRUCTOR_STATUS_MAP: Record<string, string> = {
  waiting_oral:  'written_submitted',
  oral_pending:  'written_submitted',
  pending_oral:  'written_submitted',
}

function normalizeStudentRow(r: Record<string, unknown>): PlacementStudentRow {
  // Canonical nested shape from InstructorStudentSummaryResource (Ticket 2),
  // read through the shared compatibility adapter. Always checked first;
  // legacy flat/nested fallbacks below remain only as a defensive fallback
  // when the canonical fields are absent.
  const canonicalStudent = getCanonicalStudentIdentity(r)
  const canonicalPlacement = getCanonicalPlacement(r)
  const canonicalProgress = getCanonicalProgress(r)

  // Support nested placement_attempt (legacy) AND flat fields AND placement_progress nesting
  const att: Record<string, unknown> =
    r.placement_attempt != null && typeof r.placement_attempt === 'object' && !Array.isArray(r.placement_attempt)
      ? (r.placement_attempt as Record<string, unknown>)
      : r

  // Some controllers nest score/level under placement_progress.written_test
  const ppWt: Record<string, unknown> = (() => {
    const pp = r.placement_progress
    if (!pp || typeof pp !== 'object' || Array.isArray(pp)) return {}
    const wt = (pp as Record<string, unknown>).written_test
    return (wt && typeof wt === 'object' && !Array.isArray(wt)) ? (wt as Record<string, unknown>) : {}
  })()
  const ppOa: Record<string, unknown> = (() => {
    const pp = r.placement_progress
    if (!pp || typeof pp !== 'object' || Array.isArray(pp)) return {}
    const oa = (pp as Record<string, unknown>).oral_assessment
    return (oa && typeof oa === 'object' && !Array.isArray(oa)) ? (oa as Record<string, unknown>) : {}
  })()
  const ppStatus: string | null = (() => {
    const pp = r.placement_progress
    if (!pp || typeof pp !== 'object' || Array.isArray(pp)) return null
    const s = (pp as Record<string, unknown>).status
    return s != null ? String(s) : null
  })()

  const score = canonicalPlacement.written_score ??
    (att.score          != null ? Number(att.score)          :
    att.written_score  != null ? Number(att.written_score)  :
    r.written_score    != null ? Number(r.written_score)    :
    ppWt.score         != null ? Number(ppWt.score)         : null)

  const total = canonicalPlacement.written_total ??
    (att.total_questions  != null ? Number(att.total_questions)  :
    r.total_questions    != null ? Number(r.total_questions)    :
    ppWt.total_questions != null ? Number(ppWt.total_questions) : null)

  const pct = canonicalPlacement.written_percentage ??
    (score != null && total != null && total > 0
      ? Math.round((score / total) * 100)
      : (att.percentage ?? r.percentage ?? ppWt.percentage) != null
        ? Number(att.percentage ?? r.percentage ?? ppWt.percentage)
        : null)

  const levelStr = String(
    canonicalPlacement.written_level ??
    att.estimated_level ?? att.written_level ?? att.level ??
    r.written_level ?? r.estimated_level ??
    ppWt.estimated_level ?? '',
  ) || null

  const submittedAt =
    String(att.submitted_at ?? att.completed_at ?? r.submitted_at ?? r.completed_at ?? '') || null

  // Extract oral booking: nested object, then flat field, then placement_progress.oral_assessment
  const oralObj: Record<string, unknown> | null =
    r.oral_booking != null && typeof r.oral_booking === 'object' && !Array.isArray(r.oral_booking)
      ? (r.oral_booking as Record<string, unknown>)
      : null
  const oralBookingAt =
    oralObj?.starts_at != null     ? String(oralObj.starts_at)     :
    oralObj?.booking_at != null    ? String(oralObj.booking_at)     :
    r.oral_booking_at   != null    ? String(r.oral_booking_at)      :
    ppOa.starts_at      != null    ? String(ppOa.starts_at)         : null

  // Status: prefer explicit placement_status > placement_progress.status > legacy r.status
  const rawStatus = String(
    r.placement_status ?? ppStatus ?? r.status ?? att.status ?? 'not_started'
  )
  const mappedStatus = INSTRUCTOR_STATUS_MAP[rawStatus] ?? rawStatus

  if (import.meta.env.DEV) {
    console.log('[normalizeStudentRow] raw:', r, '→ score:', score, 'level:', levelStr, 'status:', mappedStatus)
  }

  const writtenBlock = (() => {
    const wa = r.written_assessment
    if (wa && typeof wa === 'object' && !Array.isArray(wa)) return wa as Record<string, unknown>
    const stats = r.statistics
    if (stats && typeof stats === 'object' && !Array.isArray(stats)) return stats as Record<string, unknown>
    return ppWt
  })()

  const timeSpent =
    writtenBlock.time_spent_seconds != null ? Number(writtenBlock.time_spent_seconds) :
    writtenBlock.time_spent          != null ? Number(writtenBlock.time_spent)          :
    att.time_spent_seconds           != null ? Number(att.time_spent_seconds)           :
    att.time_spent                   != null ? Number(att.time_spent)                   :
    ppWt.time_spent_seconds          != null ? Number(ppWt.time_spent_seconds)          :
    ppWt.time_spent                  != null ? Number(ppWt.time_spent)                  : null

  const writtenStats: WrittenAssessmentStats | null = (() => {
    const c = writtenBlock.correct_answers ?? writtenBlock.correct ?? r.correct_answers
    const w = writtenBlock.wrong_answers   ?? writtenBlock.wrong   ?? r.wrong_answers
    const s = writtenBlock.skipped_answers ?? writtenBlock.skipped ?? r.skipped_answers
    if (c == null && w == null && s == null) return null
    return {
      correct_answers: c != null ? Number(c) : null,
      wrong_answers:   w != null ? Number(w) : null,
      skipped_answers: s != null ? Number(s) : null,
    }
  })()

  const summaryRaw = r.summary
  const summary: PlacementRowSummary | null =
    summaryRaw && typeof summaryRaw === 'object' && !Array.isArray(summaryRaw)
      ? {
          overall_score:      (summaryRaw as Record<string, unknown>).overall_score      != null ? Number((summaryRaw as Record<string, unknown>).overall_score)      : null,
          recommended_level:  (summaryRaw as Record<string, unknown>).recommended_level  != null ? String((summaryRaw as Record<string, unknown>).recommended_level)  : null,
          recommended_class:  (summaryRaw as Record<string, unknown>).recommended_class  != null ? String((summaryRaw as Record<string, unknown>).recommended_class)  : null,
          recommended_track:  (summaryRaw as Record<string, unknown>).recommended_track  != null ? String((summaryRaw as Record<string, unknown>).recommended_track)  : null,
          confidence_score:   (summaryRaw as Record<string, unknown>).confidence_score   != null ? Number((summaryRaw as Record<string, unknown>).confidence_score)   : null,
          assessment_status:  (summaryRaw as Record<string, unknown>).assessment_status  != null ? String((summaryRaw as Record<string, unknown>).assessment_status)  : null,
          assignment_status:  (summaryRaw as Record<string, unknown>).assignment_status  != null ? String((summaryRaw as Record<string, unknown>).assignment_status)  : null,
        }
      : null

  const isAssigned = !!(
    canonicalProgress.is_assigned ?? r.is_assigned ?? r.class_assigned ??
    (summaryRaw && typeof summaryRaw === 'object' && (summaryRaw as Record<string, unknown>).assignment_status === 'assigned')
  )

  return {
    attempt_id:      Number(r.attempt_id ?? att.id ?? ppWt.id ?? 0),
    booking_id:      Number(r.booking_id ?? r.oral_assessment_booking_id ?? ppOa.id ?? 0),
    student_id:      Number(canonicalStudent.id ?? r.student_id ?? 0),
    student_name:    String(canonicalStudent.name ?? r.student_name ?? r.name ?? ''),
    email:           String(canonicalStudent.email ?? r.student_email ?? r.email ?? ''),
    written_score:   score,
    total_questions: total,
    written_level:   levelStr,
    oral_booking_at: oralBookingAt,
    final_level:     canonicalPlacement.final_level ?? canonicalPlacement.oral_level ??
                     (r.final_level    != null ? String(r.final_level)    :
                     ppOa.final_level != null ? String(ppOa.final_level) : null),
    oral_score:      canonicalPlacement.oral_score ??
                     (r.oral_score    != null ? Number(r.oral_score)    :
                     ppOa.oral_score  != null ? Number(ppOa.oral_score)  : null),
    status:          coalesceStatus(mappedStatus),
    notes:           r.instructor_notes != null ? String(r.instructor_notes) :
                     r.notes           != null ? String(r.notes)            : null,
    submitted_at:    submittedAt,
    percentage:      pct,
    avatar_url:      r.avatar_url != null ? String(r.avatar_url) :
                     r.profile_photo_url != null ? String(r.profile_photo_url) : null,
    oral_assessment_full: normalizeOralAssessmentFull(r.oral_assessment_full ?? r.oral_assessment),
    time_spent_seconds: timeSpent,
    written_stats: writtenStats,
    summary,
    is_assigned: isAssigned,
  }
}

export async function fetchInstructorPlacementStudents(
  courseId: string | number,
): Promise<PlacementStudentRow[]> {
  const res = await apiClient.get<unknown>(
    `/instructor/courses/${courseId}/placement-students`,
    silent,
  )
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['students', 'items', 'data']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  return raw.map((r) => normalizeStudentRow(r as Record<string, unknown>))
}

export type OralAssessmentCompleteResult = {
  id: number
  status: string
  oral_score: number | null
  final_level: string | null
  instructor_notes: string | null
}

export async function completeOralAssessment(
  bookingId: number,
  data: {
    final_level: string
    oral_score?: number
    instructor_notes?: string
    pronunciation_score?: number | null
    grammar_score?: number | null
    vocabulary_score?: number | null
    fluency_score?: number | null
    comprehension_score?: number | null
    confidence_score?: number | null
  },
): Promise<OralAssessmentCompleteResult> {
  const res = await apiClient.patch<unknown>(
    `/instructor/oral-assessments/${bookingId}/complete`,
    data,
  )
  const payload = extractPayload(res.data)
  const booking = (payload.data != null && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload) as Record<string, unknown>
  return {
    id:               Number(booking.id ?? bookingId),
    status:           String(booking.status ?? 'completed'),
    oral_score:       booking.oral_score  != null ? Number(booking.oral_score)  : null,
    final_level:      booking.final_level != null ? String(booking.final_level) : null,
    instructor_notes: booking.instructor_notes != null ? String(booking.instructor_notes) : null,
  }
}

/* ── Instructor Oral Assessments ─────────────────────────────────────────── */

export type OralRubric = {
  pronunciation_score: number | null
  grammar_score: number | null
  vocabulary_score: number | null
  fluency_score: number | null
  comprehension_score: number | null
  confidence_score: number | null
}

export type InstructorOralAssessment = {
  id: number
  attempt_id: number
  student_id: number
  student_name: string
  student_email: string
  course_id: number
  course_title: string
  written_score: number | null
  total_questions: number | null
  percentage: number | null
  estimated_level: string | null
  oral_booking_at: string | null
  oral_booking_ends_at: string | null
  status: PlacementStatus
  final_level: string | null
  oral_score: number | null
  notes: string | null
  instructor_notes: string | null
  avatar_url: string | null
} & OralRubric

function resolveCourseTitle(r: Record<string, unknown>): string {
  const ct = r.course_title
  if (typeof ct === 'string' && ct) return ct
  if (ct && typeof ct === 'object') {
    const o = ct as Record<string, unknown>
    return String(o.title ?? o.name ?? '') || ''
  }
  const c = r.course
  if (typeof c === 'string' && c) return c
  if (c && typeof c === 'object') {
    const o = c as Record<string, unknown>
    return String(o.title ?? o.name ?? '') || ''
  }
  return ''
}

function normalizeOralAssessment(r: Record<string, unknown>): InstructorOralAssessment {
  const score = r.written_score != null ? Number(r.written_score) :
                r.score         != null ? Number(r.score)         : null
  const total = r.total_questions != null ? Number(r.total_questions) : null
  const pct   = score != null && total != null && total > 0
    ? Math.round((score / total) * 100)
    : r.percentage != null ? Number(r.percentage) : null

  const oralBooking = r.oral_booking != null && typeof r.oral_booking === 'object'
    ? r.oral_booking as Record<string, unknown>
    : null

  return {
    id:                   Number(r.id ?? 0),
    attempt_id:           Number(r.attempt_id ?? r.id ?? 0),
    student_id:           Number(r.student_id ?? 0),
    student_name:         String(r.student_name ?? r.name ?? ''),
    student_email:        String(r.student_email ?? r.email ?? ''),
    course_id:            Number(r.course_id ?? 0),
    course_title:         resolveCourseTitle(r),
    written_score:        score,
    total_questions:      total,
    percentage:           pct,
    estimated_level:      r.estimated_level != null ? String(r.estimated_level) :
                          r.written_level   != null ? String(r.written_level)   : null,
    oral_booking_at:      oralBooking?.starts_at != null ? String(oralBooking.starts_at) :
                          r.oral_booking_at  != null ? String(r.oral_booking_at) :
                          r.starts_at        != null ? String(r.starts_at)       : null,
    oral_booking_ends_at: oralBooking?.ends_at  != null ? String(oralBooking.ends_at) :
                          r.oral_booking_ends_at != null ? String(r.oral_booking_ends_at) :
                          r.ends_at              != null ? String(r.ends_at)             : null,
    status:           coalesceStatus(r.placement_status ?? r.status),
    final_level:      r.final_level != null ? String(r.final_level) : null,
    oral_score:       r.oral_score  != null ? Number(r.oral_score)  : null,
    notes:            r.notes       != null ? String(r.notes)       : null,
    instructor_notes: r.instructor_notes != null ? String(r.instructor_notes) : null,
    avatar_url:       r.avatar_url != null ? String(r.avatar_url) :
                      r.profile_photo_url != null ? String(r.profile_photo_url) : null,
    pronunciation_score: r.pronunciation_score != null ? Number(r.pronunciation_score) : null,
    grammar_score:       r.grammar_score != null ? Number(r.grammar_score) : null,
    vocabulary_score:    r.vocabulary_score != null ? Number(r.vocabulary_score) : null,
    fluency_score:       r.fluency_score != null ? Number(r.fluency_score) : null,
    comprehension_score: r.comprehension_score != null ? Number(r.comprehension_score) : null,
    confidence_score:    r.confidence_score != null ? Number(r.confidence_score) : null,
  }
}

export async function fetchInstructorOralAssessments(): Promise<InstructorOralAssessment[]> {
  const res = await apiClient.get<unknown>('/instructor/oral-assessments', silent)
  if (import.meta.env.DEV) console.log('[oral-assessments] raw:', res.data)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'assessments', 'bookings']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  return raw.map((r) => normalizeOralAssessment(r as Record<string, unknown>))
}

/* ── Instructor Availability ─────────────────────────────────────────────── */

export type OralBookingStudent = {
  id: number
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  initials: string
}

export type OralBookingStatus =
  | 'booked'
  | 'confirmed'
  | 'reschedule_requested'
  | 'rescheduled'
  | 'cancelled_by_student'
  | 'cancelled_by_instructor'
  | 'completed'
  | 'no_show'

export type OralBookingDetail = {
  id: number
  reference: string
  status: OralBookingStatus
  is_active: boolean
  booked_at: string | null
  student: OralBookingStudent | null
  course: { id: number; title: string } | null
  placement: { score: number | null; total: number | null; percentage: number | null; estimated_level: string | null } | null
  oral_score: number | null
  final_level: string | null
  instructor_notes: string | null
  status_history?: Array<{ from_status: string | null; to_status: string; reason: string | null; changed_by: string | null; changed_at: string | null }> | null
  starts_at?: string
  ends_at?: string
  meeting_link?: string | null
}

export type InstructorAvailabilitySlot = {
  id: number
  course_id: number | null
  course_title: string | null
  starts_at: string
  ends_at: string
  is_available: boolean
  is_booked: boolean
  booking_status: string
  meeting_link: string | null
  notes: string | null
  booking: OralBookingDetail | null
}

function normalizeOralBookingDetail(b: Record<string, unknown> | null | undefined): OralBookingDetail | null {
  if (!b) return null
  const student = b.student && typeof b.student === 'object' ? b.student as Record<string, unknown> : null
  const course  = b.course  && typeof b.course  === 'object' ? b.course  as Record<string, unknown> : null
  const placement = b.placement && typeof b.placement === 'object' ? b.placement as Record<string, unknown> : null

  return {
    id:        Number(b.id ?? 0),
    reference: String(b.reference ?? ''),
    status:    String(b.status ?? 'booked') as OralBookingStatus,
    is_active: b.is_active !== false,
    booked_at: b.booked_at != null ? String(b.booked_at) : null,
    student: student ? {
      id:         Number(student.id ?? 0),
      name:       String(student.name ?? ''),
      email:      String(student.email ?? ''),
      phone:      student.phone != null ? String(student.phone) : null,
      avatar_url: student.avatar_url != null ? String(student.avatar_url) : null,
      initials:   String(student.initials ?? '?'),
    } : null,
    course: course ? { id: Number(course.id ?? 0), title: String(course.title ?? '') } : null,
    placement: placement ? {
      score:           placement.score != null ? Number(placement.score) : null,
      total:           placement.total != null ? Number(placement.total) : null,
      percentage:      placement.percentage != null ? Number(placement.percentage) : null,
      estimated_level: placement.estimated_level != null ? String(placement.estimated_level) : null,
    } : null,
    oral_score:        b.oral_score != null ? Number(b.oral_score) : null,
    final_level:       b.final_level != null ? String(b.final_level) : null,
    instructor_notes:  b.instructor_notes != null ? String(b.instructor_notes) : null,
    status_history: Array.isArray(b.status_history)
      ? (b.status_history as Record<string, unknown>[]).map((h) => ({
          from_status: h.from_status != null ? String(h.from_status) : null,
          to_status:   String(h.to_status ?? ''),
          reason:      h.reason != null ? String(h.reason) : null,
          changed_by:  h.changed_by != null ? String(h.changed_by) : null,
          changed_at:  h.changed_at != null ? String(h.changed_at) : null,
        }))
      : null,
    starts_at:    b.starts_at != null ? String(b.starts_at) : undefined,
    ends_at:      b.ends_at != null ? String(b.ends_at) : undefined,
    meeting_link: b.meeting_link != null ? String(b.meeting_link) : null,
  }
}

function normalizeAvailabilitySlot(r: Record<string, unknown>): InstructorAvailabilitySlot {
  return {
    id:          Number(r.id ?? 0),
    course_id:   r.course_id != null ? Number(r.course_id) : null,
    course_title: r.course_title != null ? String(r.course_title) :
                  r.course != null && typeof r.course === 'object'
                    ? String((r.course as Record<string, unknown>).title ?? '') || null
                    : null,
    starts_at:   String(r.starts_at ?? r.start ?? r.start_at ?? ''),
    ends_at:     String(r.ends_at   ?? r.end   ?? r.end_at   ?? ''),
    is_available: r.is_available !== false,
    is_booked:    r.is_booked === true,
    booking_status: String(r.booking_status ?? (r.is_available !== false ? 'available' : 'booked')),
    meeting_link: r.meeting_link != null ? String(r.meeting_link) : null,
    notes:        r.notes != null ? String(r.notes) : null,
    booking:      normalizeOralBookingDetail(r.booking as Record<string, unknown> | null | undefined),
  }
}

export async function fetchInstructorAvailability(): Promise<InstructorAvailabilitySlot[]> {
  const res = await apiClient.get<unknown>('/instructor/availability', silent)
  if (import.meta.env.DEV) console.log('[availability] raw:', res.data)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'slots', 'availability']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  return raw.map((r) => normalizeAvailabilitySlot(r as Record<string, unknown>))
}

export async function createInstructorAvailability(data: {
  course_id: number | null
  /**
   * Must be sent explicitly whenever `course_id` is null — the backend's
   * `course_id` validation branches on this flag (`required` unless it's
   * true). Omitting it while course_id is null causes a 422: the backend
   * has no other way to know "no course" means "apply to all courses"
   * rather than a missing required field.
   */
  apply_to_all_courses?: boolean
  date_from: string
  date_to: string
  weekdays: string[]
  start_time: string
  end_time: string
  slot_duration: number
  notes?: string | null
}): Promise<InstructorAvailabilitySlot[]> {
  const res = await apiClient.post<unknown>('/instructor/availability', data, silent)
  if (import.meta.env.DEV) console.log('[availability/create] raw:', res.data)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'slots', 'availability']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  if (!raw.length && payload.id != null) return [normalizeAvailabilitySlot(payload)]
  return raw.map((r) => normalizeAvailabilitySlot(r as Record<string, unknown>))
}

export async function deleteInstructorAvailability(id: number): Promise<void> {
  await apiClient.delete(`/instructor/availability/${id}`)
}

/* ── Oral-interview booking detail & post-booking actions ────────────────── */

export async function fetchOralBookingDetail(bookingId: number): Promise<OralBookingDetail | null> {
  const res = await apiClient.get<unknown>(`/instructor/oral-bookings/${bookingId}`, silent)
  const payload = extractPayload(res.data)
  return normalizeOralBookingDetail(payload as Record<string, unknown>)
}

export async function updateOralBookingStatus(
  bookingId: number,
  status: Exclude<OralBookingStatus, 'booked' | 'reschedule_requested' | 'rescheduled' | 'cancelled_by_student'>,
  reason?: string,
): Promise<OralBookingDetail | null> {
  const res = await apiClient.patch<unknown>(`/instructor/oral-bookings/${bookingId}/status`, { status, reason })
  const payload = extractPayload(res.data)
  return normalizeOralBookingDetail(payload as Record<string, unknown>)
}

export async function sendOralBookingMessage(
  bookingId: number,
  body: string,
  sendEmail = true,
): Promise<void> {
  await apiClient.post(`/instructor/oral-bookings/${bookingId}/message`, { body, send_email: sendEmail })
}

export async function rescheduleOralBooking(
  bookingId: number,
  newSlotId: number,
  note?: string,
): Promise<OralBookingDetail | null> {
  const res = await apiClient.post<unknown>(`/instructor/oral-bookings/${bookingId}/reschedule`, {
    new_slot_id: newSlotId, note,
  })
  const payload = extractPayload(res.data)
  return normalizeOralBookingDetail(payload as Record<string, unknown>)
}

export type MeetingProvider = 'custom_url' | 'google_meet' | 'zoom' | 'teams'

/** PATCH /instructor/oral-bookings/{booking}/meeting-link — add, edit, replace, or remove the meeting link. */
export async function updateOralBookingMeetingLink(
  bookingId: number,
  meetingLink: string | null,
  meetingProvider?: MeetingProvider,
): Promise<{ meeting_link: string | null; meeting_provider: string | null }> {
  const res = await apiClient.patch<unknown>(`/instructor/oral-bookings/${bookingId}/meeting-link`, {
    meeting_link: meetingLink,
    meeting_provider: meetingProvider,
  })
  const payload = extractPayload(res.data) as Record<string, unknown>
  return {
    meeting_link:     payload.meeting_link     != null ? String(payload.meeting_link)     : null,
    meeting_provider: payload.meeting_provider != null ? String(payload.meeting_provider) : null,
  }
}

/* ── Instructor Placement Tests (all courses) ────────────────────────────── */

export type InstructorPlacementTestRow = {
  attempt_id: number
  student_id: number
  student_name: string
  student_email: string
  course_id: number
  course_title: string
  written_score: number | null
  total_questions: number | null
  percentage: number | null
  written_level: string | null
  oral_score: number | null
  oral_booking_ends_at: string | null
  avatar_url: string | null
  status: PlacementStatus
  submitted_at: string | null
  oral_booking_at: string | null
  final_level: string | null
  is_assigned: boolean
  assigned_class: string | null
  assigned_at: string | null
  assigned_by: string | null
  /** 'automatic' | 'manual' | null — from ClassGroupStudent.assigned_by being null/set. */
  assignment_method: string | null
  /** Only populated for automatic assignments — the real ClassAssignmentService rules that matched. */
  assignment_reason_details: string[]
  recommended_class: string | null
  instructor_notes: string | null
  oral_rubric: { key: string; label: string; score: number | null; max: number }[]
  /** Full evaluator/interview/notes/history detail — null until an evaluation is recorded. */
  oral_assessment: OralAssessmentFull | null
}

function normalizePlacementTestRow(r: unknown): InstructorPlacementTestRow {
  const empty: InstructorPlacementTestRow = {
    attempt_id: 0, student_id: 0, student_name: '', student_email: '', course_id: 0, course_title: '',
    written_score: null, total_questions: null, percentage: null, written_level: null, oral_score: null,
    oral_booking_ends_at: null, avatar_url: null, status: 'not_started', submitted_at: null,
    oral_booking_at: null, final_level: null, is_assigned: false, assigned_class: null,
    assigned_at: null, assigned_by: null, assignment_method: null, assignment_reason_details: [],
    recommended_class: null, instructor_notes: null, oral_rubric: [], oral_assessment: null,
  }
  if (!r || typeof r !== 'object') return empty
  const o  = r as Record<string, unknown>
  const att = o.placement_attempt != null && typeof o.placement_attempt === 'object' && !Array.isArray(o.placement_attempt)
    ? (o.placement_attempt as Record<string, unknown>)
    : null
  const score = o.written_score != null ? Number(o.written_score) :
                att?.written_score != null ? Number(att.written_score) :
                att?.score != null ? Number(att.score) : null
  const total = o.total_questions != null ? Number(o.total_questions) :
                att?.total_questions != null ? Number(att.total_questions) : null
  const pct   = score != null && total != null && total > 0
    ? Math.round((score / total) * 100)
    : o.percentage != null ? Number(o.percentage) : null
  const oralObj = o.oral_booking != null && typeof o.oral_booking === 'object' && !Array.isArray(o.oral_booking)
    ? (o.oral_booking as Record<string, unknown>)
    : null
  const rubricRaw = Array.isArray(o.oral_rubric) ? o.oral_rubric
    : Array.isArray((o.oral_assessment as Record<string, unknown> | undefined)?.rubric)
      ? (o.oral_assessment as Record<string, unknown>).rubric as unknown[]
      : []
  const oralRubric = rubricRaw.map((item) => {
    const c = item as Record<string, unknown>
    return {
      key: String(c.key ?? ''),
      label: String(c.label ?? ''),
      score: c.score != null ? Number(c.score) : null,
      max: c.max != null ? Number(c.max) : 20,
    }
  })
  // Canonical source — same class_assignment object returned by the course
  // students / placement-students endpoints, so this page can't disagree.
  const classAssignment = o.class_assignment != null && typeof o.class_assignment === 'object' && !Array.isArray(o.class_assignment)
    ? (o.class_assignment as Record<string, unknown>)
    : null
  const assignedClass = classAssignment?.class_name != null ? String(classAssignment.class_name)
    : o.assigned_class != null ? String(o.assigned_class)
    : o.class_name != null ? String(o.class_name) : null
  const isAssignedCanonical = classAssignment ? classAssignment.status === 'assigned' : null
  const canonicalStudent = getCanonicalStudentIdentity(o)
  const canonicalPlacement = getCanonicalPlacement(o)
  return {
    attempt_id:    Number(o.attempt_id ?? o.id ?? 0),
    student_id:    canonicalStudent.id ?? Number(o.student_id ?? o.id ?? 0),
    student_name:  canonicalStudent.name ?? String(o.student_name ?? o.name ?? ''),
    student_email: canonicalStudent.email ?? String(o.student_email ?? o.email ?? ''),
    course_id:     Number(o.course_id ?? 0),
    course_title:  resolveCourseTitle(o),
    written_score: canonicalPlacement.written_score ?? score,
    total_questions: canonicalPlacement.written_total ?? total,
    percentage:    canonicalPlacement.written_percentage ?? pct,
    written_level:        canonicalPlacement.written_level ??
                           (String(att?.written_level ?? att?.estimated_level ?? o.written_level ?? o.estimated_level ?? '') || null),
    oral_score:           canonicalPlacement.oral_score ??
                           (o.oral_score != null ? Number(o.oral_score) : att?.oral_score != null ? Number(att.oral_score) : null),
    oral_booking_ends_at: oralObj?.ends_at != null ? String(oralObj.ends_at) : o.oral_booking_ends_at != null ? String(o.oral_booking_ends_at) : null,
    avatar_url:           canonicalStudent.avatar_url ??
                           (o.avatar_url != null ? String(o.avatar_url) : o.profile_photo_url != null ? String(o.profile_photo_url) : null),
    status:               coalesceStatus(att?.status ?? o.status ?? o.placement_status),
    submitted_at:         o.submitted_at != null ? String(o.submitted_at) : att?.submitted_at != null ? String(att.submitted_at) : null,
    oral_booking_at:      oralObj?.starts_at != null ? String(oralObj.starts_at) : o.oral_booking_at != null ? String(o.oral_booking_at) : null,
    final_level:          canonicalPlacement.final_level ?? canonicalPlacement.oral_level ??
                           (o.final_level != null ? String(o.final_level) : att?.final_level != null ? String(att.final_level) : null),
    is_assigned:          isAssignedCanonical ?? !!(o.is_assigned ?? o.class_assigned ?? assignedClass),
    assigned_class:       assignedClass,
    assigned_at:          classAssignment?.assigned_at != null ? String(classAssignment.assigned_at)
                            : o.assigned_at != null ? String(o.assigned_at) : null,
    assigned_by:          classAssignment?.assigned_by_name != null ? String(classAssignment.assigned_by_name)
                            : o.assigned_by != null ? String(o.assigned_by) : null,
    assignment_method:    classAssignment?.method != null ? String(classAssignment.method) : null,
    assignment_reason_details: Array.isArray(classAssignment?.reason_details)
      ? (classAssignment.reason_details as unknown[]).map(String) : [],
    recommended_class:    o.recommended_class != null ? String(o.recommended_class) : null,
    instructor_notes:     o.instructor_notes != null ? String(o.instructor_notes) : o.notes != null ? String(o.notes) : null,
    oral_rubric:          oralRubric,
    // Canonical key is oral_assessment_full (matches the course/placement-
    // students endpoints exactly) — oral_assessment kept only as a fallback.
    oral_assessment:      normalizeOralAssessmentFull(o.oral_assessment_full ?? o.oral_assessment),
  }
}

export async function fetchInstructorAllPlacementTests(): Promise<InstructorPlacementTestRow[]> {
  const res = await apiClient.get<unknown>('/instructor/placement-tests', silent)
  if (import.meta.env.DEV) console.log('[placement-tests] raw:', res.data)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'tests', 'attempts', 'students']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  return raw.map(normalizePlacementTestRow)
}

/* ── Placement test answer review ────────────────────────────────────────── */

export type PlacementTestAnswerRow = {
  question_id: number
  question_text: string
  options: { a: string; b: string; c: string; d: string }
  student_answer: string | null
  correct_answer: string
  is_correct: boolean
  score_contribution: number | null
}

export async function fetchPlacementTestAnswers(attemptId: number): Promise<PlacementTestAnswerRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/placement-tests/${attemptId}/answers`, silent)
  if (import.meta.env.DEV) console.log('[placement-test-answers] raw:', res.data)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'answers', 'items']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  return raw.map((r) => {
    const o = r as Record<string, unknown>
    const opts = (o.options && typeof o.options === 'object' && !Array.isArray(o.options))
      ? (o.options as Record<string, string>)
      : {}
    return {
      question_id:        Number(o.question_id ?? 0),
      question_text:      String(o.question_text ?? o.text ?? ''),
      options: {
        a: String(opts.a ?? o.option_a ?? ''),
        b: String(opts.b ?? o.option_b ?? ''),
        c: String(opts.c ?? o.option_c ?? ''),
        d: String(opts.d ?? o.option_d ?? ''),
      },
      student_answer:     o.student_answer != null ? String(o.student_answer) :
                          o.selected_option != null ? String(o.selected_option) : null,
      correct_answer:     String(o.correct_answer ?? o.correct_option ?? ''),
      is_correct:         !!o.is_correct,
      score_contribution: o.score_contribution != null ? Number(o.score_contribution) :
                          o.points             != null ? Number(o.points)             : null,
    }
  })
}

/* ══════════════════════════════════════════════════════════════════
   CLASS / GROUP MANAGEMENT
══════════════════════════════════════════════════════════════════ */

export type ClassGroupScheduleRow = {
  id?: number
  day_of_week: string
  start_time: string
  end_time: string
  delivery_mode: string
  location: string | null
  is_active?: boolean
}

export type ClassGroup = {
  id: number
  course_id: number
  course_title: string | null
  instructor_id: number | null
  level_code: string | null
  name: string
  capacity: number
  enrolled: number
  remaining: number
  start_date: string | null
  /** @deprecated prefer `schedules` — kept for backward compatibility */
  schedule_day: string | null
  /** @deprecated prefer `schedules` */
  schedule_time: string | null
  location_type: string
  meeting_link: string | null
  /** Canonical multi-day weekly schedule. */
  schedules: ClassGroupScheduleRow[]
  status: 'draft' | 'ready' | 'active' | 'completed' | 'archived'
  created_at: string
}

export type OralRubricCriterion = { key: string; label: string; score: number | null; max: number }

export type OralAssessmentFull = {
  id: number
  status: string
  oral_score: number | null
  oral_score_max: number
  final_level: string | null
  rubric: OralRubricCriterion[]
  notes: {
    reason: string | null
    strengths: string | null
    weaknesses: string | null
    recommendations: string | null
  }
  interview: { starts_at: string | null; ends_at: string | null; duration_minutes: number | null }
  evaluator: { id: number | null; name: string | null }
  system: { evaluated_at: string | null; last_modified: string | null; approval_status: 'approved' | 'pending' | string }
  history: {
    previous_oral_score: number | null
    previous_final_level: string | null
    edited_by: string | null
    edited_at: string | null
  } | null
}

export type ClassAssignmentStudent = {
  student_id: number
  student_name: string
  student_email: string
  student_phone?: string | null
  written_score: number | null
  total_questions: number | null
  percentage: number | null
  written_level: string | null
  oral_score: number | null
  final_level: string | null
  instructor_notes: string | null
  placement_status: string
  attempt_id: number | null
  booking_id: number | null
  is_assigned: boolean
  avatar_url?: string | null
  assigned_at?: string | null
  oral_assessment?: OralAssessmentFull | null
}

function normalizeOralAssessmentFull(raw: unknown): OralAssessmentFull | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const notes = (o.notes && typeof o.notes === 'object' ? o.notes : {}) as Record<string, unknown>
  const interview = (o.interview && typeof o.interview === 'object' ? o.interview : {}) as Record<string, unknown>
  const evaluator = (o.evaluator && typeof o.evaluator === 'object' ? o.evaluator : {}) as Record<string, unknown>
  const system = (o.system && typeof o.system === 'object' ? o.system : {}) as Record<string, unknown>
  const history = o.history && typeof o.history === 'object' ? (o.history as Record<string, unknown>) : null
  const rubricRaw = Array.isArray(o.rubric) ? o.rubric as unknown[] : []

  return {
    id: Number(o.id ?? 0),
    status: String(o.status ?? ''),
    oral_score: o.oral_score != null ? Number(o.oral_score) : null,
    oral_score_max: o.oral_score_max != null ? Number(o.oral_score_max) : 100,
    final_level: o.final_level != null ? String(o.final_level) : null,
    rubric: rubricRaw.map((r) => {
      const c = r as Record<string, unknown>
      return {
        key: String(c.key ?? ''),
        label: String(c.label ?? ''),
        score: c.score != null ? Number(c.score) : null,
        max: c.max != null ? Number(c.max) : 10,
      }
    }),
    notes: {
      reason: notes.reason != null ? String(notes.reason) : null,
      strengths: notes.strengths != null ? String(notes.strengths) : null,
      weaknesses: notes.weaknesses != null ? String(notes.weaknesses) : null,
      recommendations: notes.recommendations != null ? String(notes.recommendations) : null,
    },
    interview: {
      starts_at: interview.starts_at != null ? String(interview.starts_at) : null,
      ends_at: interview.ends_at != null ? String(interview.ends_at) : null,
      duration_minutes: interview.duration_minutes != null ? Number(interview.duration_minutes) : null,
    },
    evaluator: {
      id: evaluator.id != null ? Number(evaluator.id) : null,
      name: evaluator.name != null ? String(evaluator.name) : null,
    },
    system: {
      evaluated_at: system.evaluated_at != null ? String(system.evaluated_at) : null,
      last_modified: system.last_modified != null ? String(system.last_modified) : null,
      approval_status: String(system.approval_status ?? 'pending'),
    },
    history: history ? {
      previous_oral_score: history.previous_oral_score != null ? Number(history.previous_oral_score) : null,
      previous_final_level: history.previous_final_level != null ? String(history.previous_final_level) : null,
      edited_by: history.edited_by != null ? String(history.edited_by) : null,
      edited_at: history.edited_at != null ? String(history.edited_at) : null,
    } : null,
  }
}

function normalizeClassGroup(r: unknown): ClassGroup {
  if (!r || typeof r !== 'object') {
    return { id: 0, course_id: 0, course_title: null, instructor_id: null, level_code: null, name: '', capacity: 20, enrolled: 0, remaining: 20, start_date: null, schedule_day: null, schedule_time: null, location_type: 'online', meeting_link: null, schedules: [], status: 'draft', created_at: '' }
  }
  const o = r as Record<string, unknown>
  const schedules = Array.isArray(o.schedules)
    ? (o.schedules as unknown[]).map((s) => {
        const row = s as Record<string, unknown>
        return {
          id:            row.id != null ? Number(row.id) : undefined,
          day_of_week:   String(row.day_of_week ?? ''),
          start_time:    String(row.start_time ?? ''),
          end_time:      String(row.end_time ?? ''),
          delivery_mode: String(row.delivery_mode ?? 'online'),
          location:      row.location != null ? String(row.location) : null,
          is_active:     row.is_active !== false,
        }
      })
    : []
  return {
    id:            Number(o.id ?? 0),
    course_id:     Number(o.course_id ?? 0),
    course_title:  o.course_title != null ? String(o.course_title) : null,
    instructor_id: o.instructor_id != null ? Number(o.instructor_id) : null,
    level_code:    o.level_code != null ? String(o.level_code) : null,
    name:          String(o.name ?? ''),
    capacity:      Number(o.capacity ?? 20),
    enrolled:      Number(o.enrolled ?? 0),
    remaining:     Number(o.remaining ?? 0),
    start_date:    o.start_date != null ? String(o.start_date) : null,
    schedule_day:  o.schedule_day != null ? String(o.schedule_day) : null,
    schedule_time: o.schedule_time != null ? String(o.schedule_time) : null,
    location_type: String(o.location_type ?? 'online'),
    meeting_link:  o.meeting_link != null ? String(o.meeting_link) : null,
    schedules,
    status:        (o.status as ClassGroup['status']) ?? 'draft',
    created_at:    String(o.created_at ?? ''),
  }
}

export async function fetchInstructorClasses(courseId?: number): Promise<ClassGroup[]> {
  const params = courseId ? { course_id: courseId } : {}
  const res = await apiClient.get<unknown>('/instructor/classes', { params, ...silent })
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'groups', 'classes']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  return raw.map(normalizeClassGroup)
}

export async function fetchCourseClasses(courseId: number): Promise<ClassGroup[]> {
  const res = await apiClient.get<unknown>(`/instructor/courses/${courseId}/classes`, silent)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'groups', 'classes']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  return raw.map(normalizeClassGroup)
}

export async function createClassGroup(data: {
  course_id: number
  name: string
  level_code?: string | null
  capacity?: number
  start_date?: string | null
  /** @deprecated prefer `schedules` */
  schedule_day?: string | null
  /** @deprecated prefer `schedules` */
  schedule_time?: string | null
  location_type?: string
  meeting_link?: string | null
  schedules?: Omit<ClassGroupScheduleRow, 'id' | 'is_active'>[]
}): Promise<ClassGroup> {
  const res = await apiClient.post<unknown>('/instructor/classes', data, silent)
  const payload = extractPayload(res.data)
  const raw = (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data))
    ? payload.data : payload
  return normalizeClassGroup(raw)
}

export async function updateClassGroup(id: number, data: Partial<ClassGroup>): Promise<ClassGroup> {
  const res = await apiClient.patch<unknown>(`/instructor/classes/${id}`, data, silent)
  const payload = extractPayload(res.data)
  const raw = (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data))
    ? payload.data : payload
  return normalizeClassGroup(raw)
}

export async function deleteClassGroup(id: number): Promise<void> {
  await apiClient.delete(`/instructor/classes/${id}`, silent)
}

/** GET /instructor/courses/{course}/students — all enrolled students (no placement filter) */
export async function fetchCourseEnrolledStudents(courseId: number): Promise<ClassAssignmentStudent[]> {
  const res = await apiClient.get<unknown>(`/instructor/courses/${courseId}/students`, silent)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'students']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  return raw.map((r) => {
    const o = r as Record<string, unknown>
    return {
      student_id:       Number(o.student_id ?? 0),
      student_name:     String(o.student_name ?? ''),
      student_email:    String(o.student_email ?? ''),
      student_phone:    o.student_phone != null ? String(o.student_phone) : null,
      written_score:    null,
      total_questions:  null,
      percentage:       null,
      written_level:    null,
      oral_score:       null,
      final_level:      null,
      instructor_notes: null,
      placement_status: 'not_started',
      attempt_id:       null,
      booking_id:       null,
      is_assigned:      !!o.is_assigned,
      avatar_url:       o.avatar_url != null ? String(o.avatar_url) : null,
    }
  })
}

export async function fetchClassAssignmentStudents(courseId: number): Promise<ClassAssignmentStudent[]> {
  const res = await apiClient.get<unknown>(`/instructor/courses/${courseId}/class-assignment/students`, silent)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'students']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  return raw.map((r) => {
    const o = r as Record<string, unknown>
    return {
      student_id:       Number(o.student_id ?? 0),
      student_name:     String(o.student_name ?? ''),
      student_email:    String(o.student_email ?? ''),
      written_score:    o.written_score   != null ? Number(o.written_score)   : null,
      total_questions:  o.total_questions != null ? Number(o.total_questions) : null,
      percentage:       o.percentage      != null ? Number(o.percentage)      : null,
      written_level:    o.written_level   != null ? String(o.written_level)   : null,
      oral_score:       o.oral_score      != null ? Number(o.oral_score)      : null,
      final_level:      o.final_level     != null ? String(o.final_level)     : null,
      instructor_notes: o.instructor_notes != null ? String(o.instructor_notes) : null,
      placement_status: String(o.placement_status ?? 'not_started'),
      attempt_id:       o.attempt_id  != null ? Number(o.attempt_id)  : null,
      booking_id:       o.booking_id  != null ? Number(o.booking_id)  : null,
      is_assigned:      !!o.is_assigned,
      avatar_url:       o.avatar_url  != null ? String(o.avatar_url)  : null,
    }
  })
}

export async function assignStudentToClass(groupId: number, data: {
  user_id: number
  placement_attempt_id?: number | null
  oral_assessment_booking_id?: number | null
  notes?: string | null
}): Promise<void> {
  await apiClient.post<unknown>(`/instructor/classes/${groupId}/students`, data, silent)
}

export async function removeStudentFromClass(groupId: number, userId: number): Promise<void> {
  await apiClient.delete(`/instructor/classes/${groupId}/students/${userId}`, silent)
}

/**
 * Students enrolled in a class group (for the class detail drawer / roster).
 *
 * Backend now returns the canonical `student_id` field (matching every other
 * instructor student endpoint) plus flat `written_score`/`oral_score`/
 * `final_level` reused from the same shape methods the course/placement
 * pages use. `id` is kept server-side as a deprecated alias of `student_id`
 * for backward compatibility — prefer `student_id`, fall back to `id` only
 * for older cached responses.
 */
export async function fetchClassGroupStudents(groupId: number): Promise<ClassAssignmentStudent[]> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}/students`, silent)
  const payload = extractPayload(res.data)
  let raw: unknown[] = []
  for (const key of ['data', 'items', 'students']) {
    if (Array.isArray(payload[key])) { raw = payload[key] as unknown[]; break }
  }
  if (!raw.length && Array.isArray(res.data)) raw = res.data as unknown[]
  return raw.map((r) => {
    const o = r as Record<string, unknown>
    const placement =
      o.placement && typeof o.placement === 'object' && !Array.isArray(o.placement)
        ? (o.placement as Record<string, unknown>)
        : null
    // Canonical nested sub-objects from InstructorStudentSummaryResource
    // (Ticket 2), checked first; the legacy flat `placement` sub-object
    // above (written_score/written_total/percentage/final_level) remains
    // as the fallback since some callers still rely on it.
    const canonicalStudent = getCanonicalStudentIdentity(o)
    const canonicalPlacement = getCanonicalPlacement(o)
    return {
      // Canonical field is student_id — id kept only as a deprecated
      // server-side alias for older cached responses.
      student_id:       canonicalStudent.id ?? Number(o.student_id ?? o.id ?? o.user_id ?? 0),
      student_name:     canonicalStudent.name ?? String(o.name ?? o.student_name ?? ''),
      student_email:    canonicalStudent.email ?? String(o.email ?? o.student_email ?? ''),
      written_score:    canonicalPlacement.written_score ??
        (o.written_score != null ? Number(o.written_score)
        : placement?.written_score  != null ? Number(placement.written_score)  : null),
      total_questions:  canonicalPlacement.written_total ??
        (o.total_questions != null ? Number(o.total_questions)
        : placement?.written_total  != null ? Number(placement.written_total)  : null),
      percentage:       canonicalPlacement.written_percentage ??
        (o.percentage != null ? Number(o.percentage)
        : placement?.percentage     != null ? Number(placement.percentage)     : null),
      written_level:    canonicalPlacement.written_level ??
        (o.written_level != null ? String(o.written_level) : null),
      oral_score:       canonicalPlacement.oral_score ??
        (o.oral_score != null ? Number(o.oral_score)
        : o.oral_assessment && typeof o.oral_assessment === 'object'
          ? (o.oral_assessment as Record<string, unknown>).oral_score != null
            ? Number((o.oral_assessment as Record<string, unknown>).oral_score) : null
          : null),
      // Legacy flat `placement.final_level` (shapeGroupStudents' own
      // pre-Ticket-2 shape) is checked first here — it already held the
      // correct value directly and a dedicated backend test
      // (test_group_students_endpoint_uses_canonical_resource_without_losing_legacy_fields)
      // asserts on it; `placement.oral.level` is an equivalent secondary source.
      final_level:      (placement?.final_level != null ? String(placement.final_level) : null) ??
        canonicalPlacement.oral_level ??
        (o.final_level != null ? String(o.final_level) : null),
      instructor_notes: o.notes != null ? String(o.notes) : null,
      placement_status: placement?.final_level != null ? 'completed' : 'not_started',
      attempt_id:       null,
      booking_id:       o.oral_assessment && typeof o.oral_assessment === 'object'
        ? Number((o.oral_assessment as Record<string, unknown>).id) || null
        : null,
      is_assigned:      true,
      avatar_url:       o.avatar_url != null ? String(o.avatar_url) : null,
      assigned_at:      o.assigned_at != null ? String(o.assigned_at) : null,
      oral_assessment:  normalizeOralAssessmentFull(o.oral_assessment),
    }
  }).filter((s) => s.student_id > 0 && s.student_name.trim() !== '')
}

/* ── Class workspace (class-scoped detail, sessions, attendance) ─────────── */

export type ClassGroupDetail = {
  id: number
  name: string
  level_code: string | null
  status: string
  capacity: number
  current_students_count: number
  available_seats: number
  course: { id: number; title: string } | null
  instructor: { id: number; name: string } | null
  schedule: { start_date: string | null; day: string | null; time: string | null; mode: string | null }
  meeting_link: string | null
  counts: { students: number; sessions: number; materials: number; assignments: number; attendance_records: number; pending_reviews: number; announcements: number }
  next_session: { id: number; title: string; starts_at: string } | null
  permissions: {
    edit: boolean; delete: boolean; manage_students: boolean; create_session: boolean
    record_attendance: boolean; create_assignment: boolean; upload_material: boolean; send_announcement: boolean
  }
  attendance_summary: { attendance_percentage: number; present: number; absent: number; late: number; excused: number }
  progress_summary: { students_total: number; students_completed: number; average_progress_percentage: number; at_risk_students: number }
}

export async function fetchClassGroupDetail(groupId: number): Promise<ClassGroupDetail | null> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}`, silent)
  const payload = extractPayload(res.data) as Record<string, unknown>
  if (!payload || Object.keys(payload).length === 0) return null
  return {
    id:                      Number(payload.id ?? groupId),
    name:                    String(payload.name ?? ''),
    level_code:              payload.level_code != null ? String(payload.level_code) : null,
    status:                  String(payload.status ?? ''),
    capacity:                Number(payload.capacity ?? 0),
    current_students_count: Number(payload.current_students_count ?? 0),
    available_seats:        Number(payload.available_seats ?? 0),
    course:                  payload.course && typeof payload.course === 'object'
      ? { id: Number((payload.course as Record<string, unknown>).id), title: String((payload.course as Record<string, unknown>).title ?? '') }
      : null,
    instructor:               payload.instructor && typeof payload.instructor === 'object'
      ? { id: Number((payload.instructor as Record<string, unknown>).id), name: String((payload.instructor as Record<string, unknown>).name ?? '') }
      : null,
    schedule: (() => {
      const s = payload.schedule && typeof payload.schedule === 'object' ? (payload.schedule as Record<string, unknown>) : {}
      return {
        start_date: s.start_date != null ? String(s.start_date) : null,
        day:        s.day != null ? String(s.day) : null,
        time:       s.time != null ? String(s.time) : null,
        mode:       s.mode != null ? String(s.mode) : null,
      }
    })(),
    meeting_link: payload.meeting_link != null ? String(payload.meeting_link) : null,
    counts: (() => {
      const c = payload.counts && typeof payload.counts === 'object' ? (payload.counts as Record<string, unknown>) : {}
      return {
        students:    Number(c.students ?? 0),
        sessions:    Number(c.sessions ?? 0),
        materials:   Number(c.materials ?? 0),
        assignments: Number(c.assignments ?? 0),
        attendance_records: Number(c.attendance_records ?? 0),
        pending_reviews: Number(c.pending_reviews ?? 0),
        announcements: Number(c.announcements ?? 0),
      }
    })(),
    next_session: (() => {
      const n = payload.next_session
      if (!n || typeof n !== 'object') return null
      const o = n as Record<string, unknown>
      return { id: Number(o.id ?? 0), title: String(o.title ?? ''), starts_at: String(o.starts_at ?? '') }
    })(),
    permissions: (() => {
      const p = payload.permissions && typeof payload.permissions === 'object' ? (payload.permissions as Record<string, unknown>) : {}
      return {
        edit: Boolean(p.edit), delete: Boolean(p.delete), manage_students: Boolean(p.manage_students),
        create_session: Boolean(p.create_session), record_attendance: Boolean(p.record_attendance),
        create_assignment: Boolean(p.create_assignment), upload_material: Boolean(p.upload_material),
        send_announcement: Boolean(p.send_announcement),
      }
    })(),
    attendance_summary: (() => {
      const a = payload.attendance_summary && typeof payload.attendance_summary === 'object' ? (payload.attendance_summary as Record<string, unknown>) : {}
      return {
        attendance_percentage: Number(a.attendance_percentage ?? 0), present: Number(a.present ?? 0),
        absent: Number(a.absent ?? 0), late: Number(a.late ?? 0), excused: Number(a.excused ?? 0),
      }
    })(),
    progress_summary: (() => {
      const p = payload.progress_summary && typeof payload.progress_summary === 'object' ? (payload.progress_summary as Record<string, unknown>) : {}
      return {
        students_total: Number(p.students_total ?? 0), students_completed: Number(p.students_completed ?? 0),
        average_progress_percentage: Number(p.average_progress_percentage ?? 0), at_risk_students: Number(p.at_risk_students ?? 0),
      }
    })(),
  }
}

export type ClassAnnouncementRow = {
  id: number
  title: string
  body: string
  priority: string
  status: string
  published_at: string | null
  created_at?: string
}

function normalizeAnnouncement(o: Record<string, unknown>): ClassAnnouncementRow {
  return {
    id: Number(o.id ?? 0),
    title: String(o.title ?? ''),
    body: String(o.body ?? ''),
    priority: String(o.priority ?? 'normal'),
    status: String(o.status ?? 'draft'),
    published_at: o.published_at != null ? String(o.published_at) : null,
    created_at: o.created_at != null ? String(o.created_at) : undefined,
  }
}

export async function fetchClassGroupAnnouncements(groupId: number): Promise<ClassAnnouncementRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}/announcements`, silent)
  const raw = extractPayload(res.data)
  const list = Array.isArray((raw as Record<string, unknown>).data) ? (raw as Record<string, unknown>).data as unknown[] : Array.isArray(res.data) ? res.data as unknown[] : []
  return list.map((r) => normalizeAnnouncement(r as Record<string, unknown>))
}

export async function createClassAnnouncement(groupId: number, payload: { title: string; body: string; priority?: string }): Promise<ClassAnnouncementRow> {
  const res = await apiClient.post<unknown>(`/instructor/classes/${groupId}/announcements`, payload)
  const raw = extractPayload(res.data) as Record<string, unknown>
  const data = raw.data && typeof raw.data === 'object' ? raw.data as Record<string, unknown> : raw
  return normalizeAnnouncement(data)
}

export async function publishClassAnnouncement(groupId: number, announcementId: number): Promise<ClassAnnouncementRow> {
  const res = await apiClient.patch<unknown>(`/instructor/classes/${groupId}/announcements/${announcementId}/publish`, {})
  const raw = extractPayload(res.data) as Record<string, unknown>
  const data = raw.data && typeof raw.data === 'object' ? raw.data as Record<string, unknown> : raw
  return normalizeAnnouncement(data)
}

export async function archiveClassAnnouncement(groupId: number, announcementId: number): Promise<void> {
  await apiClient.delete(`/instructor/classes/${groupId}/announcements/${announcementId}`)
}

/** Student surface. Backend already scopes to published announcements for
 *  active class members only (403 otherwise) — this just fetches and
 *  normalizes, no extra client-side visibility logic. Throws on 403 so the
 *  caller can render the "not a class member" state. */
export async function fetchStudentClassAnnouncements(groupId: number): Promise<ClassAnnouncementRow[]> {
  const res = await apiClient.get<unknown>(`/student/classes/${groupId}/announcements`, silent)
  const raw = extractPayload(res.data)
  const list = Array.isArray((raw as Record<string, unknown>).data) ? (raw as Record<string, unknown>).data as unknown[] : []
  return list.map((r) => normalizeAnnouncement(r as Record<string, unknown>))
}

export type ClassGroupSessionRow = {
  id: number
  source_type: string
  title: string
  status: string | null
  starts_at?: string | null
  ends_at?: string | null
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
}

export async function fetchClassGroupSessions(groupId: number): Promise<ClassGroupSessionRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}/sessions`, silent)
  const raw = extractPayload(res.data)
  const list = Array.isArray((raw as Record<string, unknown>).data) ? (raw as Record<string, unknown>).data as unknown[] : Array.isArray(res.data) ? res.data as unknown[] : []
  return list.map((r) => {
    const o = r as Record<string, unknown>
    return {
      id: Number(o.id ?? 0),
      source_type: String(o.source_type ?? ''),
      title: String(o.title ?? ''),
      status: o.status != null ? String(o.status) : null,
      starts_at: o.starts_at != null ? String(o.starts_at) : null,
      ends_at: o.ends_at != null ? String(o.ends_at) : null,
      session_date: o.session_date != null ? String(o.session_date) : null,
      start_time: o.start_time != null ? String(o.start_time) : null,
      end_time: o.end_time != null ? String(o.end_time) : null,
    }
  })
}

export async function createClassGroupSession(groupId: number, payload: {
  title: string; session_date: string; start_time: string; end_time: string; meeting_url?: string
}): Promise<void> {
  await apiClient.post(`/instructor/classes/${groupId}/sessions`, payload)
}

/* ── Ticket 4: canonical LmsSessionResource-shaped calendar events ───────── */

export type LmsSessionEvent = {
  id: number
  title: string
  description: string | null
  course: { id: number; title: string | null } | null
  class_group: { id: number; name: string | null } | null
  instructor: { id: number; name: string | null } | null
  date: string | null
  start_time: string | null
  end_time: string | null
  timezone: string
  status: string
  location: string | null
  meeting: { provider: string; url: string | null; join_allowed: boolean }
  recording_url: string | null
  attendance: { total: number; present: number; absent: number; late: number; excused: number }
  materials_count: number
  assignments_count: number
  allowed_transitions: string[]
  permissions: {
    view: boolean; update: boolean; transition: boolean; delete: boolean
    view_meeting_link: boolean; record_attendance: boolean
  }
}

export function normalizeLmsSessionEvent(o: Record<string, unknown>): LmsSessionEvent {
  const course = o.course && typeof o.course === 'object' ? (o.course as Record<string, unknown>) : null
  const classGroup = o.class_group && typeof o.class_group === 'object' ? (o.class_group as Record<string, unknown>) : null
  const instructor = o.instructor && typeof o.instructor === 'object' && !Array.isArray(o.instructor) ? (o.instructor as Record<string, unknown>) : null
  const meeting = o.meeting && typeof o.meeting === 'object' ? (o.meeting as Record<string, unknown>) : {}
  const attendance = o.attendance && typeof o.attendance === 'object' ? (o.attendance as Record<string, unknown>) : {}
  const permissions = o.permissions && typeof o.permissions === 'object' ? (o.permissions as Record<string, unknown>) : {}

  return {
    id: Number(o.id ?? 0),
    title: String(o.title ?? ''),
    description: o.description != null ? String(o.description) : null,
    course: course ? { id: Number(course.id ?? 0), title: course.title != null ? String(course.title) : null } : null,
    class_group: classGroup ? { id: Number(classGroup.id ?? 0), name: classGroup.name != null ? String(classGroup.name) : null } : null,
    instructor: instructor ? { id: Number(instructor.id ?? 0), name: instructor.name != null ? String(instructor.name) : null } : null,
    date: o.date != null ? String(o.date) : null,
    start_time: o.start_time != null ? String(o.start_time) : null,
    end_time: o.end_time != null ? String(o.end_time) : null,
    timezone: String(o.timezone ?? 'Europe/Amsterdam'),
    status: String(o.status ?? 'scheduled'),
    location: o.location != null ? String(o.location) : null,
    meeting: {
      provider: String(meeting.provider ?? 'none'),
      url: meeting.url != null ? String(meeting.url) : null,
      join_allowed: Boolean(meeting.join_allowed),
    },
    recording_url: o.recording_url != null ? String(o.recording_url) : null,
    attendance: {
      total: Number(attendance.total ?? 0), present: Number(attendance.present ?? 0),
      absent: Number(attendance.absent ?? 0), late: Number(attendance.late ?? 0), excused: Number(attendance.excused ?? 0),
    },
    materials_count: Number(o.materials_count ?? 0),
    assignments_count: Number(o.assignments_count ?? 0),
    allowed_transitions: Array.isArray(o.allowed_transitions) ? (o.allowed_transitions as unknown[]).map(String) : [],
    permissions: {
      view: Boolean(permissions.view), update: Boolean(permissions.update), transition: Boolean(permissions.transition),
      delete: Boolean(permissions.delete), view_meeting_link: Boolean(permissions.view_meeting_link),
      record_attendance: Boolean(permissions.record_attendance),
    },
  }
}

export async function fetchInstructorSessionCalendar(params: {
  from: string; to: string; course_id?: number; class_group_id?: number; status?: string
}): Promise<LmsSessionEvent[]> {
  const res = await apiClient.get<unknown>('/instructor/sessions/calendar', { params, ...silent })
  const payload = extractPayload(res.data) as Record<string, unknown>
  const list = Array.isArray(payload.data) ? payload.data as unknown[] : []
  return list.map((r) => normalizeLmsSessionEvent(r as Record<string, unknown>))
}

export async function fetchClassSessionDetail(groupId: number, sessionId: number): Promise<LmsSessionEvent | null> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}/sessions/${sessionId}`, silent)
  const payload = extractPayload(res.data) as Record<string, unknown>
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : null
  return data ? normalizeLmsSessionEvent(data) : null
}

export async function transitionClassSession(groupId: number, sessionId: number, status: string): Promise<LmsSessionEvent> {
  const res = await apiClient.post<unknown>(`/instructor/classes/${groupId}/sessions/${sessionId}/transition`, { status })
  const payload = extractPayload(res.data) as Record<string, unknown>
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {}
  return normalizeLmsSessionEvent(data)
}

export async function deleteClassSession(groupId: number, sessionId: number): Promise<void> {
  await apiClient.delete(`/instructor/classes/${groupId}/sessions/${sessionId}`)
}

export async function previewClassSessionGeneration(groupId: number, from: string, to: string): Promise<Array<{ date: string; day_of_week: string; start_time: string; end_time: string; already_exists: boolean }>> {
  const res = await apiClient.post<unknown>(`/instructor/classes/${groupId}/sessions/generation-preview`, { from, to })
  const payload = extractPayload(res.data) as Record<string, unknown>
  return Array.isArray(payload.data) ? payload.data as Array<{ date: string; day_of_week: string; start_time: string; end_time: string; already_exists: boolean }> : []
}

export async function generateClassSessions(groupId: number, from: string, to: string): Promise<{ created_count: number; skipped_count: number }> {
  const res = await apiClient.post<unknown>(`/instructor/classes/${groupId}/sessions/generate`, { from, to })
  const payload = extractPayload(res.data) as Record<string, unknown>
  return { created_count: Number(payload.created_count ?? 0), skipped_count: Number(payload.skipped_count ?? 0) }
}

/**
 * Edits session content only (title/description/date/time/location/meeting
 * fields). Status is deliberately not accepted here — use
 * transitionClassSession(), which delegates to the backend's centralized
 * transition matrix instead of an arbitrary status write.
 */
export async function updateClassSession(groupId: number, sessionId: number, data: {
  title?: string; description?: string | null; session_date?: string; start_time?: string; end_time?: string
  location?: string | null; meeting_url?: string | null; meeting_provider?: string | null; recording_url?: string | null
}): Promise<LmsSessionEvent> {
  const res = await apiClient.patch<unknown>(`/instructor/classes/${groupId}/sessions/${sessionId}`, data)
  const payload = extractPayload(res.data) as Record<string, unknown>
  const body = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {}
  return normalizeLmsSessionEvent(body)
}

/* ── Ticket 4 (frontend completion pass): student session API ────────────── */

export async function fetchStudentSessions(status?: string): Promise<LmsSessionEvent[]> {
  const res = await apiClient.get<unknown>('/student/sessions', { params: status ? { status } : {}, ...silent })
  const payload = extractPayload(res.data) as Record<string, unknown>
  const list = Array.isArray(payload.data) ? payload.data as unknown[] : []
  return list.map((r) => normalizeLmsSessionEvent(r as Record<string, unknown>))
}

export async function fetchStudentSessionCalendar(params: { from: string; to: string }): Promise<LmsSessionEvent[]> {
  const res = await apiClient.get<unknown>('/student/sessions/calendar', { params, ...silent })
  const payload = extractPayload(res.data) as Record<string, unknown>
  const list = Array.isArray(payload.data) ? payload.data as unknown[] : []
  return list.map((r) => normalizeLmsSessionEvent(r as Record<string, unknown>))
}

/** Returns null (never throws to the caller) on 403/404 — the caller must
 *  render a safe "not found" state, not confirm the session exists. */
export async function fetchStudentSessionDetail(sessionId: number): Promise<LmsSessionEvent | null> {
  try {
    const res = await apiClient.get<unknown>(`/student/sessions/${sessionId}`, silent)
    const payload = extractPayload(res.data) as Record<string, unknown>
    const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : null
    return data ? normalizeLmsSessionEvent(data) : null
  } catch {
    return null
  }
}

export type ClassGroupAttendanceRow = {
  id: number
  user_id: number
  student_name: string | null
  status: string
  checked_in_at: string | null
}

export async function fetchClassGroupAttendance(groupId: number): Promise<ClassGroupAttendanceRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}/attendance`, silent)
  const raw = extractPayload(res.data)
  const list = Array.isArray((raw as Record<string, unknown>).data) ? (raw as Record<string, unknown>).data as unknown[] : Array.isArray(res.data) ? res.data as unknown[] : []
  return list.map((r) => {
    const o = r as Record<string, unknown>
    return {
      id: Number(o.id ?? 0),
      user_id: Number(o.user_id ?? 0),
      student_name: o.student_name != null ? String(o.student_name) : null,
      status: String(o.status ?? ''),
      checked_in_at: o.checked_in_at != null ? String(o.checked_in_at) : null,
    }
  })
}

export type ClassGroupMaterialRow = {
  id: number
  title: string
  type: string | null
  sort_order: number | null
}

export async function fetchClassGroupMaterials(groupId: number): Promise<ClassGroupMaterialRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}/materials`, silent)
  const raw = extractPayload(res.data)
  const list = Array.isArray((raw as Record<string, unknown>).data) ? (raw as Record<string, unknown>).data as unknown[] : Array.isArray(res.data) ? res.data as unknown[] : []
  return list.map((r) => {
    const o = r as Record<string, unknown>
    return {
      id: Number(o.id ?? 0),
      title: String(o.title ?? ''),
      type: o.type != null ? String(o.type) : null,
      sort_order: o.sort_order != null ? Number(o.sort_order) : null,
    }
  })
}

export type ClassGroupAssignmentRow = {
  id: number
  title: string
  due_date: string | null
  max_score: number | null
  status: string | null
}

export async function fetchClassGroupAssignments(groupId: number): Promise<ClassGroupAssignmentRow[]> {
  const res = await apiClient.get<unknown>(`/instructor/classes/${groupId}/assignments`, silent)
  const raw = extractPayload(res.data)
  const list = Array.isArray((raw as Record<string, unknown>).data) ? (raw as Record<string, unknown>).data as unknown[] : Array.isArray(res.data) ? res.data as unknown[] : []
  return list.map((r) => {
    const o = r as Record<string, unknown>
    return {
      id: Number(o.id ?? 0),
      title: String(o.title ?? ''),
      due_date: o.due_date != null ? String(o.due_date) : null,
      max_score: o.max_score != null ? Number(o.max_score) : null,
      status: o.status != null ? String(o.status) : null,
    }
  })
}
