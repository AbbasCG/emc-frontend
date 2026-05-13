import apiClient from './axios'
import { asList } from './lmsApi'
import { unwrapData } from './unwrap'
import { seedApiTokens } from '@/data/phase7Seed'
import type { ApiAccessTokenRow, ApiTokenScope } from '@/types/phase7'

export async function fetchApiTokens(): Promise<ApiAccessTokenRow[]> {
  try {
    const res = await apiClient.get<unknown>('/developer/api-tokens')
    return asList<ApiAccessTokenRow>(res.data)
  } catch {
    return seedApiTokens()
  }
}

export type CreatedApiToken = {
  token: string
  record: ApiAccessTokenRow
}

export async function createApiToken(body: {
  name: string
  scopes: ApiTokenScope[]
}): Promise<CreatedApiToken | null> {
  try {
    const res = await apiClient.post<unknown>('/developer/api-tokens', body)
    const data = unwrapData<{ token?: string; token_plain?: string; record?: ApiAccessTokenRow }>(res.data)
    const plain = data.token ?? data.token_plain
    if (plain && data.record) return { token: plain, record: data.record }
    const synth: ApiAccessTokenRow = {
      id: Date.now(),
      name: body.name,
      scopes: body.scopes,
      last_used_at: null,
      created_at: new Date().toISOString().slice(0, 10),
      token_preview: `${plain?.slice(0, 12) ?? 'emc_live_new'}•••`,
    }
    return { token: plain ?? `emc_live_${Math.random().toString(36).slice(2, 12)}`, record: synth }
  } catch {
    const synth: ApiAccessTokenRow = {
      id: Date.now(),
      name: body.name,
      scopes: body.scopes,
      last_used_at: null,
      created_at: new Date().toISOString().slice(0, 10),
      token_preview: 'emc_live_demo•••',
    }
    return {
      token: `emc_live_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`,
      record: synth,
    }
  }
}

export async function revokeApiToken(id: number): Promise<void> {
  try {
    await apiClient.delete(`/developer/api-tokens/${id}`)
  } catch {
    /* optimistic removal handled in UI */
  }
}
