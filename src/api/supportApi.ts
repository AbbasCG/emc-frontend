import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { SupportTicket, SupportTicketDetail, SupportTicketStatus, AssigneeUser, TicketActivity } from '@/types/operations'

export interface SupportTicketsStats {
  total: number
  open: number
  unassigned: number
  resolved: number
  high: number
}

export interface SupportTicketsMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export async function fetchSupportTickets(
  params?: Record<string, string>,
): Promise<{ data: SupportTicket[]; stats: SupportTicketsStats; meta: SupportTicketsMeta }> {
  const res = await apiClient.get<{
    data?: { data?: SupportTicket[]; meta?: SupportTicketsMeta }
    stats?: SupportTicketsStats
  }>('/operations/support-tickets', { params })
  const raw = res.data
  return {
    data: (raw?.data?.data ?? raw?.data ?? []) as SupportTicket[],
    stats: (raw?.stats ?? {}) as SupportTicketsStats,
    meta: raw?.data?.meta ?? {},
  }
}

function pickAvatar(u: Record<string, unknown>): string | null {
  return (u.avatar_url ?? u.profile_photo_url ?? u.photo_url ?? u.image ?? u.avatar) as string | null ?? null
}

export async function fetchSupportTicket(id: number): Promise<SupportTicketDetail> {
  const res = await apiClient.get<unknown>(`/operations/support-tickets/${id}`)
  const ticket = unwrapLms<SupportTicketDetail>(res.data)
  if (ticket?.assigned_to) {
    ticket.assigned_to.avatar = pickAvatar(ticket.assigned_to as unknown as Record<string, unknown>)
  }
  return ticket
}

export async function fetchSupportTicketAssignees(): Promise<AssigneeUser[]> {
  const res = await apiClient.get<unknown>('/operations/support-tickets/assignees')
  const raw = res.data as { data?: unknown[] }
  return (raw?.data ?? []).map((u) => {
    const r = u as Record<string, unknown>
    return {
      id: r.id as number,
      name: r.name as string,
      email: r.email as string | null,
      role: r.role as string | null,
      department: r.department as string | null,
      active_tickets: r.active_tickets as number | undefined,
      avatar: pickAvatar(r),
    }
  })
}

export async function fetchTicketActivity(id: number): Promise<TicketActivity[]> {
  const res = await apiClient.get<{ data?: TicketActivity[] }>(`/operations/support-tickets/${id}/activity`)
  const raw = res.data
  return raw?.data ?? []
}

export async function submitSupportTicket(payload: {
  full_name: string
  email: string
  phone: string
  request_type: string
  subject: string
  message: string
}): Promise<void> {
  await apiClient.post('/support-tickets', payload)
}

export interface ReplyResult {
  email_queued: boolean
  email_warning: string | null
}

export async function replySupportTicket(
  id: number,
  body: { message: string; is_internal_note?: boolean },
): Promise<ReplyResult> {
  const res = await apiClient.post<{ email_queued?: boolean; email_warning?: string | null }>(
    `/operations/support-tickets/${id}/replies`,
    body,
  )
  const d = res.data as Record<string, unknown>
  return {
    email_queued:  Boolean(d.email_queued),
    email_warning: (d.email_warning as string | null | undefined) ?? null,
  }
}

export async function updateSupportTicket(
  id: number,
  body: { status?: SupportTicketStatus; priority?: string; assigned_to?: number | null },
): Promise<void> {
  await apiClient.patch(`/operations/support-tickets/${id}`, body)
}

export async function assignSupportTicket(id: number, assigned_to: number): Promise<void> {
  await apiClient.patch(`/operations/support-tickets/${id}/assign`, { assigned_to })
}

export async function resolveSupportTicket(id: number): Promise<void> {
  await apiClient.patch(`/operations/support-tickets/${id}/resolve`)
}

export async function deleteSupportTicket(id: number): Promise<void> {
  await apiClient.delete(`/operations/support-tickets/${id}`)
}
