import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { SupportTicket, SupportTicketDetail } from '@/types/operations'

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const res = await apiClient.get<unknown>('/operations/support-tickets')
  return asList<SupportTicket>(res.data)
}

export async function fetchSupportTicket(id: number): Promise<SupportTicketDetail> {
  const res = await apiClient.get<unknown>(`/operations/support-tickets/${id}`)
  return unwrapLms<SupportTicketDetail>(res.data)
}

export async function submitSupportTicket(payload: {
  type: string
  priority: string
  subject: string
  message: string
  contact_name: string
  contact_email: string
  contact_phone?: string
}): Promise<void> {
  await apiClient.post('/support/tickets', payload)
}

export async function replySupportTicket(
  id: number,
  body: { message: string; internal?: boolean },
): Promise<void> {
  await apiClient.post(`/operations/support-tickets/${id}/replies`, body)
}

export async function updateSupportTicket(
  id: number,
  body: Partial<Pick<SupportTicket, 'status'>> & { assignee_id?: number | null },
): Promise<void> {
  await apiClient.patch(`/operations/support-tickets/${id}`, body)
}
