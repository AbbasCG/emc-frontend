import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotificationsCenterPage from '@/pages/platform/NotificationsCenterPage'
import {
  fetchNotificationsPage,
  markNotificationRead,
  pinNotification,
  archiveNotification,
  deleteNotification,
  bulkUpdateNotifications,
} from '@/api/notificationsApi'
import type { PlatformNotification } from '@/types/platform'

vi.mock('@/api/notificationsApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/notificationsApi')>('@/api/notificationsApi')
  return {
    ...actual,
    fetchNotificationsPage: vi.fn(),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
    markNotificationUnread: vi.fn().mockResolvedValue(undefined),
    pinNotification: vi.fn().mockResolvedValue(undefined),
    unpinNotification: vi.fn().mockResolvedValue(undefined),
    archiveNotification: vi.fn().mockResolvedValue(undefined),
    unarchiveNotification: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
    bulkUpdateNotifications: vi.fn().mockResolvedValue(1),
  }
})

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

const mockedFetch = vi.mocked(fetchNotificationsPage)
const mockedRead = vi.mocked(markNotificationRead)
const mockedPin = vi.mocked(pinNotification)
const mockedArchive = vi.mocked(archiveNotification)
const mockedDelete = vi.mocked(deleteNotification)
const mockedBulk = vi.mocked(bulkUpdateNotifications)

function n(overrides: Partial<PlatformNotification> = {}): PlatformNotification {
  return {
    id: 1, type: 'course_update', title: 'عنوان', body: 'نص الإشعار', is_read: false, read_at: null,
    created_at: '2026-07-20T10:00:00Z', href: null, action_url: null, meta_url: null,
    entity_type: null, entity_id: null, pinned: false, archived_at: null,
    ...overrides,
  }
}

function pageResult(data: PlatformNotification[], overrides: Record<string, unknown> = {}) {
  return {
    data,
    unread_count: data.filter((x) => !x.read_at).length,
    meta: { total: data.length, current_page: 1, last_page: 1, per_page: 30 },
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationsCenterPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedFetch.mockResolvedValue(pageResult([]))
})

describe('NotificationsCenterPage — loading/empty/error', () => {
  it('shows a loading state before data resolves', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows the empty state when there are no notifications at all', async () => {
    mockedFetch.mockResolvedValue(pageResult([]))
    renderPage()
    expect(await screen.findByText('لا إشعارات')).toBeInTheDocument()
  })

  it('shows an error state with a retry button when the fetch fails, and retry re-fetches', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network'))
    renderPage()
    expect(await screen.findByText('تعذّر تحميل الإشعارات')).toBeInTheDocument()

    mockedFetch.mockResolvedValueOnce(pageResult([n()]))
    await userEvent.click(screen.getByText('إعادة المحاولة'))
    expect(await screen.findByText('عنوان')).toBeInTheDocument()
  })
})

describe('NotificationsCenterPage — rendering unread/pinned/archived state', () => {
  it('renders an unread badge for an unread notification', async () => {
    mockedFetch.mockResolvedValue(pageResult([n({ read_at: null })]))
    renderPage()
    expect(await screen.findByText('غير مقروء')).toBeInTheDocument()
  })

  it('renders a pin indicator for a pinned notification', async () => {
    mockedFetch.mockResolvedValue(pageResult([n({ pinned: true })]))
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('مثبت')).toBeInTheDocument())
  })

  it('renders an archived badge for an archived notification', async () => {
    mockedFetch.mockResolvedValue(pageResult([n({ archived_at: '2026-07-19T00:00:00Z' })]))
    renderPage()
    expect(await screen.findByText('مؤرشف')).toBeInTheDocument()
  })
})

describe('NotificationsCenterPage — search', () => {
  it('debounces search input then sends it as a filter, resetting to page 1', async () => {
    renderPage()
    await screen.findByText('لا إشعارات')
    mockedFetch.mockClear()
    mockedFetch.mockResolvedValue(pageResult([n({ title: 'Graded' })]))

    await userEvent.type(screen.getByLabelText('بحث في الإشعارات'), 'graded')

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ search: 'graded', page: 1 }))
    }, { timeout: 2000 })
  })

  it('clears the search input via the clear control', async () => {
    renderPage()
    await screen.findByText('لا إشعارات')
    const input = screen.getByLabelText('بحث في الإشعارات') as HTMLInputElement
    await userEvent.type(input, 'x')
    await userEvent.click(screen.getByLabelText('مسح البحث'))
    expect(input.value).toBe('')
  })
})

describe('NotificationsCenterPage — filters', () => {
  it('applies the archived-only filter and clears it via clear-all-filters', async () => {
    renderPage()
    await screen.findByText('لا إشعارات')
    mockedFetch.mockClear()
    mockedFetch.mockResolvedValue(pageResult([n({ archived_at: '2026-07-19T00:00:00Z' })]))

    await userEvent.click(screen.getByText('المؤرشفة'))
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ archived: '1' })))

    expect(await screen.findByText('مسح الفلاتر')).toBeInTheDocument()
    await userEvent.click(screen.getByText('مسح الفلاتر'))
    await waitFor(() => expect(mockedFetch).toHaveBeenLastCalledWith(expect.objectContaining({ archived: '0', unread_only: false, pinned_only: false, search: undefined })))
  })

  it('toggles unread-only and pinned-only filters', async () => {
    renderPage()
    await screen.findByText('لا إشعارات')
    mockedFetch.mockClear()

    await userEvent.click(screen.getByText('غير مقروء فقط'))
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ unread_only: true })))

    await userEvent.click(screen.getByText('المثبتة فقط'))
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ pinned_only: true })))
  })
})

