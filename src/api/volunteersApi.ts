import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { OpsVolunteer } from '@/types/operations'

export async function fetchVolunteers(): Promise<OpsVolunteer[]> {
  const res = await apiClient.get<unknown>('/operations/volunteers')
  return asList<OpsVolunteer>(res.data)
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
