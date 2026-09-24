/**
 * TICKET ATTACHMENTS — the one frontend policy.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS IS UX, NOT SECURITY
 * ─────────────────────────────────────────────────────────────────────────
 * The server is the authority: POST /api/v1/tickets validates with a `mimes:`
 * rule that sniffs real file content and a size cap, and rejects anything else
 * whatever this file says. These rules exist so a user is never told "attached"
 * about a file the request is about to refuse with a 422 - they mirror
 * TicketAttachmentService::ALLOWED_MIMES and MAX_KILOBYTES deliberately.
 *
 * VIDEO IS NOT ACCEPTED. Neither is SVG, which browsers execute.
 *
 * All three input paths - file picker, drag-drop and clipboard paste - funnel
 * through addFiles() so they cannot drift apart.
 */

/** Mirrors TicketAttachmentService::ALLOWED_MIMES. */
export const ACCEPTED_MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

/** The `accept` attribute for the picker. Never relied on for safety. */
export const ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp,application/pdf'

/** Mirrors TicketAttachmentService::MAX_KILOBYTES (50 MB). */
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024

export type RejectionReason = 'video' | 'type' | 'size'

export type TicketAttachment = {
  /** Stable key for React lists and for revoking the right preview. */
  id: string
  file: File
  /** Object URL for images only; null for PDF. The store owns revoking it. */
  previewUrl: string | null
  isImage: boolean
}

export const isAcceptedType = (type: string): boolean => type in ACCEPTED_MIME_EXTENSION

export const isImageType = (type: string): boolean =>
  isAcceptedType(type) && type.startsWith('image/')

export const isVideoType = (type: string): boolean => type.startsWith('video/')

/** Human size, e.g. "340 KB" / "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Arabic messages, keyed by why the file was refused. */
export const REJECTION_MESSAGE_AR: Record<RejectionReason, string> = {
  video: 'لا يمكن رفع ملفات الفيديو في التذاكر.',
  type: 'نوع الملف غير مدعوم. يُسمح فقط بصور JPG وPNG وWebP وملفات PDF.',
  size: 'حجم الملف يتجاوز الحد المسموح (50 ميجابايت).',
}

let counter = 0
const nextId = (): string => `att-${Date.now()}-${counter++}`

/**
 * Classify one file. Video is reported separately from other unsupported types
 * so the user gets the specific reason rather than a generic refusal.
 */
export function classify(file: File): RejectionReason | null {
  if (isVideoType(file.type)) return 'video'
  if (!isAcceptedType(file.type)) return 'type'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'size'
  return null
}

/**
 * Build an attachment, creating a preview URL for images only.
 *
 * `displayName` renames pasted screenshots, which arrive from the clipboard as
 * "image.png" or with no useful name at all. The clipboard's own filename is
 * never trusted for anything; the server generates the stored name regardless.
 */
export function toAttachment(file: File, displayName?: string): TicketAttachment {
  const named =
    displayName && displayName !== file.name
      ? new File([file], displayName, { type: file.type, lastModified: file.lastModified })
      : file

  const isImage = isImageType(named.type)

  return {
    id: nextId(),
    file: named,
    previewUrl: isImage ? URL.createObjectURL(named) : null,
    isImage,
  }
}

export type AddResult = {
  accepted: TicketAttachment[]
  rejected: RejectionReason[]
}

/**
 * THE canonical entry point. Picker, drop and paste all call this, so one
 * validation rule and one preview-URL lifecycle covers every path.
 *
 * `nameFor` lets paste supply a generated screenshot name without this function
 * needing to know where the files came from.
 */
export function addFiles(
  files: readonly File[],
  nameFor?: (file: File, index: number) => string | undefined,
): AddResult {
  const accepted: TicketAttachment[] = []
  const rejected: RejectionReason[] = []

  files.forEach((file, index) => {
    const reason = classify(file)

    if (reason) {
      rejected.push(reason)
      return
    }

    accepted.push(toAttachment(file, nameFor?.(file, index)))
  })

  return { accepted, rejected }
}

/** Generated display name for a pasted screenshot. */
export function pastedImageName(file: File, index: number): string {
  const extension = ACCEPTED_MIME_EXTENSION[file.type] ?? 'png'
  return `pasted-image-${Date.now()}-${index}.${extension}`
}

/**
 * Release preview URLs. Must be called when attachments are removed, replaced,
 * or the component unmounts - an object URL survives until revoked, so failing
 * to do this pins the whole file in memory for the life of the document.
 */
export function releasePreviews(attachments: readonly TicketAttachment[]): void {
  attachments.forEach((attachment) => {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
  })
}