describe('NotificationsCenterPage — individual actions', () => {
  it('pins then unpins a notification and refetches', async () => {
    mockedFetch.mockResolvedValue(pageResult([n({ pinned: false })]))
    renderPage()
    await screen.findByText('عنوان')

    await userEvent.click(screen.getByLabelText('تثبيت'))
    expect(mockedPin).toHaveBeenCalledWith(1)
  })

  it('archives a notification, which then removes it from the active view on refetch', async () => {
    mockedFetch.mockResolvedValueOnce(pageResult([n({ id: 1 })]))
    renderPage()
    await screen.findByText('عنوان')

    mockedFetch.mockResolvedValueOnce(pageResult([]))
    await userEvent.click(screen.getByLabelText('أرشفة'))

    expect(mockedArchive).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.getByText('لا إشعارات')).toBeInTheDocument())
  })

  it('marks an unread notification as read via the read action', async () => {
    mockedFetch.mockResolvedValue(pageResult([n({ read_at: null })]))
    renderPage()
    await screen.findByText('عنوان')

    await userEvent.click(screen.getByLabelText('تعيين كمقروء'))
    expect(mockedRead).toHaveBeenCalledWith(1)
  })

  it('deletes a notification only after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockedFetch.mockResolvedValueOnce(pageResult([n({ id: 1 })]))
    renderPage()
    await screen.findByText('عنوان')
    mockedFetch.mockResolvedValueOnce(pageResult([]))

    await userEvent.click(screen.getByLabelText('حذف'))
    expect(confirmSpy).toHaveBeenCalled()
    expect(mockedDelete).toHaveBeenCalledWith(1)
    confirmSpy.mockRestore()
  })

  it('does not delete when the confirmation is dismissed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockedFetch.mockResolvedValue(pageResult([n({ id: 1 })]))
    renderPage()
    await screen.findByText('عنوان')

    await userEvent.click(screen.getByLabelText('حذف'))
    expect(mockedDelete).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe('NotificationsCenterPage — multi-select and bulk actions', () => {
  it('shows the bulk toolbar only when at least one item is selected, and hides it after clearing', async () => {
    mockedFetch.mockResolvedValue(pageResult([n({ id: 1 })]))
    renderPage()
    await screen.findByText('عنوان')
    expect(screen.queryByText('إلغاء التحديد')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('تحديد'))
    expect(await screen.findByText('1 محدد')).toBeInTheDocument()

    await userEvent.click(screen.getByText('إلغاء التحديد'))
    await waitFor(() => expect(screen.queryByText('إلغاء التحديد')).not.toBeInTheDocument())
  })

  it('bulk-archives selected items, clears selection, and refetches the current filtered page', async () => {
    mockedFetch.mockResolvedValueOnce(pageResult([n({ id: 1 }), n({ id: 2, title: 'ثانٍ' })]))
    renderPage()
    await screen.findByText('عنوان')

    await userEvent.click(screen.getByText('تحديد الكل في هذه الصفحة'))
    expect(await screen.findByText('2 محدد')).toBeInTheDocument()

    mockedFetch.mockResolvedValueOnce(pageResult([]))
    await userEvent.click(screen.getByText('أرشفة', { selector: 'button' }))

    expect(mockedBulk).toHaveBeenCalledWith([1, 2], 'archive')
    await waitFor(() => expect(screen.queryByText('محدد')).not.toBeInTheDocument())
  })

  it('bulk delete requires confirmation before calling the API', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockedFetch.mockResolvedValue(pageResult([n({ id: 1 })]))
    renderPage()
    await screen.findByText('عنوان')

    await userEvent.click(screen.getByLabelText('تحديد'))
    await userEvent.click(screen.getByText('حذف', { selector: 'button' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(mockedBulk).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('falls back to the previous page when a bulk action empties the current (non-first) page', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockedFetch.mockResolvedValueOnce(pageResult([n({ id: 5 })], { meta: { total: 31, current_page: 2, last_page: 2, per_page: 30 } }))
    renderPage()
    await screen.findByText('عنوان')

    mockedFetch.mockClear()
    mockedFetch.mockResolvedValueOnce(pageResult([n({ id: 1 })], { meta: { total: 30, current_page: 1, last_page: 1, per_page: 30 } }))

    await userEvent.click(screen.getByLabelText('تحديد'))
    await userEvent.click(screen.getByText('حذف', { selector: 'button' }))

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })))
    confirmSpy.mockRestore()
  })
})

describe('NotificationsCenterPage — pagination', () => {
  it('renders pagination controls and requests the next page on click', async () => {
    mockedFetch.mockResolvedValueOnce(pageResult([n({ id: 1 })], { meta: { total: 60, current_page: 1, last_page: 2, per_page: 30 } }))
    renderPage()
    await screen.findByText('عنوان')

    mockedFetch.mockResolvedValueOnce(pageResult([n({ id: 2 })], { meta: { total: 60, current_page: 2, last_page: 2, per_page: 30 } }))
    await userEvent.click(screen.getByText('التالي'))

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled())
  })
})
