import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { AutomationRule, AutomationRun } from '@/types/platform'

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  try {
    const res = await apiClient.get<unknown>('/automations/rules')
    return asList<AutomationRule>(res.data)
  } catch {
    return []
  }
}

export async function fetchAutomationRuns(): Promise<AutomationRun[]> {
  try {
    const res = await apiClient.get<unknown>('/automations/runs')
    return asList<AutomationRun>(res.data)
  } catch {
    return []
  }
}

export async function createAutomationRule(body: Partial<AutomationRule>): Promise<AutomationRule> {
  const res = await apiClient.post<unknown>('/automations/rules', body)
  return unwrapLms<AutomationRule>(res.data)
}

export async function patchAutomationRule(
  id: number,
  body: Partial<AutomationRule>,
): Promise<AutomationRule | null> {
  try {
    const res = await apiClient.patch<unknown>(`/automations/rules/${id}`, body)
    return unwrapLms<AutomationRule>(res.data)
  } catch {
    return null
  }
}
