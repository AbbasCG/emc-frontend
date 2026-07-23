import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OpsSupportTicketsPage from '@/pages/operations/admin/OpsSupportTicketsPage'
import type { SupportTicket } from '@/types/operations'

const mockFetchSupportTickets = vi.fn()
vi.mock('@/api/supportApi', () => ({
  fetchSupportTickets: (...args: unknown[]) => mockFetchSupportTickets(...args),
  updateSupportTicket: vi.fn(),
  resolveSupportTicket: vi.fn(),
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

/**
 * Root cause regression: the "Open" button used to navigate to a hardcoded
 * `/dashboard/admin/support-tickets/{id}`, regardless of which namespace the
 * list page was mounted under. For a support_agent viewing the list at
 * `/dashboard/support`, that hardcoded target is outside their allowed
 * DASHBOARD_NAMESPACE_RULES prefix, so DashboardAccessGuard silently bounced
 * them back to `/dashboard/support` — indistinguishable from "the page just
 * refreshes". The fix makes the detail link namespace-aware, matching the
 * pattern OpsSupportTicketDetailPage's own back-link already used.
 */
describe('OpsSupportTicketsPage — "Open" navigates within the current namespace', () => {
  beforeEach(() => {
    mockFetchSupportTickets.mockReset()
    mockFetchSupportTickets.mockResolvedValue({ data: [ticket()], stats: {}, meta: {} })
  })

  it('navigates to /dashboard/support/{id} when mounted at the support_agent namespace', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/support']}>
        <Routes>
          <Route path="/dashboard/support" element={<OpsSupportTicketsPage />} />
          <Route path="/dashboard/support/:id" element={<div>DETAIL PAGE OPENED</div>} />
          <Route path="/dashboard/admin/support-tickets/:id" element={<div>WRONG NAMESPACE</div>} />
        </Routes>
      </MemoryRouter>,
    )

    const openButton = await screen.findByLabelText('فتح التذكرة')
    await userEvent.click(openButton)

    await waitFor(() => expect(screen.getByText('DETAIL PAGE OPENED')).toBeInTheDocument())
    expect(screen.queryByText('WRONG NAMESPACE')).not.toBeInTheDocument()
  })

  it('navigates to /dashboard/admin/support-tickets/{id} when mounted at the admin namespace', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/support-tickets']}>
        <Routes>
          <Route path="/dashboard/admin/support-tickets" element={<OpsSupportTicketsPage />} />
          <Route path="/dashboard/admin/support-tickets/:id" element={<div>ADMIN DETAIL PAGE OPENED</div>} />
        </Routes>
      </MemoryRouter>,
    )

    const openButton = await screen.findByLabelText('فتح التذكرة')
    await userEvent.click(openButton)

    await waitFor(() => expect(screen.getByText('ADMIN DETAIL PAGE OPENED')).toBeInTheDocument())
  })
})
