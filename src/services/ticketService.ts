import apiClient from '@/api/axios';
import type { MyWorkMeta, MyWorkResult, MyWorkTicket, Ticket, TicketEstimateInput, TicketMeta } from '@/types/ticket';

export interface TicketFilterParams {
  status?: string;
  department_id?: number;
  unit_id?: number;
  ticket_category?: string;
  priority?: string;
  assigned_to_id?: number;
  created_by_id?: number;
  search?: string;
  delayed_only?: boolean;
  per_page?: number;
  page?: number;
}

export interface TicketListResponse {
  success: boolean;
  data: {
    data: Ticket[];
    current_page: number;
    last_page: number;
    total: number;
  };
}

export interface TicketDetailResponse {
  success: boolean;
  data: Ticket;
  message?: string;
}

export const ticketService = {
  /**
   * Fetch ticket system metadata (departments, tech units, priorities, statuses)
   */
  getMeta: async (params: { department_id?: number; unit_id?: number } = {}): Promise<TicketMeta> => {
    const res = await apiClient.get('/v1/tickets/meta', { params });
    return res.data;
  },

  /**
   * Fetch tickets with filters and pagination
   */
  getTickets: async (params: TicketFilterParams = {}): Promise<TicketListResponse> => {
    const res = await apiClient.get('/v1/tickets', { params });
    return res.data;
  },

  /**
   * Get single ticket by ID or ticket number
   */
  getTicket: async (id: string | number): Promise<TicketDetailResponse> => {
    const res = await apiClient.get(`/v1/tickets/${id}`);
    return res.data;
  },

  /**
   * Submit a new ticket (with optional file attachments)
   */
  createTicket: async (formData: FormData): Promise<TicketDetailResponse> => {
    const res = await apiClient.post('/v1/tickets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Admin/Manager Action: Approve ticket, assign unit & user, set SLA deadline
   */
  approveTicket: async (
    id: number,
    payload: { unit_id?: number; assigned_to_id?: number; sla_hours: number; internal_notes?: string } & Partial<TicketEstimateInput>
  ): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/approve`, payload);
    return res.data;
  },

  /**
   * Admin/Manager Action: Reject ticket with mandatory reason
   */
  rejectByAdmin: async (
    id: number,
    admin_rejection_reason: string
  ): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/reject`, { admin_rejection_reason });
    return res.data;
  },

  /**
   * Assignee Action: Accept task assignment
   */
  acceptTask: async (id: number): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/accept-task`);
    return res.data;
  },

  /**
   * Assignee Action: Reject task assignment with mandatory reason
   */
  rejectTask: async (
    id: number,
    assignee_rejection_reason: string
  ): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/reject-task`, { assignee_rejection_reason });
    return res.data;
  },

  /**
   * Assignee Action: Complete task (Resolved vs Unresolved)
   */
  completeTask: async (id: number, formData: FormData): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/complete-task`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Add a comment / follow-up note to a ticket
   */
  addComment: async (
    id: number,
    comment: string,
    is_internal = false
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post(`/v1/tickets/${id}/comment`, { comment, is_internal });
    return res.data;
  },

  /**
   * Leadership: Reassign ticket to a different assignee
   */
  reassign: async (
    id: number,
    payload: { assigned_to_id: number; unit_id?: number; reason?: string } & Partial<TicketEstimateInput>
  ): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/reassign`, payload);
    return res.data;
  },

  /**
   * FINAL approval of a PENDING_REVIEW ticket: the one call that credits points and hours to the assignee (once).
   * The estimate is optional (it may correct the stored one) and REQUIRED when the ticket has none. Errors:
   * 409 (already credited / not in review), 403 (not allowed, or the HR gate), 404, 422 (`task_scope`, `task_points`,
   * `estimated_hours`, `note`).
   */
  approveCompletion: async (
    id: number,
    payload: Partial<TicketEstimateInput> & { note?: string } = {}
  ): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/approve-completion`, payload, { skipErrorToast: true });
    return res.data;
  },

  /** Send a PENDING_REVIEW ticket back to its assignee (back to IN_PROGRESS, nothing credited). `reason`: 5 to 1000 characters. */
  returnForRework: async (id: number, reason: string): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/return-for-rework`, { reason }, { skipErrorToast: true });
    return res.data;
  },

  /**
   * Edit the ticket's points and approximate duration (server: `capabilities.can_edit_estimate`).
   * `estimated_hours: null` CLEARS the stored hours; leaving the key out keeps them.
   * A 422 carries `errors.task_points / task_scope / estimated_hours`.
   */
  updateWorkEstimate: async (
    id: number,
    payload: { task_scope: TicketEstimateInput['task_scope']; task_points: number; estimated_hours?: number | null }
  ): Promise<TicketDetailResponse> => {
    const res = await apiClient.patch(`/v1/tickets/${id}/work-estimate`, payload);
    return res.data;
  },

  /**
   * The tickets assigned to the CURRENT USER only (pending, in progress, and finished in the last 30 days).
   * Reassigning a ticket removes it from the old assignee's answer, so a refetch is all that is needed.
   */
  getMyWork: async (signal?: AbortSignal): Promise<MyWorkResult> => {
    const res = await apiClient.get('/v1/tickets/my-work', { signal, skipErrorToast: true });
    const rows: unknown = res.data?.data;
    const meta = (res.data?.meta ?? {}) as Partial<MyWorkMeta>;
    return {
      tickets: Array.isArray(rows) ? (rows as MyWorkTicket[]) : [],
      meta: { open_total: Number(meta.open_total ?? 0), closed_total: Number(meta.closed_total ?? 0), truncated: meta.truncated === true },
    };
  },
};
