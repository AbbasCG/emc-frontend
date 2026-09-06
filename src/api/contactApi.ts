import apiClient from './axios'

export interface ContactTicketData {
  ticket_id?: number
  ticket_number?: string
}

export async function submitContactMessage(payload: {
  name: string
  email: string
  phone?: string
  subject?: string
  category?: string
  message: string
}): Promise<ContactTicketData> {
  const res = await apiClient.post<{ success: boolean; data?: ContactTicketData }>('/contact', payload)
  return (res.data as { data?: ContactTicketData })?.data ?? {}
}
