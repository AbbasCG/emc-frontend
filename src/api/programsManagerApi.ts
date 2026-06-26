import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

export interface ProgramsManagerSummary {
  programs: number
  published_programs: number
  courses: number
  published_courses: number
  ended_courses: number
  draft_courses: number
  learning_paths: number
  published_paths: number
  registrations: number
  pending_registrations: number
  active_students: number
  active_instructors: number
  upcoming_sessions: number
  pending_assignments: number
  pending_reviews: number
  materials_total: number
  attendance_average: number
  completion_average: number
}

export interface MonthlyPoint {
  month: string
  label: string
  count: number
}

export interface PipelineStage {
  status: string
  label: string
  count: number
}

export interface AssignmentStats {
  pending_review: number
  needs_resubmission: number
  completed: number
  total_submissions: number
}

export interface RecentCourse {
  id: number
  title: string
  slug: string
  status: string
  image_url: string | null
  instructor_name: string | null
  instructor_id: number | null
  registrations_count: number
  created_at: string | null
}

export interface RecentLearningPath {
  id: number
  title: string
  slug: string
  status: string
  courses_count: number
  students_count: number
  featured_image: string | null
}

export interface PendingRegistration {
  id: number
  student: string | null
  email: string | null
  course: string | null
  submitted_at: string | null
  status: string
}

export interface UpcomingSession {
  id: number
  title: string | null
  course_title: string | null
  instructor_name: string | null
  session_date: string
  start_time: string | null
  end_time: string | null
  status: string
  location: string | null
  meeting_url: string | null
  students_count: number
}

export interface InstructorActivityRow {
  id: number
  name: string
  courses_count: number
  sessions_count: number
  assignments_count: number
  students_count: number
}

export interface ProgramAlert {
  type: string
  message: string
  count: number
  severity: 'warning' | 'info' | 'action'
}

export interface ActivityItem {
  id: number
  action: string
  action_label: string
  entity_type: string
  entity_name: string | null
  description: string | null
  user_name: string | null
  created_at: string | null
}

export interface ProgramsManagerAnalytics {
  registrations_monthly: MonthlyPoint[]
  courses_monthly: MonthlyPoint[]
  sessions_monthly: MonthlyPoint[]
  paths_monthly: MonthlyPoint[]
}

export interface ProgramsManagerDashboardPayload {
  summary: ProgramsManagerSummary
  registration_pipeline: PipelineStage[]
  assignment_stats: AssignmentStats
  analytics: ProgramsManagerAnalytics
  courses: RecentCourse[]
  learning_paths: RecentLearningPath[]
  pending_registrations: PendingRegistration[]
  upcoming_sessions: UpcomingSession[]
  instructor_activity: InstructorActivityRow[]
  program_alerts: ProgramAlert[]
  recent_activity: ActivityItem[]
}

function normalizePayload(raw: unknown): ProgramsManagerDashboardPayload {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const emptySummary: ProgramsManagerSummary = {
    programs: 0,
    published_programs: 0,
    courses: 0,
    published_courses: 0,
    ended_courses: 0,
    draft_courses: 0,
    learning_paths: 0,
    published_paths: 0,
    registrations: 0,
    pending_registrations: 0,
    active_students: 0,
    active_instructors: 0,
    upcoming_sessions: 0,
    pending_assignments: 0,
    pending_reviews: 0,
    materials_total: 0,
    attendance_average: 0,
    completion_average: 0,
  }
  const summary = { ...emptySummary, ...(o.summary as object) }
  const analyticsRaw = (o.analytics ?? {}) as Record<string, unknown>
  return {
    summary,
    registration_pipeline: Array.isArray(o.registration_pipeline) ? o.registration_pipeline as PipelineStage[] : [],
    assignment_stats: (o.assignment_stats as AssignmentStats) ?? {
      pending_review: 0,
      needs_resubmission: 0,
      completed: 0,
      total_submissions: 0,
    },
    analytics: {
      registrations_monthly: Array.isArray(analyticsRaw.registrations_monthly) ? analyticsRaw.registrations_monthly as MonthlyPoint[] : [],
      courses_monthly: Array.isArray(analyticsRaw.courses_monthly) ? analyticsRaw.courses_monthly as MonthlyPoint[] : [],
      sessions_monthly: Array.isArray(analyticsRaw.sessions_monthly) ? analyticsRaw.sessions_monthly as MonthlyPoint[] : [],
      paths_monthly: Array.isArray(analyticsRaw.paths_monthly) ? analyticsRaw.paths_monthly as MonthlyPoint[] : [],
    },
    courses: Array.isArray(o.courses) ? o.courses as RecentCourse[] : [],
    learning_paths: Array.isArray(o.learning_paths) ? o.learning_paths as RecentLearningPath[] : [],
    pending_registrations: Array.isArray(o.pending_registrations) ? o.pending_registrations as PendingRegistration[] : [],
    upcoming_sessions: Array.isArray(o.upcoming_sessions) ? o.upcoming_sessions as UpcomingSession[] : [],
    instructor_activity: Array.isArray(o.instructor_activity) ? o.instructor_activity as InstructorActivityRow[] : [],
    program_alerts: Array.isArray(o.program_alerts) ? o.program_alerts as ProgramAlert[] : [],
    recent_activity: Array.isArray(o.recent_activity) ? o.recent_activity as ActivityItem[] : [],
  }
}

export async function fetchProgramsManagerDashboard(): Promise<ProgramsManagerDashboardPayload> {
  const { data } = await apiClient.get<unknown>('/programs-manager/dashboard', { skipErrorToast: true })
  const unwrapped = unwrapData<unknown>(data)
  if (unwrapped && typeof unwrapped === 'object' && 'summary' in (unwrapped as object)) {
    return normalizePayload(unwrapped)
  }
  if (data && typeof data === 'object' && 'summary' in data) {
    return normalizePayload(data)
  }
  return normalizePayload(unwrapped ?? data)
}
