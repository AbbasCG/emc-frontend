import apiClient from './axios'
import { unwrapLms } from './lmsApi'

export type AmbassadorExportFormat = 'csv' | 'xlsx'
export type AmbassadorExportMode = 'all' | 'filtered' | 'selected' | 'search'
export type AmbassadorExportDateField = 'created_at' | 'reviewed_at' | 'status_updated_at' | 'updated_at'

export interface AmbassadorExportColumn {
  key: string
  label: string
  group: string
}

export interface AmbassadorExportOptions {
  statuses: string[]
  countries: string[]
  universities: string[]
  university_types: string[]
  majors: string[]
  study_years: string[]
  columns: AmbassadorExportColumn[]
  column_groups: Record<string, string>
  default_columns: string[]
  max_rows: number
}

export interface AmbassadorExportRequest {
  format: AmbassadorExportFormat
  mode: AmbassadorExportMode
  ids?: number[]
  search?: string
  statuses?: string[]
  countries?: string[]
  universities?: string[]
  university_types?: string[]
  majors?: string[]
  study_years?: string[]
  date_field?: AmbassadorExportDateField
  date_from?: string
  date_to?: string
  columns: string[]
}

export interface AmbassadorExportPreview {
  records: number
  truncated: boolean
  columns: number
  estimated_size_bytes: number
}

export async function fetchAmbassadorExportOptions(): Promise<AmbassadorExportOptions> {
  const res = await apiClient.get<unknown>('/admin/ambassador-applications/export/options')
  return unwrapLms<AmbassadorExportOptions>(res.data)
}

export async function fetchAmbassadorExportPreview(body: AmbassadorExportRequest): Promise<AmbassadorExportPreview> {
  const res = await apiClient.post<unknown>('/admin/ambassador-applications/export/preview', body)
  return unwrapLms<AmbassadorExportPreview>(res.data)
}

function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback
  const match = /filename="?([^";]+)"?/i.exec(header)
  return match?.[1] ?? fallback
}

export async function downloadAmbassadorExport(body: AmbassadorExportRequest): Promise<void> {
  const res = await apiClient.post('/admin/ambassador-applications/export', body, {
    responseType: 'blob',
    skipErrorToast: true,
  })

  const ext = body.format === 'xlsx' ? 'xlsx' : 'csv'
  const fallback = `ambassador-applications-${new Date().toISOString().slice(0, 10)}.${ext}`
  const filename = filenameFromContentDisposition(res.headers['content-disposition'] as string | undefined, fallback)

  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
