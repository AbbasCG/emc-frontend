import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { AiInsight, AiMeetingIntelligence } from '@/types/ai'

export async function fetchAiInsights(): Promise<AiInsight[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/ai/insights')
    const payload = unwrapLms<AiInsight[] | { insights: AiInsight[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.insights)) return payload.insights
    return []
  } catch {
    return []
  }
}

export async function fetchMeetingIntelligence(meetingId: number): Promise<AiMeetingIntelligence | null> {
  try {
    const res = await apiClient.get<unknown>(`/ai/meetings/${meetingId}/summary`)
    return unwrapLms<AiMeetingIntelligence>(res.data)
  } catch {
    return null
  }
}
