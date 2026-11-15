import apiClient from './axios'
import type { AssignmentAttachment } from '@/types/lms'

/** Keeps the Arabic name but strips what no file system accepts. */
export function safeDownloadName(name: string, fallback: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim()
  return cleaned || fallback
}

/** Absolute URLs are only followed when they point at our own API / site; the bearer token must not leave it. */
function isTrustedDownloadUrl(url: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//')) return true
  try {
    const target = new URL(url, window.location.href)
    const apiBase = apiClient.defaults.baseURL
    const origins = new Set([window.location.origin])
    if (apiBase) origins.add(new URL(apiBase, window.location.href).origin)
    return origins.has(target.origin)
  } catch {
    return false
  }
}

/**
 * Authenticated download of one submission attachment: an axios blob request (so the Bearer token is
 * sent — a bare link would be a 401) saved under the attachment's own, possibly Arabic, name.
 * Throws on failure so the caller can show an error.
 */
export async function downloadAssignmentAttachment(attachment: AssignmentAttachment): Promise<void> {
  if (!isTrustedDownloadUrl(attachment.download_url)) {
    throw new Error('رابط التنزيل غير موثوق.')
  }
  const res = await apiClient.get<Blob>(attachment.download_url, { responseType: 'blob', skipErrorToast: true })
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data as BlobPart])
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = safeDownloadName(attachment.name, `attachment-${attachment.id}`)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
}
