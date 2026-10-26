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
  /** departments.leader_id — the canonical department-leadership relationship. Null = no leader configured. */
  leader_id?: number | null
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

/** The values the API stores (`meetings.type`). */
export type MeetingType =
  | 'executive'
  | 'department'
  | 'programs'
  | 'partnerships'
  | 'quality'
  | 'external_partner'
  | 'general'

/** `meetings.status`: what is recorded about the meeting itself. */
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

/**
 * The single plain state the UI badges, computed by the server:
 * - awaiting_report: held (or due) and no official report yet
 * - report_submitted: the meeting's one official report exists
 */
export type MeetingDisplayStatus = 'scheduled' | 'in_progress' | 'awaiting_report' | 'report_submitted' | 'cancelled'

export type MeetingRef = { id: number; name: string }

/** What the signed-in viewer may do with this meeting, as decided by the server. */
export type MeetingCapabilities = {
  can_view: boolean
  can_join: boolean
  can_confirm_attendance: boolean
  can_manage: boolean
  can_upload_report: boolean
  can_view_report: boolean
  can_view_attendance: boolean
  can_view_quality_data: boolean
}

/** Who the meeting is for: invited people, a whole department, or nobody in particular. */
export type MeetingAudience = 'explicit' | 'department' | 'general'

export type ParticipantStatus = 'invited' | 'joined' | 'attended' | 'absent'
export type ExcuseStatus = 'with_excuse' | 'without_excuse'

export type MyAttendance = {
  status: ParticipantStatus
  excuse_status?: ExcuseStatus | null
  excuse_reason?: string | null
  joined_at: string | null
  confirmed_at: string | null
}

export type OpsMeeting = {
  id: number
  title: string
  type: MeetingType
  status: MeetingStatus
  display_status: MeetingDisplayStatus
  /** `YYYY-MM-DD`, the meeting's own wall-clock date (Europe/Amsterdam). */
  meeting_date: string | null
  /** `HH:MM` 24-hour */
  start_time: string | null
  end_time: string | null
  department: MeetingRef | null
  organizer: MeetingRef | null
  moderator?: MeetingRef | null
  top_interactive_user?: MeetingRef | null
  discipline_rate?: number | null
  /** The join link. Present only for someone assigned to the meeting. */
  meeting_url: string | null
  audience: MeetingAudience
  my_attendance: MyAttendance | null
  /** Only present for someone who may see attendance. */
  participants_count: number | null
  has_report: boolean
  report_id: number | null
  capabilities: MeetingCapabilities
  created_at: string | null
}

/** One person who can be invited or marked present. `department` is shown as secondary text. */
export type MeetingCandidate = {
  id: number
  name: string
  role: string | null
  role_title: string | null
  department: string | null
}

export type MeetingParticipantRow = {
  user: { id: number; name: string; department: string | null }
  status: ParticipantStatus
  excuse_status?: ExcuseStatus | null
  excuse_reason?: string | null
  joined_at: string | null
  confirmed_at: string | null
}

export type AttendanceSummary = {
  invited: number
  joined: number
  attended: number
  absent: number
}

/** The one official report of a meeting (the periodic report filed from the lounge). */
export type MeetingReportView = {
  id: number
  absentees: string[]
  team_commitment_score: number | null
  team_commitment_notes: string | null
  completed_tasks_summary: string | null
  kpi_percentage: number | null
  top_interactive_member: string | null
  challenges: string | null
  executive_requests: string | null
  next_month_goals?: string | null
  improvement_suggestions: string | null
  uploaded_by: MeetingRef | null
  uploaded_at: string | null
}

