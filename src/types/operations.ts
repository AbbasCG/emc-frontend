/** ── Tasks ─────────────────────────────────────────────────────────────── */

export type TaskStatus =
  | 'idea'
  | 'study'
  | 'planning'
  | 'pending_approval'
  | 'in_progress'
  | 'done'
  | 'deferred'
  | 'cancelled'
  | 'needs_review'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type OpsTask = {
  id: number
  title: string
  description?: string | null
  department_id: string
  department_name?: string | null
  assignee_id?: number | null
  assignee_name?: string | null
  status: TaskStatus
  priority: TaskPriority
  due_at?: string | null
  tags?: string[]
  checklist_done?: number
  checklist_total?: number
  comments?: OpsComment[]
  checklist?: OpsChecklistItem[]
  related_type?: string | null
  related_label?: string | null
}

export type OpsChecklistItem = {
  id: number
  label: string
  done: boolean
}

export type OpsComment = {
  id: number
  author_name: string
  body: string
  created_at: string
}

/** ── Departments workspace ──────────────────────────────────────────────── */

export type DepartmentHealth = 'healthy' | 'attention' | 'risk'

export type WorkspaceDepartment = {
  id: string
  /** Primary label from API when present; optional when backend only sends name_ar/name/etc. */
  title?: string
  name_ar?: string | null
  name_en?: string | null
  name?: string | null
  department_name?: string | null
  label?: string | null
  description?: string
  leader_name?: string | null
  members_count: number
  /** Real backend count — null means tasks system not connected */
  open_tasks_count?: number | null
  /** Legacy field from /operations/departments */
  open_tasks: number
  leaders_count?: number
  courses_count?: number
  volunteer_requests_count?: number
  pending_items_count?: number
  meetings_week?: number
  status: DepartmentHealth
  health_score?: number
}

/** Rich admin department detail — from GET /admin/departments/:id */
export type AdminDepartment = {
  id: string | number
  name_ar: string
  name_en?: string | null
  description_ar?: string | null
  leader_name?: string | null
  members_count: number
  leaders_count: number
  courses_count: number
  volunteer_requests_count: number
  pending_items_count: number
  open_tasks_count: number | null
  status: DepartmentHealth
}

export type DepartmentDetail = WorkspaceDepartment & {
  sections?: { title: string; body: string }[]
  members_preview?: { name: string; role?: string }[]
  kpi_placeholder?: string[]
}

/** ── Meetings ─────────────────────────────────────────────────────────── */

export type MeetingType =
  | 'exec'
  | 'departments'
  | 'programs'
  | 'partnerships'
  | 'quality'
  | 'external'
  | 'general'

export type MeetingStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export type OpsMeeting = {
  id: number
  title: string
  starts_at?: string | null
  type: MeetingType
  department_id?: string | null
  department_name?: string | null
  organizer_name?: string | null
  status: MeetingStatus
}

export type OpsMeetingDetail = OpsMeeting & {
  meeting_date?: string | null
  start_time?: string | null
  end_time?: string | null
  meeting_url?: string | null
  agenda?: string | null
  attendees?: { name: string; role?: string }[]
  decisions?: { id: number; text: string }[]
  action_items?: OpsActionItem[]
  minutes?: string | null
  recording_link?: string | null
}

export type OpsActionItem = {
  id: number
  text: string
  owner?: string | null
  due_at?: string | null
  done?: boolean
}

/** ── Forms ─────────────────────────────────────────────────────────────── */

export type FormTypeSlug =
  | 'student_register'
  | 'volunteer_register'
  | 'partnership_request'
  | 'course_eval'
  | 'workshop_eval'
  | 'trainer_eval'
  | 'new_program_request'
  | 'meeting_form'
  | 'activity_report'
  | 'complaint'
  | 'suggestion'
  | 'grant_request'

export type QuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number'

export type FormQuestion = {
  id: number
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
  sort_order: number
}

export type OpsFormDefinition = {
  id: number
  title: string
  description?: string | null
  slug: string
  form_type: FormTypeSlug
  questions: FormQuestion[]
}

export type FormSubmissionRow = {
  id: number
  submitted_at: string
  submitter_label?: string | null
  answers_preview?: string
}

/** ── Volunteers ────────────────────────────────────────────────────────── */

export type VolunteerStatus =
  | 'applied'
  | 'review'
  | 'accepted'
  | 'active'
  | 'partial'
  | 'inactive'
  | 'withdrawn'

export type OpsVolunteer = {
  id: number
  name: string
  department_id?: string | null
  department_name?: string | null
  status: VolunteerStatus
  skills?: string[]
  availability?: string | null
  hours_logged?: number
  onboarding_step?: string | null
}

/** ── Partners ──────────────────────────────────────────────────────────── */

export type PartnerRecord = {
  id: number
  name: string
  type?: string | null
  /** Institutional category (e.g. university/company/NGO) — distinct from `type` (partnership type). */
  institution_type?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  country?: string | null
  city?: string | null
  status?: string | null
  notes?: string | null
  project_scope: string
  classification?: string | null
  field_of_work?: string | null
  contact_position?: string | null
  assigned_to?: string | null
  first_contact_date?: string | null
  last_contact_date?: string | null
  rejection_reason?: string | null
  attachment_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type PartnershipRequest = {
  id: number
  partner_name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  country?: string | null
  city?: string | null
  website?: string | null
  type?: string | null
  type_other?: string | null
  partnership_type?: string | null
  partnership_type_other?: string | null
  message?: string | null
  privacy_accepted?: boolean
  status: string
  created_at: string
  reviewed_by?: { id: number; name: string } | null
}

/** ── Marketing ─────────────────────────────────────────────────────────── */

export type MarketingContentStatus =
  | 'idea'
  | 'writing'
  | 'design'
  | 'review'
  | 'approval'
  | 'scheduled'
  | 'published'
  | 'archived'

export type MarketingItem = {
  id: number
  title: string
  platform?: string | null
  status: MarketingContentStatus
  publish_at?: string | null
  owner_name?: string | null
  related_program?: string | null
}

/** ── Support ───────────────────────────────────────────────────────────── */

export type SupportTicketStatus = 'new' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed'

export type AssigneeUser = {
  id: number
  name: string
  email?: string | null
  role?: string | null
  department?: string | null
  avatar?: string | null
  active_tickets?: number
}

export type TicketActivity = {
  id: number
  action: string
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  user?: { id: number; name: string; avatar?: string | null; role?: string | null } | null
  created_at: string
}

export type SupportTicket = {
  id: number
  ticket_number?: string | null
  subject: string
  type?: string | null
  request_type?: string | null
  priority?: string | null
  status: SupportTicketStatus
  full_name?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  assigned_to?: { id: number; name: string; email?: string; role?: string; department?: string; avatar?: string | null } | null
  replies_count?: number
  last_reply_at?: string | null
  resolved_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type SupportTicketReply = {
  id: number
  author_name: string
  body: string
  internal?: boolean
  created_at: string
  user_id?: number | null
  sender_id?: number | null
  author_id?: number | null
}

export type SupportTicketDetail = SupportTicket & {
  message?: string | null
  replies?: SupportTicketReply[]
}

/** ── Operations dashboard ─────────────────────────────────────────────── */

export type OperationsDashboardData = {
  active_departments: number
  open_tasks: number
  overdue_tasks: number
  upcoming_meetings: number
  pending_partnership_requests: number
  volunteer_applications: number
  support_tickets_open: number
  marketing_in_review: number
  recent_activity?: { id: number; label: string; at: string; kind: string }[]
  department_health?: { department_id: string; title: string; score: number }[]
}
