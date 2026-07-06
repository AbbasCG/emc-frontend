import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { SupportTicket, SupportTicketDetail, SupportTicketStatus, AssigneeUser, TicketActivity } from '@/types/operations'

export async function fetchSupportTickets(params?: Record<string, string>): Promise<{ data: SupportTicket[]; stats: any; meta: any }> {
  const res = await apiClient.get<unknown>('/operations/support-tickets', { params })
  const raw = res.data as any
  return {
    data: (raw?.data?.data ?? raw?.data ?? []) as SupportTicket[],
    stats: raw?.stats ?? {},
    meta: raw?.data?.meta ?? {},
  }
}

export async function fetchSupportTicket(id: number): Promise<SupportTicketDetail> {
  const res = await apiClient.get<unknown>(`/operations/support-tickets/${id}`)
  return unwrapLms<SupportTicketDetail>(res.data)
}

export async function fetchSupportTicketAssignees(): Promise<AssigneeUser[]> {
  const res = await apiClient.get<unknown>('/operations/support-tickets/assignees')
  const raw = res.data as any
  return raw?.data ?? []
}

export async function fetchTicketActivity(id: number): Promise<TicketActivity[]> {
  const res = await apiClient.get<unknown>(`/operations/support-tickets/${id}/activity`)
  const raw = res.data as any
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

export async function replySupportTicket(
  id: number,
  body: { message: string; is_internal_note?: boolean },
): Promise<void> {
  await apiClient.post(`/operations/support-tickets/${id}/replies`, body)
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
