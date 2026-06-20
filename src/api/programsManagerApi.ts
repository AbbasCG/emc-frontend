import axios from 'axios'

export interface ProgramsManagerDashboardCounts {
  courses: number
  published_courses: number
  draft_courses: number
  learning_paths: number
  active_learning_paths: number
  registrations: number
  students: number
  sessions: number
  assignments: number
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

export interface DashboardWarning {
  type: string
  message: string
  count: number
}

export interface ProgramsManagerDashboard {
  success: boolean
  counts: ProgramsManagerDashboardCounts
  recent_courses: RecentCourse[]
  recent_learning_paths: RecentLearningPath[]
  upcoming_sessions: UpcomingSession[]
  warnings: DashboardWarning[]
}

export async function fetchProgramsManagerDashboard(): Promise<ProgramsManagerDashboard> {
  const { data } = await axios.get<ProgramsManagerDashboard>('/api/programs-manager/dashboard')
  return data
}
