import apiClient from '@/api/axios'

/**
 * TICKET ATTACHMENTS — authenticated retrieval.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────
 * The attachment endpoint is private and sits behind auth:sanctum. Rendering
 * it as `<img src={preview_url}>` or `<a href={preview_url}>` makes the BROWSER
 * issue the request, and a browser navigation carries cookies - not the
 * `Authorization: Bearer` header the SPA's axios client attaches. The server
 * therefore answered "Unauthenticated", which is exactly what it should do.
 *
 * The fix is to fetch through the authenticated client and hand the resulting
 * bytes to the browser as a temporary object URL. The file stays private, the
 * endpoint keeps its auth and its authorization, and no storage URL is ever
 * exposed.
 *
 * Follows the existing project convention for private files - see
 * fetchAmbassadorFileBlob and downloadAuthenticated.
 */

export type TicketAttachmentBlob = {
  blob: Blob
  mime: string
  /** Temporary object URL. The CALLER owns revoking it. */
  objectUrl: string
}

const attachmentPath = (ticketId: number | string, attachmentId: number | string) =>
  `/v1/tickets/${ticketId}/attachments/${attachmentId}/download`

/**
 * An error body can arrive with a blob responseType, in which case the "blob"
 * is really JSON. Surface its message rather than rendering broken bytes.
 */
async function assertNotJsonError(data: Blob, mime: string): Promise<void> {
  if (!mime.includes('json') && !data.type?.includes('json')) return

  let message = 'تعذر تحميل المرفق.'
  try {
    const parsed = JSON.parse(await data.text()) as { message?: string }
    if (parsed.message) message = parsed.message
  } catch {
    /* keep the default */
  }

  throw new Error(message)
}

/**
 * Fetch one attachment through the authenticated client.
 *
 * `skipErrorToast` keeps a failed thumbnail from spraying toasts across a
 * detail page that may hold several attachments; the caller renders an inline
 * fallback instead.
 */
export async function fetchTicketAttachmentBlob(
  ticketId: number | string,
  attachmentId: number | string,
): Promise<TicketAttachmentBlob> {
  const res = await apiClient.get<Blob>(attachmentPath(ticketId, attachmentId), {
    responseType: 'blob',
    skipErrorToast: true,
  } as Record<string, unknown>)

  const rawType = String(res.headers['content-type'] ?? res.data.type ?? 'application/octet-stream')
  const mime = rawType.split(';')[0].trim()

  await assertNotJsonError(res.data, mime)

  // Some servers omit the type on the blob itself; re-wrap so <img> honours it.
  const blob = res.data.type ? res.data : new Blob([res.data], { type: mime })

  return { blob, mime, objectUrl: URL.createObjectURL(blob) }
}

/**
 * Save an attachment to disk through the authenticated client.
 *
 * The temporary URL is revoked immediately after the click: the browser has
 * already taken ownership of the download by then.
 */
export async function downloadTicketAttachment(
  ticketId: number | string,
  attachmentId: number | string,
  filename: string,
): Promise<void> {
  const { objectUrl } = await fetchTicketAttachmentBlob(ticketId, attachmentId)

  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename || 'attachment'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(objectUrl)
}
