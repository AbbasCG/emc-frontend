import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { seedPlatformScale } from '@/data/platformSeed'
import type { PlatformScaleData } from '@/types/platform'

export async function fetchPlatformScale(): Promise<PlatformScaleData> {
  try {
    const res = await apiClient.get<unknown>('/platform/scale')
    return unwrapLms<PlatformScaleData>(res.data)
  } catch {
    return seedPlatformScale()
  }
}
