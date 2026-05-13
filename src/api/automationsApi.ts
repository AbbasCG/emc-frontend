import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { seedAutomationRuns, seedAutomations } from '@/data/platformSeed'
import type { AutomationRule, AutomationRun } from '@/types/platform'

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  try {
    const res = await apiClient.get<unknown>('/automations/rules')
    return asList<AutomationRule>(res.data)
  } catch {
    return seedAutomations()
  }
}

export async function fetchAutomationRuns(): Promise<AutomationRun[]> {
  try {
    const res = await apiClient.get<unknown>('/automations/runs')
    return asList<AutomationRun>(res.data)
  } catch {
    return seedAutomationRuns()
  }
}

export async function createAutomationRule(body: Partial<AutomationRule>): Promise<AutomationRule> {
  try {
    const res = await apiClient.post<unknown>('/automations/rules', body)
    return unwrapLms<AutomationRule>(res.data)
  } catch {
    return {
      id: Date.now(),
      name: body.name ?? 'قاعدة جديدة',
      trigger: body.trigger ?? 'manual',
      active: body.active ?? true,
      conditions_json: body.conditions_json ?? '{}',
      actions_json: body.actions_json ?? '{}',
      updated_at: new Date().toISOString().slice(0, 10),
    }
  }
}

export async function patchAutomationRule(
  id: number,
  body: Partial<AutomationRule>,
): Promise<AutomationRule | null> {
  try {
    const res = await apiClient.patch<unknown>(`/automations/rules/${id}`, body)
    return unwrapLms<AutomationRule>(res.data)
  } catch {
    const rules = await fetchAutomationRules()
    const existing = rules.find((r) => r.id === id)
    if (!existing) return null
    return {
      ...existing,
      ...body,
      updated_at: new Date().toISOString().slice(0, 10),
    }
  }
}
