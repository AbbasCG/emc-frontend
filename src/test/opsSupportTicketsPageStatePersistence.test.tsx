import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import OpsSupportTicketsPage from '@/pages/operations/admin/OpsSupportTicketsPage'
import OpsSupportTicketDetailPage from '@/pages/operations/admin/OpsSupportTicketDetailPage'
import type { SupportTicket, SupportTicketDetail } from '@/types/operations'

const mockFetchSupportTickets = vi.fn()
vi.mock('@/api/supportApi', () => ({
  fetchSupportTickets: (...args: unknown[]) => mockFetchSupportTickets(...args),
  fetchSupportTicket: vi.fn(),
  fetchSupportTicketAssignees: vi.fn().mockResolvedValue([]),
  fetchTicketActivity: vi.fn().mockResolvedValue([]),
  updateSupportTicket: vi.fn(),
  resolveSupportTicket: vi.fn(),
  replySupportTicket: vi.fn(),
  assignSupportTicket: vi.fn(),
  deleteSupportTicket: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin', role: 'admin' }, isAuthenticated: true, isLoading: false }),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

function ticket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 77, ticket_number: 'TCK-77', subject: 'Cannot access course',
    status: 'new', priority: 'high', full_name: 'Faisal', email: 'faisal@example.com',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function ticketDetail(id: number): SupportTicketDetail {
  return {
    id, ticket_number: `TCK-${id}`, subject: `Ticket subject ${id}`,
    status: 'new', priority: 'high', full_name: 'Faisal', email: 'faisal@example.com',
    created_at: '2026-01-01T00:00:00Z', message: 'Body', replies: [],
  }
}

/**
 * Root cause: page/search/filters lived in plain useState inside
 * OpsSupportTicketsPage, and the detail page's Back link always pointed at
 * the bare list path with no query string. Navigating list(page 3) → detail
 * → Back therefore remounted the list from scratch at page 1 with every
 * filter cleared. Fixed by making the URL (via useSearchParams) the source
 * of truth for list state, and having the detail page's Back link return to
 * the exact URL (including query string) the user came from.
 */
describe('OpsSupportTicketsPage — URL state survives navigating to a ticket and back', () => {
  beforeEach(() => {
    mockFetchSupportTickets.mockReset()
    mockFetchSupportTickets.mockResolvedValue({
      data: [ticket()],
      stats: {},
      meta: { current_page: 3, last_page: 5 },
    })
  })

  it('reads page/search/filters from the URL on mount instead of defaulting to page 1', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/support-tickets?page=3&status=new&priority=high&search=test']}>
        <Routes>
          <Route path="/dashboard/admin/support-tickets" element={<OpsSupportTicketsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(mockFetchSupportTickets).toHaveBeenCalled())
    const params = mockFetchSupportTickets.mock.calls[0][0]
    expect(params).toMatchObject({ page: '3', status: 'new', priority: 'high', search: 'test' })

    // Page 3 button reflects as the active page.
    expect(await screen.findByRole('button', { name: '3' })).toHaveClass('bg-[#0077B6]')
  })

  it('changing a filter updates the URL query string (so it round-trips through navigation)', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/support-tickets']}>
        <Routes>
          <Route path="/dashboard/admin/support-tickets" element={<OpsSupportTicketsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Cannot access course')
    await userEvent.type(screen.getByPlaceholderText('بحث بالموضوع، الرقم، الاسم أو البريد...'), 'urgent bug')

    await waitFor(() => {
      const lastCall = mockFetchSupportTickets.mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ search: 'urgent bug' })
    })
  })

  it('opening a ticket then clicking Back restores the exact list URL — page, filters, and search intact', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/support-tickets?page=3&status=open&priority=high&search=test']}>
        <Routes>
          <Route path="/dashboard/admin/support-tickets" element={<OpsSupportTicketsPage />} />
          <Route path="/dashboard/admin/support-tickets/:id" element={<OpsSupportTicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Cannot access course')

    const { fetchSupportTicket } = await import('@/api/supportApi')
    vi.mocked(fetchSupportTicket).mockResolvedValue(ticketDetail(77))
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()

    await userEvent.click(screen.getByLabelText('فتح التذكرة'))

    await screen.findByRole('heading', { level: 1, name: 'Ticket subject 77' })

    mockFetchSupportTickets.mockClear()
    await userEvent.click(screen.getByLabelText('العودة إلى قائمة التذاكر'))

    // Back on the list — verify the exact same params were used to reload it.
    await waitFor(() => expect(mockFetchSupportTickets).toHaveBeenCalled())
    const params = mockFetchSupportTickets.mock.calls[0][0]
    expect(params).toMatchObject({ page: '3', status: 'open', priority: 'high', search: 'test' })
  })
})
