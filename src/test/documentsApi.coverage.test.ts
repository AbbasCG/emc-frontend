import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import { fetchDocumentFolders, fetchDocuments, uploadDocument } from '@/api/documentsApi'
import type { DocumentFolder, PlatformDocument } from '@/types/platform'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

const folder: DocumentFolder = { id: 'contracts', name: 'العقود', parent_id: null }

const docInFolder: PlatformDocument = {
  id: 1,
  name: 'عقد الشراكة.pdf',
  folder_id: 'contracts',
  visibility: 'management',
  related_label: 'شراكة المعهد',
  size_label: '2 م.ب',
  updated_at: '2026-08-01T00:00:00Z',
}

const rootDoc: PlatformDocument = {
  id: 2,
  name: 'دليل السياسات.pdf',
  folder_id: null,
  visibility: 'internal',
  updated_at: '2026-08-02T00:00:00Z',
}

describe('fetchDocumentFolders', () => {
  it('unwraps the folder list from /documents/folders', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [folder] } })
    await expect(fetchDocumentFolders()).resolves.toEqual([folder])
    expect(mockedApi.get).toHaveBeenCalledWith('/documents/folders')
  })

  it('returns [] on malformed payloads and on request failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: null } })
    await expect(fetchDocumentFolders()).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchDocumentFolders()).resolves.toEqual([])
  })
})

describe('fetchDocuments', () => {
  it('passes params through and returns the full list when no folder filter is set', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [docInFolder, rootDoc] } })
    await expect(fetchDocuments()).resolves.toEqual([docInFolder, rootDoc])
    expect(mockedApi.get).toHaveBeenCalledWith('/documents', { params: undefined })
  })

  it('client-side filters to the requested folder id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [docInFolder, rootDoc] } })
    const rows = await fetchDocuments({ folder: 'contracts' })
    expect(rows).toEqual([docInFolder])
    expect(mockedApi.get).toHaveBeenCalledWith('/documents', { params: { folder: 'contracts' } })
  })

  it('the special "root" folder disables client-side filtering', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [docInFolder, rootDoc] } })
    await expect(fetchDocuments({ folder: 'root' })).resolves.toEqual([docInFolder, rootDoc])
  })

  it('returns [] on request failure (never throws)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchDocuments({ folder: 'contracts' })).resolves.toEqual([])
  })
})

describe('uploadDocument', () => {
  it('POSTs multipart FormData to /documents/upload and unwraps the created document', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: docInFolder } })
    const fd = new FormData()
    fd.append('name', 'عقد الشراكة.pdf')
    await expect(uploadDocument(fd)).resolves.toEqual(docInFolder)
    expect(mockedApi.post).toHaveBeenCalledWith('/documents/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })

  it('propagates upload errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('413'))
    await expect(uploadDocument(new FormData())).rejects.toThrow('413')
  })
})
