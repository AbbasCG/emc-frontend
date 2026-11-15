import type { AssignmentAttachment } from '@/types/lms'

function toFiniteNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Reads `attachments: [{ id, name, size, mime, download_url }]` from a submission payload.
 * Returns undefined when the field is not an array (older submissions keep a single `file_url`),
 * and drops entries that cannot be downloaded.
 */
export function normalizeAssignmentAttachments(raw: unknown): AssignmentAttachment[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: AssignmentAttachment[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = toFiniteNumber(o.id)
    const url = typeof o.download_url === 'string' ? o.download_url.trim() : ''
    if (id == null || !url) continue
    const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : `ملف ${id}`
    out.push({
      id,
      name,
      size: toFiniteNumber(o.size),
      mime: typeof o.mime === 'string' && o.mime.trim() ? o.mime.trim() : null,
      download_url: url,
    })
  }
  return out
}
