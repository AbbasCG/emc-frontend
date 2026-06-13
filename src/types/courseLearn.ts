import type { LmsSessionStatus } from './lms'

/** GET /student/courses/:courseId/learn — normalized view */
export type StudentLearnCourseOverview = {
  id: number
  title: string
  slug?: string | null
  instructor_name?: string | null
  description?: string | null
  course_image?: string | null
}

export type CourseLearnSession = {
  id: number
  course_id?: number | null
  module_id?: number | null
  title?: string | null
  description?: string | null
  start_at?: string | null
  end_at?: string | null
  starts_at?: string | null
  ends_at?: string | null
  date?: string | null
  time?: string | null
  meeting_url?: string | null
  meeting_link?: string | null
  recording_url?: string | null
  location_type?: 'online' | 'offline' | 'hybrid' | string | null
  location?: string | null
  status: LmsSessionStatus | string
  type?: 'online' | 'offline' | null
  instructor_name?: string | null
}

export type CourseLearnMaterialKind = 'pdf' | 'video' | 'link' | 'slides' | 'document' | 'other'

export type CourseLearnMaterial = {
  id: number
  course_id?: number | null
  module_id?: number | null
  title: string
  description?: string | null
  kind: CourseLearnMaterialKind | string
  file_url?: string | null
  external_url?: string | null
  url?: string | null
  visibility?: 'public' | 'enrolled' | string | null
  updated_at?: string | null
}

export type CourseLearnAssignmentSubmissionType = 'text' | 'file' | 'both' | string

/** Student-facing assignment row (mirrors LMS submit contract) */
export type CourseLearnAssignment = {
  id: number
  course_assignment_id?: number
  assignment_id?: number
  lms_assignment_id?: number
  module_id?: number | null
  title: string
  description?: string | null
  instructions?: string | null
  due_at?: string | null
  max_points?: number | null
  submission_type?: CourseLearnAssignmentSubmissionType | null
  required?: boolean
  is_required?: boolean
  visible?: boolean
  is_visible?: boolean
  /** Student status — when learner context */
  status?: string | null
  score?: number | null
  feedback?: string | null
  submitted_at?: string | null
  resubmission_allowed?: boolean
  my_submission?: {
    submitted_at?: string | null
    status?: string | null
    text_answer?: string | null
    score?: number | null
    feedback?: string | null
  } | null
}

export type ModuleLesson = {
  id: number
  title: string
  description?: string | null
  video_url?: string | null
  duration_minutes?: number | null
  sort_order: number
  status: string
}

export type StudentLearnModule = {
  id: number
  course_id?: number
  title: string
  description?: string | null
  sort_order: number
  lessons_count: number
  completed_lessons?: number
  completed_lessons_count?: number
  assignments_count?: number
  submitted_assignments_count?: number
  progress_percentage?: number
  is_completed?: boolean
  /** Full children — present when backend returns enriched module tree */
  lessons?: ModuleLesson[]
  materials?: CourseLearnMaterial[]
  sessions?: CourseLearnSession[]
  assignments?: CourseLearnAssignment[]
}

export type CourseLearnClassGroup = {
  id: number
  name: string
  level_code?: string | null
  schedule_day?: string | null
  schedule_time?: string | null
  location_type?: string | null
  meeting_link?: string | null
}

export type StudentCourseLearnPayload = {
  course: StudentLearnCourseOverview | null
  progress_percent?: number | null
  registration_status?: string | null
  class_group?: CourseLearnClassGroup | null
  modules: StudentLearnModule[]
  sessions: CourseLearnSession[]
  materials: CourseLearnMaterial[]
  assignments: CourseLearnAssignment[]
}
