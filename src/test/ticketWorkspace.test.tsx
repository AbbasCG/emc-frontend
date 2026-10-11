import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Ticket, TicketAttachment, TicketCapabilities } from '@/types/ticket'
import { attachmentTypeLabel, formatAttachmentDate } from '@/utils/ticketAttachments'

/**
 * TICKETS WORKSPACE — attachment preview + capability-driven actions.
 *
 * Regression for the bug where the workspace rendered every attachment as a
 * bare <a href={preview_url}>: a browser navigation to a Sanctum-protected
 * route carries no Bearer token, so the file never previewed. The workspace
 * must go through the authenticated blob pipeline instead.
 */

const created: string[] = []
const revoked: string[] = []
let seq = 0

const fetchBlob = vi.fn()
const download = vi.fn()
vi.mock('@/api/ticketAttachmentsApi', () => ({
  fetchTicketAttachmentBlob: (...args: unknown[]) => fetchBlob(...args),
  downloadTicketAttachment: (...args: unknown[]) => download(...args),
}))

const mockGetTickets = vi.fn()
const mockGetTicket = vi.fn()
const mockAcceptTask = vi.fn()
const mockRejectTask = vi.fn()
const mockCompleteTask = vi.fn()
const mockAddComment = vi.fn()
vi.mock('@/services/ticketService', () => ({
  ticketService: {
    getTickets: (...a: unknown[]) => mockGetTickets(...a),
    getTicket: (...a: unknown[]) => mockGetTicket(...a),
    acceptTask: (...a: unknown[]) => mockAcceptTask(...a),
    rejectTask: (...a: unknown[]) => mockRejectTask(...a),
    completeTask: (...a: unknown[]) => mockCompleteTask(...a),
    addComment: (...a: unknown[]) => mockAddComment(...a),
  },
}))

let mockUser: { id: number; name: string } | null = { id: 7, name: 'موظف الدعم' }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isLoading: false }),
}))

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))

const { default: AssigneeWorkspacePage } = await import('@/components/tickets/AssigneeWorkspacePage')

const NO_CAPS: TicketCapabilities = {
  approve: false, reject: false, reassign: false,
  accept_task: false, reject_task: false, complete_task: false,
  add_internal_note: false, comment: true,
}

const image = (over: Partial<TicketAttachment> = {}): TicketAttachment => ({
  id: 9,
  ticket_id: 42,
  preview_url: 'https://api.example/api/v1/tickets/42/attachments/9/download',
  file_name: 'pasted-image-1789681091276-0.png',
  file_type: 'IMAGE',
  mime_type: 'image/png',
  file_size: 348_160,
  is_image: true,
  attachment_context: 'INITIAL_SUBMISSION',
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

const pdf = (): TicketAttachment =>
  image({
    id: 10,
    file_name: 'report.pdf',
    file_type: 'DOCUMENT',
    mime_type: 'application/pdf',
    is_image: false,
  })

function makeTicket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 42,
    ticket_number: 'EMC-TCK-42',
    title: 'عطل في الطابعة',
    description: 'الطابعة لا تعمل منذ الصباح',
    ticket_category: 'OLD_ISSUE',
    priority: 'HIGH',
    department_id: 1,
    created_by_name: 'محمد',
    assigned_to_id: 7,
    status: 'IN_PROGRESS',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    capabilities: NO_CAPS,
    attachments: [image()],
    ...over,
  }
}

async function renderWorkspace(ticket: Ticket, detail?: Partial<Ticket>) {
  mockGetTickets.mockResolvedValue({ success: true, data: { data: [ticket] } })
  mockGetTicket.mockResolvedValue({ success: true, data: { ...ticket, ...detail } })

  const user = userEvent.setup()
  const view = render(<AssigneeWorkspacePage />)

  await user.click(await screen.findByRole('button', { name: new RegExp(ticket.title) }))
  await screen.findByRole('heading', { level: 2, name: ticket.title })

  return { user, view }
}

beforeEach(() => {
  created.length = 0
  revoked.length = 0
  seq = 0
  mockUser = { id: 7, name: 'موظف الدعم' }
  ;[fetchBlob, download, mockGetTickets, mockGetTicket, mockAcceptTask, mockRejectTask,
    mockCompleteTask, mockAddComment, toastError, toastSuccess].forEach((m) => m.mockReset())

  URL.createObjectURL = vi.fn(() => {
    const u = `blob:mock/${seq++}`
    created.push(u)
    return u
  })
  URL.revokeObjectURL = vi.fn((u: string) => { revoked.push(u) })

  fetchBlob.mockImplementation(async () => ({
    blob: new Blob(['x']),
    mime: 'image/png',
    objectUrl: URL.createObjectURL(new Blob(['x'])),
  }))
  mockAcceptTask.mockResolvedValue({ success: true })
  mockRejectTask.mockResolvedValue({ success: true })
  mockCompleteTask.mockResolvedValue({ success: true })
  mockAddComment.mockResolvedValue({ success: true, message: 'ok' })
})

