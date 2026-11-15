import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchAssignmentUploadRules,
  fetchStudentAssignments,
  resetAssignmentUploadRulesCache,
  submitStudentAssignment,
} from '@/api/studentApi'
import { downloadAssignmentAttachment, safeDownloadName } from '@/api/assignmentAttachmentsApi'
import { normalizeAssignmentAttachments } from '@/utils/assignmentAttachments'
import { FALLBACK_UPLOAD_RULES } from '@/lib/assignmentUploadRules'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost/api' },
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
  resetAssignmentUploadRulesCache()
})

const SERVER_RULES = {
  success: true,
  data: {
    max_files: 3,
    max_total_bytes: 3 * 1024 * 1024,
    groups: [{ key: 'document', label_ar: 'المستندات', extensions: ['pdf'], max_bytes: 1024 * 1024 }],
  },
}

describe('submitStudentAssignment — multi-file', () => {
  it('appends every file under a repeated `files[]` key, in order, plus the text fields', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { id: 5, status: 'submitted', submitted_at: '2026-11-01T10:00:00Z' } } })
    const a = new File(['a'], 'تقرير.pdf', { type: 'application/pdf' })
    const b = new File(['b'], 'photo.png', { type: 'image/png' })

    await submitStudentAssignment(91, { text_answer: 'إجابتي', notes: 'ملاحظة', files: [a, b] })

    const [url, body] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/student/assignments/91/submit')
    const sent = body.getAll('files[]')
    expect(sent).toHaveLength(2)
    expect((sent[0] as File).name).toBe('تقرير.pdf')
    expect((sent[1] as File).name).toBe('photo.png')
    expect(body.get('text_answer')).toBe('إجابتي')
    expect(body.get('answer_text')).toBe('إجابتي')
    expect(body.get('notes')).toBe('ملاحظة')
    expect(body.get('file')).toBeNull()
  })

  it('prefers `files` over the legacy single `file`', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const a = new File(['a'], 'a.pdf')
    const legacy = new File(['l'], 'legacy.pdf')
    await submitStudentAssignment(1, { files: [a], file: legacy })
    const [, body] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(body.getAll('files[]')).toHaveLength(1)
    expect(body.get('file')).toBeNull()
  })

  it('sends no `files[]` for a text-only answer', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await submitStudentAssignment(1, { text_answer: 'نص', files: [] })
    const [, body] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(body.has('files[]')).toBe(false)
  })

  it('lifts the 20 s default timeout, passes the abort signal and reports upload progress', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const controller = new AbortController()
    const onProgress = vi.fn()
    await submitStudentAssignment(1, { text_answer: 'x' }, { signal: controller.signal, onProgress })

    const config = mockedApi.post.mock.calls[0][2] as {
      timeout: number
      signal: AbortSignal
      skipErrorToast: boolean
      onUploadProgress: (e: { loaded: number; total?: number }) => void
    }
    expect(config.skipErrorToast).toBe(true)
    expect(config.signal).toBe(controller.signal)
    expect(config.timeout).toBeGreaterThanOrEqual(5 * 60 * 1000)

    config.onUploadProgress({ loaded: 50, total: 200 })
    config.onUploadProgress({ loaded: 999, total: 200 })
    config.onUploadProgress({ loaded: 10 })
    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { loaded: 50, total: 200, percent: 25 },
      { loaded: 999, total: 200, percent: 100 },
      { loaded: 10, total: null, percent: 0 },
    ])
  })

  it('does not register a progress listener when none is wanted', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await submitStudentAssignment(1, { text_answer: 'x' })
    expect((mockedApi.post.mock.calls[0][2] as { onUploadProgress?: unknown }).onUploadProgress).toBeUndefined()
  })

  it('returns the stored attachments from the response', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        data: {
          id: 5,
          status: 'submitted',
          attachments: [{ id: 1, name: 'تقرير.pdf', size: 2048, mime: 'application/pdf', download_url: 'http://localhost/api/x/1' }, { id: 2 }],
        },
      },
    })
    const res = await submitStudentAssignment(1, { text_answer: 'x' })
    expect(res.attachments).toEqual([
      { id: 1, name: 'تقرير.pdf', size: 2048, mime: 'application/pdf', download_url: 'http://localhost/api/x/1' },
    ])
  })

  it('rejects with the original axios error so the modal can map it', async () => {
    const err = new Error('Network Error')
    mockedApi.post.mockRejectedValueOnce(err)
    await expect(submitStudentAssignment(1, { text_answer: 'x' })).rejects.toBe(err)
  })
})

