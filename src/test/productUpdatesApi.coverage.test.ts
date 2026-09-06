import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchProductUpdates,
  fetchProductUpdate,
  fetchWhatsNew,
  fetchUnreadCount,
  markProductUpdateRead,
  fetchProductUpdateStats,
  createProductUpdate,
  updateProductUpdate,
  publishProductUpdate,
  deleteProductUpdate,
  type ProductUpdate,
  type ProductUpdatePayload,
  type ProductUpdateStats,
} from '@/api/productUpdatesApi'

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

const update = {
  id: 11,
  title: 'ميزة جديدة: لوحة الشهادات',
  body: 'أصبح بإمكانك الآن استعراض شهاداتك من مكان واحد.',
  category: 'feature',
  update_type: 'new_feature',
  status: 'published',
  target_roles: null,
  notify_in_app: true,
  notify_email: false,
  published_at: '2026-03-01T09:00:00Z',
  scheduled_at: null,
  created_at: '2026-02-28T09:00:00Z',
  updated_at: '2026-03-01T09:00:00Z',
  is_read: false,
  reads_count: 40,
  cta_label: 'استعرض الشهادات',
  cta_url: '/certificates',
  cta_external: false,
  image_url: null,
  image_before_url: null,
  image_after_url: null,
  maintenance_start: null,
  maintenance_end: null,
  affected_services: null,
  maintenance_severity: null,
  due_date: null,
  assigned_to_roles: null,
  priority: null,
  requires_acknowledgement: false,
  problem_description: null,
  fix_description: null,
  affected_users: null,
  related_page_url: null,
} satisfies ProductUpdate

describe('public product-updates endpoints', () => {
  it('fetchProductUpdates passes list params and returns the raw list response', async () => {
    const response = {
      success: true,
      data: [update],
      meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 },
    }
    mockedApi.get.mockResolvedValueOnce({ data: response })
    const out = await fetchProductUpdates({ page: 1, status: 'published', q: 'شهادات' })
    expect(mockedApi.get).toHaveBeenCalledWith('/product-updates', {
      params: { page: 1, status: 'published', q: 'شهادات' },
    })
    expect(out).toEqual(response)
  })

  it('fetchProductUpdates defaults to empty params', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 10 } } })
    await fetchProductUpdates()
    expect(mockedApi.get).toHaveBeenCalledWith('/product-updates', { params: {} })
  })

  it('fetchProductUpdate unwraps a single update', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: update } })
    expect(await fetchProductUpdate(11)).toEqual(update)
    expect(mockedApi.get).toHaveBeenCalledWith('/product-updates/11')
  })

  it('fetchProductUpdate propagates errors (no internal catch)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('404'))
    await expect(fetchProductUpdate(999)).rejects.toThrow('404')
  })

  it('fetchWhatsNew returns the list, [] on missing data, [] on error', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [update] } })
    expect(await fetchWhatsNew()).toEqual([update])
    expect(mockedApi.get).toHaveBeenCalledWith('/product-updates/whats-new', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    expect(await fetchWhatsNew()).toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    expect(await fetchWhatsNew()).toEqual([])
  })

  it('fetchUnreadCount returns the count, 0 on missing count, 0 on error', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, count: 4 } })
    expect(await fetchUnreadCount()).toBe(4)
    expect(mockedApi.get).toHaveBeenCalledWith('/product-updates/unread-count', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    expect(await fetchUnreadCount()).toBe(0)

    mockedApi.get.mockRejectedValueOnce(new Error('401'))
    expect(await fetchUnreadCount()).toBe(0)
  })

  it('markProductUpdateRead posts an empty body silently', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await markProductUpdateRead(11)
    expect(mockedApi.post).toHaveBeenCalledWith('/product-updates/11/read', {}, { skipErrorToast: true })
  })
})

describe('admin product-updates endpoints', () => {
  it('fetchProductUpdateStats returns stats, null on missing data, null on error', async () => {
    const stats: ProductUpdateStats = { total: 10, published: 6, draft: 3, archived: 1 }
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: stats } })
    expect(await fetchProductUpdateStats()).toEqual(stats)
    expect(mockedApi.get).toHaveBeenCalledWith('/product-updates/admin-stats', { skipErrorToast: true })

    mockedApi.get.mockResolvedValueOnce({ data: { success: true } })
    expect(await fetchProductUpdateStats()).toBeNull()

    mockedApi.get.mockRejectedValueOnce(new Error('403'))
    expect(await fetchProductUpdateStats()).toBeNull()
  })

  it('createProductUpdate posts the payload and unwraps', async () => {
    const payload: ProductUpdatePayload = {
      title: 'صيانة مجدولة',
      body: 'سيتم إيقاف المنصة مؤقتًا للصيانة.',
      category: 'announcement',
      update_type: 'maintenance',
      maintenance_severity: 'high',
      affected_services: ['المدفوعات'],
    }
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: update } })
    expect(await createProductUpdate(payload)).toEqual(update)
    expect(mockedApi.post).toHaveBeenCalledWith('/product-updates', payload)
  })

  it('updateProductUpdate patches a partial payload', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { success: true, data: { ...update, title: 'عنوان محدث' } } })
    const out = await updateProductUpdate(11, { title: 'عنوان محدث' })
    expect(mockedApi.patch).toHaveBeenCalledWith('/product-updates/11', { title: 'عنوان محدث' })
    expect(out.title).toBe('عنوان محدث')
  })

  it('publishProductUpdate posts to the publish endpoint with no body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { success: true, data: { ...update, status: 'published' } } })
    const out = await publishProductUpdate(11)
    expect(mockedApi.post).toHaveBeenCalledWith('/product-updates/11/publish')
    expect(out.status).toBe('published')
  })

  it('deleteProductUpdate calls DELETE /product-updates/{id}', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteProductUpdate(11)
    expect(mockedApi.delete).toHaveBeenCalledWith('/product-updates/11')
  })

  it('createProductUpdate propagates validation errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(
      createProductUpdate({ title: '', body: '', category: 'fix', update_type: 'bug_fix' }),
    ).rejects.toThrow('422')
  })
})
