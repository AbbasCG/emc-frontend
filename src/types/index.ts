import type { LucideIcon } from 'lucide-react'

export type UserRole = 'student' | 'teacher' | 'admin'

export type User = {
  id: number
  name: string
  email: string
  phone?: string | null
  city?: string | null
  gender?: string | null
  role?: UserRole
}

export type Course = {
  id: number
  title: string
  slug: string
  description?: string | null
  short_description?: string | null
  instructor_name?: string | null
  type: 'free' | 'paid'
  price: number | string
  location?: string | null
  is_online: boolean | number
  start_date?: string | null
  end_date?: string | null
  capacity?: number | null
  status?: string

  duration?: string | null
  training_hours?: number | null
  target_audience?: string | null
  language?: string | null
  level?: string | null
  study_days?: string | null
  study_time?: string | null
  certificate?: string | null
  course_image?: string | null

  instructor?: {
    id: number
    name: string
    title?: string | null
    bio?: string | null
    image?: string | null
  } | null

  features?: {
    id: number
    course_id?: number
    title: string
    sort_order?: number
  }[]
}

export type CourseFilter = 'all' | 'free' | 'paid' | 'online' | 'offline'

export type DashboardStats = {
  enrolled_courses: number
  upcoming_sessions: number
  completed_certificates: number
  training_hours: number
}

export type Enrollment = {
  id: number
  course: Course
  enrolled_at: string
  completed_sessions: number
  total_sessions: number
  status: 'active' | 'completed' | 'pending'
}

export type UpcomingSession = {
  id: number
  course_name: string
  date: string
  time?: string | null
  type: 'online' | 'offline'
  instructor_name?: string | null
  location?: string | null
  meeting_link?: string | null
  platform?: 'zoom' | 'meet' | 'teams' | null
}

export type Notification = {
  id: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning'
  is_read: boolean
  created_at: string
}

export type StudentDashboard = {
  stats: DashboardStats
  enrollments: Enrollment[]
  upcoming_sessions: UpcomingSession[]
  notifications: Notification[]
}

// ---------------------------------------------------------------------------
// Teacher dashboard
// ---------------------------------------------------------------------------

export type TeacherStats = {
  total_students: number
  upcoming_sessions: number
  active_courses: number
  completion_rate: number
}

export type TeachingCourse = {
  id: number
  title: string
  slug: string
  student_count: number
  upcoming_sessions: number
  status: 'active' | 'completed' | 'upcoming'
}

export type TeacherDashboardData = {
  stats: TeacherStats
  courses: TeachingCourse[]
  upcoming_sessions: UpcomingSession[]
}

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------

export type AdminStats = {
  total_users: number
  active_courses: number
  total_enrollments: number
  total_programs: number
}

export type RecentRegistration = {
  id: number
  student_name: string
  course_name: string
  enrolled_at: string
  status: 'active' | 'pending' | 'completed'
}

export type AdminDashboardData = {
  stats: AdminStats
  recent_registrations: RecentRegistration[]
}

export type NavLinkItem = {
  label: string
  href: string
}

export type IconComponent = LucideIcon
