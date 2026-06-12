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
  submission_id?: number | null
}

export type StudentAttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | string

export type StudentAttendanceRecord = {
  id: number
  session_id?: number | null
  course_session_id?: number | null
  session_title: string
  course_id?: number | null
  course_title?: string | null
  date?: string | null
  starts_at?: string | null
  status: StudentAttendanceStatus
  notes?: string | null
  marked_at?: string | null
}

export type StudentCertificateSummary = {
  id: number
  title: string
  course_name?: string | null
  track_name?: string | null
  issued_at?: string | null
  verification_code?: string | null
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

/** KPI counts from GET /student/dashboard — canonical backend field names. */
export type StudentDashboardCounts = {
  enrolled_courses_count: number
  active_courses_count: number
  completed_courses_count: number
  pending_assignments_count: number
  upcoming_sessions_count: number
  unread_notifications_count: number
  certificates_count: number
  learning_paths_count: number
}

export type StudentDashboardCourse = {
    id: number
    title: string
    slug?: string | null
    instructor_name?: string | null
    progress_percent?: number
    status?: string
    start_date?: string | null
    start_time?: string | null
    meeting_link?: string | null
    cover_url?: string | null
    requires_placement_test?: boolean
    placement_status?: string | null
    can_start_learning?: boolean | null
    class_assignment?: {
      class_group_id: number
      name: string
      level_code?: string | null
      schedule_day?: string | null
      schedule_time?: string | null
      location_type?: string | null
      meeting_link?: string | null
      start_date?: string | null
      instructor_name?: string | null
      assigned_at?: string | null
    } | null
}

export type StudentLmsDashboard = {
  progress_percent: number
  attendance_percent: number
  pending_assignments: StudentAssignment[]
  current_courses: StudentDashboardCourse[]
  /** Subset flagged active by backend, or derived from current_courses. */
  active_courses?: StudentDashboardCourse[]
  /** Recent enrollments slice from backend. */
  recent_courses?: StudentDashboardCourse[]
  /** Normalized KPI block — always present after normalizeStudentLmsDashboard. */
  counts: StudentDashboardCounts
  upcoming_sessions: LmsSession[]
  live_sessions?: LmsSession[]
  ended_sessions?: LmsSession[]
  all_sessions?: LmsSession[]
  completed_sessions?: LmsSession[]
  certificates?: StudentCertificateSummary[]
  certificates_count?: number
  training_hours?: number
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
  class_groups?: { id: number; name: string; course_id?: number | null; enrolled?: number | null }[]
  student_count: number
  class_groups_count?: number | null
  attendance_pending_count: number
  submissions_pending_count: number
  oral_pending_count?: number | null
  placement_pending_count?: number | null
  admin_notes_placeholder?: string | null
}

export type TeachingCourseLms = {
  id: number
  title: string
  slug?: string | null
  // Student counts (multiple backend names accepted)
  student_count?: number | null
  enrolled_students_count?: number | null
  students_count?: number | null
  // Canonical placement stats (backend v2)
  written_tests_count?: number | null
  oral_pending_count?: number | null
  oral_booked_count?: number | null
  final_level_count?: number | null
  // Legacy / alternate field names still accepted as fallbacks
  written_completed_count?: number | null
  placement_completed_count?: number | null
  waiting_oral_count?: number | null
  oral_completed_count?: number | null
  requires_placement_test?: boolean | null
  status?: string
  start_date?: string | null
  end_date?: string | null
  meeting_link?: string | null
  thumbnail?: string | null
  image?: string | null
}

export type InstructorSubmission = {
  id: number
  assignment_id?: number | null
  assignment_title: string
  course_name?: string | null
  student_name: string
  student_id: number
  submitted_at?: string | null
  status: 'pending_review' | 'reviewed' | 'needs_revision' | 'not_submitted'
  score?: number | null
  body_preview?: string | null
}

export type SubmissionDetail = InstructorSubmission & {
  body_text?: string | null
  file_url?: string | null
  max_score?: number | null
  feedback?: string | null
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export type AttendanceRow = {
  student_id: number
  student_name: string
  email?: string | null
  avatar_url?: string | null
  status: AttendanceStatus | null
  notes?: string | null
}

export type AdminLmsRow = {
  id: number
  label: string
  subtitle?: string | null
  status?: string | null
  updated_at?: string | null
}
