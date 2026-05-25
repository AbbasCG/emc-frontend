import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { AiAutomationFlow, AiAutomationRun } from '@/types/ai'

export async function fetchAiAutomations(): Promise<AiAutomationFlow[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/automations')
    const payload = unwrapLms<AiAutomationFlow[] | { automations: AiAutomationFlow[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.automations)) return payload.automations
    return []
  } catch {
    return []
  }
}

export async function fetchAiAutomationRuns(): Promise<AiAutomationRun[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/automations/runs')
    const payload = unwrapLms<AiAutomationRun[] | { runs: AiAutomationRun[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.runs)) return payload.runs
    return []
  } catch {
    return []
  }
}
