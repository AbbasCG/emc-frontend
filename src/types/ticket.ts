import type { TaskScope } from '@/types/operations';

export type TicketCategory = 'OLD_ISSUE' | 'NEW_SUGGESTION';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketStatus =
  | 'PENDING_APPROVAL'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  /** The assignee submitted the work; it waits for the final approval that credits points and hours. An OPEN status. */
  | 'PENDING_REVIEW'
  /** Deployment tickets only: the reviewer approved the work (points/time approved, nothing credited yet); it waits to be deployed. */
  | 'APPROVED_FOR_DEPLOY'
  /** Deployment tickets only: deployed to the live site; the assignee tests it live and confirms (that is what credits). */
  | 'PENDING_VERIFICATION'
  | 'RESOLVED'
  | 'UNRESOLVED'
  | 'REJECTED_BY_ADMIN'
  | 'REJECTED_BY_ASSIGNEE';

/**
 * The canonical, per-ticket, per-user action set — computed server-side in
 * TicketController::buildCapabilities() from the SAME canManage()/isAssignee()
 * helpers every mutating endpoint already guards itself with, and the SAME
 * status guard each endpoint already enforces. This is a REPORT of what the
 * backend would actually allow, never a frontend-derived guess — do not
 * re-derive any of these from role/status checks in component code.
 *
 * `reassign` covers BOTH "assign for the first time after approval" and "true
 * reassignment": there is no separate assign endpoint, and reassign() itself
 * doesn't care whether an assignee already exists, only that status is
 * ASSIGNED or IN_PROGRESS. The UI derives its own label ("تعيين" vs
 * "إعادة التوجيه") from whether `assignee` is null — that is presentation,
 * not a second authorization decision.
 */
export interface TicketCapabilities {
  approve: boolean;
  reject: boolean;
  reassign: boolean;
  accept_task: boolean;
  reject_task: boolean;
  complete_task: boolean;
  add_internal_note: boolean;
  comment: boolean;
  /** Manager of an open ticket. Absent on payloads from before the operations center. */
  change_priority?: boolean;
  /** May edit the ticket's points and approximate duration («تعديل النقاط والمدة»). Absent on older payloads. */
  can_edit_estimate?: boolean;
  /**
   * May confirm the review of a PENDING_REVIEW ticket in one press («تأكيد المراجعة»): the server moves it to its next stage
   * (waiting for deployment, or closed with the credit). Trust it; never recompute. Absent for reporters and plain members.
   */
  confirm_review?: boolean;
  /** May send a PENDING_REVIEW / APPROVED_FOR_DEPLOY ticket back to the assignee. */
  return_for_rework?: boolean;
  /** Deployment tickets: may record that the work is deployed on the live site. */
  mark_deployed?: boolean;
  /** Deployment tickets: the assignee may confirm the live test passed (this credits the balance). */
  verify_resolved?: boolean;
  /** Deployment tickets: the assignee may report that the live test failed (the ticket goes back to work). */
  verify_failed?: boolean;
}

/** Where a ticket is in its lifecycle, as the server reports it (managers, global roles and the assignee only). */
export type TicketWorkflowStage = 'in_progress' | 'pending_review' | 'approved_for_deploy' | 'pending_verification' | 'resolved';
export type TicketNextActor = 'assignee' | 'reviewer' | 'deployer' | null;
export type TicketNextStepKey = 'submit_for_review' | 'review' | 'deploy' | 'verify_live' | 'none';

export interface TicketWorkflow {
  stage: TicketWorkflowStage;
  next_actor: TicketNextActor;
  next_step_key: TicketNextStepKey;
}

/** The deployment trail of a deployment ticket; nulls where the step has not been reached. */
export interface TicketDeployment {
  review_approved_by_name: string | null;
  review_approved_at: string | null;
  deployed_by_name: string | null;
  deployed_at: string | null;
  live_url: string | null;
  verified_at: string | null;
  /** Which round of review/deploy/verify this is: it grows on every resubmission for review (after a rework or a failed live test). */
  round: number | null;
}

