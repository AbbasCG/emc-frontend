import apiClient from './axios'

/**
 * Expense / revenue voucher attachments are private financial documents. They
 * are never exposed as public storage URLs — the file is fetched through the
 * authenticated, authorized and audited backend endpoint and handed to the
 * browser as a short-lived object URL.
 */

export type VoucherKind = 'expenses' | 'revenues'
export type VoucherAttachmentMode = 'download' | 'preview'

export function voucherAttachmentPath(kind: VoucherKind, id: number, mode: VoucherAttachmentMode): string {
  return `/admin/finance/${kind}/${id}/attachment${mode === 'preview' ? '/preview' : ''}`
}

export async function fetchVoucherAttachment(
  kind: VoucherKind,
  id: number,
  mode: VoucherAttachmentMode,
): Promise<{ blob: Blob; mime: string }> {
  const res = await apiClient.get<Blob>(voucherAttachmentPath(kind, id, mode), {
    responseType: 'blob',
    skipErrorToast: true,
  } as Record<string, unknown>)

  const mime = String(res.headers['content-type'] ?? res.data.type ?? 'application/octet-stream').split(';')[0].trim()
  if (mime.includes('application/json')) {
    let message = 'تعذّر تحميل المرفق.'
    try {
      const parsed = JSON.parse(await res.data.text()) as { message?: string }
      if (parsed.message) message = parsed.message
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }

  return { blob: res.data, mime }
}

/** Preview opens in a new tab; download saves under the original file name. */
export async function openVoucherAttachment(
  kind: VoucherKind,
  id: number,
  mode: VoucherAttachmentMode,
  fileName?: string | null,
): Promise<void> {
  // Open the tab synchronously so pop-up blockers treat it as user-initiated.
  const tab = mode === 'preview' ? window.open('', '_blank') : null
  try {
    const { blob } = await fetchVoucherAttachment(kind, id, mode)
    const url = URL.createObjectURL(blob)
    if (tab) {
      tab.opener = null
      tab.location.href = url
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'attachment'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    tab?.close()
    throw err
  }
}
