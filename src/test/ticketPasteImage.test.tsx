import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'

/**
 * TICKET ATTACHMENTS — PASTE IMAGE.
 *
 * Pasting a screenshot into the ticket form must attach it exactly as drag-drop
 * does, and must not disturb any other paste. The decisive case is pasting
 * while the DESCRIPTION TEXTAREA is focused, because that is where a user
 * actually is when they paste a screenshot — not hovering a dropzone.
 */

vi.mock('@/services/ticketService', () => ({
  ticketService: {
    getMeta: vi.fn(async () => ({
      departments: [{ id: 1, slug: 'tech-support', name_ar: 'الإدارة التقنية' }],
    })),
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

/** A clipboard payload carrying one image file, shaped like the real event. */
function imageClipboard(files: { name: string; type: string }[]) {
  return {
    items: files.map((f) => ({
      kind: 'file' as const,
      type: f.type,
      getAsFile: () => new File(['binary-bytes'], f.name, { type: f.type }),
    })),
    files: files.map((f) => new File(['binary-bytes'], f.name, { type: f.type })),
    types: ['Files'],
    getData: () => '',
  }
}

/** A plain-text clipboard payload — must never be intercepted. */
function textClipboard(text: string) {
  return {
    items: [{ kind: 'string' as const, type: 'text/plain', getAsFile: () => null }],
    files: [],
    types: ['text/plain'],
    getData: () => text,
  }
}

const attachmentNames = () =>
  screen.queryAllByText(/^pasted-image-\d+-\d+\.[a-z0-9+]+$/i).map((n) => n.textContent ?? '')

async function renderForm() {
  const view = render(<TicketSubmitPage />)
  // Wait for the meta fetch so the form (not the loader) is on screen.
  await screen.findByPlaceholderText(/اشرح المشكلة بالتفصيل/)
  return view
}

const textarea = () => screen.getByPlaceholderText(/اشرح المشكلة بالتفصيل/)
const dropzone = () => screen.getByText(/اضغط أو اسحب وأفلت الملفات هنا/).closest('div[class*="border-dashed"]')!

beforeEach(() => {
  vi.clearAllMocks()
})

describe('pasting a screenshot where the user actually is', () => {
  it('attaches the image when pasted into the description textarea', async () => {
    await renderForm()

    const box = textarea()
    box.focus()

    fireEvent.paste(box, {
      clipboardData: imageClipboard([{ name: 'image.png', type: 'image/png' }]),
    })

    await waitFor(() => expect(attachmentNames()).toHaveLength(1))
    expect(attachmentNames()[0]).toMatch(/\.png$/)
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('تم لصق الصورة'))
  })

  it('attaches the image when pasted onto the dropzone itself', async () => {
    await renderForm()

    fireEvent.paste(dropzone(), {
      clipboardData: imageClipboard([{ name: 'shot.png', type: 'image/png' }]),
    })

    await waitFor(() => expect(attachmentNames()).toHaveLength(1))
  })

  it('attaches every image from a multi-image paste', async () => {
    await renderForm()

    fireEvent.paste(textarea(), {
      clipboardData: imageClipboard([
        { name: 'a.png', type: 'image/png' },
        { name: 'b.jpg', type: 'image/jpeg' },
      ]),
    })

    await waitFor(() => expect(attachmentNames()).toHaveLength(2))
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('2'))
  })
})

describe('other pastes are never disturbed', () => {
  it('leaves plain text paste alone and adds no attachment', async () => {
    await renderForm()

    const box = textarea()
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: textClipboard('نص عادي') })

    box.dispatchEvent(event)

    // Not prevented → the browser performs its normal text insertion.
    expect(event.defaultPrevented).toBe(false)
    await waitFor(() => expect(attachmentNames()).toHaveLength(0))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('leaves a non-image file paste alone', async () => {
    await renderForm()

    const box = textarea()
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: imageClipboard([{ name: 'notes.pdf', type: 'application/pdf' }]),
    })

    box.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    await waitFor(() => expect(attachmentNames()).toHaveLength(0))
  })
})

describe('naming and typing', () => {
  it('names jpeg as .jpg and never trusts the clipboard filename', async () => {
    await renderForm()

    fireEvent.paste(textarea(), {
      clipboardData: imageClipboard([
        { name: '../../evil.php', type: 'image/jpeg' },
      ]),
    })

    await waitFor(() => expect(attachmentNames()).toHaveLength(1))

    const name = attachmentNames()[0]
    expect(name).toMatch(/^pasted-image-\d+-0\.jpg$/)
    expect(name).not.toContain('..')
    expect(name).not.toContain('evil')
    expect(name).not.toContain('.php')
  })

  it('refuses an image type the server would reject rather than promising success', async () => {
    await renderForm()

    fireEvent.paste(textarea(), {
      clipboardData: imageClipboard([{ name: 'x.svg', type: 'image/svg+xml' }]),
    })

    // SVG is absent from the backend's mimes whitelist, so attaching it would
    // only produce a 422 at submit. Reject it at paste time instead.
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(attachmentNames()).toHaveLength(0)
  })

  it('rejects an oversized image instead of letting the request fail', async () => {
    await renderForm()

    const huge = new File([new Uint8Array(1024)], 'big.png', { type: 'image/png' })
    Object.defineProperty(huge, 'size', { value: 60 * 1024 * 1024 })

    fireEvent.paste(textarea(), {
      clipboardData: {
        items: [{ kind: 'file' as const, type: 'image/png', getAsFile: () => huge }],
        files: [huge],
        types: ['Files'],
        getData: () => '',
      },
    })

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(attachmentNames()).toHaveLength(0)
  })
})

describe('repeated pastes', () => {
  it('adds one attachment per paste and does not duplicate a single event', async () => {
    await renderForm()

    const box = textarea()

    fireEvent.paste(box, { clipboardData: imageClipboard([{ name: 'a.png', type: 'image/png' }]) })
    await waitFor(() => expect(attachmentNames()).toHaveLength(1))

    fireEvent.paste(box, { clipboardData: imageClipboard([{ name: 'a.png', type: 'image/png' }]) })
    await waitFor(() => expect(attachmentNames()).toHaveLength(2))
  })
})
