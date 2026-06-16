import apiClient from './axios'

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
  duration_minutes: number
  is_available: boolean
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

/**
 * Normalise a raw slot from any backend shape.
 * Supports starts_at/start_time/start/date + ends_at/end_time/end for date/time extraction.
 */
function normalizeOralSlot(r: unknown): OralSlot {
  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    return { id: 0, instructor_id: 0, instructor_name: '', date: '', time: '', duration_minutes: 30, is_available: false }
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
    duration_minutes: durationMinutes,
    is_available:     o.is_available !== false,
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

  const score =
    att.score          != null ? Number(att.score)          :
    att.written_score  != null ? Number(att.written_score)  :
    r.written_score    != null ? Number(r.written_score)    :
    ppWt.score         != null ? Number(ppWt.score)         : null

  const total =
    att.total_questions  != null ? Number(att.total_questions)  :
    r.total_questions    != null ? Number(r.total_questions)    :
    ppWt.total_questions != null ? Number(ppWt.total_questions) : null

  const pct =
    score != null && total != null && total > 0
      ? Math.round((score / total) * 100)
      : (att.percentage ?? r.percentage ?? ppWt.percentage) != null
        ? Number(att.percentage ?? r.percentage ?? ppWt.percentage)
        : null

  const levelStr = String(
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

  return {
    attempt_id:      Number(r.attempt_id ?? att.id ?? ppWt.id ?? 0),
    booking_id:      Number(r.booking_id ?? r.oral_assessment_booking_id ?? ppOa.id ?? 0),
    student_id:      Number(r.student_id ?? 0),
    student_name:    String(r.student_name ?? r.name ?? ''),
    email:           String(r.student_email ?? r.email ?? ''),
    written_score:   score,
    total_questions: total,
    written_level:   levelStr,
    oral_booking_at: oralBookingAt,
    final_level:     r.final_level    != null ? String(r.final_level)    :
                     ppOa.final_level != null ? String(ppOa.final_level) : null,
    oral_score:      r.oral_score    != null ? Number(r.oral_score)    :
                     ppOa.oral_score  != null ? Number(ppOa.oral_score)  : null,
    status:          coalesceStatus(mappedStatus),
    notes:           r.instructor_notes != null ? String(r.instructor_notes) :
                     r.notes           != null ? String(r.notes)            : null,
    submitted_at:    submittedAt,
    percentage:      pct,
    avatar_url:      r.avatar_url != null ? String(r.avatar_url) :
                     r.profile_photo_url != null ? String(r.profile_photo_url) : null,
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

export type InstructorAvailabilitySlot = {
  id: number
  course_id: number | null
  course_title: string | null
  starts_at: string
  ends_at: string
  is_available: boolean
  notes: string | null
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
    notes:        r.notes != null ? String(r.notes) : null,
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
}

function normalizePlacementTestRow(r: unknown): InstructorPlacementTestRow {
  if (!r || typeof r !== 'object') {
    return { attempt_id: 0, student_id: 0, student_name: '', student_email: '', course_id: 0, course_title: '', written_score: null, total_questions: null, percentage: null, written_level: null, oral_score: null, oral_booking_ends_at: null, avatar_url: null, status: 'not_started', submitted_at: null, oral_booking_at: null, final_level: null }
  }
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
  return {
    attempt_id:    Number(o.attempt_id ?? o.id ?? 0),
    student_id:    Number(o.student_id ?? o.id ?? 0),
    student_name:  String(o.student_name ?? o.name ?? ''),
    student_email: String(o.student_email ?? o.email ?? ''),
    course_id:     Number(o.course_id ?? 0),
    course_title:  resolveCourseTitle(o),
    written_score: score,
    total_questions: total,
    percentage:    pct,
    written_level:        String(att?.written_level ?? att?.estimated_level ?? o.written_level ?? o.estimated_level ?? '') || null,
    oral_score:           o.oral_score != null ? Number(o.oral_score) : att?.oral_score != null ? Number(att.oral_score) : null,
    oral_booking_ends_at: oralObj?.ends_at != null ? String(oralObj.ends_at) : o.oral_booking_ends_at != null ? String(o.oral_booking_ends_at) : null,
    avatar_url:           o.avatar_url != null ? String(o.avatar_url) : o.profile_photo_url != null ? String(o.profile_photo_url) : null,
    status:               coalesceStatus(att?.status ?? o.status ?? o.placement_status),
    submitted_at:         o.submitted_at != null ? String(o.submitted_at) : att?.submitted_at != null ? String(att.submitted_at) : null,
    oral_booking_at:      oralObj?.starts_at != null ? String(oralObj.starts_at) : o.oral_booking_at != null ? String(o.oral_booking_at) : null,
    final_level:          o.final_level != null ? String(o.final_level) : att?.final_level != null ? String(att.final_level) : null,
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
  schedule_day: string | null
  schedule_time: string | null
  location_type: string
  meeting_link: string | null
  status: 'draft' | 'ready' | 'active' | 'completed' | 'archived'
  created_at: string
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
}

function normalizeClassGroup(r: unknown): ClassGroup {
  if (!r || typeof r !== 'object') {
    return { id: 0, course_id: 0, course_title: null, instructor_id: null, level_code: null, name: '', capacity: 20, enrolled: 0, remaining: 20, start_date: null, schedule_day: null, schedule_time: null, location_type: 'online', meeting_link: null, status: 'draft', created_at: '' }
  }
  const o = r as Record<string, unknown>
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
  schedule_day?: string | null
  schedule_time?: string | null
  location_type?: string
  meeting_link?: string | null
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

/** Students enrolled in a class group (for attendance drawer / roster). */
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
    const user =
      o.user && typeof o.user === 'object' && !Array.isArray(o.user)
        ? (o.user as Record<string, unknown>)
        : null
    return {
      student_id:       Number(o.student_id ?? o.user_id ?? user?.id ?? 0),
      student_name:     String(o.student_name ?? user?.name ?? o.name ?? ''),
      student_email:    String(o.student_email ?? user?.email ?? o.email ?? ''),
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
      is_assigned:      o.is_assigned != null ? !!o.is_assigned : true,
      avatar_url:       o.avatar_url != null ? String(o.avatar_url) : user?.avatar_url != null ? String(user.avatar_url) : null,
    }
  }).filter((s) => s.student_id > 0 && s.student_name.trim() !== '')
}
