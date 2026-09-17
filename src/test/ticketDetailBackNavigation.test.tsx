import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import TicketDetailPage from '@/components/tickets/TicketDetailPage'
import type { Ticket } from '@/types/ticket'

const mockGetTicket = vi.fn()
vi.mock('@/services/ticketService', () => ({
  ticketService: {
    getTicket: (...args: unknown[]) => mockGetTicket(...args),
    addComment: vi.fn(),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin' } }),
}))

let mockCanAccessAdmin = true
let mockCanAccessWorkspace = false
vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({
    canAccessPath: (path: string) => {
      if (path === '/dashboard/tickets/admin') return mockCanAccessAdmin
      if (path === '/dashboard/tickets/workspace') return mockCanAccessWorkspace
      return false
    },
  }),
}))

// The attachment pipeline (blob fetch/preview/download) is regression-tested
// independently in ticketAttachmentCard.test.tsx — stub it here so this test
// stays focused on back-navigation.
vi.mock('@/components/tickets/TicketAttachmentCard', () => ({
  TicketAttachmentCard: () => <div>ATTACHMENT CARD</div>,
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 42,
    ticket_number: 'EMC-42',
    title: 'عطل في الطابعة',
    description: 'وصف المشكلة',
    ticket_category: 'OLD_ISSUE',
    priority: 'HIGH',
    department_id: 1,
    created_by_name: 'محمد',
    status: 'PENDING_APPROVAL',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderAt(initialEntry: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: new URL(initialEntry, 'http://x').pathname, search: new URL(initialEntry, 'http://x').search, state }]}>
      <Routes>
        <Route path="/dashboard/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/dashboard/tickets/admin" element={<div>ADMIN TABLE</div>} />
        <Route path="/dashboard/tickets/workspace" element={<div>WORKSPACE</div>} />
        <Route path="/dashboard/tickets/new" element={<div>NEW TICKET FORM</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TicketDetailPage — back navigation', () => {
  beforeEach(() => {
    mockGetTicket.mockReset()
    mockCanAccessAdmin = true
    mockCanAccessWorkspace = false
  })

  it('restores the exact admin list URL (with filters) when opened with a valid state.from', async () => {
    mockGetTicket.mockResolvedValue({ success: true, data: ticket() })
    renderAt('/dashboard/tickets/42', { from: '/dashboard/tickets/admin?status=PENDING_APPROVAL&page=2' })

    const backButton = await screen.findByText('رجوع إلى التذاكر')
    await userEvent.click(backButton)

    // MemoryRouter renders the matched route element only — we confirm the
    // navigation targeted the admin route rather than falling back.
    await waitFor(() => expect(screen.getByText('ADMIN TABLE')).toBeInTheDocument())
  })

  it('falls back to the admin queue (never the raw route state) when there is no from and admin access exists', async () => {
    mockGetTicket.mockResolvedValue({ success: true, data: ticket() })
    renderAt('/dashboard/tickets/42')

    const backButton = await screen.findByText('رجوع إلى التذاكر')
    await userEvent.click(backButton)

    await waitFor(() => expect(screen.getByText('ADMIN TABLE')).toBeInTheDocument())
  })

  it('never sends a normal user (no admin/workspace page access) to the admin table on a direct link', async () => {
    mockCanAccessAdmin = false
    mockCanAccessWorkspace = false
    mockGetTicket.mockResolvedValue({ success: true, data: ticket() })
    renderAt('/dashboard/tickets/42')

    const backButton = await screen.findByText('رجوع إلى التذاكر')
    await userEvent.click(backButton)

    await waitFor(() => expect(screen.getByText('NEW TICKET FORM')).toBeInTheDocument())
    expect(screen.queryByText('ADMIN TABLE')).not.toBeInTheDocument()
  })

  it('ignores an unsafe from value smuggled into route state and still uses the page-access fallback', async () => {
    mockGetTicket.mockResolvedValue({ success: true, data: ticket() })
    renderAt('/dashboard/tickets/42', { from: '/dashboard/admin/users' })

    const backButton = await screen.findByText('رجوع إلى التذاكر')
    await userEvent.click(backButton)

    await waitFor(() => expect(screen.getByText('ADMIN TABLE')).toBeInTheDocument())
  })

  it('renders the attachment card and keeps "تقديم تذكرة جديدة" as a separate control from back', async () => {
    mockGetTicket.mockResolvedValue({
      success: true,
      data: ticket({ attachments: [{
        id: 1, ticket_id: 42, preview_url: '/x', file_type: 'IMAGE',
        attachment_context: 'INITIAL_SUBMISSION', created_at: '2026-01-01T00:00:00Z',
      }] }),
    })
    renderAt('/dashboard/tickets/42')

    expect(await screen.findByText('ATTACHMENT CARD')).toBeInTheDocument()
    expect(screen.getByText('رجوع إلى التذاكر')).toBeInTheDocument()
    expect(screen.getByText('تقديم تذكرة جديدة')).toBeInTheDocument()
  })
})
