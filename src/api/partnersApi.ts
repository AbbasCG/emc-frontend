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

export interface PartnershipApplicationPayload {
  partner_name: string
  type: string
  type_other?: string | null
  contact_name: string
  email: string
  phone: string
  country: string
  city?: string | null
  website?: string | null
  partnership_type: string
  partnership_type_other?: string | null
  message: string
  privacy_accepted: boolean
}

/**
 * skipErrorToast: the page shows its own per-field/summary error UI for
 * this form — without this flag the global axios interceptor would also
 * fire a second, generic toast on top of it.
 */
export async function submitPartnershipApplication(payload: PartnershipApplicationPayload): Promise<void> {
  await apiClient.post('/partnership-requests', payload, { skipErrorToast: true })
}
