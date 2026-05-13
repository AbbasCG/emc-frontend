import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { MarketingItem } from '@/types/operations'

export async function fetchMarketingItems(): Promise<MarketingItem[]> {
  const res = await apiClient.get<unknown>('/operations/marketing')
  return asList<MarketingItem>(res.data)
}

export async function updateMarketingItem(
  id: number,
  body: Partial<Pick<MarketingItem, 'status' | 'publish_at' | 'title'>>,
): Promise<MarketingItem> {
  const res = await apiClient.patch<unknown>(`/operations/marketing/${id}`, body)
  return unwrapLms<MarketingItem>(res.data)
}
