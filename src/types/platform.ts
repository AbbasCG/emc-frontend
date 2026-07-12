/** Phase 5 — scale, knowledge, partner portal, advanced LMS, notifications, AI-ready */

export type KnowledgeVisibility = 'public' | 'internal'
export type KnowledgeStatus = 'draft' | 'published'

export type KnowledgeCategory = {
  id: string
  slug: string
  title: string
  description?: string
}

export type AdminKnowledgeCategory = {
  id: number
  name: string
  slug: string
  description?: string | null
  status?: string | null
  sort_order?: number
  parent_id?: number | null
  articles_count: number
  created_at?: string | null
  department?: { id: number; name: string } | null
  children?: AdminKnowledgeCategory[]
}

export type KnowledgeArticle = {
  id: number
  slug: string
  title: string
  excerpt?: string | null
  body?: string | null
  category_id: string
  tags?: string[]
  visibility: KnowledgeVisibility
  status: KnowledgeStatus
  updated_at: string
}

export type PartnerDashboardData = {
  partnership_status: string
  joint_programs_count: number
  participants_total: number
  impact_score: number
  upcoming_meetings: { id: number; title: string; at: string }[]
  recent_reports: { id: number; title: string; at: string }[]
}

export type PartnerProgramRow = {
  id: number
  title: string
  status: string
  cohort_size: number
  starts_at: string | null
}

export type LmsModule = {
  id: number
  course_id: number
  title: string
  sort_order: number
  lessons_count: number
  completed_lessons?: number
  assignments_count?: number
  submitted_assignments_count?: number
  progress_percentage?: number
  is_completed?: boolean
}

export type LmsLesson = {
  id: number
  module_id: number
  course_id: number
  title: string
  sort_order: number
  content_html?: string | null
  video_placeholder_url?: string | null
  materials?: { id: number; label: string; type: string }[]
  next_lesson_id?: number | null
  prev_lesson_id?: number | null
}

export type QuizQuestion = {
  id: number
  prompt: string
  choices: string[]
  correct_index: number
}

export type LmsQuiz = {
  id: number
  course_id: number
  title: string
  passing_score: number
  questions: QuizQuestion[]
}

export type QuizAttemptResult = {
  passed: boolean
  score: number
  passing_score: number
  correct_count: number
  total: number
}

export type NotificationType =
  | 'registration'
  | 'course_registration'
  | 'payment'
  | 'session_reminder'
  | 'assignment_due'
  | 'certificate_issued'
  | 'task_assigned'
  | 'meeting_invite'
  | 'support_reply'
  | 'partner_update'
  | 'volunteer_request'
  | 'course_update'
  | 'instructor_assigned'
  | 'schedule_update'
  | 'placement_result'
  | 'placement_test_completed'
  | 'oral_assessment_booked'
  | 'assignment_graded'
  | 'assignment_submitted'
  | 'assignment_created'
  | 'session_scheduled'
  | 'attendance_marked'

export type PlatformNotification = {
  id: number
  type: NotificationType
  title: string
  /** Body text shown below the title. */
  body?: string | null
  /** Alias of `body` — preferred field name per notification contract. */
  message?: string | null
  /** Derived from `read_at` — true when notification has been read. */
  is_read: boolean
  read_at: string | null
  created_at: string
  /** Resolved in-app route (from `action_url` or entity) */
  href?: string | null
  /** Raw link from API */
  action_url?: string | null
  entity_type?: string | null
  entity_id?: number | null
}

export type AutomationTrigger =
  | 'manual'
  | 'schedule'
  | 'webhook'
  | 'record_created'
  | 'registration_created'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'session_starts_soon'
  | 'assignment_due_soon'
  | 'certificate_issued'
  | 'task_overdue'
  | 'support_ticket_created'
  | 'partner_request_created'

/** Actions surfaced by Automation UI — persisted JSON merges selections server-side */
export type AutomationActionKind =
  | 'send_notification'
  | 'send_email'
  | 'send_whatsapp'
  | 'create_task'
  | 'create_meeting'
  | 'create_report'
  | 'call_webhook'
  | 'update_status'

export type AutomationRule = {
  id: number
  name: string
  trigger: AutomationTrigger
  active: boolean
  conditions_json: string
  actions_json: string
  updated_at: string
}

export type AutomationRun = {
  id: number
  rule_id: number
  rule_name: string
  status: 'success' | 'failed' | 'running'
  started_at: string
  finished_at?: string | null
  detail?: string | null
}

export type AiMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type AiConversation = {
  id: number
  title: string
  updated_at: string
}

export type SearchResultGroup = {
  type: string
  label: string
  items: { id: string | number; title: string; href: string; subtitle?: string }[]
}

export type GlobalSearchResponse = {
  query: string
  groups: SearchResultGroup[]
}

export type DocumentVisibility = 'internal' | 'management' | 'partner'

export type DocumentFolder = {
  id: string
  name: string
  parent_id: string | null
}

export type PlatformDocument = {
  id: number
  name: string
  folder_id: string | null
  visibility: DocumentVisibility
  related_label?: string | null
  size_label?: string | null
  updated_at: string
}

export type AuditLogEntry = {
  id: number
  action: string
  user_name: string
  entity_type: string
  entity_id: string
  created_at: string
  summary?: string | null
}

export type PlatformScaleData = {
  users?: number
  courses?: number
  instructors?: number
  registrations?: number
  total_users?: number
  active_courses?: number
  monthly_active_learners?: number
  api_requests_24h?: number
  storage_used_gb: number | null
  storage_total_gb: number | null
  storage_used_percent: number | null
  database_size_gb: number | null
  uploads_count: number | null
  queue_pending: number | null
  uptime_percent?: number | null
  regions?: string[]
}
