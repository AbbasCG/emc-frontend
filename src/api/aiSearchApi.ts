import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { seedAiSearch } from '@/data/aiSeed'
import type { AiSearchResponse } from '@/types/ai'

export async function semanticSearch(query: string): Promise<AiSearchResponse> {
  try {
    const res = await apiClient.get<unknown>('/ai/search', {
      params: { q: query },
      skipErrorToast: true,
    })
    const payload = unwrapLms<AiSearchResponse>(res.data)
    if (payload?.groups?.length) return payload
    return seedAiSearch(query)
  } catch {
    return seedAiSearch(query)
  }
}
