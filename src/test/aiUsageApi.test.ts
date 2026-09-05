import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { fetchAiUsage } from '@/api/aiUsageApi'

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

describe('fetchAiUsage', () => {
  it('calls /admin/ai/usage/summary — not the raw paginated /admin/ai/usage list', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { period: { from: '2026-09-01', to: '2026-09-05' }, totals: null, by_model: [] } },
    })
    await fetchAiUsage()
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/ai/usage/summary')
  })

  it('maps AiUsageController::summary() aggregates into AiUsageSnapshot, collapsing by_model across statuses', async () => {
    // Real shape confirmed live against the backend: SUM()/COUNT() aggregates
    // can come back as numeric strings depending on DB driver.
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: {
          period: { from: '2026-09-01', to: '2026-09-30' },
          totals: { total_calls: 3, total_tokens: '190', total_cost: '0.012000' },
          by_model: [
            { provider: 'mock', model: 'mock-1', calls: 1, total_input: '10', total_output: '10', total_cost: '0.000000', status: 'success' },
            { provider: 'openai', model: 'gpt-4o', calls: 1, total_input: '20', total_output: '0', total_cost: '0.002000', status: 'failed' },
            { provider: 'openai', model: 'gpt-4o', calls: 1, total_input: '100', total_output: '50', total_cost: '0.010000', status: 'success' },
          ],
        },
      },
    })

    const usage = await fetchAiUsage()

    expect(usage).not.toBeNull()
    expect(usage!.requests_count).toBe(3)
    expect(usage!.tokens_total).toBe(190)
    expect(usage!.estimated_cost_usd).toBeCloseTo(0.012)
    expect(usage!.failed_generations).toBe(1)
    // gpt-4o appears in two by_model rows (success + failed) — collapsed to one entry.
    expect(usage!.models).toEqual(
      expect.arrayContaining([
        { name: 'mock-1', requests: 1, tokens: 20 },
        { name: 'gpt-4o', requests: 2, tokens: 170 },
      ]),
    )
    expect(usage!.models).toHaveLength(2)
  })

  it('always returns real arrays for models/top_users/top_prompts, never undefined — the exact fields components .map() over unconditionally', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { period: { from: '2026-09-01', to: '2026-09-05' }, totals: null, by_model: [] } },
    })

    const usage = await fetchAiUsage()

    expect(Array.isArray(usage!.models)).toBe(true)
    expect(Array.isArray(usage!.top_users)).toBe(true)
    expect(Array.isArray(usage!.top_prompts)).toBe(true)
  })

  it('resolves null (not throw) when the request fails', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('network down'))

    await expect(fetchAiUsage()).resolves.toBeNull()
  })
})