/**
 * What the ticket has credited (or would credit) to its assignee. Present ONLY for managers, global roles and the
 * assignee; absent for plain members and reporters, in which case nothing about it may be rendered.
 */
export interface TicketCredit {
  /** `approved`: points and time are approved but NOT credited yet (deployment tickets, until the live test is confirmed). */
  status: 'none' | 'pending_review' | 'approved' | 'credited';
  /** Credited points / hours; null until credited. */
  points: number | null;
  /** Decimal hours = minutes / 60 (kept for credits made before the actual duration existed). */
  hours: number | null;
  /** The ACTUAL approved duration that was credited, in minutes; null for credits made before this existed. */
  minutes?: number | null;
  credited_at: string | null;
  credited_by_name: string | null;
}

export interface DepartmentalUnit {
  id: number;
  department_id: number;
  code: string;
  name_ar: string;
  name_en?: string;
  description?: string;
  is_active: boolean;
}

export interface Department {
  id: number;
  name: string;
  name_ar: string;
  name_en?: string;
  slug: string;
  description_ar?: string;
  icon?: string;
  color?: string;
}

export interface TicketUser {
  id: number;
  name: string;
  email: string;
}

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  /**
   * The AUTHENTICATED endpoint for this attachment. It is not usable as an
   * <img src> or <a href>: a browser navigation carries no Bearer token. Fetch
   * it through ticketAttachmentsApi instead.
   */
  preview_url: string;
  file_name?: string;
  /** 'VIDEO' only ever appears on historical rows; video uploads are rejected. */
  file_type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  /** Null on rows created before the column existed. */
  mime_type?: string | null;
  /** Null on rows created before the column existed. */
  file_size?: number | null;
  /** Server-computed, with a safe fallback to file_type for historical rows. */
  is_image?: boolean;
  attachment_context: 'INITIAL_SUBMISSION' | 'RESOLUTION_PROOF';
  uploaded_by?: number;
  created_at: string;
}

/** How a reviewer is tied to a ticket they review: the person who created it, is assigned to it, or submitted its completion. */
export type TicketReviewerRelation = 'creator' | 'assignee' | 'submitter';

/**
 * Structured data the server attaches to a review log row (approved / approved for deployment / returned for rework).
 * Sent to internal viewers only (managers, global roles, the assignee); absent for a reporter or a plain member, and on
 * every older row, so every reader must treat it as optional.
 */
export interface TicketActivityMetadata {
  /** Unknown strings are kept (a newer server may add a relation) and shown as they are. */
  reviewer_relation?: Array<TicketReviewerRelation | string>;
  /** True when the reviewer took part in the ticket and used the «اعتماد التذاكر التي أشارك فيها» permission. */
  participated?: boolean;
  review_round?: number;
}

export interface TicketActivityLog {
  id: number;
  ticket_id: number;
  action: string;
  previous_state?: string;
  new_state?: string;
  performed_by?: number;
  performed_by_name?: string;
  details?: string;
  logged_at: string;
  metadata?: TicketActivityMetadata | null;
}

/**
 * Why a leader / global role can or cannot review a ticket that is in a review stage right now (`review_context` on the
 * detail payload). ABSENT for everyone who is not a potential reviewer of the ticket's department, for tickets outside a
 * review stage, and for reporters and plain members: never invent it. The review BUTTONS still come only from `capabilities`.
 */
export interface TicketReviewBlocker {
  code: string;
  /** The reason, in Arabic, ready to show («أكمل حجم المهمة…»). */
  message_ar: string;
}

