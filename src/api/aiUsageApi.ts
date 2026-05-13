import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { seedAiUsage } from '@/data/aiSeed'
import type { AiUsageSnapshot } from '@/types/ai'

export async function fetchAiUsage(): Promise<AiUsageSnapshot> {
  try {
    const res = await apiClient.get<unknown>('/ai/usage')
    return unwrapLms<AiUsageSnapshot>(res.data)
  } catch {
    return seedAiUsage()
  }
}