describe('fetchAssignmentUploadRules', () => {
  it('parses the server rules and caches them for the session', async () => {
    mockedApi.get.mockResolvedValue({ data: SERVER_RULES })
    const first = await fetchAssignmentUploadRules()
    const second = await fetchAssignmentUploadRules()
    expect(first.max_files).toBe(3)
    expect(second).toBe(first)
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    expect(mockedApi.get).toHaveBeenCalledWith('/student/assignment-upload-rules', expect.objectContaining({ skipErrorToast: true }))
  })

  it('shares one request between concurrent callers', async () => {
    mockedApi.get.mockResolvedValue({ data: SERVER_RULES })
    await Promise.all([fetchAssignmentUploadRules(), fetchAssignmentUploadRules()])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('falls back to the built-in rules when the call fails, and does not cache the failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('offline'))
    expect(await fetchAssignmentUploadRules()).toBe(FALLBACK_UPLOAD_RULES)

    mockedApi.get.mockResolvedValueOnce({ data: SERVER_RULES })
    expect((await fetchAssignmentUploadRules()).max_files).toBe(3)
  })

  it('falls back when the payload is unusable', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [] } })
    expect(await fetchAssignmentUploadRules()).toBe(FALLBACK_UPLOAD_RULES)
  })

  it('falls back when the client throws synchronously', async () => {
    mockedApi.get.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    expect(await fetchAssignmentUploadRules()).toBe(FALLBACK_UPLOAD_RULES)
  })
})

describe('normalizing attachments', () => {
  it('returns undefined for anything that is not a list (legacy single-file submissions)', () => {
    expect(normalizeAssignmentAttachments(undefined)).toBeUndefined()
    expect(normalizeAssignmentAttachments(null)).toBeUndefined()
    expect(normalizeAssignmentAttachments('x')).toBeUndefined()
    expect(normalizeAssignmentAttachments({})).toBeUndefined()
  })

  it('keeps downloadable entries, fills a missing name and coerces numbers', () => {
    expect(
      normalizeAssignmentAttachments([
        { id: '7', name: ' ملف.docx ', size: '1500', mime: 'application/msword', download_url: '/student/attachments/7' },
        { id: 8, download_url: '/a/8' },
        { id: 9, name: 'no-url' },
        null,
        'x',
        { name: 'no-id', download_url: '/a' },
      ]),
    ).toEqual([
      { id: 7, name: 'ملف.docx', size: 1500, mime: 'application/msword', download_url: '/student/attachments/7' },
      { id: 8, name: 'ملف 8', size: null, mime: null, download_url: '/a/8' },
    ])
  })

  it('reads attachments of a submission row from my_submission or the row itself', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        assignments: [
          {
            id: 1,
            lms_assignment_id: 11,
            title: 'واجب',
            my_submission: { id: 2, status: 'submitted', attachments: [{ id: 3, name: 'a.pdf', download_url: '/d/3' }] },
          },
          { id: 2, lms_assignment_id: 12, title: 'واجب قديم', my_submission: { id: 4, status: 'submitted' } },
        ],
      },
    })
    const rows = await fetchStudentAssignments()
    expect(rows[0].attachments).toEqual([{ id: 3, name: 'a.pdf', size: null, mime: null, download_url: '/d/3' }])
    expect('attachments' in rows[1]).toBe(false)
  })
})

describe('downloadAssignmentAttachment', () => {
  let clicked: HTMLAnchorElement | null
  beforeEach(() => {
    clicked = null
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    // The helper clicks a temporary anchor it has just appended to the body.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      clicked = document.body.querySelector('a[download]')
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches the blob with auth and saves it under the Arabic name', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['pdf']) })
    await downloadAssignmentAttachment({ id: 1, name: 'تقرير نهائي.pdf', size: 3, mime: 'application/pdf', download_url: '/student/assignment-attachments/1/download' })

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/student/assignment-attachments/1/download',
      expect.objectContaining({ responseType: 'blob', skipErrorToast: true }),
    )
    expect(clicked?.download).toBe('تقرير نهائي.pdf')
    expect(clicked?.href).toBe('blob:test')
  })

  it('follows an absolute URL on the API origin', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['x']) })
    await downloadAssignmentAttachment({ id: 2, name: 'a.pdf', size: null, mime: null, download_url: 'http://localhost/api/student/attachments/2' })
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('refuses to send the bearer token to another origin', async () => {
    await expect(
      downloadAssignmentAttachment({ id: 3, name: 'a.pdf', size: null, mime: null, download_url: 'https://evil.example/steal' }),
    ).rejects.toThrow()
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('propagates a failed download', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('403'))
    await expect(
      downloadAssignmentAttachment({ id: 4, name: 'a.pdf', size: null, mime: null, download_url: '/x' }),
    ).rejects.toThrow('403')
  })

  it('sanitises characters no file system accepts, keeping Arabic', () => {
    expect(safeDownloadName('تقرير/نهائي:1?.pdf', 'f')).toBe('تقرير_نهائي_1_.pdf')
    expect(safeDownloadName('   ', 'attachment-4')).toBe('attachment-4')
  })
})
