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
  file_url: string;
  file_name?: string;
  file_type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
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
