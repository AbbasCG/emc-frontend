import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { OpsMeeting, OpsMeetingDetail } from '@/types/operations'

export async function fetchMeetings(): Promise<OpsMeeting[]> {
  const res = await apiClient.get<unknown>('/department/meetings')
  return asList<OpsMeeting>(res.data)
}

export async function createMeeting(payload: Partial<OpsMeetingDetail>): Promise<OpsMeetingDetail> {
  const res = await apiClient.post<unknown>('/department/meetings', payload)
  return unwrapLms<OpsMeetingDetail>(res.data)
}

export async function fetchMeeting(id: number): Promise<OpsMeetingDetail> {
  const res = await apiClient.get<unknown>(`/department/meetings/${id}`)
  return unwrapLms<OpsMeetingDetail>(res.data)
}

export async function updateMeetingActionItem(
  meetingId: number,
  actionItemId: number,
  body: { done?: boolean; text?: string },
): Promise<void> {
  await apiClient.patch(`/department/meetings/${meetingId}/action-items/${actionItemId}`, body)
}

export async function submitMeetingReport(meetingId: number, payload: any): Promise<any> {
  const res = await apiClient.post<unknown>(`/department/meetings/${meetingId}/report`, payload)
  return unwrapLms<any>(res.data)
}