afterEach(() => {
  // @ts-expect-error restoring jsdom's absent implementation
  delete URL.createObjectURL
  // @ts-expect-error restoring jsdom's absent implementation
  delete URL.revokeObjectURL
})

describe('attachment preview in the workspace', () => {
  it('renders an image attachment as a preview fetched through the authenticated client', async () => {
    await renderWorkspace(makeTicket())

    const img = await screen.findByRole('img', { name: 'pasted-image-1789681091276-0.png' })

    expect(fetchBlob).toHaveBeenCalledWith(42, 9)
    expect(img).toHaveAttribute('src', 'blob:mock/0')
    expect(img.getAttribute('src')).not.toContain('/api/v1/tickets')
  })

  it('never links the private endpoint directly (the original bug)', async () => {
    await renderWorkspace(makeTicket())
    await screen.findByRole('img')

    expect(document.querySelector('a[href*="/attachments/"]')).toBeNull()
    expect(document.querySelector('a[target="_blank"][href*="api/v1"]')).toBeNull()
  })

  it('shows filename, file type and size for the attachment', async () => {
    await renderWorkspace(makeTicket())
    await screen.findByRole('img')

    expect(screen.getByText('pasted-image-1789681091276-0.png')).toBeInTheDocument()
    expect(screen.getByText('340 KB')).toBeInTheDocument()
    expect(screen.getAllByText(/PNG/).length).toBeGreaterThan(0)
  })

  it('renders a non-image attachment as a file card and never fetches a thumbnail', async () => {
    await renderWorkspace(makeTicket({ attachments: [pdf()] }))

    expect(await screen.findByText('report.pdf')).toBeInTheDocument()
    // Once as the card badge, once in the metadata line.
    expect(screen.getAllByText('PDF')).toHaveLength(2)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(fetchBlob).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /تنزيل/ })).toBeInTheDocument()
  })

  it('degrades to a fallback when the image fails, keeping download and the rest of the page', async () => {
    fetchBlob.mockRejectedValue(new Error('403'))
    await renderWorkspace(makeTicket())

    expect(await screen.findByText('تعذر عرض الصورة')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /تنزيل/ })).toBeInTheDocument()
    expect(screen.getByText('الطابعة لا تعمل منذ الصباح')).toBeInTheDocument()
  })

  it('separates the requester files from resolution proof', async () => {
    await renderWorkspace(
      makeTicket({
        attachments: [image(), image({ id: 11, file_name: 'proof.png', attachment_context: 'RESOLUTION_PROOF' })],
      }),
    )

    expect(await screen.findByText('مرفقات مقدّم الطلب')).toBeInTheDocument()
    expect(screen.getByText('إثباتات الحل')).toBeInTheDocument()
  })

  it('says so when a ticket has no attachments', async () => {
    await renderWorkspace(makeTicket({ attachments: [] }))

    expect(await screen.findByText('لا توجد مرفقات على هذه التذكرة.')).toBeInTheDocument()
  })

  it('releases the preview object URL when the page unmounts', async () => {
    const { view } = await renderWorkspace(makeTicket())
    await screen.findByRole('img')
    expect(created).toHaveLength(1)

    view.unmount()

    await waitFor(() => expect(revoked).toContain(created[0]))
  })
})

describe('image lightbox', () => {
  it('opens a large preview with filename, download and close', async () => {
    const { user } = await renderWorkspace(makeTicket())
    await screen.findByRole('img')

    await user.click(screen.getByTitle('عرض بحجم أكبر'))

    const dialog = await screen.findByRole('dialog', { name: 'pasted-image-1789681091276-0.png' })
    expect(within(dialog).getByText('pasted-image-1789681091276-0.png')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'تنزيل' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'إغلاق' })).toBeInTheDocument()
    // Reuses the already-fetched bytes: no second request, no second object URL.
    expect(fetchBlob).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', 'blob:mock/0')
  })

  it('closes with the close button and with Escape', async () => {
    const { user } = await renderWorkspace(makeTicket())
    await screen.findByRole('img')

    await user.click(screen.getByTitle('عرض بحجم أكبر'))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'إغلاق' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByTitle('عرض بحجم أكبر'))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('downloads through the protected helper from the lightbox', async () => {
    const { user } = await renderWorkspace(makeTicket())
    await screen.findByRole('img')

    await user.click(screen.getByTitle('عرض بحجم أكبر'))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'تنزيل' }))

    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(42, 9, 'pasted-image-1789681091276-0.png'),
    )
  })

  it('downloads through the protected helper from the card', async () => {
    const { user } = await renderWorkspace(makeTicket())
    await screen.findByRole('img')

    await user.click(screen.getByRole('button', { name: 'تنزيل' }))

    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(42, 9, 'pasted-image-1789681091276-0.png'),
    )
  })
})