/** Codes of `confirm-review` refusals (`{ success: false, message, code }`). */
export type ConfirmReviewErrorCode =
  | 'REVIEW_PERMISSION_REQUIRED'
  | 'PARTICIPATION_PERMISSION_REQUIRED'
  | 'HR_APPROVAL_REQUIRED'
  | 'INVALID_STAGE'
  | 'NOT_PENDING_REVIEW'
  | 'ALREADY_CREDITED'
  | 'REVIEW_DATA_INCOMPLETE'
  | 'REVIEW_VALUES_LOCKED'
  | 'STALE_REVIEW';

/** What a 422 REVIEW_DATA_INCOMPLETE says is still missing. */
export type ReviewMissingField = 'task_scope' | 'task_points' | 'estimated_hours' | 'actual_minutes';

export interface TicketReviewContext {
  stage: TicketStatus;
  can_review: boolean;
  /** `missing_permission`: lacks «مراجعة واعتماد إنجاز التذاكر». `needs_participation_permission`: took part in the ticket and lacks «اعتماد التذاكر التي أشارك فيها». */
  reason: 'missing_permission' | 'needs_participation_permission' | null;
  relation: Array<TicketReviewerRelation | string>;
  needs_participation_permission: boolean;
  required_permissions: string[];
}

/** Who must act next on a ticket row of the work queue (null once the ticket is finished, and for reporters / plain members). */
export interface TicketAwaiting {
  actor: 'approver' | 'assignee' | 'reviewer' | 'deployer' | 'verifier' | string;
  /** Arabic sentence, ready to show: «بانتظار اعتماد مدير الإدارة». */
  label: string;
  /** The assignee's name when the actor is the assignee. */
  name: string | null;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  ticket_category: TicketCategory;
  priority: TicketPriority;
  department_id: number;
  unit_id?: number;
  created_by_id?: number;
  created_by_name: string;
  created_by_email?: string;
  approved_by_id?: number;
  assigned_to_id?: number;
  status: TicketStatus;
  expected_resolution_time?: string;
  accepted_at?: string;
  resolved_at?: string;
  admin_rejection_reason?: string;
  assignee_rejection_reason?: string;
  resolution_summary?: string;
  unresolved_reason?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  is_delayed?: boolean;
  /**
   * The work estimate, set when the ticket is assigned (same scale as a task: size, points, hours). All null on
   * tickets assigned before the estimate existed ("legacy"). Staff payloads only — never on {@link ReporterTicket}.
   */
  task_scope?: TaskScope | null;
  task_points?: number | null;
  estimated_hours?: number | null;
  /** The ACTUAL duration, in minutes, entered at the final approval (what the balance receives); null until then. Same viewers as `credit`. */
  actual_minutes?: number | null;
  /** The credit block (see {@link TicketCredit}); absent when the viewer may not read it. */
  credit?: TicketCredit;
  /** Deployment ticket: goes through review, deployment and a live test by the assignee before closing. Managers/assignee only. */
  requires_deployment?: boolean;
  deployment?: TicketDeployment | null;
  workflow?: TicketWorkflow;
  /** Work-queue rows (`lite=1`) only: newest activity-log time and the attachment count. */
  last_activity_at?: string | null;
  attachments_count?: number;
  /** Present on show()/index() responses; absent is treated as "no actions known yet". */
  capabilities?: TicketCapabilities;
  /** 'staff' on the operational payload from show(); absent on list rows. */
  viewer_role?: 'staff';
  /** Detail payload, review stages, potential reviewers only: why review is (not) available to this viewer. */
  review_context?: TicketReviewContext;
  /**
   * Detail payload, PENDING_REVIEW, internal viewers who pass permission and scope but are blocked (missing size, points,
   * approximate or actual duration; the HR gate): the reasons the review cannot be confirmed yet. Absent otherwise.
   */
  review_blockers?: TicketReviewBlocker[];
  /** Internal viewers only: which review round the ticket is in. Sent back with «تأكيد المراجعة» so a press on a stale screen is refused (409 STALE_REVIEW). Absent on list rows. */
  review_round?: number;
  /** List rows requested with a `tab`: does THIS viewer have a workflow step to take on this ticket now? */
  needs_my_action?: boolean;
  /** List rows requested with a `tab`: who must act next (null when finished or when the viewer may not see it). */
  awaiting?: TicketAwaiting | null;

