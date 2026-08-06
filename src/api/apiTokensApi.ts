import apiClient from './axios'
import { asList } from './lmsApi'
import { unwrapData } from './unwrap'
import type { ApiAccessTokenRow, ApiTokenScope } from '@/types/phase7'

type RawToken = {
  id: number
  name: string
  abilities?: string[]
  scopes?: string[]
  last_used_at?: string | null
  created_at?: string
  token_preview?: string
}

function normToken(r: RawToken): ApiAccessTokenRow {
  return {
    id:            r.id,
    name:          r.name,
    scopes:        (r.scopes ?? r.abilities ?? []) as ApiTokenScope[],
    last_used_at:  r.last_used_at ?? null,
    created_at:    r.created_at ?? '',
    token_preview: r.token_preview,
  }
}

export async function fetchApiTokens(): Promise<ApiAccessTokenRow[]> {
  try {
    const res = await apiClient.get<unknown>('/developer/api-tokens')
    return asList<RawToken>(res.data).map(normToken)
  } catch {
    return []
  }
}

export type CreatedApiToken = {
  token: string
  record: ApiAccessTokenRow
}

export async function createApiToken(body: {
  name: string
  scopes: ApiTokenScope[]
}): Promise<CreatedApiToken> {
  const res = await apiClient.post<unknown>('/developer/api-tokens', body)
  const data = unwrapData<{ token?: string; token_plain?: string; record?: ApiAccessTokenRow }>(res.data)
  const plain = data.token ?? data.token_plain
  if (!plain || !data.record) throw new Error('استجابة إنشاء الرمز غير مكتملة')
  return { token: plain, record: data.record }
}

export async function revokeApiToken(id: number): Promise<void> {
  try {
    await apiClient.delete(`/developer/api-tokens/${id}`)
  } catch {
    /* optimistic removal handled in UI */
  }
}
