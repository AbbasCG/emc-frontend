import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchAutomationRules,
  fetchAutomationRuns,
  createAutomationRule,
  patchAutomationRule,
} from '@/api/automationsApi'
import type { AutomationRule, AutomationRun } from '@/types/platform'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

const rule = {
  id: 1,
  name: 'تنبيه غياب المتعلم',
  trigger: 'attendance.missed',
  active: true,
  conditions_json: '{"sessions":2}',
  actions_json: '{"notify":"instructor"}',
  updated_at: '2026-08-01T00:00:00Z',
} as unknown as AutomationRule

const run: AutomationRun = {
  id: 5,
  rule_id: 1,
  rule_name: 'تنبيه غياب المتعلم',
  status: 'success',
  started_at: '2026-08-01T01:00:00Z',
  finished_at: null,
  detail: null,
}

describe('fetchAutomationRules / fetchAutomationRuns', () => {
  it('fetchAutomationRules unwraps the list and hits /admin/automation-rules', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [rule] } })
    await expect(fetchAutomationRules()).resolves.toEqual([rule])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/automation-rules')
  })

  it('fetchAutomationRules returns [] on malformed payloads and on failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: 'ليست قائمة' } })
    await expect(fetchAutomationRules()).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchAutomationRules()).resolves.toEqual([])
  })

  it('fetchAutomationRuns unwraps the list and hits /admin/automation-runs', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [run] } })
    await expect(fetchAutomationRuns()).resolves.toEqual([run])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/automation-runs')
  })

  it('fetchAutomationRuns returns [] on failure (never throws)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchAutomationRuns()).resolves.toEqual([])
  })
})

describe('createAutomationRule', () => {
  it('POSTs the body and unwraps the created rule', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: rule } })
    await expect(createAutomationRule({ name: 'تنبيه غياب المتعلم' })).resolves.toEqual(rule)
    expect(mockedApi.post).toHaveBeenCalledWith('/admin/automation-rules', { name: 'تنبيه غياب المتعلم' })
  })

  it('propagates request errors (no swallow)', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(createAutomationRule({ name: '' })).rejects.toThrow('422')
  })
})

describe('patchAutomationRule', () => {
  it('PATCHes the rule and unwraps the updated row', async () => {
    const updated = { ...rule, active: false }
    mockedApi.patch.mockResolvedValueOnce({ data: { data: updated } })
    await expect(patchAutomationRule(1, { active: false })).resolves.toEqual(updated)
    expect(mockedApi.patch).toHaveBeenCalledWith('/admin/automation-rules/1', { active: false })
  })

  it('returns null on failure instead of throwing', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('500'))
    await expect(patchAutomationRule(1, { active: true })).resolves.toBeNull()
  })
})
