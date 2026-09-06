import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { fetchApiTokens, createApiToken, revokeApiToken } from '@/api/apiTokensApi'
import type { ApiAccessTokenRow } from '@/types/phase7'

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

describe('fetchApiTokens', () => {
  it('normalizes raw rows: scopes preferred, defaults filled', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            name: 'رمز لوحة التقارير',
            scopes: ['read:reports'],
            abilities: ['write:forms'], // must be ignored when scopes exist
            last_used_at: '2026-08-01T00:00:00Z',
            created_at: '2026-07-01T00:00:00Z',
            token_preview: 'emc_****abcd',
          },
        ],
      },
    })

    const rows = await fetchApiTokens()
    expect(mockedApi.get).toHaveBeenCalledWith('/developer/api-tokens')
    expect(rows).toEqual([
      {
        id: 1,
        name: 'رمز لوحة التقارير',
        scopes: ['read:reports'],
        last_used_at: '2026-08-01T00:00:00Z',
        created_at: '2026-07-01T00:00:00Z',
        token_preview: 'emc_****abcd',
      },
    ])
  })

  it('falls back to Sanctum abilities when scopes are absent, and to [] when both are missing', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 2, name: 'قديم', abilities: ['read:courses'] },
          { id: 3, name: 'فارغ' },
        ],
      },
    })
    const rows = await fetchApiTokens()
    expect(rows[0]).toEqual({
      id: 2,
      name: 'قديم',
      scopes: ['read:courses'],
      last_used_at: null,
      created_at: '',
      token_preview: undefined,
    })
    expect(rows[1]!.scopes).toEqual([])
    expect(rows[1]!.last_used_at).toBeNull()
    expect(rows[1]!.created_at).toBe('')
  })

  it('returns [] on malformed payloads and on request failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { tokens: [] } } })
    await expect(fetchApiTokens()).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchApiTokens()).resolves.toEqual([])
  })
})

describe('createApiToken', () => {
  const record: ApiAccessTokenRow = {
    id: 5,
    name: 'رمز جديد',
    scopes: ['read:registrations'],
    last_used_at: null,
    created_at: '2026-08-07T00:00:00Z',
  }

  it('returns the plaintext token with its record', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { token: 'emc_plain_secret', record } } })
    const out = await createApiToken({ name: 'رمز جديد', scopes: ['read:registrations'] })
    expect(mockedApi.post).toHaveBeenCalledWith('/developer/api-tokens', {
      name: 'رمز جديد',
      scopes: ['read:registrations'],
    })
    expect(out).toEqual({ token: 'emc_plain_secret', record })
  })

  it('accepts the token_plain alias', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { token_plain: 'emc_alias', record } } })
    await expect(createApiToken({ name: 'x', scopes: [] })).resolves.toEqual({
      token: 'emc_alias',
      record,
    })
  })

  it('throws the Arabic incomplete-response error when token or record is missing', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { record } } }) // no plaintext token
    await expect(createApiToken({ name: 'x', scopes: [] })).rejects.toThrow(
      'استجابة إنشاء الرمز غير مكتملة',
    )

    mockedApi.post.mockResolvedValueOnce({ data: { data: { token: 'emc_only' } } }) // no record
    await expect(createApiToken({ name: 'x', scopes: [] })).rejects.toThrow(
      'استجابة إنشاء الرمز غير مكتملة',
    )
  })

  it('propagates request errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('403'))
    await expect(createApiToken({ name: 'x', scopes: [] })).rejects.toThrow('403')
  })
})

describe('revokeApiToken', () => {
  it('DELETEs /developer/api-tokens/{id}', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await expect(revokeApiToken(5)).resolves.toBeUndefined()
    expect(mockedApi.delete).toHaveBeenCalledWith('/developer/api-tokens/5')
  })

  it('swallows failures (optimistic UI removal)', async () => {
    mockedApi.delete.mockRejectedValueOnce(new Error('500'))
    await expect(revokeApiToken(5)).resolves.toBeUndefined()
  })
})
