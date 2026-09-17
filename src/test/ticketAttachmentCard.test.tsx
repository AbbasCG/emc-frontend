import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TicketAttachment } from '@/types/ticket'

/**
 * TICKET DETAIL — authenticated attachment preview.
 *
 * The endpoint is private and behind auth:sanctum, so the image must be fetched
 * through the authenticated client and rendered from a temporary object URL.
 * A plain <img src={preview_url}> would be a browser navigation carrying no
 * Bearer token, which is exactly what produced "Unauthenticated".
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

const toastError = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: (m: string) => toastError(m) },
}))

const { TicketAttachmentCard } = await import('@/components/tickets/TicketAttachmentCard')

beforeEach(() => {
  created.length = 0
  revoked.length = 0
  seq = 0
  fetchBlob.mockReset()
  download.mockReset()
  toastError.mockClear()

  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => {
      const u = `blob:mock/${seq++}`
      created.push(u)
      return u
    }),
    revokeObjectURL: vi.fn((u: string) => revoked.push(u)),
  })

  // The api module owns URL creation; emulate that for the mocked fetch.
  fetchBlob.mockImplementation(async () => {
    const objectUrl = URL.createObjectURL(new Blob(['x']))
    return { blob: new Blob(['x']), mime: 'image/png', objectUrl }
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const attachment = (over: Partial<TicketAttachment> = {}): TicketAttachment => ({
  id: 9,
  ticket_id: 11,
  preview_url: 'https://api.example/api/v1/tickets/11/attachments/9/download',
  file_name: 'screenshot.png',
  file_type: 'IMAGE',
  mime_type: 'image/png',
  file_size: 348_160,
  is_image: true,
  attachment_context: 'INITIAL_SUBMISSION',
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('authenticated image preview', () => {
  it('fetches the image through the authenticated client, not a bare URL', async () => {
    render(<TicketAttachmentCard attachment={attachment()} />)

    await waitFor(() => expect(fetchBlob).toHaveBeenCalledWith(11, 9))

    const img = await screen.findByRole('img')
    expect(img).toHaveAttribute('src', 'blob:mock/0')
    // The private endpoint must never be handed to the browser directly.
    expect(img.getAttribute('src')).not.toContain('/api/v1/tickets')
  })

  it('shows the filename and a human size', async () => {
    render(<TicketAttachmentCard attachment={attachment()} />)

    expect(await screen.findByText('screenshot.png')).toBeInTheDocument()
    expect(screen.getByText('340 KB')).toBeInTheDocument()
  })

  it('revokes the object URL on unmount', async () => {
    const view = render(<TicketAttachmentCard attachment={attachment()} />)

    await screen.findByRole('img')
    expect(created).toHaveLength(1)

    view.unmount()

    await waitFor(() => expect(revoked).toContain(created[0]))
  })

  it('shows a safe fallback when the preview fails', async () => {
    fetchBlob.mockRejectedValueOnce(new Error('403'))

    render(<TicketAttachmentCard attachment={attachment()} />)

    expect(await screen.findByText('تعذر عرض الصورة')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // The download route stays available even when the thumbnail fails.
    expect(screen.getByRole('button', { name: /تنزيل/ })).toBeInTheDocument()
  })

  it('shows a loading placeholder before the blob arrives', () => {
    fetchBlob.mockImplementation(() => new Promise(() => {}))

    render(<TicketAttachmentCard attachment={attachment()} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('historical attachments', () => {
  it('still previews a row that predates mime_type', async () => {
    render(
      <TicketAttachmentCard
        attachment={attachment({ mime_type: null, file_size: null, is_image: undefined })}
      />,
    )

    // Falls back to file_type === 'IMAGE'.
    await waitFor(() => expect(fetchBlob).toHaveBeenCalled())
    expect(await screen.findByRole('img')).toBeInTheDocument()
  })

  it('omits the size line when the row has none', async () => {
    render(<TicketAttachmentCard attachment={attachment({ file_size: null })} />)

    await screen.findByRole('img')
    expect(screen.queryByText(/KB|MB/)).not.toBeInTheDocument()
  })
})

describe('documents', () => {
  it('renders a document card and never fetches a thumbnail for a PDF', async () => {
    render(
      <TicketAttachmentCard
        attachment={attachment({
          file_name: 'report.pdf',
          file_type: 'DOCUMENT',
          mime_type: 'application/pdf',
          is_image: false,
        })}
      />,
    )

    expect(await screen.findByText('report.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(fetchBlob).not.toHaveBeenCalled()
  })
})

describe('download', () => {
  it('downloads through the authenticated helper', async () => {
    const user = userEvent.setup()
    render(<TicketAttachmentCard attachment={attachment()} />)

    await screen.findByRole('img')
    await user.click(screen.getByRole('button', { name: /تنزيل/ }))

    await waitFor(() => expect(download).toHaveBeenCalledWith(11, 9, 'screenshot.png'))
  })

  it('reports a failed download safely', async () => {
    download.mockRejectedValueOnce(new Error('network'))
    const user = userEvent.setup()

    render(<TicketAttachmentCard attachment={attachment()} />)
    await screen.findByRole('img')
    await user.click(screen.getByRole('button', { name: /تنزيل/ }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('تعذر تنزيل المرفق. حاول مرة أخرى.'),
    )
  })
})
