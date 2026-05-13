import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { KpiTabData, KpiTabSlug } from '@/types/intelligence'

export async function fetchKpiDashboard(tab: KpiTabSlug): Promise<KpiTabData> {
  const res = await apiClient.get<unknown>('/kpi', { params: { tab } })
  return unwrapLms<KpiTabData>(res.data)
}
