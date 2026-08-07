import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import apiClient from '@/api/axios'
import {
  getApplicationFiles,
  deleteApplicationFile,
  fetchAmbassadorFileBlob,
  triggerBlobDownload,
  type AmbassadorFileRecord,
} from '@/api/ambassadorApplicationFilesApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

/* ── list + delete ── */

describe('getApplicationFiles / deleteApplicationFile', () => {
  it('getApplicationFiles fetches the files sub-resource and returns the inner array', async () => {
    const record: AmbassadorFileRecord = {
      id: 9,
      category: 'cv',
      category_label: 'السيرة الذاتية',
      original_name: 'سيرة-ذاتية.pdf',
      mime_type: 'application/pdf',
      extension: 'pdf',
      original_size: 1024,
      optimized_size: 512,
      compression_ratio: 50,
      file_size_humans: '1 كيلوبايت',
      processing_status: 'optimized',
      processing_error: null,
      uploaded_at: '2026-08-01T09:00:00Z',
      processed_at: '2026-08-01T09:01:00Z',
      has_thumbnail: true,
      has_preview: true,
      preview_url: '/admin/ambassador-applications/3/files/9/preview',
      download_url: '/admin/ambassador-applications/3/files/9/download',
      thumbnail_url: null,
    }
    mockedApi.get.mockResolvedValueOnce({ data: { success: true, data: [record] } })

    const files = await getApplicationFiles(3)

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/ambassador-applications/3/files')
    expect(files).toEqual([record])
  })

  it('getApplicationFiles propagates errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('403'))
    await expect(getApplicationFiles(3)).rejects.toThrow('403')
  })

  it('deleteApplicationFile deletes the nested file route', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteApplicationFile(3, 9)
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/ambassador-applications/3/files/9')
  })

  it('deleteApplicationFile propagates errors', async () => {
    mockedApi.delete.mockRejectedValueOnce(new Error('404'))
    await expect(deleteApplicationFile(3, 9)).rejects.toThrow('404')
  })
})

/* ── fetchAmbassadorFileBlob ── */

describe('fetchAmbassadorFileBlob', () => {
  it('downloads an authenticated blob and reads mime + quoted filename from headers', async () => {
    const pdf = new Blob(['pdf-bytes'], { type: 'application/pdf' })
    mockedApi.get.mockResolvedValueOnce({
      data: pdf,
      headers: {
        'content-type': 'application/pdf; charset=utf-8',
        'content-disposition': 'attachment; filename="report.pdf"',
      },
    })

    const result = await fetchAmbassadorFileBlob(3, 9, 'download')

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/ambassador-applications/3/files/9/download',
      expect.objectContaining({ responseType: 'blob', skipErrorToast: true }),
    )
    expect(result.mime).toBe('application/pdf') // charset suffix stripped
    expect(result.blob).toBe(pdf)               // typed blob passed through untouched
    expect(result.filename).toBe('report.pdf')
  })

  it('uses the preview endpoint for preview mode', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['img'], { type: 'image/png' }),
      headers: { 'content-type': 'image/png' },
    })
    await fetchAmbassadorFileBlob(3, 9, 'preview')
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/ambassador-applications/3/files/9/preview',
      expect.objectContaining({ responseType: 'blob' }),
    )
  })

  it('decodes an RFC 5987 filename*=UTF-8 Arabic filename', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['pdf'], { type: 'application/pdf' }),
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': "attachment; filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf",
      },
    })
    const result = await fetchAmbassadorFileBlob(3, 9, 'download')
    expect(result.filename).toBe('تقرير.pdf')
  })

  it('keeps the raw encoded token when decodeURIComponent throws', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['pdf'], { type: 'application/pdf' }),
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': "attachment; filename*=UTF-8''%E0%A4%A",
      },
    })
    const result = await fetchAmbassadorFileBlob(3, 9, 'download')
    expect(result.filename).toBe('%E0%A4%A')
  })

  it('falls back to file-{id} when there is no content-disposition header', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['pdf'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    })
    const result = await fetchAmbassadorFileBlob(3, 42, 'download')
    expect(result.filename).toBe('file-42')
  })

  it('reads the capitalized Content-Disposition header variant', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['img'], { type: 'image/png' }),
      headers: {
        'content-type': 'image/png',
        'Content-Disposition': 'attachment; filename="صورة.png"',
      },
    })
    const result = await fetchAmbassadorFileBlob(3, 9, 'download')
    expect(result.filename).toBe('صورة.png')
  })

  it('re-wraps an untyped non-empty blob with the header mime', async () => {
    // Backend streamed bytes without a blob type — the code rebuilds a typed Blob.
    const untyped = {
      type: '',
      size: 5,
    } as unknown as Blob
    mockedApi.get.mockResolvedValueOnce({
      data: untyped,
      headers: { 'content-type': 'image/jpeg' },
    })
    const result = await fetchAmbassadorFileBlob(3, 9, 'preview')
    expect(result.blob).not.toBe(untyped)
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.type).toBe('image/jpeg')
  })

  it('throws the backend Arabic message when the "blob" is actually a JSON error body', async () => {
    const jsonBlob = {
      type: 'application/json',
      size: 40,
      text: async () => JSON.stringify({ message: 'الملف غير موجود' }),
    } as unknown as Blob
    mockedApi.get.mockResolvedValueOnce({
      data: jsonBlob,
      headers: { 'content-type': 'application/json' },
    })
    await expect(fetchAmbassadorFileBlob(3, 9, 'download')).rejects.toThrow('الملف غير موجود')
  })

  it('throws the default Arabic message when the JSON error body is unparseable', async () => {
    const jsonBlob = {
      type: 'application/json',
      size: 10,
      text: async () => 'not-json',
    } as unknown as Blob
    mockedApi.get.mockResolvedValueOnce({
      data: jsonBlob,
      headers: {},
    })
    await expect(fetchAmbassadorFileBlob(3, 9, 'download')).rejects.toThrow('تعذّر تحميل الملف.')
  })

  it('propagates transport errors untouched', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchAmbassadorFileBlob(3, 9, 'download')).rejects.toThrow('Network Error')
  })
})

/* ── triggerBlobDownload ── */

describe('triggerBlobDownload', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('creates a temporary anchor with download + noopener, clicks it, and revokes the URL', () => {
    const blob = new Blob(['file-bytes'], { type: 'application/pdf' })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    triggerBlobDownload(blob, 'تقرير-السفير.pdf')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.tagName).toBe('A')
    expect(anchor.download).toBe('تقرير-السفير.pdf')
    expect(anchor.rel).toBe('noopener')
    expect(anchor.href).toContain('blob:mock-url')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    // the anchor removes itself after the click
    expect(document.body.contains(anchor)).toBe(false)

    appendSpy.mockRestore()
    clickSpy.mockRestore()
  })
})
