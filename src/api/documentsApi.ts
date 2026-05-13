import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { seedDocumentFolders, seedDocuments } from '@/data/platformSeed'
import type { DocumentFolder, PlatformDocument } from '@/types/platform'

export async function fetchDocumentFolders(): Promise<DocumentFolder[]> {
  try {
    const res = await apiClient.get<unknown>('/documents/folders')
    return asList<DocumentFolder>(res.data)
  } catch {
    return seedDocumentFolders()
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
    let docs = seedDocuments()
    if (params?.folder && params.folder !== 'root') {
      docs = docs.filter((d) => d.folder_id === params.folder)
    }
    return docs
  }
}

export async function uploadDocument(payload: FormData): Promise<PlatformDocument> {
  const res = await apiClient.post<unknown>('/documents/upload', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrapLms<PlatformDocument>(res.data)
}
