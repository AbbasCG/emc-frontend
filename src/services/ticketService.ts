import apiClient from '@/api/axios';
import type { Ticket, TicketMeta } from '@/types/ticket';

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
    payload: { unit_id?: number; assigned_to_id?: number; sla_hours: number; internal_notes?: string }
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
    payload: { assigned_to_id: number; unit_id?: number; reason?: string }
  ): Promise<TicketDetailResponse> => {
    const res = await apiClient.post(`/v1/tickets/${id}/reassign`, payload);
    return res.data;
  },
};
