import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/api/axios', () => ({ default: { get } }))

import { fetchLastLogins, fetchUsersActivity, fetchUsersOverview } from '@/api/usersAnalyticsApi'

beforeEach(() => {
  get.mockReset()
})

describe('users analytics client', () => {
  it('asks the overview endpoint for the window and the comparison, silently', async () => {
    get.mockResolvedValue({ data: { success: true, data: { kpis: 1 } } })
    const signal = new AbortController().signal

    const data = await fetchUsersOverview({ from: '2026-11-10', to: '2026-11-16', compare: true }, signal)

    expect(data).toEqual({ kpis: 1 })
    expect(get).toHaveBeenCalledWith('/admin/users-analytics/overview', {
      skipErrorToast: true,
      params: { from: '2026-11-10', to: '2026-11-16', compare: 1 },
      signal,
    })
  })

  it('sends compare=0 when the comparison is off', async () => {
    get.mockResolvedValue({ data: { data: {} } })

    await fetchUsersActivity({ from: '2026-11-10', to: '2026-11-10', compare: false })

    expect(get.mock.calls[0][0]).toBe('/admin/users-analytics/activity')
    expect(get.mock.calls[0][1].params).toEqual({ from: '2026-11-10', to: '2026-11-10', compare: 0 })
  })

  it('maps the paginated last-logins response', async () => {
    get.mockResolvedValue({
      data: {
        data: [{ id: 1, name: 'ليلى', role: 'student', is_active: true, last_login_at: '2026-11-20T09:41:00+00:00' }],
        meta: { total: 41, current_page: 2, last_page: 5, per_page: 10 },
      },
    })

    const page = await fetchLastLogins(2, 10)

    expect(get.mock.calls[0][1].params).toEqual({ page: 2, per_page: 10 })
    expect(page).toEqual({
      rows: [{ id: 1, name: 'ليلى', role: 'student', is_active: true, last_login_at: '2026-11-20T09:41:00+00:00' }],
      total: 41,
      page: 2,
      lastPage: 5,
      perPage: 10,
    })
  })

  it('lets a failure propagate (the tab shows it)', async () => {
    const failure = new Error('boom')
    get.mockReturnValue(Promise.reject(failure))
    let caught: unknown = null

    try {
      await fetchUsersOverview({ from: 'a', to: 'b', compare: false })
    } catch (e) {
      caught = e
    }

    expect(caught).toBe(failure)
  })
})
