import type { AssignmentStatus } from '@/types/lms'

/** LMS Assignment PK used by POST /student/assignments/{id}/submit. */
export function resolveLmsAssignmentSubmitId(raw: {
  lms_assignment_id?: number | null
  assignment_id?: number | null
  id?: number | null
  course_assignment_id?: number | null
}): number | null {
  const lmsRaw = raw.lms_assignment_id ?? raw.assignment_id
  if (lmsRaw != null && Number.isFinite(Number(lmsRaw)) && Number(lmsRaw) > 0) {
    return Number(lmsRaw)
  }

  const rowId = raw.id != null ? Number(raw.id) : NaN
  if (Number.isFinite(rowId) && rowId > 0) return rowId

  const courseAssignmentId =
    raw.course_assignment_id != null ? Number(raw.course_assignment_id) : null
  if (courseAssignmentId != null && Number.isFinite(courseAssignmentId) && courseAssignmentId > 0) {
    return courseAssignmentId
  }

  return null
}

export function normalizeAssignmentStatus(raw: string | null | undefined): AssignmentStatus {
  const s = String(raw ?? '').toLowerCase()
  if (/grad|reviewed|nota/.test(s)) return 'graded'
  if (/submit|turned|deliver|مسلم|تم\s*التسليم/.test(s)) return 'submitted'
  if (/revision|needs|rev\b/.test(s)) return 'revision'
  if (/late|متأخر|overdue/.test(s)) return 'late'
  return 'pending'
}
