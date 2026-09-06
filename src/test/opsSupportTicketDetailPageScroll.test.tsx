import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import OpsSupportTicketDetailPage from '@/pages/operations/admin/OpsSupportTicketDetailPage'
import type { SupportTicketDetail } from '@/types/operations'

const mockFetchSupportTicket = vi.fn()
vi.mock('@/api/supportApi', () => ({
  fetchSupportTicket: (...args: unknown[]) => mockFetchSupportTicket(...args),
  fetchSupportTicketAssignees: vi.fn().mockResolvedValue([]),
  fetchTicketActivity: vi.fn().mockResolvedValue([]),
  replySupportTicket: vi.fn(),
  updateSupportTicket: vi.fn(),
  assignSupportTicket: vi.fn(),
  resolveSupportTicket: vi.fn(),
  deleteSupportTicket: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Agent', role: 'support_agent' }, isAuthenticated: true, isLoading: false }),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

function ticket(id: number, replyCount = 0): SupportTicketDetail {
  return {
    id,
    ticket_number: `TCK-${id}`,
    subject: `Ticket subject ${id}`,
    status: 'new',
    priority: 'high',
    full_name: 'Faisal',
    email: 'faisal@example.com',
    created_at: '2026-01-01T00:00:00Z',
    message: 'Original message body',
    replies: Array.from({ length: replyCount }, (_, i) => ({
      id: i + 1,
      author_name: 'Agent',
      body: `Reply ${i + 1}`,
      internal: false,
      created_at: '2026-01-02T00:00:00Z',
    })),
  }
}

/**
 * Root cause: the conversation panel's "scroll to latest message" effect
 * used `chatEndRef.current.scrollIntoView(...)`, which walks up every
 * scrollable ancestor — including the window — to bring its target into
 * view. Since that sentinel sits far down a tall page, this dragged the
 * whole window scroll position down every time a ticket finished loading,
 * overriding the app-wide <ScrollToTop /> reset that had already fired on
 * navigation. The fix scrolls only the chat panel's own scrollTop.
 */
describe('OpsSupportTicketDetailPage — scroll behavior', () => {
  const scrollToSpy = vi.fn()

  beforeEach(() => {
    mockFetchSupportTicket.mockReset()
    scrollToSpy.mockReset()
    window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  function renderAt(entry: string) {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/dashboard/support/:id" element={<OpsSupportTicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('resets window scroll to the top when a ticket loads', async () => {
    mockFetchSupportTicket.mockResolvedValue(ticket(101, 3))

    renderAt('/dashboard/support/101')

    await screen.findByRole('heading', { level: 1, name: 'Ticket subject 101' })

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
  })

  it('resets window scroll to the top again when opening another ticket from inside the detail page', async () => {
    mockFetchSupportTicket.mockResolvedValueOnce(ticket(101, 3))
    mockFetchSupportTicket.mockResolvedValueOnce(ticket(202, 1))

    render(
      <MemoryRouter initialEntries={['/dashboard/support/101']}>
        <Routes>
          <Route
            path="/dashboard/support/:id"
            element={
              <>
                {/* Simulates "opening another ticket from inside the ticket detail page". */}
                <Link to="/dashboard/support/202">Open ticket 202</Link>
                <OpsSupportTicketDetailPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { level: 1, name: 'Ticket subject 101' })
    scrollToSpy.mockClear()

    await userEvent.click(screen.getByRole('link', { name: 'Open ticket 202' }))

    await screen.findByRole('heading', { level: 1, name: 'Ticket subject 202' })
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
  })

  it('never calls scrollIntoView on the window-level chat-end sentinel (the old root cause)', async () => {
    mockFetchSupportTicket.mockResolvedValue(ticket(303, 2))

    renderAt('/dashboard/support/303')
    await screen.findByRole('heading', { level: 1, name: 'Ticket subject 303' })
    await waitFor(() => expect(Element.prototype.scrollTo).toHaveBeenCalled())

    // The conversation panel's own container.scrollTo() is used instead —
    // scrollIntoView (which would have dragged the whole window) is never invoked.
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })
})

describe('OpsSupportTicketDetailPage — sticky header and action layout', () => {
  beforeEach(() => {
    mockFetchSupportTicket.mockReset()
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  function renderAt(entry: string) {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/dashboard/support/:id" element={<OpsSupportTicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('shows ticket number, status, and priority in the sticky header', async () => {
    mockFetchSupportTicket.mockResolvedValue(ticket(404))
    renderAt('/dashboard/support/404')

    await waitFor(() => expect(screen.getAllByText('TCK-404').length).toBeGreaterThan(0))
    expect(screen.getAllByText('جديدة').length).toBeGreaterThan(0)
    expect(screen.getAllByText('عالية').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('العودة إلى قائمة التذاكر')).toBeInTheDocument()
  })

  it('shows primary actions (رد / تغيير الحالة / حل التذكرة) directly, and keeps secondary actions inside the More menu until opened', async () => {
    mockFetchSupportTicket.mockResolvedValue(ticket(505))
    renderAt('/dashboard/support/505')
    await screen.findByRole('heading', { level: 1, name: 'Ticket subject 505' })

    expect(screen.getByRole('button', { name: 'رد' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تغيير الحالة' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حل التذكرة' })).toBeInTheDocument()

    // Secondary actions are not directly visible until the More menu opens.
    expect(screen.queryByText('نسخ الرابط')).not.toBeInTheDocument()
    expect(screen.queryByText('طباعة')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('المزيد من الإجراءات'))

    expect(screen.getByText('نسخ الرابط')).toBeInTheDocument()
    expect(screen.getByText('طباعة')).toBeInTheDocument()
    expect(screen.getByText('حذف')).toBeInTheDocument()
  })

  it('the reply button scrolls the reply editor into view', async () => {
    mockFetchSupportTicket.mockResolvedValue(ticket(606))
    renderAt('/dashboard/support/606')
    await screen.findByRole('heading', { level: 1, name: 'Ticket subject 606' })

    await userEvent.click(screen.getByRole('button', { name: 'رد' }))

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })
})