  // Relations
  department?: Department;
  unit?: DepartmentalUnit;
  creator?: TicketUser;
  approver?: TicketUser;
  assignee?: TicketUser;
  attachments?: TicketAttachment[];
  activity_logs?: TicketActivityLog[];
}

/** The estimate fields every assigning endpoint accepts (approve, reassign, bulk reassign, work-estimate). */
export interface TicketEstimateInput {
  task_scope: TaskScope;
  task_points: number;
  estimated_hours?: number | null;
}

/**
 * One row of GET /v1/tickets/my-work: a ticket assigned to THE CURRENT USER (pending, in progress, or finished in
 * the last 30 days). The server decides the capabilities; nothing here is derived from roles.
 */
export interface MyWorkTicket {
  id: number;
  ticket_number: string;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  department?: { id: number; name: string } | null;
  unit?: string | { id?: number; name_ar?: string } | null;
  created_by_name?: string | null;
  assigned_to_id?: number | null;
  expected_resolution_time?: string | null;
  is_delayed?: boolean;
  accepted_at?: string | null;
  resolved_at?: string | null;
  task_scope?: TaskScope | null;
  task_points?: number | null;
  estimated_hours?: number | null;
  credit?: TicketCredit;
  requires_deployment?: boolean;
  workflow?: TicketWorkflow;
  created_at?: string;
  updated_at?: string;
  capabilities?: {
    can_accept?: boolean;
    can_reject?: boolean;
    can_complete?: boolean;
    can_open?: boolean;
  };
}

/** `meta` of GET /v1/tickets/my-work: the true totals, and whether the list was cut short. */
export interface MyWorkMeta {
  open_total: number;
  closed_total: number;
  truncated: boolean;
}

export interface MyWorkResult {
  tickets: MyWorkTicket[];
  meta: MyWorkMeta;
}

export interface TicketMeta {
  departments: Department[];
  tech_units: DepartmentalUnit[];
  users: TicketUser[];
  categories: { id: TicketCategory; label_ar: string; label_en: string }[];
  priorities: { id: TicketPriority; label_ar: string; color: string }[];
  statuses: Record<TicketStatus, { label_ar: string; color: string }>;
  /** The points a ticket of each size may be given (the dropdown options). Absent on older servers: the form falls back to a free number. */
  points_options?: Partial<Record<TaskScope, number[]>>;
  /** The server's accepted range per size; `max` is null for the open-ended strategic size. */
  scope_ranges?: Partial<Record<TaskScope, { min: number; max: number | null }>>;
}

/** One step of the reporter's simplified history. `key` is stable; `label` is ready to display. */
export interface ReporterTimelineStep {
  key: string;
  label: string;
  at: string | null;
  /** Only the submitter's own follow-up text, or the rejection reason written for them. */
  note?: string;
}

/**
 * What the server returns from GET /v1/tickets/:id to the person who submitted
 * the ticket (TicketReporterView). A deliberate whitelist: none of the
 * operational fields on {@link Ticket} (assignee, internal notes, SLA, the raw
 * activity log, the submitter email...) exist here, so a component rendering
 * this type cannot show them even by accident.
 */
export interface ReporterTicket {
  viewer_role: 'reporter';
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  ticket_category: TicketCategory;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  /** The written answer, only while RESOLVED. */
  resolution_note: string | null;
  /** The department's reason, written for the submitter, only when rejected. */
  rejection_reason: string | null;
  department: { id: number; name: string } | null;
  attachments: TicketAttachment[];
  timeline: ReporterTimelineStep[];
  capabilities: TicketCapabilities;
}

export function isReporterTicket(ticket: Ticket | ReporterTicket): ticket is ReporterTicket {
  return ticket.viewer_role === 'reporter';
}
