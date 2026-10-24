import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import TicketDetailPage from '@/components/tickets/TicketDetailPage'
import { reporterStatusCopy } from '@/utils/reporterTicketStatus'
import type { ReporterTicket, Ticket, TicketStatus } from '@/types/ticket'

const mockGetTicket = vi.fn()
const mockAddComment = vi.fn()
vi.mock('@/services/ticketService', () => ({
  ticketService: {
    getTicket: (...args: unknown[]) => mockGetTicket(...args),
    addComment: (...args: unknown[]) => mockAddComment(...args),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, name: 'مقدّم البلاغ' } }),
}))

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ canAccessPath: () => false }),
}))

vi.mock('@/components/tickets/TicketAttachmentCard', () => ({
  TicketAttachmentCard: ({ attachment }: { attachment: { file_name?: string } }) => (
    <div data-testid="attachment-card">{attachment.file_name}</div>
  ),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

const CAPS_OFF = {
  approve: false, reject: false, reassign: false, accept_task: false,
  reject_task: false, complete_task: false, add_internal_note: false, comment: false,
}

function reporter(over: Partial<ReporterTicket> = {}): ReporterTicket {
  return {
    viewer_role: 'reporter',
    id: 42,
    ticket_number: 'EMC-TCK-ABC123',
    title: 'تعطل بوابة الدفع الإلكتروني',
    description: 'لا تعمل البوابة عند إتمام الدفع',
    ticket_category: 'OLD_ISSUE',
    status: 'RESOLVED',
    created_at: '2026-10-10T08:00:00Z',
    updated_at: '2026-10-12T09:30:00Z',
    resolved_at: '2026-10-12T09:30:00Z',
    resolution_note: 'تم إصلاح إعدادات البوابة وإعادة تشغيل الخدمة.',
    rejection_reason: null,
    department: { id: 3, name: 'إدارة التقنية' },
    attachments: [],
    timeline: [
      { key: 'submitted', label: 'تم تقديم البلاغ', at: '2026-10-10T08:00:00Z' },
      { key: 'approved', label: 'تمت مراجعة البلاغ وإحالته للفريق المختص', at: '2026-10-10T10:00:00Z' },
      { key: 'resolved', label: 'تم حل البلاغ', at: '2026-10-12T09:30:00Z' },
    ],
    capabilities: CAPS_OFF,
    ...over,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/tickets/42']}>
      <Routes>
        <Route path="/dashboard/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/dashboard/tickets/new" element={<div>NEW TICKET FORM</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function open(ticket: ReporterTicket) {
  mockGetTicket.mockResolvedValue({ success: true, data: ticket })
  renderPage()
  return screen.findByTestId('reporter-ticket-view')
}

describe('reporter read-only ticket view', () => {
  beforeEach(() => {
    mockGetTicket.mockReset()
    mockAddComment.mockReset()
  })

  it('shows the resolved report with title, number, badge, department and last update', async () => {
    const root = await open(reporter())

    expect(within(root).getByRole('heading', { level: 1, name: 'تعطل بوابة الدفع الإلكتروني' })).toBeInTheDocument()
    expect(within(root).getByTestId('resolution-badge')).toHaveTextContent('تم حل البلاغ')
    expect(within(root).getByText('EMC-TCK-ABC123')).toBeInTheDocument()
    expect(within(root).getByText('إدارة التقنية')).toBeInTheDocument()
    expect(within(root).getByText('آخر تحديث')).toBeInTheDocument()
    expect(root).toHaveAttribute('dir', 'rtl')
  })

  it('highlights the written resolution and keeps the original description', async () => {
    await open(reporter())

    expect(screen.getByTestId('resolution-note')).toHaveTextContent('تم إصلاح إعدادات البوابة وإعادة تشغيل الخدمة.')
    expect(screen.getByText('لا تعمل البوابة عند إتمام الدفع')).toBeInTheDocument()
  })

  it('omits the resolution block when there is no written note', async () => {
    await open(reporter({ resolution_note: null }))

    expect(screen.queryByTestId('resolution-note')).not.toBeInTheDocument()
    expect(screen.getByTestId('resolution-badge')).toBeInTheDocument()
  })

  it('renders no workflow, assignment, SLA or internal-data controls', async () => {
    const root = await open(reporter({ status: 'PENDING_APPROVAL', resolution_note: null }))

    const text = root.textContent ?? ''
    for (const forbidden of [
      'اعتماد', 'رفض التذكرة', 'إعادة التوجيه', 'قبول التكليف', 'إنجاز المهمة', 'ملاحظة داخلية',
      'المكلّف', 'SLA', 'الموعد النهائي', 'معلومات المُدخل',
    ]) {
      expect(text).not.toContain(forbidden)
    }
    // The only controls are navigation; with comments off there is no form at all.
    expect(within(root).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(root).queryByText('إرسال التعقيب')).not.toBeInTheDocument()
  })

  it('labels a resolved suggestion as implemented and an approved one as approved', async () => {
    const implemented = reporter({ ticket_category: 'NEW_SUGGESTION', status: 'RESOLVED', title: 'وضع ليلي' })
    mockGetTicket.mockResolvedValue({ success: true, data: implemented })
    const first = renderPage()
    expect(await screen.findByTestId('resolution-badge')).toHaveTextContent('تم تنفيذ المقترح')
    first.unmount()

    mockGetTicket.mockResolvedValue({ success: true, data: reporter({ ticket_category: 'NEW_SUGGESTION', status: 'ASSIGNED', resolution_note: null }) })
    renderPage()
    expect(await screen.findByTestId('resolution-badge')).toHaveTextContent('تم اعتماد المقترح')
  })

  it('lists the simplified timeline in order', async () => {
    await open(reporter())

    const items = within(screen.getByTestId('reporter-timeline')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('تم تقديم البلاغ')
    expect(items[1]).toHaveTextContent('تمت مراجعة البلاغ وإحالته للفريق المختص')
    expect(items[2]).toHaveTextContent('تم حل البلاغ')
  })

  it("renders the reporter's own attachments through the attachment card", async () => {
    await open(reporter({
      attachments: [
        { id: 1, ticket_id: 42, preview_url: '/x', file_name: 'screenshot.png', file_type: 'IMAGE', is_image: true, attachment_context: 'INITIAL_SUBMISSION', created_at: '2026-10-10T08:00:00Z' },
        { id: 2, ticket_id: 42, preview_url: '/y', file_name: 'invoice.pdf', file_type: 'DOCUMENT', is_image: false, attachment_context: 'INITIAL_SUBMISSION', created_at: '2026-10-10T08:00:00Z' },
      ],
    }))

    expect(screen.getAllByTestId('attachment-card')).toHaveLength(2)
    expect(screen.getByText('مرفقاتك (2)')).toBeInTheDocument()
  })

  it('shows no attachments section when there are none', async () => {
    await open(reporter())

    expect(screen.queryByText(/مرفقاتك/)).not.toBeInTheDocument()
  })

  it('shows the department reason for a declined request', async () => {
    await open(reporter({ status: 'REJECTED_BY_ADMIN', resolution_note: null, rejection_reason: 'الطلب خارج نطاق الخدمة' }))

    expect(screen.getByTestId('resolution-badge')).toHaveTextContent('تعذّر قبول البلاغ')
    expect(screen.getByTestId('rejection-reason')).toHaveTextContent('الطلب خارج نطاق الخدمة')
  })

  it('offers a follow-up box only when the server enables it, and sends through the comment endpoint', async () => {
    mockAddComment.mockResolvedValue({ success: true })
    await open(reporter({ status: 'IN_PROGRESS', resolution_note: null, capabilities: { ...CAPS_OFF, comment: true } }))

    const box = screen.getByRole('textbox', { name: 'نص التعقيب' })
    await userEvent.type(box, 'هل من جديد؟')
    await userEvent.click(screen.getByRole('button', { name: /إرسال التعقيب/ }))

    await waitFor(() => expect(mockAddComment).toHaveBeenCalledWith(42, 'هل من جديد؟'))
  })

  it('does not render the staff history panel for a reporter payload', async () => {
    await open(reporter())
    expect(screen.queryByText('سجل أحداث التذكرة')).not.toBeInTheDocument()
  })

  it('leaves the staff page untouched for a staff payload', async () => {
    const staff: Ticket = {
      id: 42, ticket_number: 'EMC-42', title: 'عطل', description: 'د', ticket_category: 'OLD_ISSUE', priority: 'HIGH',
      department_id: 1, created_by_name: 'محمد', status: 'PENDING_APPROVAL',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', viewer_role: 'staff',
    }
    mockGetTicket.mockResolvedValue({ success: true, data: staff })
    renderPage()

    expect(await screen.findByText('معلومات المُدخل')).toBeInTheDocument()
    expect(screen.queryByTestId('reporter-ticket-view')).not.toBeInTheDocument()
  })
})

describe('reporterStatusCopy', () => {
  const statuses: TicketStatus[] = [
    'PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ADMIN', 'REJECTED_BY_ASSIGNEE',
  ]

  it.each(statuses)('has complete Arabic copy for %s in both categories', (status) => {
    for (const category of ['OLD_ISSUE', 'NEW_SUGGESTION'] as const) {
      const c = reporterStatusCopy(status, category)
      expect(c.badge).toBeTruthy()
      expect(c.statusLabel).toBeTruthy()
      expect(c.hint).toBeTruthy()
    }
  })

  it('never exposes internal routing wording for the internal-only states', () => {
    for (const status of ['UNRESOLVED', 'REJECTED_BY_ASSIGNEE'] as const) {
      const c = reporterStatusCopy(status, 'OLD_ISSUE')
      const text = `${c.badge} ${c.statusLabel} ${c.hint}`
      expect(text).not.toMatch(/تعذر الحل|اعتذر|التصعيد|المكلف|إعادة التوجيه/)
      expect(c.tone).toBe('review')
    }
  })

  it('uses the success tone only for a finished item', () => {
    expect(reporterStatusCopy('RESOLVED', 'OLD_ISSUE').tone).toBe('success')
    expect(reporterStatusCopy('IN_PROGRESS', 'OLD_ISSUE').tone).not.toBe('success')
  })
})
