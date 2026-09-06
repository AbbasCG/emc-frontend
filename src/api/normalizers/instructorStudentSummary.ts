/**
 * Shared compatibility adapter for `InstructorStudentSummaryResource`
 * (Ticket 2 — Single Source of Truth).
 *
 * Every instructor-facing student-row consumer (Instructor Students,
 * Placement, Course Students, Class Students) reads the same canonical
 * nested `student`/`course`/`registration`/`placement`/`class_assignment`/
 * `progress` sub-objects through the helpers below, instead of each page
 * re-implementing its own canonical-field lookup.
 *
 * These helpers only read already-backend-computed values — they never
 * calculate scores, percentages, levels, assignment status, or counts.
 * Callers remain responsible for their own legacy fallback fields; these
 * helpers return `undefined` (not a derived default) when the canonical
 * field is absent, so `??` composes correctly with `0`/`false`/`''` values.
 */

type Row = Record<string, unknown>

function asObject(v: unknown): Row | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : undefined
}

export function getCanonicalStudentIdentity(row: Row): {
  id?: number
  name?: string
  email?: string
  phone?: string
  avatar_url?: string
} {
  const student = asObject(row.student)
  if (!student) return {}
  return {
    id: student.id != null ? Number(student.id) : undefined,
    name: student.name != null ? String(student.name) : undefined,
    email: student.email != null ? String(student.email) : undefined,
    phone: student.phone != null ? String(student.phone) : undefined,
    avatar_url: student.avatar_url != null ? String(student.avatar_url) : undefined,
  }
}

export function getCanonicalCourse(row: Row): { id?: number; title?: string } {
  const course = asObject(row.course)
  if (!course) return {}
  return {
    id: course.id != null ? Number(course.id) : undefined,
    title: course.title != null ? String(course.title) : undefined,
  }
}

export function getCanonicalRegistration(row: Row): { status?: string } {
  const registration = asObject(row.registration)
  if (!registration) return {}
  return { status: registration.status != null ? String(registration.status) : undefined }
}

export function getCanonicalPlacement(row: Row): {
  written_score?: number
  written_total?: number
  written_percentage?: number
  written_level?: string
  oral_score?: number
  oral_level?: string
  oral_breakdown?: unknown
  final_level?: string
  status?: string
} {
  const placement = asObject(row.placement)
  if (!placement) return {}
  const written = asObject(placement.written)
  const oral = asObject(placement.oral)
  return {
    written_score:      written?.score != null ? Number(written.score) : undefined,
    written_total:      written?.total != null ? Number(written.total) : undefined,
    written_percentage: written?.percentage != null ? Number(written.percentage) : undefined,
    written_level:      written?.level != null ? String(written.level) : undefined,
    oral_score:         oral?.score != null ? Number(oral.score) : undefined,
    oral_level:         oral?.level != null ? String(oral.level) : undefined,
    oral_breakdown:     oral?.breakdown,
    final_level:        placement.final_level != null ? String(placement.final_level) : undefined,
    status:             placement.status != null ? String(placement.status) : undefined,
  }
}

export function getCanonicalClassAssignment(row: Row): {
  status?: string
  class_group_id?: number
  class_name?: string
  level_code?: string
  assigned_at?: string
  instructor_name?: string
  assigned_by_name?: string
  method?: string
  reason_details?: string[]
  is_assigned?: boolean
} {
  const ca = asObject(row.class_assignment)
  if (!ca) return {}
  return {
    status:           ca.status != null ? String(ca.status) : undefined,
    class_group_id:   ca.class_group_id != null ? Number(ca.class_group_id) : undefined,
    class_name:       ca.class_name != null ? String(ca.class_name) : undefined,
    level_code:       ca.level_code != null ? String(ca.level_code) : undefined,
    assigned_at:      ca.assigned_at != null ? String(ca.assigned_at) : undefined,
    instructor_name:  ca.instructor_name != null ? String(ca.instructor_name) : undefined,
    assigned_by_name: ca.assigned_by_name != null ? String(ca.assigned_by_name) : undefined,
    method:           ca.method != null ? String(ca.method) : undefined,
    reason_details:   Array.isArray(ca.reason_details) ? ca.reason_details.map(String) : undefined,
    is_assigned:      ca.status != null ? ca.status === 'assigned' : undefined,
  }
}

export function getCanonicalProgress(row: Row): {
  is_assigned?: boolean
  placement_status?: string
  placement_progress?: number
} {
  const progress = asObject(row.progress)
  if (!progress) return {}
  return {
    is_assigned:         progress.is_assigned != null ? Boolean(progress.is_assigned) : undefined,
    placement_status:    progress.placement_status != null ? String(progress.placement_status) : undefined,
    placement_progress:  progress.placement_progress != null ? Number(progress.placement_progress) : undefined,
  }
}
