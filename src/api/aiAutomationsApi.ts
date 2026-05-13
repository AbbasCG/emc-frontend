import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { seedAiAutomationRuns, seedAiAutomations } from '@/data/aiSeed'
import type { AiAutomationFlow, AiAutomationRun } from '@/types/ai'

export async function fetchAiAutomations(): Promise<AiAutomationFlow[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/automations')
    const payload = unwrapLms<AiAutomationFlow[] | { automations: AiAutomationFlow[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.automations)) return payload.automations
    return seedAiAutomations()
  } catch {
    return seedAiAutomations()
  }
}

export async function fetchAiAutomationRuns(): Promise<AiAutomationRun[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/automations/runs')
    const payload = unwrapLms<AiAutomationRun[] | { runs: AiAutomationRun[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.runs)) return payload.runs
    return seedAiAutomationRuns()
  } catch {
    return seedAiAutomationRuns()
  }
}
