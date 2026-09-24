import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import type { Ticket, TicketCapabilities } from '@/types/ticket'

vi.mock('@/services/ticketService', () => ({
  ticketService: {
    getMeta: vi.fn().mockResolvedValue({ tech_units: [], users: [] }),
    acceptTask: vi.fn(),
  },
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

const NO_CAPS: TicketCapabilities = {
  approve: false, reject: false, reassign: false,
  accept_task: false, reject_task: false, complete_task: false,
  add_internal_note: false, comment: true,
}

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 12,
    ticket_number: 'EMC-12',
    title: 'مشكلة في الطابعة',
    description: '...',
    ticket_category: 'OLD_ISSUE',
    priority: 'MEDIUM',
    department_id: 2,
    created_by_name: 'سارة',
    status: 'PENDING_APPROVAL',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('TicketActionCenter — capability-gated rendering', () => {
  it('renders nothing when the ticket has no capabilities field at all', () => {
    const { container } = render(<TicketActionCenter ticket={ticket({ capabilities: undefined })} onChanged={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when every capability is false (e.g. a closed ticket)', () => {
    const { container } = render(
      <TicketActionCenter ticket={ticket({ status: 'RESOLVED', capabilities: NO_CAPS })} onChanged={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows only the Approve/Reject buttons when those are the only true capabilities', () => {
    render(
      <TicketActionCenter
        ticket={ticket({ capabilities: { ...NO_CAPS, approve: true, reject: true } })}
        onChanged={vi.fn()}
      />,
    )
    // Scoped to the action-center card itself — ConfirmDialog always portals
    // its (closed) markup into document.body regardless of capabilities, so
    // an unscoped query would see its static "بدء المعالجة" confirm label too.
    const card = within(screen.getByTestId('ticket-action-center'))
    expect(card.getByText('اعتماد')).toBeInTheDocument()
    expect(card.getByText('رفض')).toBeInTheDocument()
    expect(card.queryByText(/إعادة التوجيه|تعيين عضو/)).not.toBeInTheDocument()
    expect(card.queryByText('بدء المعالجة')).not.toBeInTheDocument()
  })

  it('labels the reassign action "تعيين عضو" when no assignee exists yet', () => {
    render(
      <TicketActionCenter
        ticket={ticket({ status: 'ASSIGNED', assignee: undefined, capabilities: { ...NO_CAPS, reassign: true } })}
        onChanged={vi.fn()}
      />,
    )
    expect(screen.getByText('تعيين عضو')).toBeInTheDocument()
  })

  it('labels the reassign action "إعادة التوجيه" once an assignee already exists', () => {
    render(
      <TicketActionCenter
        ticket={ticket({
          status: 'ASSIGNED',
          assignee: { id: 4, name: 'خالد', email: 'khaled@example.com' },
          capabilities: { ...NO_CAPS, reassign: true },
        })}
        onChanged={vi.fn()}
      />,
    )
    expect(screen.getByText('إعادة التوجيه')).toBeInTheDocument()
    expect(screen.queryByText('تعيين عضو')).not.toBeInTheDocument()
  })

  it('shows the "بدء المعالجة" (accept) button only when accept_task is true', () => {
    render(
      <TicketActionCenter
        ticket={ticket({ status: 'ASSIGNED', capabilities: { ...NO_CAPS, accept_task: true } })}
        onChanged={vi.fn()}
      />,
    )
    const card = within(screen.getByTestId('ticket-action-center'))
    expect(card.getByText('بدء المعالجة')).toBeInTheDocument()
  })
})
