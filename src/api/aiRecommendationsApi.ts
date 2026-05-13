import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { seedAiRecommendations } from '@/data/aiSeed'
import type { AiRecommendation } from '@/types/ai'

export async function fetchAiRecommendations(
  audience: 'student' | 'admin',
): Promise<AiRecommendation[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/recommendations', { params: { audience } })
    const payload = unwrapLms<AiRecommendation[] | { recommendations: AiRecommendation[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.recommendations)) {
      return payload.recommendations
    }
    return seedAiRecommendations(audience)
  } catch {
    return seedAiRecommendations(audience)
  }
}
