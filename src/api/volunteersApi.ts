import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { unwrapData } from './unwrap'
import type { OpsVolunteer } from '@/types/operations'

export async function fetchVolunteers(): Promise<OpsVolunteer[]> {
  try {
    const res = await apiClient.get<unknown>('/operations/volunteers', { skipErrorToast: true })
    return asList<OpsVolunteer>(res.data)
  } catch {
    return []
  }
}

export async function fetchVolunteerRequestsStats(): Promise<{ total: number; pending: number }> {
  const getCount = async (status?: string): Promise<number> => {
    try {
      const params: Record<string, unknown> = { per_page: 1 }
      if (status) params.status = status
      const res = await apiClient.get<unknown>('/admin/volunteer-requests', { skipErrorToast: true, params })
      const inner = unwrapData<{ total?: unknown }>(res.data)
      return Number(inner?.total ?? 0) || 0
    } catch {
      return 0
    }
  }
  const [total, pending] = await Promise.all([getCount(), getCount('pending')])
  return { total, pending }
}

export async function fetchVolunteer(id: number): Promise<OpsVolunteer> {
  const res = await apiClient.get<unknown>(`/operations/volunteers/${id}`)
  return unwrapLms<OpsVolunteer>(res.data)
}

export async function updateVolunteer(
  id: number,
  body: Partial<Pick<OpsVolunteer, 'status' | 'department_id' | 'availability'>>,
): Promise<OpsVolunteer> {
  const res = await apiClient.patch<unknown>(`/operations/volunteers/${id}`, body)
  return unwrapLms<OpsVolunteer>(res.data)
}
