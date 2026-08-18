import apiClient from './axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AmbassadorFileRecord = {
  id: number
  category: string
  category_label: string
  original_name: string
  mime_type: string
  extension: string
  original_size: number
  optimized_size: number | null
  compression_ratio: number | null
  file_size_humans: string
  processing_status: 'uploaded' | 'processing' | 'optimized' | 'failed' | 'skipped'
  processing_error: string | null
  uploaded_at: string
  processed_at: string | null
  has_thumbnail: boolean
  has_preview: boolean
  preview_url: string
  thumbnail_url: string | null
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getApplicationFiles(applicationId: number): Promise<AmbassadorFileRecord[]> {
  const res = await apiClient.get<{ success: boolean; data: AmbassadorFileRecord[] }>(
    `/admin/ambassador-applications/${applicationId}/files`
  )
  return res.data.data
}

export async function deleteApplicationFile(applicationId: number, fileId: number): Promise<void> {
  await apiClient.delete(`/admin/ambassador-applications/${applicationId}/files/${fileId}`)
}

function parseContentDispositionFilename(
  cd: string | undefined,
  fallback: string,
): string {
  if (!cd) return fallback
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      return star[1].trim()
    }
  }
  const plain = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(cd)
  if (plain?.[1]) return plain[1].replace(/['"]/g, '').trim()
  return fallback
}

export async function fetchAmbassadorFileBlob(
  applicationId: number,
  fileId: number,
  mode: 'preview' = 'preview',
): Promise<{ blob: Blob; mime: string; filename: string }> {
  const res = await apiClient.get<Blob>(
    `/admin/ambassador-applications/${applicationId}/files/${fileId}/${mode}`,
    { responseType: 'blob', skipErrorToast: true } as Record<string, unknown>,
  )

  const rawType = String(res.headers['content-type'] ?? res.data.type ?? 'application/octet-stream')
  const mime = rawType.split(';')[0].trim()

  if (mime.includes('application/json') || res.data.type?.includes('json')) {
    const text = await res.data.text()
    let message = 'تعذّر تحميل الملف.'
    try {
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed.message) message = parsed.message
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }

  const blob =
    res.data.size > 0 && !res.data.type ? new Blob([res.data], { type: mime }) : res.data
  const cd = (res.headers['content-disposition'] ?? res.headers['Content-Disposition']) as
    | string
    | undefined

  return {
    blob,
    mime,
    filename: parseContentDispositionFilename(cd, `file-${fileId}`),
  }
}
