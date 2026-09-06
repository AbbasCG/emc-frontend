import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchNotificationsPage,
  pinNotification,
  unpinNotification,
  archiveNotification,
  unarchiveNotification,
  markNotificationUnread,
  bulkUpdateNotifications,
} from '@/api/notificationsApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

function rawNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, type: 'test_type', title: 'T', message: 'M', read_at: null,
    created_at: '2026-07-20T10:00:00Z', pinned: false, archived_at: null,
    ...overrides,
  }
}

describe('fetchNotificationsPage — filters sent to backend', () => {
  it('sends no query params when no filters are given', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, unread_count: 0, data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 30 } } })
    await fetchNotificationsPage()
    expect(mockedApi.get).toHaveBeenCalledWith('/notifications', expect.objectContaining({ params: {} }))
  })

  it('sends search, archived, unread_only, pinned_only, page as query params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, unread_count: 0, data: [], meta: { total: 0, current_page: 2, last_page: 3, per_page: 30 } } })
    await fetchNotificationsPage({ search: 'graded', archived: '1', unread_only: true, pinned_only: true, page: 2 })
    expect(mockedApi.get).toHaveBeenCalledWith('/notifications', expect.objectContaining({
      params: { search: 'graded', archived: '1', unread_only: 1, pinned_only: 1, page: 2 },
    }))
  })

  it('omits unread_only/pinned_only from params when false (not sent as 0)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, unread_count: 0, data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 30 } } })
    await fetchNotificationsPage({ unread_only: false, pinned_only: false })
    const [, config] = mockedApi.get.mock.calls[0] as [string, { params: Record<string, unknown> }]
    expect(config.params.unread_only).toBeUndefined()
    expect(config.params.pinned_only).toBeUndefined()
  })

  it('normalizes returned notifications and preserves pinned=false / archived_at=null rather than dropping them', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, unread_count: 2, data: [rawNotification()], meta: { total: 1, current_page: 1, last_page: 1, per_page: 30 } },
    })
    const res = await fetchNotificationsPage()
    expect(res.unread_count).toBe(2)
    expect(res.data[0].pinned).toBe(false)
    expect(res.data[0].archived_at).toBeNull()
    expect(res.meta).toEqual({ total: 1, current_page: 1, last_page: 1, per_page: 30 })
  })

  it('reflects pinned=true and a real archived_at timestamp from the backend', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, unread_count: 0, data: [rawNotification({ pinned: true, archived_at: '2026-07-19T09:00:00Z' })], meta: { total: 1, current_page: 1, last_page: 1, per_page: 30 } },
    })
    const res = await fetchNotificationsPage()
    expect(res.data[0].pinned).toBe(true)
    expect(res.data[0].archived_at).toBe('2026-07-19T09:00:00Z')
  })

  it('falls back to a sane meta object when the backend omits it', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, unread_count: 0, data: [rawNotification()] } })
    const res = await fetchNotificationsPage()
    expect(res.meta.current_page).toBe(1)
    expect(res.meta.total).toBe(1)
  })
})

describe('per-item pin/archive route + method assertions', () => {
  it('pinNotification calls PUT /notifications/{id}/pin', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true } })
    await pinNotification(5)
    expect(mockedApi.put).toHaveBeenCalledWith('/notifications/5/pin', undefined, expect.anything())
  })

  it('unpinNotification calls PUT /notifications/{id}/unpin', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true } })
    await unpinNotification(5)
    expect(mockedApi.put).toHaveBeenCalledWith('/notifications/5/unpin', undefined, expect.anything())
  })

  it('archiveNotification calls PUT /notifications/{id}/archive', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true } })
    await archiveNotification(9)
    expect(mockedApi.put).toHaveBeenCalledWith('/notifications/9/archive', undefined, expect.anything())
  })

  it('unarchiveNotification calls PUT /notifications/{id}/unarchive', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true } })
    await unarchiveNotification(9)
    expect(mockedApi.put).toHaveBeenCalledWith('/notifications/9/unarchive', undefined, expect.anything())
  })
})

describe('markNotificationUnread — no dedicated route, reuses bulk endpoint', () => {
  it('posts to /notifications/bulk with a single-id array and action=unread', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, affected: 1 } })
    await markNotificationUnread(7)
    expect(mockedApi.post).toHaveBeenCalledWith('/notifications/bulk', { ids: [7], action: 'unread' })
  })
})

describe('bulkUpdateNotifications — payload/method/response', () => {
  it('posts {ids, action} to /notifications/bulk', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, affected: 3 } })
    const affected = await bulkUpdateNotifications([1, 2, 3], 'archive')
    expect(mockedApi.post).toHaveBeenCalledWith('/notifications/bulk', { ids: [1, 2, 3], action: 'archive' })
    expect(affected).toBe(3)
  })

  it('returns 0 when the backend omits `affected` rather than throwing', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true } })
    const affected = await bulkUpdateNotifications([1], 'delete')
    expect(affected).toBe(0)
  })

  it.each(['read', 'unread', 'archive', 'unarchive', 'pin', 'unpin', 'delete'] as const)(
    'supports the "%s" bulk action verbatim in the request body',
    async (action) => {
      mockedApi.post.mockResolvedValueOnce({ data: { success: true, affected: 1 } })
      await bulkUpdateNotifications([42], action)
      expect(mockedApi.post).toHaveBeenCalledWith('/notifications/bulk', { ids: [42], action })
    },
  )
})
