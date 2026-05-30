/** ── Shared LMS ─────────────────────────────────────────────────────────── */

export type LmsSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export type LmsSession = {
  id: number
  /** When present, used to scope sessions to registered courses */
  course_id?: number | null
  title?: string | null
  course_name: string
  course_slug?: string | null
  starts_at?: string | null
  ends_at?: string | null
  /** Display-ready date/time (API may send instead of ISO) */
  date?: string | null
  time?: string | null
  status: LmsSessionStatus
  type?: 'online' | 'offline'
  instructor_name?: string | null
  location?: string | null
  meeting_link?: string | null
  recording_link?: string | null
  platform?: string | null
}

export type MaterialKind = 'pdf' | 'video' | 'link' | 'slides' | 'document' | 'other'

export type LmsMaterial = {
  id: number
  course_id?: number | null
  title: string
  kind: MaterialKind
  url?: string | null
  description?: string | null
  course_name?: string | null
  size_label?: string | null
  updated_at?: string | null
}

export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'revision' | 'late'

export type StudentAssignment = {
  id: number
  course_id?: number | null
  assignment_id: number
  title: string
  course_name?: string | null
  due_at?: string | null
  status: AssignmentStatus
  score?: number | null
  max_score?: number | null
  feedback?: string | null
  submitted_at?: string | null
}

export type StudentProgressPayload = {
  course_progress: {
    course_id: number
    course_title: string
    slug?: string | null
    progress_percent: number
    sessions_completed: number
    sessions_total: number
    assignments_done: number
    assignments_total: number
  }[]
  track_progress?: { track_id: number; title: string; progress_percent: number }[]
  attendance_percent: number
  overall_assignment_completion: number
}

export type StudentLmsDashboard = {
  progress_percent: number
  attendance_percent: number
  pending_assignments: StudentAssignment[]
  current_courses: {
    id: number
    title: string
    slug?: string | null
    instructor_name?: string | null
    progress_percent?: number
    status?: string
    start_date?: string | null
    start_time?: string | null
    meeting_link?: string | null
  }[]
  upcoming_sessions: LmsSession[]
  completed_sessions?: LmsSession[]
  certificates_placeholder?: { label: string; note?: string }[]
  /** Notifications embedded in dashboard response — duck-typed for compatibility. */
  notifications?: {
    id?: number | string
    title?: string | null
    message?: string | null
    body?: string | null
    type?: string | null
    is_read?: boolean
    read_at?: string | null
    created_at?: string | null
    href?: string | null
    action_url?: string | null
  }[]
}

export type InstructorLmsDashboard = {
  assigned_courses: TeachingCourseLms[]
  upcoming_sessions: LmsSession[]
  student_count: number
  attendance_pending_count: number
  submissions_pending_count: number
  admin_notes_placeholder?: string | null
}

export type TeachingCourseLms = {
  id: number
  title: string
  slug?: string | null
  student_count?: number
  status?: string
  start_date?: string | null
  end_date?: string | null
  meeting_link?: string | null
}

export type InstructorSubmission = {
  id: number
  assignment_title: string
  student_name: string
  student_id: number
  submitted_at?: string | null
  status: 'pending_review' | 'reviewed' | 'needs_revision'
  score?: number | null
  body_preview?: string | null
}

export type SubmissionDetail = InstructorSubmission & {
  body_text?: string | null
  file_url?: string | null
  max_score?: number | null
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export type AttendanceRow = {
  student_id: number
  student_name: string
  email?: string | null
  status: AttendanceStatus | null
}

export type AdminLmsRow = {
  id: number
  label: string
  subtitle?: string | null
  status?: string | null
  updated_at?: string | null
}
