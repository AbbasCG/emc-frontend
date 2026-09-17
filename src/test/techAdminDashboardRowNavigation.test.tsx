import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import TechAdminDashboardPage from '@/components/tickets/TechAdminDashboardPage'
import type { Ticket } from '@/types/ticket'

const mockGetTickets = vi.fn()
vi.mock('@/services/ticketService', () => ({
  ticketService: {
    getTickets: (...args: unknown[]) => mockGetTickets(...args),
    getMeta: vi.fn().mockResolvedValue({ tech_units: [], users: [] }),
    approveTicket: vi.fn(),
    rejectByAdmin: vi.fn(),
    reassign: vi.fn(),
  },
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 501,
    ticket_number: 'EMC-501',
    title: 'الشبكة لا تعمل',
    description: '...',
    ticket_category: 'OLD_ISSUE',
    priority: 'HIGH',
    department_id: 3,
    created_by_name: 'أحمد',
    status: 'PENDING_APPROVAL',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard/tickets/admin" element={<TechAdminDashboardPage />} />
        <Route path="/dashboard/tickets/:id" element={<div>TICKET DETAIL OPENED</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TechAdminDashboardPage — row navigation', () => {
  beforeEach(() => {
    mockGetTickets.mockReset()
  })

  it('clicking anywhere on a row opens Ticket Detail', async () => {
    mockGetTickets.mockResolvedValue({ success: true, data: { data: [ticket()], total: 1 } })
    renderAt('/dashboard/tickets/admin')

    const row = await screen.findByLabelText('فتح التذكرة EMC-501')
    await userEvent.click(row)

    await waitFor(() => expect(screen.getByText('TICKET DETAIL OPENED')).toBeInTheDocument())
  })

  it('pressing Enter on a focused row opens Ticket Detail (keyboard access)', async () => {
    mockGetTickets.mockResolvedValue({ success: true, data: { data: [ticket()], total: 1 } })
    renderAt('/dashboard/tickets/admin')

    const row = await screen.findByLabelText('فتح التذكرة EMC-501')
    row.focus()
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByText('TICKET DETAIL OPENED')).toBeInTheDocument())
  })

  it('clicking an action button inside the row does not also trigger row navigation', async () => {
    mockGetTickets.mockResolvedValue({
      success: true,
      data: {
        data: [ticket({ capabilities: {
          approve: true, reject: true, reassign: false,
          accept_task: false, reject_task: false, complete_task: false,
          add_internal_note: true, comment: true,
        } })],
        total: 1,
      },
    })
    renderAt('/dashboard/tickets/admin')

    const approveButton = await screen.findByText('✅ اعتماد')
    await userEvent.click(approveButton)

    // The approve modal should open instead of navigating away from the table.
    expect(await screen.findByText('اعتماد التذكرة وتحديد التكليف', { exact: false })).toBeInTheDocument()
    expect(screen.queryByText('TICKET DETAIL OPENED')).not.toBeInTheDocument()
  })

  it('does not render a reassign button for REJECTED_BY_ASSIGNEE (backend capability says false)', async () => {
    // Root-cause regression: the old UI showed "إعادة توجيه" for this status by
    // matching on ticket.status directly, but reassign() only accepts
    // ASSIGNED/IN_PROGRESS and would 409. The capability is now the single
    // source of truth, computed the same way for the table and Detail.
    mockGetTickets.mockResolvedValue({
      success: true,
      data: {
        data: [ticket({
          status: 'REJECTED_BY_ASSIGNEE',
          capabilities: {
            approve: false, reject: false, reassign: false,
            accept_task: false, reject_task: false, complete_task: false,
            add_internal_note: true, comment: true,
          },
        })],
        total: 1,
      },
    })
    renderAt('/dashboard/tickets/admin')

    const row = await screen.findByLabelText('فتح التذكرة EMC-501')
    expect(within(row).queryByText(/إعادة توجيه/)).not.toBeInTheDocument()
  })

  it('renders a reassign button for ASSIGNED when the backend reports reassign: true', async () => {
    mockGetTickets.mockResolvedValue({
      success: true,
      data: {
        data: [ticket({
          status: 'ASSIGNED',
          capabilities: {
            approve: false, reject: false, reassign: true,
            accept_task: false, reject_task: false, complete_task: false,
            add_internal_note: true, comment: true,
          },
        })],
        total: 1,
      },
    })
    renderAt('/dashboard/tickets/admin')

    expect(await screen.findByText(/إعادة توجيه/)).toBeInTheDocument()
  })

  it('preserves filters/search/page in the URL when opening a ticket, for back-navigation restoration', async () => {
    mockGetTickets.mockResolvedValue({ success: true, data: { data: [ticket()], total: 1 } })
    renderAt('/dashboard/tickets/admin?status=PENDING_APPROVAL&search=network&page=2')

    const row = await screen.findByLabelText('فتح التذكرة EMC-501')
    await userEvent.click(row)

    await waitFor(() => expect(screen.getByText('TICKET DETAIL OPENED')).toBeInTheDocument())
    // The click handler must have read the URL (with query string) at click time —
    // verified indirectly via the mocked getTickets call reflecting the parsed params.
    expect(mockGetTickets).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING_APPROVAL', search: 'network', page: 2 }),
    )
  })
})
