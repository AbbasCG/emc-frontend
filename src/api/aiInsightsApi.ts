import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { seedAiInsights, seedAiMeetingIntelligence } from '@/data/aiSeed'
import type { AiInsight, AiMeetingIntelligence } from '@/types/ai'

export async function fetchAiInsights(): Promise<AiInsight[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/insights')
    const payload = unwrapLms<AiInsight[] | { insights: AiInsight[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.insights)) return payload.insights
    return seedAiInsights()
  } catch {
    return seedAiInsights()
  }
}

export async function fetchMeetingIntelligence(meetingId: number): Promise<AiMeetingIntelligence> {
  try {
    const res = await apiClient.get<unknown>(`/ai/meetings/${meetingId}/intelligence`)
    return unwrapLms<AiMeetingIntelligence>(res.data)
  } catch {
    return seedAiMeetingIntelligence(meetingId)
  }
}
