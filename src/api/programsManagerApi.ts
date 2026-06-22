import axios from 'axios'

export interface ProgramsManagerSummary {
  courses: number
  published_courses: number
  draft_courses: number
  learning_paths: number
  published_paths: number
  registrations: number
  pending_registrations: number
  active_students: number
  upcoming_sessions: number
  pending_assignments: number
}

export interface RecentCourse {
  id: number
  title: string
  slug: string
  status: 'published' | 'draft'
  image_url: string | null
  instructor_name: string | null
  registrations_count: number
}

export interface RecentLearningPath {
  id: number
  title: string
  slug: string
  status: string
  courses_count: number
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
  course_title: string | null
  session_date: string
  start_time: string | null
  end_time: string | null
  status: string
  location: string | null
  meeting_url: string | null
}

export interface ProgramAlert {
  type: string
  message: string
  count: number
  severity: 'warning' | 'info' | 'action'
}

export interface ProgramsManagerDashboard {
  success: boolean
  summary: ProgramsManagerSummary
  courses: RecentCourse[]
  learning_paths: RecentLearningPath[]
  pending_registrations: PendingRegistration[]
  upcoming_sessions: UpcomingSession[]
  program_alerts: ProgramAlert[]
  recent_activity: unknown[]
}

export async function fetchProgramsManagerDashboard(): Promise<ProgramsManagerDashboard> {
  const { data } = await axios.get<ProgramsManagerDashboard>('/api/programs-manager/dashboard')
  return data
}
