import apiClient from './axios'
import { asList } from './lmsApi'
import type { PartnerRecord, PartnershipRequest } from '@/types/operations'

export async function fetchPartners(): Promise<PartnerRecord[]> {
  const res = await apiClient.get<unknown>('/operations/partners')
  return asList<PartnerRecord>(res.data)
}

export async function fetchPartnershipRequests(): Promise<PartnershipRequest[]> {
  const res = await apiClient.get<unknown>('/operations/partnership-requests')
  return asList<PartnershipRequest>(res.data)
}

export async function updatePartnershipRequest(id: number, status: string): Promise<void> {
  await apiClient.patch(`/operations/partnership-requests/${id}`, { status })
}

export async function submitPartnershipApplication(payload: {
  institution_name: string
  institution_type?: string
  contact_name: string
  email: string
  phone?: string
  message: string
}): Promise<void> {
  await apiClient.post('/partnership-requests', payload)
}
