import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { MobileReadinessPayload } from '@/types/phase7'

export async function fetchMobileReadiness(): Promise<MobileReadinessPayload> {
  const res = await apiClient.get<unknown>('/mobile/readiness')
  return unwrapData<MobileReadinessPayload>(res.data)
}
