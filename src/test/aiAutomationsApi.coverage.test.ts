import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { fetchAiAutomations, fetchAiAutomationRuns } from '@/api/aiAutomationsApi'
import type { AiAutomationFlow, AiAutomationRun } from '@/types/ai'

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

const flow: AiAutomationFlow = {
  id: 1,
  name: 'ترحيب بالمتعلمين الجدد',
  trigger: 'student.registered',
  action: 'send_welcome_email',
  status: 'active',
  last_run_at: '2026-08-01T08:00:00Z',
}

const run: AiAutomationRun = {
  id: 11,
  automation_id: 1,
  status: 'success',
  started_at: '2026-08-01T08:00:00Z',
  finished_at: '2026-08-01T08:00:05Z',
  logs: ['بدأ التشغيل', 'تم الإرسال'],
}

describe('fetchAiAutomations', () => {
  it('accepts a bare array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [flow] } })
    await expect(fetchAiAutomations()).resolves.toEqual([flow])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/ai/automations')
  })

  it('accepts the { automations: [...] } shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { automations: [flow] } } })
    await expect(fetchAiAutomations()).resolves.toEqual([flow])
  })

  it('returns [] for malformed payloads and on request failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { automations: 'ليست قائمة' } } })
    await expect(fetchAiAutomations()).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchAiAutomations()).resolves.toEqual([])
  })
})

describe('fetchAiAutomationRuns', () => {
  it('short-circuits to [] without any request when no automation id is given', async () => {
    await expect(fetchAiAutomationRuns()).resolves.toEqual([])
    await expect(fetchAiAutomationRuns(undefined)).resolves.toEqual([])
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('accepts bare array and { runs: [...] } shapes from the executions endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [run] } })
    await expect(fetchAiAutomationRuns(1)).resolves.toEqual([run])
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/ai/automations/1/executions')

    mockedApi.get.mockResolvedValueOnce({ data: { data: { runs: [run] } } })
    await expect(fetchAiAutomationRuns(1)).resolves.toEqual([run])
  })

  it('returns [] for malformed payloads and on request failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { runs: null } } })
    await expect(fetchAiAutomationRuns(1)).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchAiAutomationRuns(1)).resolves.toEqual([])
  })
})
