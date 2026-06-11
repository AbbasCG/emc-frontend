import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { AutomationRule, AutomationRun } from '@/types/platform'

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/automation-rules')
    return asList<AutomationRule>(res.data)
  } catch {
    return []
  }
}

export async function fetchAutomationRuns(): Promise<AutomationRun[]> {
  try {
    const res = await apiClient.get<unknown>('/admin/automation-runs')
    return asList<AutomationRun>(res.data)
  } catch {
    return []
  }
}

export async function createAutomationRule(body: Partial<AutomationRule>): Promise<AutomationRule> {
  const res = await apiClient.post<unknown>('/admin/automation-rules', body)
  return unwrapLms<AutomationRule>(res.data)
}

export async function patchAutomationRule(
  id: number,
  body: Partial<AutomationRule>,
): Promise<AutomationRule | null> {
  try {
    const res = await apiClient.patch<unknown>(`/admin/automation-rules/${id}`, body)
    return unwrapLms<AutomationRule>(res.data)
  } catch {
    return null
  }
}
