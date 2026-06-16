import type { LucideIcon } from 'lucide-react'

export type UserRole = 'student' | 'teacher' | 'instructor' | 'admin' | 'partner' | 'super_admin'

export type User = {
  id: number
  name: string
  email: string
  phone?: string | null
  city?: string | null
  country?: string | null
  gender?: string | null
  department?: string | null
  how_did_you_hear_about_us?: string | null
  instructor_bio?: string | null
  avatar_url?: string | null
  /** When API exposes verification / timestamps (may be omitted on lite payloads). */
  email_verified_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_login_at?: string | null
  is_active?: boolean | null
  /** Backends may return extended roles beyond the frontend union — keep readable on profile. */
  role?: UserRole | string | null
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
  /** Alternate media keys from various backends */
  image_url?: string | null
  thumbnail?: string | null
  image?: string | null
  cover_image?: string | null
  /** Some APIs expose explicit free flag */
  is_free?: boolean | number | null
  seats_count?: number | null
  delivery_type?: string | null

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

  /** Placement test requirement — set when backend indicates test is needed */
  requires_placement_test?: boolean
  requires_placement?: boolean

  /** Admin/catalog extensions — backends may omit any of these */
  program_kind?: string | null
  /** بعض الـ APIs تستخدم program_type بدلاً من program_kind */
  program_type?: string | null
  track_id?: number | null
  track?: { id: number; title?: string | null; slug?: string | null } | null
  track_title?: string | null
  department_id?: number | null
  department?: { id: number; name?: string | null } | null
  department_name?: string | null
  instructor_id?: number | null
  registrations_count?: number | null
  effective_enrollment_count?: number | null
  is_published?: boolean | number | null
  registration_open?: boolean | number | null
  start_time?: string | null
  end_time?: string | null
  meeting_link?: string | null
  location_type?: string | null
  /** عرض عربي محفوظ من لوحة الإدارة — يغيّر صفحة الزائر عند وجوده */
  session_format?: string | null
  prerequisites?: string | null
  learning_outcomes?: string | null
  keywords?: string | null
  admin_notes?: string | null

  /** Learning path membership — injected by AdminCourseController */
  learning_path?: {
    id: number
    title: string
    slug: string
    status: string
  } | null
  is_part_of_learning_path?: boolean
  learning_path_status?: string | null
  can_delete?: boolean
  can_archive?: boolean
  can_deactivate?: boolean
  lock_reason?: string | null

  /** Optional WhatsApp community link for the course (must start with https://chat.whatsapp.com/) */
  whatsapp_community_url?: string | null
}

export type CourseFilter = 'all' | 'free' | 'paid' | 'online' | 'offline'

export type DashboardStats = {
  enrolled_courses: number
  upcoming_sessions: number
  completed_certificates: number
  training_hours: number
}

export type ClassAssignment = {
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
}

export type Enrollment = {
  id: number
  course: Course
  enrolled_at: string
  completed_sessions: number
  total_sessions: number
  status: 'active' | 'completed' | 'pending'
  /** Placement test state from backend — preserved through normalization pipeline */
  placement_status?: string | null
  placement_score?: number | null
  placement_total?: number | null
  placement_percentage?: number | null
  placement_estimated_level?: string | null
  /** Oral assessment booking fields */
  oral_booking_status?: string | null
  oral_booking_starts_at?: string | null
  oral_booking_ends_at?: string | null
  oral_final_level?: string | null
  oral_score?: number | null
  can_start_learning?: boolean | null
  /** Class group assignment — set after instructor assigns the student */
  class_assignment?: ClassAssignment | null
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
  pending_payments?: number
  workshop_requests?: number
  active_workshops?: number
  tracks_count?: number
  instructors_count?: number
  departments_count?: number
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