export type OpsMeetingDetail = OpsMeeting & {
  description: string | null
  recording_link: string | null
  agenda: string[]
  timezone: string
  updated_at: string | null
  /** False for a normal assigned user: names and counts are hidden. */
  participants_visible: boolean
  participants: MeetingParticipantRow[]
  attendance_summary: AttendanceSummary | null
  /** Only for someone who may read the report. */
  decisions: { id: number; text: string }[]
  action_items: OpsActionItem[]
  report: MeetingReportView | null
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

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'url'
  | 'date'
  | 'time'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'yes_no'
  | 'star_rating'
  | 'linear_scale'
  | 'consent'
  | 'file'
  | 'image'
  // Structural blocks: they shape the form and are never answered.
  | 'section'
  | 'description'
  | 'page_break'

/** The per-type settings a block can carry. The server validates them against the type and enforces them again on submission. */
export type QuestionConfig = {
  validation?: {
    min_length?: number
    max_length?: number
    min?: number
    max?: number
    integer_only?: boolean
    min_date?: string
    max_date?: string
    min_choices?: number
    max_choices?: number
  }
  scale?: { min?: number; max?: number; min_label?: string; max_label?: string }
  default_value?: string | number | string[]
}

/** The closed list of comparisons a visibility rule can make. Which of them a question offers depends on its type (formLogic.ts). */
export type LogicOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'any_of'
  | 'none_of'

export type LogicCondition = {
  /** The question whose answer is read. */
  question: number
  operator: LogicOperator
  value?: string | number | string[]
}

/** Shows or hides one block (a question, a section, a step) according to earlier answers. Data, never code. */
export type QuestionLogic = {
  action: 'show' | 'hide'
  match: 'all' | 'any'
  conditions: LogicCondition[]
}

/** How a respondent moves through the form. Part of what a published version freezes. */
export type FormFlow = { review_step?: boolean }

export type FormStatus = 'draft' | 'active' | 'closed' | 'archived'

export type FormQuestion = {
  id: number
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
  sort_order: number
  description?: string | null
  placeholder?: string | null
  help_text?: string | null
  config?: QuestionConfig | null
  /** The rule that shows or hides this block; null when it is always shown. */
  logic?: QuestionLogic | null
  /** Only in the staff editor: the type of an answered question cannot change. */
  has_answers?: boolean
}

/** A person as the forms screens show them: a name, never contact details. */
export type FormPerson = { id: number; name: string }

/** Who may see the form (`private`: owner, collaborators and platform admins; `organization`: its scope). */
export type FormVisibility = 'private' | 'organization'

/** Who may read the responses, independently of who may open the form. */
export type FormResponsesVisibility = 'restricted' | 'form_viewers'

export type FormSettings = {
  opens_at: string | null
  closes_at: string | null
  max_submissions: number | null
  per_respondent_limit: number | null
  allow_anonymous: boolean
  /** Who may answer: anyone, any signed-in user, or only invited signed-in users. */
  access_mode?: FormAccessMode
  /** The form opens only through one of its valid share links. */
  requires_share_link?: boolean
  /** True when signing in is needed: anonymous answers are off, or a per-person limit makes identity necessary. */
  requires_login: boolean
}

export type FormAccessMode = 'public' | 'authenticated' | 'invited'

/** What the signed-in user may do with this form. The server re-checks every action. */
export type FormAbilities = {
  view: boolean
  edit: boolean
  publish: boolean
  manage_access: boolean
  view_responses: boolean
  manage_responses: boolean
  /** Correct what a respondent submitted: an explicit grant, separate from reading the responses. */
  correct_responses?: boolean
  delete: boolean
  /** See how the form is shared (links, access mode, invitations). */
  view_sharing?: boolean
  /** Change how it is shared. */
  manage_sharing?: boolean
}

export type FormAvailabilityState =
  | 'open'
  | 'closed'
  | 'not_open_yet'
  | 'ended'
  | 'login_required'
  | 'limit_reached'
  | 'respondent_limit'
  // Phase 3: share links and invitations
  | 'share_link_required'
  | 'share_link_invalid'
  | 'share_link_revoked'
  | 'share_link_expired'
  | 'share_link_exhausted'
  | 'not_invited'

/** What the public page is told about whether the form takes answers right now. */
export type FormAvailability = {
  state: FormAvailabilityState
  message: string | null
  opens_at: string | null
  closes_at: string | null
  requires_login: boolean
}

export type OpsFormDefinition = {
  id: number
  title: string
  description?: string | null
  slug: string
  form_type: FormTypeSlug
  flow?: FormFlow | null
  questions: FormQuestion[]
  status?: FormStatus
  visibility?: FormVisibility
  responses_visibility?: FormResponsesVisibility
  department_id?: number | null
  department?: { id: number; name: string } | null
  created_by?: FormPerson | null
  owner?: FormPerson | null
  last_editor?: FormPerson | null
  publisher?: FormPerson | null
  published_at?: string | null
  current_version?: number | null
  has_unpublished_changes?: boolean
  /** Moves on every persisted draft change; sent back as `base_revision` so a stale editor is refused. */
  draft_revision?: number
  settings?: FormSettings
  abilities?: FormAbilities
  submissions_count?: number
  last_submission_at?: string | null
  created_at?: string
  updated_at?: string
  /** Public view only. */
  availability?: FormAvailability
  version?: number | null
  preview?: boolean
}

export type FormVersionRow = {
  id: number
  version_number: number
  origin: 'publish' | 'restore' | 'legacy'
  note: string | null
  question_count: number
  published_at: string | null
  publisher?: FormPerson | null
  restored_from_version_id: number | null
  is_current: boolean
}

/** One version with the questions exactly as respondents saw them. */
export type FormVersionDetail = FormVersionRow & {
  title: string | null
  description: string | null
  questions: FormQuestion[]
}

export type FormCollaboratorLevel = 'viewer' | 'editor'

export type FormEmployee = { id: number; name: string; role: string; departments: string[] }

export type FormCollaboratorRow = {
  id: number
  user: FormEmployee
  access_level: FormCollaboratorLevel
  can_view_responses: boolean
  can_correct_responses?: boolean
  granted_by?: FormPerson | null
  granted_at: string | null
}

export type FormActivityRow = {
  id: number
  action: string
  label: string
  actor?: FormPerson | null
  details: Record<string, unknown>
  created_at: string
}

export type PagedRows<T> = { rows: T[]; currentPage: number; lastPage: number; total: number }

/** One answer inside a response, as the response list returns it. A file is never given by its storage path. */
export type FormAnswerRow = {
  id: number
  question_id: number
  question_label?: string | null
  question_type?: QuestionType | null
  question_deleted?: boolean
  /** The question as the respondent's published version froze it (what a correction is edited with). */
  question_required?: boolean
  question_options?: string[] | null
  question_config?: QuestionConfig | null
  value: string | string[] | null
  /** The answer in words (yes / no, "4 / 5", a joined list), as the response detail shows it. */
  display_value?: string | null
  has_file: boolean
  file_name: string | null
  /** A reviewer changed what the respondent submitted. The previous value is in the protected correction history. */
  corrected?: boolean
}

export type FormSubmissionRow = {
  id: number
  submitted_at: string
  submitter_label?: string | null
  answers_preview?: string
  status?: 'new' | 'reviewed' | 'archived'
  /** The share link the response came through, by its label. */
  share_link?: { id: number; label: string } | null
  answers?: FormAnswerRow[]
}

export type FormSubmissionsPage = {
  rows: FormSubmissionRow[]
  currentPage: number
  lastPage: number
  total: number
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
  partnership_type?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  country?: string | null
  city?: string | null
  status?: string | null
  onboarding_status?: string | null
  activated_at?: string | null
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
  reviewed_at?: string | null
  review_notes?: string | null
  converted_partner?: { id: number; name: string; status: string } | null
  converted_user?: { id: number; name: string; email: string } | null
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
  finance_approval_pending?: number
  priority_queues?: {
    key: 'tasks' | 'support' | 'partnerships' | 'volunteers' | 'finance'
    label: string
    count: number
    urgent_count: number
  }[]
  today_items?: {
    id: string
    label: string
    at?: string | null
    kind: string
    key: 'tasks' | 'meetings'
  }[]
  recent_activity?: { id: number | string; label: string; at: string; kind: string }[]
  department_health?: { department_id: string; title: string; score: number }[]
  generated_at?: string
}
