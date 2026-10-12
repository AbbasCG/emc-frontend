export type TicketCategory = 'OLD_ISSUE' | 'NEW_SUGGESTION';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketStatus =
  | 'PENDING_APPROVAL'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
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
  /** Present on show()/index() responses; absent is treated as "no actions known yet". */
  capabilities?: TicketCapabilities;
  /** 'staff' on the operational payload from show(); absent on list rows. */
  viewer_role?: 'staff';

  // Relations
  department?: Department;
  unit?: DepartmentalUnit;
  creator?: TicketUser;
  approver?: TicketUser;
  assignee?: TicketUser;
  attachments?: TicketAttachment[];
  activity_logs?: TicketActivityLog[];
}

export interface TicketMeta {
  departments: Department[];
  tech_units: DepartmentalUnit[];
  users: TicketUser[];
  categories: { id: TicketCategory; label_ar: string; label_en: string }[];
  priorities: { id: TicketPriority; label_ar: string; color: string }[];
  statuses: Record<TicketStatus, { label_ar: string; color: string }>;
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
