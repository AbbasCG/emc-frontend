import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import {
  ACCEPT_ATTRIBUTE,
  addFiles,
  classify,
  formatBytes,
  isImageType,
  isVideoType,
  pastedImageName,
  releasePreviews,
} from '@/utils/ticketAttachments'

/**
 * TICKET ATTACHMENTS — picker, drop, paste, preview and lifecycle.
 *
 * The three input paths must produce the SAME attachment state through the same
 * validation, and every preview URL created must be released.
 */

/* ── Object URL instrumentation ─────────────────────────────────────────── */

const created: string[] = []
const revoked: string[] = []
let urlSeq = 0

beforeEach(() => {
  created.length = 0
  revoked.length = 0
  urlSeq = 0
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:mock/${urlSeq++}`
      created.push(url)
      return url
    }),
    revokeObjectURL: vi.fn((url: string) => {
      revoked.push(url)
    }),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const file = (name: string, type: string, size = 1024): File => {
  const f = new File(['bytes'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

/* ── 1. The canonical policy ────────────────────────────────────────────── */

describe('attachment policy', () => {
  it.each([
    ['image/jpeg', null],
    ['image/png', null],
    ['image/webp', null],
    ['application/pdf', null],
    ['video/mp4', 'video'],
    ['video/quicktime', 'video'],
    ['video/webm', 'video'],
    ['image/svg+xml', 'type'],
    ['image/gif', 'type'],
    ['application/x-php', 'type'],
    ['application/octet-stream', 'type'],
  ])('classifies %s as %s', (type, expected) => {
    expect(classify(file('f', type))).toBe(expected)
  })

  it('rejects a file over 50 MB', () => {
    expect(classify(file('big.png', 'image/png', 60 * 1024 * 1024))).toBe('size')
  })

  it('accepts a file at exactly the limit', () => {
    expect(classify(file('edge.png', 'image/png', 50 * 1024 * 1024))).toBeNull()
  })

  it('advertises no video in the accept attribute', () => {
    expect(ACCEPT_ATTRIBUTE).not.toMatch(/video|mp4|mov|avi/i)
    expect(ACCEPT_ATTRIBUTE).toBe('image/jpeg,image/png,image/webp,application/pdf')
  })

  it('treats svg as neither image nor video, so it is simply unsupported', () => {
    expect(isImageType('image/svg+xml')).toBe(false)
    expect(isVideoType('image/svg+xml')).toBe(false)
  })

  it('formats sizes for display', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(348_160)).toBe('340 KB')
    expect(formatBytes(1_258_291)).toBe('1.2 MB')
  })
})

/* ── 2. addFiles is the single entry point ──────────────────────────────── */

describe('addFiles', () => {
  it('creates a preview URL for images only', () => {
    const { accepted } = addFiles([file('a.png', 'image/png'), file('b.pdf', 'application/pdf')])

    expect(accepted).toHaveLength(2)
    expect(accepted[0].isImage).toBe(true)
    expect(accepted[0].previewUrl).toBe('blob:mock/0')
    expect(accepted[1].isImage).toBe(false)
    expect(accepted[1].previewUrl).toBeNull()
    expect(created).toHaveLength(1)
  })

  it('separates accepted files from each rejection reason', () => {
    const { accepted, rejected } = addFiles([
      file('ok.png', 'image/png'),
      file('clip.mp4', 'video/mp4'),
      file('x.svg', 'image/svg+xml'),
      file('big.png', 'image/png', 60 * 1024 * 1024),
    ])

    expect(accepted).toHaveLength(1)
    expect(rejected).toEqual(['video', 'type', 'size'])
  })

  it('never creates a preview URL for a rejected file', () => {
    addFiles([file('clip.mp4', 'video/mp4'), file('x.svg', 'image/svg+xml')])

    expect(created).toHaveLength(0)
  })

  it('renames pasted screenshots without trusting the clipboard name', () => {
    const { accepted } = addFiles([file('../../evil.php', 'image/jpeg')], pastedImageName)

    expect(accepted[0].file.name).toMatch(/^pasted-image-\d+-0\.jpg$/)
    expect(accepted[0].file.name).not.toContain('..')
    expect(accepted[0].file.name).not.toContain('evil')
  })

  it('releases every preview it created', () => {
    const { accepted } = addFiles([file('a.png', 'image/png'), file('b.jpg', 'image/jpeg')])

    releasePreviews(accepted)

    expect(revoked).toEqual(created)
  })
})

/* ── 3. The submit page ─────────────────────────────────────────────────── */

vi.mock('@/services/ticketService', () => ({
  ticketService: {
    getMeta: vi.fn(async () => ({ departments: [{ id: 1, slug: 'tech-support', name_ar: 'التقنية' }] })),
    createTicket: vi.fn(async () => ({ success: true, data: { id: 1 } })),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'مستخدم', email: 'u@emc.test', role: 'student' } }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))

const { default: TicketSubmitPage } = await import('@/components/tickets/TicketSubmitPage')
const { ticketService } = await import('@/services/ticketService')

const clipboard = (files: File[]) => ({
  items: files.map((f) => ({ kind: 'file' as const, type: f.type, getAsFile: () => f })),
  files,
  types: ['Files'],
  getData: () => '',
})

const textClipboard = () => ({
  items: [{ kind: 'string' as const, type: 'text/plain', getAsFile: () => null }],
  files: [],
  types: ['text/plain'],
  getData: () => 'نص',
})

async function renderForm() {
  const view = render(<TicketSubmitPage />)
  await screen.findByPlaceholderText(/اشرح المشكلة بالتفصيل/)
  return view
}

const textarea = () => screen.getByPlaceholderText(/اشرح المشكلة بالتفصيل/)
const dropzone = () =>
  screen.getByText(/اضغط أو اسحب وأفلت الملفات هنا/).closest('div[class*="border-dashed"]')!
const thumbnails = () => screen.queryAllByRole('img')

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  vi.mocked(ticketService.createTicket).mockClear()
})

describe('pre-submit previews', () => {
  it('shows a thumbnail for a pasted image', async () => {
    await renderForm()

    fireEvent.paste(textarea(), { clipboardData: clipboard([file('shot.png', 'image/png')]) })

    await waitFor(() => expect(thumbnails()).toHaveLength(1))
    expect(thumbnails()[0]).toHaveAttribute('src', expect.stringContaining('blob:mock/'))
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('تم لصق الصورة'))
  })

  it('shows a thumbnail for a dropped image', async () => {
    await renderForm()

    fireEvent.drop(dropzone(), { dataTransfer: { files: [file('drop.jpg', 'image/jpeg')] } })

    await waitFor(() => expect(thumbnails()).toHaveLength(1))
  })

  it('shows a thumbnail for a picked image', async () => {
    const { container } = await renderForm()
    const input = container.querySelector('#ticket-media-input') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file('pick.webp', 'image/webp')] } })

    await waitFor(() => expect(thumbnails()).toHaveLength(1))
  })

  it('shows a document card, not a thumbnail, for a PDF', async () => {
    const { container } = await renderForm()
    const input = container.querySelector('#ticket-media-input') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file('report.pdf', 'application/pdf')] } })

    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument())
    expect(thumbnails()).toHaveLength(0)
  })

  it('shows the file size next to each attachment', async () => {
    await renderForm()

    // Real bytes, not a mocked `size`: renaming a pasted screenshot re-wraps the
    // File, which recomputes size from the actual content - so the displayed
    // value always reflects what will really be uploaded.
    const realFile = new File([new Uint8Array(348_160)], 'shot.png', { type: 'image/png' })

    fireEvent.paste(textarea(), { clipboardData: clipboard([realFile]) })

    await waitFor(() => expect(screen.getByText('340 KB')).toBeInTheDocument())
  })

  it('releases the preview URL when an attachment is removed', async () => {
    const user = userEvent.setup()
    await renderForm()

    fireEvent.paste(textarea(), { clipboardData: clipboard([file('shot.png', 'image/png')]) })
    await waitFor(() => expect(thumbnails()).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: /إزالة/ }))

    await waitFor(() => expect(thumbnails()).toHaveLength(0))
    expect(revoked).toContain(created[0])
  })
})

describe('rejection feedback', () => {
  it('rejects a pasted video with the video-specific message', async () => {
    await renderForm()

    fireEvent.paste(textarea(), { clipboardData: clipboard([file('clip.mp4', 'video/mp4')]) })

    // Not an image item, so paste is not even intercepted - and nothing attaches.
    await waitFor(() => expect(thumbnails()).toHaveLength(0))
  })

  it('rejects a dropped video with the video-specific message', async () => {
    await renderForm()

    fireEvent.drop(dropzone(), { dataTransfer: { files: [file('clip.mp4', 'video/mp4')] } })

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('لا يمكن رفع ملفات الفيديو في التذاكر.'),
    )
    expect(thumbnails()).toHaveLength(0)
  })

  it('rejects SVG as an unsupported type', async () => {
    await renderForm()

    fireEvent.drop(dropzone(), { dataTransfer: { files: [file('x.svg', 'image/svg+xml')] } })

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'نوع الملف غير مدعوم. يُسمح فقط بصور JPG وPNG وWebP وملفات PDF.',
      ),
    )
  })

  it('rejects an oversized file', async () => {
    await renderForm()

    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [file('big.png', 'image/png', 60 * 1024 * 1024)] },
    })

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('حجم الملف يتجاوز الحد المسموح (50 ميجابايت).'),
    )
  })

  it('reports each distinct reason once, not once per file', async () => {
    await renderForm()

    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [file('a.mp4', 'video/mp4'), file('b.mov', 'video/quicktime')] },
    })

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
  })
})

describe('text paste is never disturbed', () => {
  it('does not intercept plain text paste', async () => {
    await renderForm()

    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: textClipboard() })

    textarea().dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    await waitFor(() => expect(thumbnails()).toHaveLength(0))
  })
})

describe('submission', () => {
  it('sends the attached files and clears previews afterwards', async () => {
    await renderForm()

    fireEvent.paste(textarea(), { clipboardData: clipboard([file('shot.png', 'image/png')]) })
    await waitFor(() => expect(thumbnails()).toHaveLength(1))

    fireEvent.change(screen.getByPlaceholderText(/مثال: تعذر رفع المرفقات/), {
      target: { value: 'عنوان' },
    })
    fireEvent.change(textarea(), { target: { value: 'وصف' } })
    fireEvent.click(screen.getByRole('button', { name: /إرسال التذكرة/ }))

    await waitFor(() => expect(ticketService.createTicket).toHaveBeenCalled())

    const formData = vi.mocked(ticketService.createTicket).mock.calls[0][0] as FormData
    expect(formData.getAll('attachments[]')).toHaveLength(1)

    // A successful submit resets the form, which must release the preview.
    await waitFor(() => expect(revoked).toContain(created[0]))
  })

  it('surfaces a validation error message instead of the generic save error', async () => {
    vi.mocked(ticketService.createTicket).mockRejectedValueOnce({
      response: { status: 422, data: { errors: { 'attachments.0': ['نوع الملف غير مدعوم.'] } } },
    })

    await renderForm()

    fireEvent.change(screen.getByPlaceholderText(/مثال: تعذر رفع المرفقات/), {
      target: { value: 'عنوان' },
    })
    fireEvent.change(textarea(), { target: { value: 'وصف' } })
    fireEvent.click(screen.getByRole('button', { name: /إرسال التذكرة/ }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('نوع الملف غير مدعوم.'))
  })

  it('reports a network failure distinctly from a server failure', async () => {
    vi.mocked(ticketService.createTicket).mockRejectedValueOnce({})

    await renderForm()

    fireEvent.change(screen.getByPlaceholderText(/مثال: تعذر رفع المرفقات/), {
      target: { value: 'عنوان' },
    })
    fireEvent.change(textarea(), { target: { value: 'وصف' } })
    fireEvent.click(screen.getByRole('button', { name: /إرسال التذكرة/ }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.'),
    )
  })
})
