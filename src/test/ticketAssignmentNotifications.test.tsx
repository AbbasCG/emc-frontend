import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { normalizePlatformNotification } from '@/api/notificationsApi'
import { TicketActionCenter } from '@/components/tickets/TicketActionCenter'
import type { Ticket, TicketCapabilities } from '@/types/ticket'

/**
 * The backend tells an employee when a ticket is assigned to them
 * (ticket_assigned): in-app + email, both linking to
 * /dashboard/tickets/:id?review=assigned. The ticket page then shows the
 * assignee a review panel and highlights accept / decline.
 */

vi.mock('@/services/ticketService', () => ({
  ticketService: { getMeta: vi.fn().mockResolvedValue({ tech_units: [], users: [] }), acceptTask: vi.fn() },
}))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

const NO_CAPS: TicketCapabilities = {
  approve: false, reject: false, reassign: false,
  accept_task: false, reject_task: false, complete_task: false,
  add_internal_note: false, comment: true,
}

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 42, ticket_number: 'EMC-TCK-42', title: 'تعطل بوابة الدفع', description: '...',
    ticket_category: 'OLD_ISSUE', priority: 'HIGH', department_id: 2, created_by_name: 'سارة',
    status: 'ASSIGNED', assigned_to_id: 7, expected_resolution_time: '2026-11-22T10:00:00Z',
    created_at: '2026-11-21T00:00:00Z', updated_at: '2026-11-21T00:00:00Z',
    ...overrides,
  }
}

const ASSIGNEE_CAPS: TicketCapabilities = { ...NO_CAPS, accept_task: true, reject_task: true }

describe('ticket_assigned in the notification centre', () => {
  it('keeps its type, Arabic text and the review link with its query string', () => {
    const n = normalizePlatformNotification({
      id: 9, type: 'ticket_assigned', title: 'أُسندت إليك تذكرة',
      message: 'أُسندت إليك التذكرة "تعطل بوابة الدفع" وهي بانتظار مراجعتك وقبولك. اضغط لمراجعتها.',
      entity_type: 'ticket', entity_id: 42, action_url: '/dashboard/tickets/42?review=assigned',
      is_read: false, created_at: '2026-11-21T09:00:00Z',
    })

    expect(n?.type).toBe('ticket_assigned')
    expect(n?.title).toBe('أُسندت إليك تذكرة')
    expect(n?.href).toBe('/dashboard/tickets/42?review=assigned')
  })
})

describe('TicketActionCenter — assignment review', () => {
  it('shows the review panel to an assignee who still has to accept or decline', () => {
    render(<TicketActionCenter ticket={ticket({ capabilities: ASSIGNEE_CAPS })} onChanged={vi.fn()} currentUserId={7} />)

    const panel = within(screen.getByTestId('assignment-review-panel'))
    expect(panel.getByText('أُسندت إليك هذه التذكرة وهي بانتظار ردّك')).toBeInTheDocument()
    expect(panel.getByText('عالية')).toBeInTheDocument()
    expect(panel.getByText(/الموعد النهائي/)).toBeInTheDocument()

    const card = within(screen.getByTestId('ticket-action-center'))
    expect(card.getByRole('button', { name: /بدء المعالجة/ })).toBeInTheDocument()
    expect(card.getByRole('button', { name: /اعتذار عن الاستلام/ })).toBeInTheDocument()
  })

  it('does not show the panel once the task is accepted, nor to a manager', () => {
    const { rerender } = render(
      <TicketActionCenter ticket={ticket({ status: 'IN_PROGRESS', capabilities: { ...NO_CAPS, complete_task: true } })} onChanged={vi.fn()} />,
    )
    expect(screen.queryByTestId('assignment-review-panel')).not.toBeInTheDocument()

    rerender(<TicketActionCenter ticket={ticket({ capabilities: { ...NO_CAPS, reassign: true } })} onChanged={vi.fn()} reviewMode />)
    expect(screen.queryByTestId('assignment-review-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('ticket-action-center')).not.toHaveAttribute('data-review-mode')
  })

  it('does not tell a global admin a ticket assigned to someone else is theirs', () => {
    // accept_task is true for global roles on any ASSIGNED ticket (TicketAccess::isAssignee).
    render(<TicketActionCenter ticket={ticket({ capabilities: ASSIGNEE_CAPS })} onChanged={vi.fn()} reviewMode currentUserId={99} />)

    expect(screen.queryByTestId('assignment-review-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('ticket-action-center')).not.toHaveAttribute('data-review-mode')
  })

  it('highlights and scrolls to the actions when opened from the assignment link', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll

    render(<TicketActionCenter ticket={ticket({ capabilities: ASSIGNEE_CAPS })} onChanged={vi.fn()} reviewMode currentUserId={7} />)

    expect(screen.getByTestId('ticket-action-center')).toHaveAttribute('data-review-mode', 'true')
    expect(scroll).toHaveBeenCalledTimes(1)
  })
})
