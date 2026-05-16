import axios from 'axios'
import apiClient from './axios'
import { asList } from './lmsApi'
import type { PartnerRecord, PartnershipRequest } from '@/types/operations'

const silent = { skipErrorToast: true as const }

export async function fetchPartners(): Promise<PartnerRecord[]> {
  const res = await apiClient.get<unknown>('/operations/partners')
  return asList<PartnerRecord>(res.data)
}

/** GET للسوبر مشرف — بدون سبام Toast؛ يفسِّر الغلق في الواجهة. */
export async function fetchPartnersForSuperAdmin(): Promise<
  | { ok: true; rows: PartnerRecord[] }
  | { ok: false; status?: number }
> {
  try {
    const res = await apiClient.get<unknown>('/operations/partners', silent)
    return { ok: true, rows: asList<PartnerRecord>(res.data) }
  } catch (e) {
    if (axios.isAxiosError(e)) return { ok: false, status: e.response?.status }
    return { ok: false }
  }
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
