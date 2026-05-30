import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { DocumentFolder, PlatformDocument } from '@/types/platform'

export async function fetchDocumentFolders(): Promise<DocumentFolder[]> {
  try {
    const res = await apiClient.get<unknown>('/documents/folders')
    return asList<DocumentFolder>(res.data)
  } catch {
    return []
  }
}

export async function fetchDocuments(params?: { folder?: string }): Promise<PlatformDocument[]> {
  try {
    const res = await apiClient.get<unknown>('/documents', { params })
    const list = asList<PlatformDocument>(res.data)
    if (params?.folder && params.folder !== 'root') {
      return list.filter((d) => d.folder_id === params.folder)
    }
    return list
  } catch {
    return []
  }
}

export async function uploadDocument(payload: FormData): Promise<PlatformDocument> {
  const res = await apiClient.post<unknown>('/documents/upload', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrapLms<PlatformDocument>(res.data)
}
