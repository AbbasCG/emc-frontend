import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchAdminDashboard,
  classifyAdminDashboardError,
  type AdminDashboardErrorKind,
} from '@/api/adminApi'
import type { AdminDashboardData } from '@/types'

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

/** Minimal axios-shaped error — passes axios.isAxiosError (checks `isAxiosError === true`). */
function axiosErr(status?: number): unknown {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed',
    config: { url: '/dashboard/admin' },
    response: status != null ? { status, data: {} } : undefined,
  }
}

describe('fetchAdminDashboard', () => {
  it('calls GET /dashboard/admin with skipErrorToast and unwraps the { data } envelope', async () => {
    const dash = {
      stats: { total_users: 120 },
      recent_registrations: [{ id: 1, name: 'أحمد محمد' }],
    } as unknown as AdminDashboardData

    mockedApi.get.mockResolvedValueOnce({ data: { success: true, message: 'OK', data: dash } })

    const result = await fetchAdminDashboard()

    expect(mockedApi.get).toHaveBeenCalledWith('/dashboard/admin', { skipErrorToast: true })
    expect(result).toBe(dash)
  })

  it('returns a legacy bare payload as-is when there is no data envelope', async () => {
    const bare = { stats: {}, recent_registrations: [] } as unknown as AdminDashboardData
    // no `data` key on the response body → unwrapData passes it through
    mockedApi.get.mockResolvedValueOnce({ data: bare })

    // NOTE: bare has a `stats` key but no `data` key, so unwrapData returns it unchanged
    const result = await fetchAdminDashboard()
    expect(result).toBe(bare)
  })

  it('propagates request failures (no swallowing)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchAdminDashboard()).rejects.toThrow('Network Error')
  })
})

describe('classifyAdminDashboardError', () => {
  it('classifies a non-axios error as unknown', () => {
    expect(classifyAdminDashboardError(new Error('boom'))).toBe('unknown')
    expect(classifyAdminDashboardError(null)).toBe('unknown')
    expect(classifyAdminDashboardError('nope')).toBe('unknown')
  })

  it('classifies a response-less axios error as network', () => {
    expect(classifyAdminDashboardError(axiosErr())).toBe('network')
  })

  it('classifies 403 as forbidden', () => {
    expect(classifyAdminDashboardError(axiosErr(403))).toBe('forbidden')
  })

  it('classifies 404 as notfound', () => {
    expect(classifyAdminDashboardError(axiosErr(404))).toBe('notfound')
  })

  it('classifies every 5xx as server', () => {
    expect(classifyAdminDashboardError(axiosErr(500))).toBe('server')
    expect(classifyAdminDashboardError(axiosErr(502))).toBe('server')
    expect(classifyAdminDashboardError(axiosErr(503))).toBe('server')
  })

  it('classifies other statuses (401, 422) as unknown', () => {
    const kinds: AdminDashboardErrorKind[] = [
      classifyAdminDashboardError(axiosErr(401)),
      classifyAdminDashboardError(axiosErr(422)),
    ]
    expect(kinds).toEqual(['unknown', 'unknown'])
  })
})
