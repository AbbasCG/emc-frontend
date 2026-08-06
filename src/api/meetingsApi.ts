import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { OpsMeeting, OpsMeetingDetail } from '@/types/operations'

export async function fetchMeetings(): Promise<OpsMeeting[]> {
  const res = await apiClient.get<unknown>('/operations/meetings')
  return asList<OpsMeeting>(res.data)
}

export async function fetchMeeting(id: number): Promise<OpsMeetingDetail> {
  const res = await apiClient.get<unknown>(`/operations/meetings/${id}`)
  return unwrapLms<OpsMeetingDetail>(res.data)
}

export async function updateMeetingActionItem(
  meetingId: number,
  actionItemId: number,
  body: { done?: boolean; text?: string },
): Promise<void> {
  await apiClient.patch(`/operations/meetings/${meetingId}/action-items/${actionItemId}`, body)
}
