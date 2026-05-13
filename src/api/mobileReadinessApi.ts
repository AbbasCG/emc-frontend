import apiClient from './axios'
import { unwrapData } from './unwrap'
import { seedMobileReadiness } from '@/data/phase7Seed'
import type { MobileReadinessPayload } from '@/types/phase7'

export async function fetchMobileReadiness(): Promise<MobileReadinessPayload> {
  try {
    const res = await apiClient.get<unknown>('/mobile/readiness')
    return unwrapData<MobileReadinessPayload>(res.data)
  } catch {
    return seedMobileReadiness()
  }
}
