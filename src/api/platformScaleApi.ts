import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { PlatformScaleData } from '@/types/platform'

export async function fetchPlatformScale(): Promise<PlatformScaleData> {
  const res = await apiClient.get<unknown>('/platform/scale')
  return unwrapLms<PlatformScaleData>(res.data)
}
