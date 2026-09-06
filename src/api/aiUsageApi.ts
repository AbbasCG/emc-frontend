import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { AiUsageSnapshot } from '@/types/ai'

/** AiUsageController::summary()'s actual response shape — aggregated by provider+model+status. */
type AiUsageSummaryResponse = {
  period: { from: string; to: string }
  totals: { total_calls: number | string | null; total_tokens: number | string | null; total_cost: number | string | null } | null
  by_model: Array<{
    provider: string
    model: string
    calls: number | string
    total_input: number | string | null
    total_output: number | string | null
    total_cost: number | string | null
    status: string
  }>
}

/** SUM()/COUNT() aggregates come back as numeric strings from some DB drivers (confirmed on SQLite) — coerce defensively either way. */
function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export async function fetchAiUsage(): Promise<AiUsageSnapshot | null> {
  try {
    // /admin/ai/usage (index) returns a raw paginated log list, not an
    // aggregate — /summary is the endpoint actually shaped for a dashboard.
    const res = await apiClient.get<unknown>('/admin/ai/usage/summary')
    const payload = unwrapLms<AiUsageSummaryResponse>(res.data)
    if (!payload) return null

    const byModel = payload.by_model ?? []

    const failedGenerations = byModel
      .filter((row) => row.status === 'failed')
      .reduce((sum, row) => sum + toNumber(row.calls), 0)

    // by_model has one row per (provider, model, status) — collapse to one
    // entry per model, summing across statuses, to match `models`.
    const modelTotals = new Map<string, { name: string; requests: number; tokens: number }>()
    for (const row of byModel) {
      const key = row.model || row.provider
      const existing = modelTotals.get(key) ?? { name: key, requests: 0, tokens: 0 }
      existing.requests += toNumber(row.calls)
      existing.tokens += toNumber(row.total_input) + toNumber(row.total_output)
      modelTotals.set(key, existing)
    }

    return {
      requests_count: toNumber(payload.totals?.total_calls),
      tokens_total: toNumber(payload.totals?.total_tokens),
      estimated_cost_usd: toNumber(payload.totals?.total_cost),
      failed_generations: failedGenerations,
      models: Array.from(modelTotals.values()),
      // Not backed by any current data source: AiUsageLog has no per-user
      // aggregation query, and prompt text is never stored anywhere at all
      // (only `action`, a short label). Honest empty state — same decision
      // as fetchAiRecentGenerations() — rather than fake data. Always an
      // array (never undefined), so components that .map() over these
      // fields render an empty list instead of throwing.
      top_users: [],
      top_prompts: [],
    }
  } catch {
    return null
  }
}