describe('actions follow server capabilities', () => {
  it('offers accept and reject only when the server allows them', async () => {
    const { user } = await renderWorkspace(
      makeTicket({ status: 'ASSIGNED', capabilities: { ...NO_CAPS, accept_task: true, reject_task: true } }),
    )

    expect(screen.getByRole('button', { name: 'قبول التكليف' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /اعتذار/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تم الحل \(Resolved\)/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'قبول التكليف' }))
    await waitFor(() => expect(mockAcceptTask).toHaveBeenCalledWith(42))
  })

  it('offers resolved / unresolved only when complete_task is granted', async () => {
    await renderWorkspace(
      makeTicket({ status: 'IN_PROGRESS', capabilities: { ...NO_CAPS, complete_task: true } }),
    )

    expect(screen.getByRole('button', { name: /تم الحل \(Resolved\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعذر الحل' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'قبول التكليف' })).not.toBeInTheDocument()
  })

  it('shows no action buttons when the server grants none, even for an in-progress ticket', async () => {
    await renderWorkspace(makeTicket({ status: 'IN_PROGRESS', capabilities: NO_CAPS }))

    expect(screen.queryByRole('button', { name: /تم الحل \(Resolved\)/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'قبول التكليف' })).not.toBeInTheDocument()
    expect(screen.getByText(/لا توجد إجراءات متاحة/)).toBeInTheDocument()
  })

  it('requires a summary before closing as resolved, then submits to the service', async () => {
    const { user } = await renderWorkspace(
      makeTicket({ status: 'IN_PROGRESS', capabilities: { ...NO_CAPS, complete_task: true } }),
    )

    await user.click(screen.getByRole('button', { name: /تم الحل \(Resolved\)/ }))
    const dialog = await screen.findByRole('dialog', { name: 'إغلاق المهمة' })

    await user.click(within(dialog).getByRole('button', { name: /تأكيد الإغلاق/ }))
    expect(mockCompleteTask).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()

    await user.type(within(dialog).getByRole('textbox'), 'تم استبدال الخرطوشة')
    await user.click(within(dialog).getByRole('button', { name: /تأكيد الإغلاق/ }))

    await waitFor(() => expect(mockCompleteTask).toHaveBeenCalledTimes(1))
    const [id, form] = mockCompleteTask.mock.calls[0] as [number, FormData]
    expect(id).toBe(42)
    expect(form.get('resolution_type')).toBe('RESOLVED')
    expect(form.get('resolution_summary')).toBe('تم استبدال الخرطوشة')
  })

  it('requires an apology reason before rejecting a task', async () => {
    const { user } = await renderWorkspace(
      makeTicket({ status: 'ASSIGNED', capabilities: { ...NO_CAPS, accept_task: true, reject_task: true } }),
    )

    await user.click(screen.getByRole('button', { name: /اعتذار/ }))
    const dialog = await screen.findByRole('dialog', { name: 'اعتذار عن استلام التكليف' })

    expect(within(dialog).getByRole('button', { name: 'تأكيد الاعتذار' })).toBeDisabled()

    await user.type(within(dialog).getByRole('textbox'), 'خارج نطاق تخصصي')
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد الاعتذار' }))

    await waitFor(() => expect(mockRejectTask).toHaveBeenCalledWith(42, 'خارج نطاق تخصصي'))
  })
})

describe('internal notes', () => {
  it('saves an internal note when the server grants add_internal_note', async () => {
    const { user } = await renderWorkspace(
      makeTicket({ capabilities: { ...NO_CAPS, add_internal_note: true } }),
    )

    const save = screen.getByRole('button', { name: 'حفظ الملاحظة' })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText('ملاحظة داخلية'), 'تم التواصل مع المورد')
    await user.click(save)

    await waitFor(() => expect(mockAddComment).toHaveBeenCalledWith(42, 'تم التواصل مع المورد', true))
    expect(toastSuccess).toHaveBeenCalledWith('تم حفظ الملاحظة الداخلية')
  })

  it('shows a locked state instead of a form when the server withholds the capability', async () => {
    await renderWorkspace(makeTicket({ capabilities: NO_CAPS }))

    expect(screen.queryByLabelText('ملاحظة داخلية')).not.toBeInTheDocument()
    expect(screen.getByText(/متاحة لقيادة الإدارة فقط/)).toBeInTheDocument()
  })
})

describe('loading and error states', () => {
  it('does not spin forever when there is no signed-in user', async () => {
    mockUser = null
    render(<AssigneeWorkspacePage />)

    await waitFor(() => expect(screen.queryByText('جاري تحميل مهامك...')).not.toBeInTheDocument())
    expect(mockGetTickets).not.toHaveBeenCalled()
  })

  it('offers a retry when the list fails to load', async () => {
    mockGetTickets.mockRejectedValueOnce(new Error('network'))
    const user = userEvent.setup()
    render(<AssigneeWorkspacePage />)

    expect(await screen.findByText('تعذر تحميل المهام')).toBeInTheDocument()

    mockGetTickets.mockResolvedValueOnce({ success: true, data: { data: [makeTicket()] } })
    await user.click(screen.getByRole('button', { name: /إعادة المحاولة/ }))

    expect(await screen.findByText('عطل في الطابعة')).toBeInTheDocument()
    expect(mockGetTickets).toHaveBeenCalledTimes(2)
  })

  it('keeps the list data on screen when the detail request fails', async () => {
    const ticket = makeTicket()
    mockGetTickets.mockResolvedValue({ success: true, data: { data: [ticket] } })
    mockGetTicket.mockRejectedValue(new Error('500'))
    const user = userEvent.setup()
    render(<AssigneeWorkspacePage />)

    await user.click(await screen.findByRole('button', { name: /عطل في الطابعة/ }))

    expect(await screen.findByRole('heading', { level: 2, name: 'عطل في الطابعة' })).toBeInTheDocument()
    expect(screen.getByText('الطابعة لا تعمل منذ الصباح')).toBeInTheDocument()
  })

  it('shows the empty state when nothing is assigned', async () => {
    mockGetTickets.mockResolvedValue({ success: true, data: { data: [] } })
    render(<AssigneeWorkspacePage />)

    expect(await screen.findByText('لا مهام نشطة حالياً')).toBeInTheDocument()
  })

  it('shows the activity timeline from the detail payload', async () => {
    await renderWorkspace(makeTicket(), {
      activity_logs: [
        { id: 1, ticket_id: 42, action: 'ACCEPTED', performed_by_name: 'موظف الدعم', logged_at: '2026-01-02T10:00:00Z' },
      ],
    })

    expect(await screen.findByText('قبلت التكليف')).toBeInTheDocument()
  })
})

describe('layout basics', () => {
  it('is right-to-left and summarises each status', async () => {
    mockGetTickets.mockResolvedValue({
      success: true,
      data: {
        data: [
          makeTicket({ id: 1, title: 'أ', status: 'ASSIGNED' }),
          makeTicket({ id: 2, title: 'ب', status: 'RESOLVED' }),
          makeTicket({ id: 3, title: 'ج', status: 'UNRESOLVED' }),
        ],
      },
    })
    render(<AssigneeWorkspacePage />)

    await screen.findByText('تنتظر قبولك')
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()

    const summary = screen.getByRole('region', { name: 'ملخص الحالات' })
    for (const label of ['تنتظر قبولك', 'قيد التنفيذ', 'تم الحل', 'تعذر الحل']) {
      expect(within(summary).getByText(label)).toBeInTheDocument()
    }
  })

  it('lets long filenames truncate instead of overflowing', async () => {
    await renderWorkspace(makeTicket({ attachments: [image({ file_name: `${'ملف-طويل-'.repeat(20)}.png` })] }))
    await screen.findByRole('img')

    const name = screen.getByTitle(`${'ملف-طويل-'.repeat(20)}.png`)
    expect(name.className).toContain('truncate')
  })
})

describe('attachment display helpers', () => {
  it('labels the file type from mime, then from extension', () => {
    expect(attachmentTypeLabel('image/jpeg', 'a.jpeg')).toBe('JPG')
    expect(attachmentTypeLabel('image/png', null)).toBe('PNG')
    expect(attachmentTypeLabel('application/pdf; charset=binary', 'x')).toBe('PDF')
    expect(attachmentTypeLabel(null, 'legacy.webp')).toBe('WEBP')
    expect(attachmentTypeLabel(null, 'noextension')).toBe('ملف')
    expect(attachmentTypeLabel(undefined, undefined)).toBe('ملف')
  })

  it('formats an upload date and tolerates bad input', () => {
    expect(formatAttachmentDate('2026-01-12T00:00:00Z')).not.toBe('')
    expect(formatAttachmentDate('')).toBe('')
    expect(formatAttachmentDate(null)).toBe('')
    expect(formatAttachmentDate('not-a-date')).toBe('')
  })
})
