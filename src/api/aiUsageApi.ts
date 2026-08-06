import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { AiUsageSnapshot } from '@/types/ai'

export async function fetchAiUsage(): Promise<AiUsageSnapshot> {
  const res = await apiClient.get<unknown>('/admin/ai/usage')
  return unwrapLms<AiUsageSnapshot>(res.data)
}
